const DEFAULT_BACKEND_URL = 'http://localhost:4000'

interface RuntimeEnvelope<T = unknown> {
  result?: T
  [key: string]: unknown
}

export interface RuntimeSessionSummary {
  key: string
  label: string | null
  modelId: string | null
  updatedAt: string | null
  raw: Record<string, unknown>
}

export interface RuntimeSessionsData {
  sessions: RuntimeSessionSummary[]
  raw: unknown
}

export interface RuntimeSessionsListOptions {
  limit?: number
  includeGlobal?: boolean
  includeUnknown?: boolean
  includeDerivedTitles?: boolean
  includeLastMessage?: boolean
  label?: string
  spawnedBy?: string
  agentId?: string
  search?: string
}

export interface RuntimeChatHistoryMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string | null
  raw: Record<string, unknown>
}

export interface RuntimeChatHistoryData {
  messages: RuntimeChatHistoryMessage[]
  raw: unknown
}

export interface RuntimeModelSummary {
  id: string
  label: string
  providerId: string | null
  raw: Record<string, unknown>
}

export interface RuntimeModelsData {
  models: RuntimeModelSummary[]
  currentModelId: string | null
  raw: unknown
}

export interface RuntimeSkillSummary {
  key: string
  name: string
  enabled: boolean | null
  raw: Record<string, unknown>
}

export interface RuntimeSkillsData {
  skills: RuntimeSkillSummary[]
  raw: unknown
}

export interface RuntimeModelUpdatePayload {
  modelId: string
  modelProviderId?: string
  modelAuthMethod?: 'api-key' | 'oauth'
  modelApiKey?: string
  modelOauthConnected?: boolean
  sessionKey?: string
  persist?: boolean
}

export interface RuntimeSkillUpdatePayload {
  skillKey: string
  enabled?: boolean
  apiKey?: string
  env?: Record<string, string>
}

export interface RuntimeSkillInstallPayload {
  name: string
  installId: string
  timeoutMs?: number
}

export interface RuntimeWorkspaceHooksStatus {
  internalEnabled: boolean
  bootMdEnabled: boolean
  commandLoggerEnabled: boolean
  sessionMemoryEnabled: boolean
}

export interface RuntimeWorkspaceFilesStatus {
  memoryMdExists: boolean
  bootMdExists: boolean
  agentsMdExists: boolean
}

export interface RuntimeWorkspaceHealthData {
  workspaceDir: string | null
  memoryDir: string | null
  memoryDirExists: boolean
  hooks: RuntimeWorkspaceHooksStatus
  files: RuntimeWorkspaceFilesStatus
  repaired: boolean
  raw: unknown
}

export interface RuntimeWorkspaceTemplateCreatePayload {
  template: 'memory-md' | 'boot-md' | 'daily-memory'
  overwrite?: boolean
}

export interface RuntimeWorkspaceFilesData {
  workspaceDir: string | null
  files: string[]
  raw: unknown
}

export interface RuntimeWorkspaceFileData {
  relativePath: string
  exists: boolean
  content: string
  raw: unknown
}

export interface RuntimeWorkspaceFileUpsertPayload {
  relativePath: string
  content: string
  overwrite?: boolean
}

export interface RuntimeWorkspaceDeleteFilePayload {
  relativePath: string
}

export interface RuntimeChannelSessionMapping {
  tenantId: string
  channelId: string
  channelThreadKey: string
  sessionKey: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, string>
}

export interface RuntimeChannelEvent {
  eventId: string
  tenantId: string
  channelId: string
  channelThreadKey: string
  direction: 'inbound' | 'outbound'
  sessionKey: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: Record<string, string>
}

export interface RuntimeChannelsStatusData {
  channels: Record<string, Record<string, unknown>>
  channelAccounts: Record<string, Array<Record<string, unknown>>>
  channelOrder: string[]
  channelLabels: Record<string, string>
  raw: unknown
}

export interface RuntimeWhatsAppLoginData {
  message: string | null
  qrDataUrl: string | null
  connected: boolean | null
  raw: unknown
}

