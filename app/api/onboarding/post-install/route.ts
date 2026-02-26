import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { getBackendUrl } from '@/lib/runtime-controls'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

const RequestBodySchema = z.object({
  tenantId: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  skillIds: z.array(z.string().trim().min(1).max(120)).max(24).default([]),
})

interface BackendRequestOptions {
  path: string
  method?: 'GET' | 'POST' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
}

interface DeferredTaskResult {
  status: 'ok' | 'failed' | 'skipped'
  error?: string
  details?: Record<string, unknown>
}

interface RuntimeSkillCandidate {
  key: string
  name: string
  raw: Record<string, unknown>
}

interface RuntimeInstallOption {
  id: string
  label: string
}

const MAX_BACKGROUND_SKILL_INSTALLS = 8
const SKILL_INSTALL_TIMEOUT_MS = 45_000
const SKILL_INSTALL_STATIC_IDS: Record<string, string> = {
  clawhub: 'node',
}

async function backendRequest<T>({
  path,
  method = 'GET',
  headers = {},
  body,
}: BackendRequestOptions): Promise<{ status: number; data: T }> {
  const backendApiUrl = getBackendUrl()

  try {
    const response = await fetch(`${backendApiUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })

    const text = await response.text()
    let data = {} as T

    if (text) {
      try {
        data = JSON.parse(text) as T
      } catch {
        data = {
          raw: text,
        } as T
      }
    }

    return {
      status: response.status,
      data,
    }
  } catch {
    throw new Error('BACKEND_UNREACHABLE')
  }
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null
  const normalized = authorizationHeader.trim()
  if (!normalized) return null
  if (!normalized.toLowerCase().startsWith('bearer ')) return null
  const token = normalized.slice(7).trim()
  return token || null
}

async function runDeferredTask(task: () => Promise<{ status: number }>): Promise<DeferredTaskResult> {
  try {
    const response = await task()
    if (response.status >= 400) {
      return {
        status: 'failed',
        error: `HTTP_${response.status}`,
      }
    }
    return {
      status: 'ok',
    }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    }
  }
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function readString(record: Record<string, unknown> | null, keys: string[]): string | null {
  if (!record) {
    return null
  }
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

function readBoolean(record: Record<string, unknown> | null, keys: string[]): boolean | null {
  if (!record) {
    return null
  }
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'boolean') {
      return value
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'true' || normalized === '1' || normalized === 'enabled') {
        return true
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'disabled') {
        return false
      }
    }
  }
  return null
}

function readStringArray(record: Record<string, unknown> | null, key: string): string[] {
  const value = record?.[key]
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function normalizeRequestedSkillIds(skillIds: string[]): string[] {
  const deduped = new Set<string>()
  for (const skillId of skillIds) {
    const normalized = skillId.trim().toLowerCase()
    if (!normalized) {
      continue
    }
    deduped.add(normalized)
    if (deduped.size >= MAX_BACKGROUND_SKILL_INSTALLS) {
      break
    }
  }
  return Array.from(deduped)
}

function parseRuntimeSkillItem(item: unknown, keyFallback?: string): RuntimeSkillCandidate | null {
  if (typeof item === 'string' && item.trim()) {
    const normalized = item.trim()
    return {
      key: normalized,
      name: normalized,
      raw: { key: normalized },
    }
  }

  const record = toRecord(item)
  if (!record) {
    return null
  }

  const key = readString(record, ['skillKey', 'key', 'id', 'name'])
    ?? (keyFallback && keyFallback.trim() ? keyFallback.trim() : null)
  if (!key) {
    return null
  }

  return {
    key,
    name: readString(record, ['label', 'title', 'displayName', 'name']) ?? key,
    raw: record,
  }
}

function parseRuntimeSkills(payload: unknown): RuntimeSkillCandidate[] {
  const envelope = toRecord(payload)
  const result = envelope?.result ?? payload
  const root = toRecord(result)
  const parsed = new Map<string, RuntimeSkillCandidate>()

  const arrayCandidates = [
    root?.skills,
    root?.items,
    root?.list,
    root?.results,
    root?.data,
    root?.available,
  ]
  const directArray = arrayCandidates.find((candidate) => Array.isArray(candidate))
  if (Array.isArray(directArray)) {
    for (const item of directArray) {
      const normalized = parseRuntimeSkillItem(item)
      if (normalized) {
        parsed.set(normalized.key, normalized)
      }
    }
  }

  if (parsed.size > 0) {
    return Array.from(parsed.values())
  }

  const objectCandidates = [
    toRecord(root?.skills),
    toRecord(root?.items),
    toRecord(root?.data),
    toRecord(root?.result),
    root,
  ]
  const skillObject = objectCandidates.find((candidate) => Boolean(candidate)) ?? null
  if (!skillObject) {
    return []
  }

  for (const [key, value] of Object.entries(skillObject)) {
    const normalized = parseRuntimeSkillItem(value, key)
    if (normalized) {
      parsed.set(normalized.key, normalized)
    }
  }

  return Array.from(parsed.values())
}

function skillIdentityTokens(skill: RuntimeSkillCandidate): string[] {
  const raw = skill.raw
  const tokens = [
    skill.key,
    skill.name,
    readString(raw, ['id']),
    readString(raw, ['skillKey']),
    readString(raw, ['key']),
    readString(raw, ['name']),
    readString(raw, ['label']),
  ]
  return tokens
    .map((token) => token?.trim().toLowerCase() ?? '')
    .filter(Boolean)
}

function skillMatchesRequestedId(skill: RuntimeSkillCandidate, requestedSkillId: string): boolean {
  const requestTokens = new Set<string>([
    requestedSkillId.trim().toLowerCase(),
    normalizeToken(requestedSkillId),
  ])
  for (const token of skillIdentityTokens(skill)) {
    if (requestTokens.has(token) || requestTokens.has(normalizeToken(token))) {
      return true
    }
  }
  return false
}

function isRuntimeSkillInstalled(skill: RuntimeSkillCandidate): boolean {
  const raw = skill.raw
  const explicitInstalled = readBoolean(raw, ['installed', 'isInstalled'])
  if (explicitInstalled !== null) {
    return explicitInstalled
  }

  const status = readString(raw, ['status'])?.toLowerCase() ?? null
  if (status && ['installed', 'ready', 'available', 'ok'].includes(status)) {
    return true
  }

  const missing = toRecord(raw.missing)
  const missingBins = readStringArray(missing, 'bins')
  return missingBins.length === 0
}

function normalizeInstallOption(value: unknown): RuntimeInstallOption | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    const id = value.trim()
    return {
      id,
      label: `Install (${id})`,
    }
  }

  const record = toRecord(value)
  if (!record) {
    return null
  }

  const id = readString(record, ['id', 'installId', 'key', 'name'])
  if (!id) {
    return null
  }

  return {
    id,
    label: readString(record, ['label', 'title']) ?? `Install (${id})`,
  }
}

function extractInstallOptions(skill: RuntimeSkillCandidate): RuntimeInstallOption[] {
  const options: RuntimeInstallOption[] = []
  const raw = skill.raw
  const install = raw.install
  const installer = raw.installer

  if (Array.isArray(install)) {
    for (const item of install) {
      const normalized = normalizeInstallOption(item)
      if (normalized) {
        options.push(normalized)
      }
    }
  } else {
    const normalized = normalizeInstallOption(install)
    if (normalized) {
      options.push(normalized)
    }
  }

  if (Array.isArray(installer)) {
    for (const item of installer) {
      const normalized = normalizeInstallOption(item)
      if (normalized) {
        options.push(normalized)
      }
    }
  } else {
    const normalized = normalizeInstallOption(installer)
    if (normalized) {
      options.push(normalized)
    }
  }

  const directInstallId = readString(raw, ['installId'])
  if (directInstallId) {
    options.push({
      id: directInstallId,
      label: `Install (${directInstallId})`,
    })
  }

  const deduped = options.filter((option, index, collection) => (
    collection.findIndex((candidate) => candidate.id === option.id) === index
  ))

  if (deduped.length > 0) {
    return deduped
  }

  const staticInstallId = SKILL_INSTALL_STATIC_IDS[skill.key.trim().toLowerCase()]
  if (staticInstallId) {
    return [{
      id: staticInstallId,
      label: `Install (${staticInstallId})`,
    }]
  }

  return []
}

function scoreInstallOptionForLinux(option: RuntimeInstallOption): number {
  const normalized = `${option.id} ${option.label}`.toLowerCase()
  if (normalized.includes('apt') || normalized.includes('apt-get')) return 0
  if (normalized.includes('dnf')) return 1
  if (normalized.includes('yum')) return 2
  if (normalized.includes('pipx')) return 3
  if (normalized.includes('pip')) return 4
  if (normalized.includes('npm')) return 5
  if (normalized.includes('node')) return 6
  if (normalized.includes('npx')) return 7
  if (normalized.includes('brew')) return 99
  return 50
}

function pickInstallOption(options: RuntimeInstallOption[]): RuntimeInstallOption | null {
  if (options.length === 0) {
    return null
  }
  return [...options].sort((left, right) => (
    scoreInstallOptionForLinux(left) - scoreInstallOptionForLinux(right)
  ))[0] ?? null
}

function resolveSkillInstallName(skill: RuntimeSkillCandidate): string {
  return (
    readString(skill.raw, ['id']) ??
    readString(skill.raw, ['skillKey']) ??
    readString(skill.raw, ['key']) ??
    skill.key
  )
}

function extractInstallResultProblem(payload: unknown): string | null {
  const record = toRecord(payload)
  if (!record) {
    return null
  }
  const directError = readString(record, ['error', 'message', 'reason'])
  const status = readString(record, ['status'])?.toLowerCase() ?? null
  const ok = readBoolean(record, ['ok', 'success'])
  const nestedError = readString(toRecord(record.error), ['error', 'message', 'reason'])

  if (ok === false || (status !== null && ['failed', 'error', 'denied'].includes(status))) {
    return nestedError ?? directError ?? 'Skill installation failed.'
  }
  return null
}

function parseRuntimeNotReadyReason(payload: unknown): string | null {
  const record = toRecord(payload)
  const errorCode = readString(record, ['error'])?.toLowerCase() ?? ''
  const message = readString(record, ['message'])?.toLowerCase() ?? ''
  const combined = `${errorCode} ${message}`.trim()
  if (
    combined.includes('gateway_starting') ||
    combined.includes('bootstrapping') ||
    combined.includes('gateway_unavailable') ||
    combined.includes('gateway is still bootstrapping')
  ) {
    return 'RUNTIME_GATEWAY_BOOTSTRAPPING'
  }
  return null
}

async function installRequestedRuntimeSkills(input: {
  tenantId: string
  accessToken: string
  requestedSkillIds: string[]
}): Promise<DeferredTaskResult> {
  const requestedSkillIds = normalizeRequestedSkillIds(input.requestedSkillIds)
  if (requestedSkillIds.length === 0) {
    return {
      status: 'skipped',
      details: {
        reason: 'NO_SKILLS_REQUESTED',
      },
    }
  }

  const headers = {
    'x-tenant-id': input.tenantId,
    authorization: `Bearer ${input.accessToken}`,
  }

  const statusResponse = await backendRequest<unknown>({
    path: `/api/v1/daemons/${encodeURIComponent(input.tenantId)}/status`,
    headers,
  })
  if (statusResponse.status >= 400) {
    const notReadyReason = parseRuntimeNotReadyReason(statusResponse.data)
    if (notReadyReason) {
      return {
        status: 'skipped',
        error: notReadyReason,
      }
    }
    return {
      status: 'failed',
      error: `DAEMON_STATUS_HTTP_${statusResponse.status}`,
    }
  }

  const statusRecord = toRecord(statusResponse.data)
  const daemonRecord = toRecord(statusRecord?.daemon)
  const instanceRecord = toRecord(statusRecord?.instance)
  const gatewayProbeRecord = toRecord(instanceRecord?.gatewayProbe)
  const daemonStatus = readString(daemonRecord, ['status'])?.toUpperCase() ?? null
  const gatewayReady = readBoolean(gatewayProbeRecord, ['ready'])
  if (daemonStatus !== 'RUNNING' || gatewayReady === false) {
    return {
      status: 'skipped',
      error: 'RUNTIME_NOT_READY',
      details: {
        daemonStatus: daemonStatus ?? 'unknown',
        gatewayReady,
      },
    }
  }

  const skillsResponse = await backendRequest<unknown>({
    path: `/api/v1/daemons/${encodeURIComponent(input.tenantId)}/runtime/skills?syncRuntime=true`,
    headers,
  })
  if (skillsResponse.status >= 400) {
    const notReadyReason = parseRuntimeNotReadyReason(skillsResponse.data)
    if (notReadyReason) {
      return {
        status: 'skipped',
        error: notReadyReason,
      }
    }
    return {
      status: 'failed',
      error: `RUNTIME_SKILLS_HTTP_${skillsResponse.status}`,
    }
  }

  const runtimeSkills = parseRuntimeSkills(skillsResponse.data)
  if (runtimeSkills.length === 0) {
    return {
      status: 'skipped',
      error: 'SKILLS_NOT_AVAILABLE',
    }
  }

  const attempts: Array<Record<string, unknown>> = []
  let installedCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (const requestedSkillId of requestedSkillIds) {
    const matchedSkill = runtimeSkills.find((skill) => skillMatchesRequestedId(skill, requestedSkillId)) ?? null
    if (!matchedSkill) {
      skippedCount += 1
      attempts.push({
        requestedSkillId,
        status: 'skipped',
        reason: 'SKILL_NOT_FOUND',
      })
      continue
    }

    if (isRuntimeSkillInstalled(matchedSkill)) {
      skippedCount += 1
      attempts.push({
        requestedSkillId,
        matchedSkillKey: matchedSkill.key,
        status: 'skipped',
        reason: 'ALREADY_INSTALLED',
      })
      continue
    }

    const installOption = pickInstallOption(extractInstallOptions(matchedSkill))
    if (!installOption) {
      skippedCount += 1
      attempts.push({
        requestedSkillId,
        matchedSkillKey: matchedSkill.key,
        status: 'skipped',
        reason: 'NO_INSTALL_OPTION',
      })
      continue
    }

    const installResponse = await backendRequest<unknown>({
      path: `/api/v1/daemons/${encodeURIComponent(input.tenantId)}/runtime/skills/install`,
      method: 'POST',
      headers,
      body: {
        name: resolveSkillInstallName(matchedSkill),
        installId: installOption.id,
        timeoutMs: SKILL_INSTALL_TIMEOUT_MS,
      },
    })

    if (installResponse.status >= 400) {
      failedCount += 1
      attempts.push({
        requestedSkillId,
        matchedSkillKey: matchedSkill.key,
        status: 'failed',
        installId: installOption.id,
        error: `HTTP_${installResponse.status}`,
      })
      continue
    }

    const installPayload = toRecord(installResponse.data)
    const installResult = installPayload?.result ?? installResponse.data
    const installProblem = extractInstallResultProblem(installResult)
    if (installProblem) {
      failedCount += 1
      attempts.push({
        requestedSkillId,
        matchedSkillKey: matchedSkill.key,
        status: 'failed',
        installId: installOption.id,
        error: installProblem,
      })
      continue
    }

    installedCount += 1
    attempts.push({
      requestedSkillId,
      matchedSkillKey: matchedSkill.key,
      status: 'ok',
      installId: installOption.id,
    })
  }

  const status: DeferredTaskResult['status'] = failedCount > 0
    ? 'failed'
    : installedCount > 0
      ? 'ok'
      : 'skipped'

  return {
    status,
    error: failedCount > 0 ? 'PARTIAL_INSTALL_FAILURE' : undefined,
    details: {
      requestedCount: requestedSkillIds.length,
      installedCount,
      skippedCount,
      failedCount,
      attempts,
    },
  }
}

export async function POST(request: Request) {
  let body: z.infer<typeof RequestBodySchema>

  try {
    const raw = await request.json()
    const parsed = RequestBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    body = parsed.data
  } catch {
    return NextResponse.json(
      {
        error: 'INVALID_JSON',
      },
      { status: 400 },
    )
  }

  const accessToken = extractBearerToken(request.headers.get('authorization'))
  if (!accessToken) {
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Missing access token',
      },
      { status: 401 },
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        error: 'SERVER_MISCONFIGURED',
        message: 'Supabase environment variables are missing.',
      },
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired session token.',
      },
      { status: 401 },
    )
  }

  const tenantId = deriveTenantIdFromUserId(userData.user.id)
  if (body.tenantId !== tenantId) {
    return NextResponse.json(
      {
        error: 'TENANT_ACCESS_DENIED',
        message: 'Authenticated user cannot finalize onboarding for this tenant.',
      },
      { status: 403 },
    )
  }

  const internalToken = process.env.BACKEND_INTERNAL_API_TOKEN?.trim() || ''
  const usageEventsTask: Promise<DeferredTaskResult> = internalToken
    ? runDeferredTask(() => backendRequest({
        path: '/api/v1/internal/usage-events',
        method: 'POST',
        headers: {
          'x-internal-api-token': internalToken,
        },
        body: {
          tenantId,
          apiRequests: 5,
          daemonRuntimeMinutes: 5,
          egressGb: 0,
        },
      }))
    : Promise.resolve({
        status: 'skipped',
      } as DeferredTaskResult)

  const skillInstallsTask = installRequestedRuntimeSkills({
    tenantId,
    accessToken,
    requestedSkillIds: body.skillIds,
  })

  const [usageEvents, skillInstalls] = await Promise.all([
    usageEventsTask,
    skillInstallsTask,
  ])

  const shouldRetrySkillInstalls = skillInstalls.status === 'skipped'
    && (
      skillInstalls.error === 'RUNTIME_NOT_READY'
      || skillInstalls.error === 'RUNTIME_GATEWAY_BOOTSTRAPPING'
    )
  const complete = usageEvents.status !== 'failed' && !shouldRetrySkillInstalls

  return NextResponse.json({
    status: complete ? 'ok' : 'partial',
    complete,
    retryAfterMs: shouldRetrySkillInstalls ? 15_000 : null,
    tenantId,
    tasks: {
      usageEvents,
      skillInstalls,
    },
  })
}
