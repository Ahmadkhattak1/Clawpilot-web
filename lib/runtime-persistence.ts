import { getSupabaseAuthClient } from '@/lib/supabase-auth'

const PROFILE_TABLE = 'openclaw_runtime_profiles'

type PersistedProfileRow = {
  model_provider_id: string | null
  model_id: string | null
  auth_method: 'api-key' | 'oauth' | null
  oauth_connected: boolean | null
}

export interface PersistedRuntimeProfile {
  modelProviderId: string | null
  modelId: string | null
  authMethod: 'api-key' | 'oauth' | null
  oauthConnected: boolean
}

type UpsertProfileInput = {
  userId: string
  tenantId: string
  modelProviderId?: string | null
  modelId?: string | null
  authMethod?: 'api-key' | 'oauth' | null
  oauthConnected?: boolean
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
      normalizedCode === '42501'
      || normalizedCode === 'PGRST301'
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