export interface RuntimeWhatsAppConnectPayload {
  accountId?: string
  phoneMode?: 'personal' | 'dedicated'
  ownerPhone?: string
  dmPolicy?: 'pairing' | 'allowlist' | 'open' | 'disabled'
  allowFrom?: string[]
  selfChatMode?: boolean
}

export interface RuntimeTelegramConnectPayload {
  botToken: string
  accountId?: string
  dmPolicy?: 'pairing' | 'open'
  streamMode?: 'off' | 'partial' | 'block'
}

export const DEFAULT_CHAT_SESSION_KEY = 'agent:main:main'

function getBackendUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_API_URL ?? DEFAULT_BACKEND_URL
}

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function readBoolean(record: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'true' || normalized === '1' || normalized === 'enabled') return true
      if (normalized === 'false' || normalized === '0' || normalized === 'disabled') return false
    }
  }
  return null
}

function extractArrayCandidates(result: unknown, keys: string[]): unknown[] {
  if (Array.isArray(result)) {
    return result
  }

  const objectValue = toObject(result)
  if (!objectValue) {
    return []
  }

  for (const key of keys) {
    const value = objectValue[key]
    if (Array.isArray(value)) {
      return value
    }
  }

  return []
}

function isValidRuntimeSessionKey(value: string): boolean {
  return /^[a-zA-Z0-9:_-]{1,160}$/.test(value)
}

function isUserFacingRuntimeSessionKey(value: string): boolean {
  return isValidRuntimeSessionKey(value) && value.startsWith('agent:main:')
}

function parseSessionItem(item: unknown, keyFallback?: string): RuntimeSessionSummary | null {
  if (typeof item === 'string' && item.trim()) {
    const key = item.trim()
    if (!isUserFacingRuntimeSessionKey(key)) {
      return null
    }
    return {
      key,
      label: null,
      modelId: null,
      updatedAt: null,
      raw: { key },
    }
  }

  const record = toObject(item)
  if (!record) return null

  const key =
    readString(record, ['key', 'sessionKey', 'id']) ??
    (keyFallback && keyFallback.trim() ? keyFallback.trim() : null)
  if (!key) return null
  const normalizedKey = key.trim()
  if (!isUserFacingRuntimeSessionKey(normalizedKey)) {
    return null
  }

  return {
    key: normalizedKey,
    label: readString(record, ['label', 'title', 'name']),
    modelId: readString(record, ['model', 'modelId']),
    updatedAt: readString(record, ['updatedAt', 'lastUsedAt', 'createdAt']),
    raw: record,
  }
}

function dedupeByKey<T extends { key: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.key)) {
      return false
    }
    seen.add(item.key)
    return true
  })
}

function parseSessions(result: unknown): RuntimeSessionsData {
  const parsed: RuntimeSessionSummary[] = []

  const arrayItems = extractArrayCandidates(result, ['sessions', 'items', 'list', 'results', 'data'])
  for (const item of arrayItems) {
    const normalized = parseSessionItem(item)
    if (normalized) parsed.push(normalized)
  }

  const objectValue = toObject(result)
  if (parsed.length === 0 && objectValue) {
    const fallbackCollection =
      toObject(objectValue.sessions) ??
      toObject(objectValue.items) ??
      toObject(objectValue.data) ??
      (
        Object.keys(objectValue).length > 0 &&
        Object.keys(objectValue).every((key) => isUserFacingRuntimeSessionKey(key.trim()))
          ? objectValue
          : null
      )

    if (fallbackCollection) {
      for (const [key, value] of Object.entries(fallbackCollection)) {
        const normalized = parseSessionItem(value, key)
        if (normalized) parsed.push(normalized)
      }
    }
  }

  return {
    sessions: dedupeByKey(parsed),
    raw: result,
  }
}

