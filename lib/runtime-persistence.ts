import { getSupabaseAuthClient } from '@/lib/supabase-auth'

const SESSIONS_TABLE = 'openclaw_runtime_sessions'
const PROFILE_TABLE = 'openclaw_runtime_profiles'
const MESSAGES_TABLE = 'openclaw_runtime_messages'

type PersistedSessionRow = {
  session_key: string
  session_label: string | null
  is_active: boolean | null
  last_seen_at: string | null
}

type PersistedProfileRow = {
  model_provider_id: string | null
  model_id: string | null
  auth_method: 'api-key' | 'oauth' | null
  oauth_connected: boolean | null
}

type PersistedMessageRow = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  message_ts: string | null
}

export interface PersistedRuntimeSession {
  sessionKey: string
  sessionLabel: string | null
  isActive: boolean
  lastSeenAt: string | null
}

export interface PersistedRuntimeProfile {
  modelProviderId: string | null
  modelId: string | null
  authMethod: 'api-key' | 'oauth' | null
  oauthConnected: boolean
}

export interface PersistedRuntimeMessage {
  id: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string | null
}

type UpsertSessionInput = {
  userId: string
  tenantId: string
  sessionKey: string
  sessionLabel?: string | null
  isActive?: boolean
  touchLastSeen?: boolean
}

type UpsertProfileInput = {
  userId: string
  tenantId: string
  modelProviderId?: string | null
  modelId?: string | null
  authMethod?: 'api-key' | 'oauth' | null
  oauthConnected?: boolean
}

type InsertMessageInput = {
  userId: string
  tenantId: string
  sessionKey: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string | null
}

function isTableMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? (error as { code?: unknown }).code : undefined
  if (typeof code === 'string' && code === 'PGRST205') {
    return true
  }

  const message = 'message' in error ? (error as { message?: unknown }).message : undefined
  if (typeof message === 'string' && /not found|does not exist|relation/i.test(message)) {
    return true
  }

  return false
}

function isAuthOrPermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const code = 'code' in error ? (error as { code?: unknown }).code : undefined
  if (typeof code === 'string') {
    const normalizedCode = code.trim().toUpperCase()
    if (
      normalizedCode === '42501' // postgres insufficient_privilege / RLS denied
      || normalizedCode === 'PGRST301' // JWT missing/invalid
      || normalizedCode === 'PGRST302'
      || normalizedCode === 'PGRST303'
    ) {
      return true
    }
  }

  const status = 'status' in error ? (error as { status?: unknown }).status : undefined
  if (typeof status === 'number' && (status === 401 || status === 403)) {
    return true
  }

  const name = 'name' in error ? (error as { name?: unknown }).name : undefined
  if (typeof name === 'string' && /AuthSessionMissingError|Unauthorized/i.test(name)) {
    return true
  }

  const message = 'message' in error ? (error as { message?: unknown }).message : undefined
  if (
    typeof message === 'string'
    && /row-level security|rls|permission denied|unauthorized|forbidden|jwt|session missing|not authenticated/i.test(message)
  ) {
    return true
  }

  const details = 'details' in error ? (error as { details?: unknown }).details : undefined
  if (
    typeof details === 'string'
    && /row-level security|rls|permission denied|unauthorized|forbidden|jwt|session missing|not authenticated/i.test(details)
  ) {
    return true
  }

  return false
}

function isIgnorablePersistenceError(error: unknown): boolean {
  return isTableMissingError(error) || isAuthOrPermissionError(error)
}

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && /Missing Supabase environment variables/i.test(error.message)
}

function getRuntimePersistenceClient() {
  try {
    return getSupabaseAuthClient()
  } catch (error) {
    if (isMissingSupabaseEnvError(error)) {
      return null
    }
    throw error
  }
}