function parseChatHistoryMessage(item: unknown): RuntimeChatHistoryMessage | null {
  const record = toObject(item)
  if (!record) {
    return null
  }

  const roleValue = readString(record, ['role', 'type'])?.toLowerCase()
  if (roleValue !== 'user' && roleValue !== 'assistant' && roleValue !== 'system') {
    return null
  }

  const directContent = readString(record, ['content', 'text'])
  const nestedMessage = toObject(record.message)
  const nestedContent = nestedMessage ? readString(nestedMessage, ['content', 'text']) : null
  const content = directContent ?? nestedContent
  if (!content) {
    return null
  }

  return {
    role: roleValue,
    content,
    timestamp: readString(record, ['timestamp', 'createdAt', 'updatedAt', 'time']),
    raw: record,
  }
}

function parseChatHistory(result: unknown): RuntimeChatHistoryData {
  const parsed: RuntimeChatHistoryMessage[] = []

  const arrayItems = extractArrayCandidates(result, ['messages', 'items', 'history', 'events', 'data'])
  for (const item of arrayItems) {
    const normalized = parseChatHistoryMessage(item)
    if (normalized) {
      parsed.push(normalized)
    }
  }

  const objectValue = toObject(result)
  if (parsed.length === 0 && objectValue) {
    const fallbackCollection =
      toObject(objectValue.messages) ??
      toObject(objectValue.items) ??
      toObject(objectValue.data) ??
      objectValue

    for (const value of Object.values(fallbackCollection)) {
      const normalized = parseChatHistoryMessage(value)
      if (normalized) {
        parsed.push(normalized)
      }
    }
  }

  return {
    messages: parsed,
    raw: result,
  }
}

function parseModelItem(item: unknown): RuntimeModelSummary | null {
  if (typeof item === 'string' && item.trim()) {
    return {
      id: item.trim(),
      label: item.trim(),
      providerId: inferProviderFromModelId(item.trim()),
      raw: { id: item.trim() },
    }
  }

  const record = toObject(item)
  if (!record) return null

  const id = readString(record, ['id', 'modelId', 'model', 'name'])
  if (!id) return null

  return {
    id,
    label: readString(record, ['label', 'displayName', 'name']) ?? id,
    providerId: readString(record, ['providerId', 'provider']) ?? inferProviderFromModelId(id),
    raw: record,
  }
}

function dedupeModels(items: RuntimeModelSummary[]): RuntimeModelSummary[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false
    }
    seen.add(item.id)
    return true
  })
}

function parseCurrentModelId(result: unknown): string | null {
  if (typeof result === 'string' && result.trim()) {
    return result.trim()
  }

  const objectValue = toObject(result)
  if (!objectValue) {
    return null
  }

  const direct = readString(objectValue, ['currentModelId', 'currentModel', 'activeModel'])
  if (direct) {
    return direct
  }

  const nested = toObject(objectValue.current) ?? toObject(objectValue.active) ?? toObject(objectValue.selected)
  if (!nested) {
    return null
  }

  return readString(nested, ['id', 'modelId', 'model'])
}

function parseModels(result: unknown): RuntimeModelsData {
  const arrayItems = extractArrayCandidates(result, ['models', 'items', 'list', 'available', 'data'])
  const parsed = arrayItems
    .map((item) => parseModelItem(item))
    .filter((item): item is RuntimeModelSummary => Boolean(item))

  const objectValue = toObject(result)
  if (parsed.length === 0 && objectValue) {
    const fallbackCollection =
      toObject(objectValue.models) ??
      toObject(objectValue.items) ??
      toObject(objectValue.data) ??
      objectValue

    for (const [key, value] of Object.entries(fallbackCollection)) {
      const normalized =
        parseModelItem(value) ??
        (typeof key === 'string' && key.trim()
          ? parseModelItem(key)
          : null)
      if (normalized) parsed.push(normalized)
    }
  }

  return {
    models: dedupeModels(parsed),
    currentModelId: parseCurrentModelId(result),
    raw: result,
  }
}

function parseSkillItem(item: unknown, keyFallback?: string): RuntimeSkillSummary | null {
  if (typeof item === 'string' && item.trim()) {
    return {
      key: item.trim(),
      name: item.trim(),
      enabled: null,
      raw: { key: item.trim() },
    }
  }

  const record = toObject(item)
  if (!record) return null

  const key =
    readString(record, ['skillKey', 'key', 'id', 'name']) ??
    (keyFallback && keyFallback.trim() ? keyFallback.trim() : null)
  if (!key) return null

  return {
    key,
    name: readString(record, ['label', 'title', 'displayName', 'name']) ?? key,
    enabled: readBoolean(record, ['enabled', 'active']),
    raw: record,
  }
}

function parseSkills(result: unknown): RuntimeSkillsData {
  const parsed: RuntimeSkillSummary[] = []

  const arrayItems = extractArrayCandidates(result, ['skills', 'items', 'list', 'results', 'data'])
  for (const item of arrayItems) {
    const normalized = parseSkillItem(item)
    if (normalized) parsed.push(normalized)
  }

  const objectValue = toObject(result)
  if (parsed.length === 0 && objectValue) {
    const skillObject =
      toObject(objectValue.skills) ??
      toObject(objectValue.items) ??
      toObject(objectValue.data) ??
      objectValue
    for (const [key, value] of Object.entries(skillObject)) {
      const normalized = parseSkillItem(value, key)
      if (normalized) parsed.push(normalized)
    }
  }

  return {
    skills: dedupeByKey(parsed),
    raw: result,
  }
}

function parseChannelsStatus(result: unknown): RuntimeChannelsStatusData {
  const root = toObject(result)
  const rawChannels = toObject(root?.channels) ?? {}
  const channels: Record<string, Record<string, unknown>> = {}
  const rawAccounts = toObject(root?.channelAccounts) ?? {}
  const rawLabels = toObject(root?.channelLabels) ?? {}
  const channelAccounts: Record<string, Array<Record<string, unknown>>> = {}
  const channelLabels: Record<string, string> = {}

  for (const [channelId, value] of Object.entries(rawChannels)) {
    const channel = toObject(value)
    if (channel) {
      channels[channelId] = channel
    }
  }

  for (const [channelId, accountList] of Object.entries(rawAccounts)) {
    if (!Array.isArray(accountList)) {
      continue
    }
    channelAccounts[channelId] = accountList
      .map((account) => toObject(account))
      .filter((account): account is Record<string, unknown> => Boolean(account))
  }

  for (const [channelId, label] of Object.entries(rawLabels)) {
    if (typeof label === 'string' && label.trim()) {
      channelLabels[channelId] = label.trim()
    }
  }

  const channelOrder = Array.isArray(root?.channelOrder)
    ? root!.channelOrder
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
    : Object.keys(channels)

  return {
    channels,
    channelAccounts,
    channelOrder,
    channelLabels,
    raw: result,
  }
}

function parseWorkspaceHealth(result: unknown): RuntimeWorkspaceHealthData {
  const root = toObject(result)
  const hooks = toObject(root?.hooks)
  const files = toObject(root?.files)
  return {
    workspaceDir: typeof root?.workspaceDir === 'string' ? root.workspaceDir : null,
    memoryDir: typeof root?.memoryDir === 'string' ? root.memoryDir : null,
    memoryDirExists: Boolean(root?.memoryDirExists),
    hooks: {
      internalEnabled: Boolean(hooks?.internalEnabled),
      bootMdEnabled: Boolean(hooks?.bootMdEnabled),
      commandLoggerEnabled: Boolean(hooks?.commandLoggerEnabled),
      sessionMemoryEnabled: Boolean(hooks?.sessionMemoryEnabled),
    },
    files: {
      memoryMdExists: Boolean(files?.memoryMdExists),
      bootMdExists: Boolean(files?.bootMdExists),
      agentsMdExists: Boolean(files?.agentsMdExists),
    },
    repaired: Boolean(root?.repaired),
    raw: result,
  }
}

function parseWorkspaceFiles(result: unknown): RuntimeWorkspaceFilesData {
  const root = toObject(result)
  const files = Array.isArray(root?.files)
    ? root.files
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
    : []
  return {
    workspaceDir: typeof root?.workspaceDir === 'string' ? root.workspaceDir : null,
    files,
    raw: result,
  }
}