function normalizeSessionRows(rows: PersistedSessionRow[] | null): PersistedRuntimeSession[] {
  if (!rows?.length) return []
  return rows
    .map((row) => ({
      sessionKey: row.session_key,
      sessionLabel: row.session_label,
      isActive: Boolean(row.is_active),
      lastSeenAt: row.last_seen_at,
    }))
    .filter((row) => Boolean(row.sessionKey))
}

export async function listPersistedRuntimeSessions(
  userId: string,
  tenantId: string,
): Promise<PersistedRuntimeSession[]> {
  if (!userId || !tenantId) return []
  const supabase = getRuntimePersistenceClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select('session_key,session_label,is_active,last_seen_at')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('last_seen_at', { ascending: false })

  if (error) {
    if (isIgnorablePersistenceError(error)) {
      return []
    }
    throw error
  }

  return normalizeSessionRows((data ?? null) as PersistedSessionRow[] | null)
}

export async function upsertPersistedRuntimeSession(input: UpsertSessionInput): Promise<void> {
  const normalizedKey = input.sessionKey.trim()
  if (!input.userId || !input.tenantId || !normalizedKey) {
    return
  }

  const supabase = getRuntimePersistenceClient()
  if (!supabase) return
  const nowIso = new Date().toISOString()
  const isActive = input.isActive ?? false
  const touchLastSeen = input.touchLastSeen ?? false
  const hasSessionLabel = input.sessionLabel !== undefined

  if (isActive) {
    const { error: deactivateError } = await supabase
      .from(SESSIONS_TABLE)
      .update({
        is_active: false,
        updated_at: nowIso,
      })
      .eq('user_id', input.userId)
      .eq('tenant_id', input.tenantId)
      .neq('session_key', normalizedKey)

    if (deactivateError && !isTableMissingError(deactivateError)) {
      if (isIgnorablePersistenceError(deactivateError)) {
        return
      }
      throw deactivateError
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from(SESSIONS_TABLE)
    .select('id')
    .eq('user_id', input.userId)
    .eq('tenant_id', input.tenantId)
    .eq('session_key', normalizedKey)
    .limit(1)

  if (existingError) {
    if (isIgnorablePersistenceError(existingError)) {
      return
    }
    throw existingError
  }

  if (existingRows && existingRows.length > 0) {
    const updatePayload: Record<string, unknown> = {
      is_active: isActive,
      updated_at: nowIso,
    }
    if (touchLastSeen) {
      updatePayload.last_seen_at = nowIso
    }
    if (hasSessionLabel) {
      updatePayload.session_label = input.sessionLabel
    }

    const { error: updateError } = await supabase
      .from(SESSIONS_TABLE)
      .update(updatePayload)
      .eq('user_id', input.userId)
      .eq('tenant_id', input.tenantId)
      .eq('session_key', normalizedKey)

    if (updateError) {
      if (isIgnorablePersistenceError(updateError)) {
        return
      }
      throw updateError
    }
    return
  }

  const insertPayload: Record<string, unknown> = {
    user_id: input.userId,
    tenant_id: input.tenantId,
    session_key: normalizedKey,
    session_label: input.sessionLabel ?? null,
    is_active: isActive,
    last_seen_at: nowIso,
    updated_at: nowIso,
  }

  const { error: insertError } = await supabase
    .from(SESSIONS_TABLE)
    .insert(insertPayload)

  if (insertError) {
    if (isIgnorablePersistenceError(insertError)) {
      return
    }
    throw insertError
  }
}

export async function upsertPersistedRuntimeProfile(input: UpsertProfileInput): Promise<void> {
  if (!input.userId || !input.tenantId) {
    return
  }

  const supabase = getRuntimePersistenceClient()
  if (!supabase) return
  const nowIso = new Date().toISOString()

  const { error } = await supabase
    .from(PROFILE_TABLE)
    .upsert(
      {
        user_id: input.userId,
        tenant_id: input.tenantId,
        model_provider_id: input.modelProviderId ?? null,
        model_id: input.modelId ?? null,
        auth_method: input.authMethod ?? null,
        oauth_connected: Boolean(input.oauthConnected),
        updated_at: nowIso,
      },
      {
        onConflict: 'user_id,tenant_id',
      },
    )

  if (error) {
    if (isIgnorablePersistenceError(error)) {
      return
    }
    throw error
  }
}

export async function getPersistedRuntimeProfile(
  userId: string,
  tenantId: string,
): Promise<PersistedRuntimeProfile | null> {
  if (!userId || !tenantId) return null
  const supabase = getRuntimePersistenceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('model_provider_id,model_id,auth_method,oauth_connected')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    if (isIgnorablePersistenceError(error)) {
      return null
    }
    throw error
  }

  const row = (data ?? null) as PersistedProfileRow | null
  if (!row) return null

  return {
    modelProviderId: row.model_provider_id,
    modelId: row.model_id,
    authMethod: row.auth_method,
    oauthConnected: Boolean(row.oauth_connected),
  }
}

export async function listPersistedRuntimeMessages(
  userId: string,
  tenantId: string,
  sessionKey: string,
): Promise<PersistedRuntimeMessage[]> {
  const normalizedSessionKey = sessionKey.trim()
  if (!userId || !tenantId || !normalizedSessionKey) {
    return []
  }

  const supabase = getRuntimePersistenceClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select('id,role,content,message_ts')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('session_key', normalizedSessionKey)
    .order('message_ts', { ascending: true })

  if (error) {
    if (isIgnorablePersistenceError(error)) {
      return []
    }
    throw error
  }

  return ((data ?? []) as PersistedMessageRow[])
    .map((row) => ({
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : null,
      role: row.role,
      content: row.content,
      timestamp: row.message_ts,
    }))
    .filter((row) => Boolean(row.content))
}

export async function insertPersistedRuntimeMessage(input: InsertMessageInput): Promise<void> {
  const normalizedSessionKey = input.sessionKey.trim()
  const normalizedContent = input.content.trim()
  if (!input.userId || !input.tenantId || !normalizedSessionKey || !normalizedContent) {
    return
  }

  const supabase = getRuntimePersistenceClient()
  if (!supabase) return
  const parsedInputTimestamp = input.timestamp ? Date.parse(input.timestamp) : Number.NaN
  const parsedMessageTs = Number.isFinite(parsedInputTimestamp) ? parsedInputTimestamp : Date.now()
  const messageTimestamp = new Date(parsedMessageTs).toISOString()
  const dedupeWindowMs = 5_000
  const dedupeSinceIso = new Date(parsedMessageTs - dedupeWindowMs).toISOString()
  const dedupeUntilIso = new Date(parsedMessageTs + dedupeWindowMs).toISOString()

  if (dedupeSinceIso && dedupeUntilIso) {
    const { data: existingRows, error: existingError } = await supabase
      .from(MESSAGES_TABLE)
      .select('message_ts')
      .eq('user_id', input.userId)
      .eq('tenant_id', input.tenantId)
      .eq('session_key', normalizedSessionKey)
      .eq('role', input.role)
      .eq('content', normalizedContent)
      .gte('message_ts', dedupeSinceIso)
      .lte('message_ts', dedupeUntilIso)
      .order('message_ts', { ascending: false })
      .limit(1)

    if (existingError) {
      if (isIgnorablePersistenceError(existingError)) {
        return
      }
      throw existingError
    }

    if ((existingRows ?? []).length > 0) {
      return
    }
  }

  const { error } = await supabase
    .from(MESSAGES_TABLE)
    .insert({
      user_id: input.userId,
      tenant_id: input.tenantId,
      session_key: normalizedSessionKey,
      role: input.role,
      content: normalizedContent,
      message_ts: messageTimestamp,
    })

  if (error) {
    if (isIgnorablePersistenceError(error)) {
      return
    }
    throw error
  }
}