function parseWorkspaceFile(result: unknown): RuntimeWorkspaceFileData {
  const root = toObject(result)
  const relativePath = (
    (typeof root?.relativePath === 'string' ? root.relativePath : null) ??
    (typeof root?.path === 'string' ? root.path : null) ??
    ''
  )
  const content = typeof root?.content === 'string' ? root.content : ''
  const exists = typeof root?.exists === 'boolean' ? root.exists : Boolean(content)
  return {
    relativePath: relativePath.trim(),
    exists,
    content,
    raw: result,
  }
}

function parseWhatsAppLogin(result: unknown): RuntimeWhatsAppLoginData {
  const record = toObject(result)
  const connectedValue = record?.connected
  const connected = typeof connectedValue === 'boolean' ? connectedValue : null
  const qrDataUrl = readString(record ?? {}, ['qrDataUrl'])
  const message = readString(record ?? {}, ['message', 'status']) ?? null

  return {
    message,
    qrDataUrl,
    connected,
    raw: result,
  }
}

function inferProviderFromModelId(modelId: string): string | null {
  const normalized = modelId.trim()
  if (!normalized) return null
  const slashIndex = normalized.indexOf('/')
  if (slashIndex <= 0) return null
  return normalized.slice(0, slashIndex)
}

function extractErrorMessage(payload: unknown, fallbackStatus: number): string {
  const objectValue = toObject(payload)
  if (!objectValue) {
    return `Request failed (${fallbackStatus})`
  }

  const code = typeof objectValue.error === 'string' ? objectValue.error.trim() : ''
  const message = typeof objectValue.message === 'string' ? objectValue.message.trim() : ''

  if (message && code && code !== message) {
    return `${message} (${code})`
  }
  if (message) {
    return message
  }
  if (code) {
    return code
  }

  return `Request failed (${fallbackStatus})`
}

class RuntimeRequestError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, payload: unknown) {
    super(extractErrorMessage(payload, status))
    this.name = 'RuntimeRequestError'
    this.status = status
    this.payload = payload
  }
}

async function runtimeRequest<T>(
  tenantId: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const backendUrl = getBackendUrl()
  const response = await fetch(`${backendUrl}/api/v1/daemons/${encodeURIComponent(tenantId)}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': tenantId,
      ...(init.headers ?? {}),
    },
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new RuntimeRequestError(response.status, payload)
  }

  return payload as T
}

export async function listRuntimeSessions(
  tenantId: string,
  options?: RuntimeSessionsListOptions,
): Promise<RuntimeSessionsData> {
  const query = new URLSearchParams()
  if (options?.limit !== undefined) query.set('limit', String(options.limit))
  if (options?.includeGlobal !== undefined) query.set('includeGlobal', String(options.includeGlobal))
  if (options?.includeUnknown !== undefined) query.set('includeUnknown', String(options.includeUnknown))
  if (options?.includeDerivedTitles !== undefined) query.set('includeDerivedTitles', String(options.includeDerivedTitles))
  if (options?.includeLastMessage !== undefined) query.set('includeLastMessage', String(options.includeLastMessage))
  if (options?.label) query.set('label', options.label)
  if (options?.spawnedBy) query.set('spawnedBy', options.spawnedBy)
  if (options?.agentId) query.set('agentId', options.agentId)
  if (options?.search) query.set('search', options.search)
  const queryString = query.toString()
  const path = queryString
    ? `/runtime/sessions?${queryString}`
    : '/runtime/sessions'
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, path)
  return parseSessions(payload.result)
}

export async function listRuntimeChatHistory(
  tenantId: string,
  sessionKey: string,
  limit = 200,
): Promise<RuntimeChatHistoryData> {
  const query = new URLSearchParams({
    sessionKey,
    limit: String(limit),
  })
  try {
    const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, `/runtime/chat/history?${query.toString()}`)
    return parseChatHistory(payload.result)
  } catch (error) {
    const status = error instanceof RuntimeRequestError ? error.status : null
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (
      status === 404 ||
      status === 400 ||
      message.includes('not found') ||
      message.includes('gateway_invalid_request') ||
      message.includes('invalid_request') ||
      message.includes('(404)') ||
      message.includes('daemon_not_found') ||
      message.includes('gateway_unavailable')
    ) {
      return {
        messages: [],
        raw: null,
      }
    }
    return {
      messages: [],
      raw: null,
    }
  }
}

export async function patchRuntimeSession(
  tenantId: string,
  params: Record<string, unknown>,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/sessions', {
    method: 'PATCH',
    body: JSON.stringify(params),
  })
}

export async function resetRuntimeSession(
  tenantId: string,
  key: string,
  reason: 'new' | 'reset' = 'reset',
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/sessions/reset', {
    method: 'POST',
    body: JSON.stringify({ key, reason }),
  })
}

export async function deleteRuntimeSession(
  tenantId: string,
  key: string,
  deleteTranscript = false,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/sessions/delete', {
    method: 'POST',
    body: JSON.stringify({ key, deleteTranscript }),
  })
}

export async function listRuntimeModels(tenantId: string): Promise<RuntimeModelsData> {
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/models')
  return parseModels(payload.result)
}

export async function updateRuntimeCurrentModel(
  tenantId: string,
  payload: RuntimeModelUpdatePayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/models/current', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function listRuntimeSkills(tenantId: string): Promise<RuntimeSkillsData> {
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/skills')
  return parseSkills(payload.result)
}

export async function listRuntimeChannelsStatus(
  tenantId: string,
  options?: {
    probe?: boolean
    timeoutMs?: number
  },
): Promise<RuntimeChannelsStatusData> {
  const query = new URLSearchParams()
  if (options?.probe !== undefined) query.set('probe', String(options.probe))
  if (options?.timeoutMs) query.set('timeoutMs', String(options.timeoutMs))
  const queryString = query.toString()
  const path = queryString
    ? `/runtime/channels/status?${queryString}`
    : '/runtime/channels/status'
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, path)
  return parseChannelsStatus(payload.result)
}

export async function startRuntimeWhatsAppLogin(
  tenantId: string,
  options?: {
    force?: boolean
    timeoutMs?: number
    accountId?: string
  },
): Promise<RuntimeWhatsAppLoginData> {
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/channels/whatsapp/login/start', {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  })
  return parseWhatsAppLogin(payload.result)
}

export async function connectRuntimeWhatsApp(
  tenantId: string,
  payload: RuntimeWhatsAppConnectPayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/channels/whatsapp/connect', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function waitRuntimeWhatsAppLogin(
  tenantId: string,
  options?: {
    timeoutMs?: number
    accountId?: string
  },
): Promise<RuntimeWhatsAppLoginData> {
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/channels/whatsapp/login/wait', {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  })
  return parseWhatsAppLogin(payload.result)
}

export async function logoutRuntimeChannel(
  tenantId: string,
  payload: {
    channelId: 'whatsapp' | 'telegram'
    accountId?: string
  },
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/channels/logout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function connectRuntimeTelegram(
  tenantId: string,
  payload: RuntimeTelegramConnectPayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/channels/telegram/connect', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function installRuntimeSkill(
  tenantId: string,
  payload: RuntimeSkillInstallPayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/skills/install', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateRuntimeSkill(
  tenantId: string,
  payload: RuntimeSkillUpdatePayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/skills', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function listRuntimeWorkspaceHealth(tenantId: string): Promise<RuntimeWorkspaceHealthData> {
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/workspace/health')
  return parseWorkspaceHealth(payload.result)
}

export async function listRuntimeWorkspaceFiles(
  tenantId: string,
  options?: {
    includeHidden?: boolean
  },
): Promise<RuntimeWorkspaceFilesData> {
  const query = new URLSearchParams()
  if (options?.includeHidden !== undefined) query.set('includeHidden', String(options.includeHidden))
  const queryString = query.toString()
  const path = queryString
    ? `/runtime/workspace/files?${queryString}`
    : '/runtime/workspace/files'
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, path)
  return parseWorkspaceFiles(payload.result)
}

export async function readRuntimeWorkspaceFile(
  tenantId: string,
  relativePath: string,
): Promise<RuntimeWorkspaceFileData> {
  const query = new URLSearchParams({ relativePath })
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, `/runtime/workspace/file?${query.toString()}`)
  return parseWorkspaceFile(payload.result)
}

export async function repairRuntimeWorkspaceEssentials(tenantId: string): Promise<RuntimeWorkspaceHealthData> {
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/workspace/repair', {
    method: 'POST',
  })
  return parseWorkspaceHealth(payload.result)
}

export async function createRuntimeWorkspaceTemplate(
  tenantId: string,
  payload: RuntimeWorkspaceTemplateCreatePayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/workspace/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function upsertRuntimeWorkspaceFile(
  tenantId: string,
  payload: RuntimeWorkspaceFileUpsertPayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/workspace/files', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteRuntimeWorkspaceFile(
  tenantId: string,
  payload: RuntimeWorkspaceDeleteFilePayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/workspace/files', {
    method: 'DELETE',
    body: JSON.stringify(payload),
  })
}

export async function listRuntimeChannelSessionMappings(
  tenantId: string,
  options?: {
    channelId?: string
    sessionKey?: string
    limit?: number
  },
): Promise<RuntimeChannelSessionMapping[]> {
  const query = new URLSearchParams()
  if (options?.channelId) query.set('channelId', options.channelId)
  if (options?.sessionKey) query.set('sessionKey', options.sessionKey)
  if (options?.limit) query.set('limit', String(options.limit))
  const queryString = query.toString()
  const path = queryString
    ? `/runtime/channel-session-mappings?${queryString}`
    : '/runtime/channel-session-mappings'
  const payload = await runtimeRequest<RuntimeEnvelope<RuntimeChannelSessionMapping[]>>(tenantId, path)
  return Array.isArray(payload.result) ? payload.result : []
}

export async function upsertRuntimeChannelSessionMapping(
  tenantId: string,
  payload: {
    channelId: string
    channelThreadKey: string
    sessionKey: string
    metadata?: Record<string, string>
  },
): Promise<RuntimeChannelSessionMapping | null> {
  const response = await runtimeRequest<RuntimeEnvelope<RuntimeChannelSessionMapping>>(
    tenantId,
    '/runtime/channel-session-mappings',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )
  return response.result ?? null
}

export async function listRuntimeChannelEvents(
  tenantId: string,
  options?: {
    channelId?: string
    channelThreadKey?: string
    sessionKey?: string
    direction?: 'inbound' | 'outbound'
    since?: string
    limit?: number
  },
): Promise<RuntimeChannelEvent[]> {
  const query = new URLSearchParams()
  if (options?.channelId) query.set('channelId', options.channelId)
  if (options?.channelThreadKey) query.set('channelThreadKey', options.channelThreadKey)
  if (options?.sessionKey) query.set('sessionKey', options.sessionKey)
  if (options?.direction) query.set('direction', options.direction)
  if (options?.since) query.set('since', options.since)
  if (options?.limit) query.set('limit', String(options.limit))
  const queryString = query.toString()
  const path = queryString
    ? `/runtime/channel-events?${queryString}`
    : '/runtime/channel-events'
  const payload = await runtimeRequest<RuntimeEnvelope<RuntimeChannelEvent[]>>(tenantId, path)
  return Array.isArray(payload.result) ? payload.result : []
}

export function getChatSessionStorageKey(tenantId: string): string {
  return `clawpilot:chat-session-key:${tenantId}`
}

export function readStoredChatSessionKey(tenantId: string): string | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(getChatSessionStorageKey(tenantId))
  if (!value) return null
  const normalized = value.trim()
  return normalized || null
}

export function writeStoredChatSessionKey(tenantId: string, sessionKey: string) {
  if (typeof window === 'undefined') return
  const normalized = sessionKey.trim()
  if (!normalized) return
  window.localStorage.setItem(getChatSessionStorageKey(tenantId), normalized)
}

export function clearStoredChatSessionKey(tenantId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(getChatSessionStorageKey(tenantId))
}
