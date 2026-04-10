import { buildTenantAuthHeaders } from '@/lib/backend-auth'

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
  syncRuntime?: boolean
}

export interface RuntimeAgentSummary {
  id: string
  name: string
  enabled: boolean
  raw: Record<string, unknown>
}

export interface RuntimeAgentsData {
  agents: RuntimeAgentSummary[]
  raw: unknown
}

export interface RuntimeChatHistoryMessage {
  id: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string | null
  toolEvent: RuntimeToolEvent | null
  raw: Record<string, unknown>
}

export interface RuntimeChatHistoryData {
  messages: RuntimeChatHistoryMessage[]
  raw: unknown
}

export type RuntimeToolEventKind = 'tool' | 'exec' | 'process'

export interface RuntimeToolEvent {
  kind: RuntimeToolEventKind
  title: string
  summary: string
  toolName: string | null
  command: string | null
  status: string | null
  pid: string | null
  error: string | null
  output: string | null
  raw: Record<string, unknown>
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
  storedModelConfig: {
    modelProviderId: string | null
    modelId: string | null
    modelAuthMethod: 'api-key' | 'oauth' | null
    modelOauthConnected: boolean | null
  } | null
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

export interface RuntimeOpenAICodexOAuthStartPayload {
  modelId?: string
}

export interface RuntimeOpenAICodexOAuthStartData {
  sessionId: string
  authUrl: string
  expiresAt: string | null
  raw: unknown
}

export interface RuntimeOpenAICodexOAuthCompletePayload {
  sessionId: string
  callback: string
  modelId?: string
}

export interface RuntimeOpenAICodexOAuthCompleteData {
  providerId: string | null
  profileId: string | null
  modelId: string | null
  oauthConnected: boolean
  raw: unknown
}

export interface RuntimeModelUpdateData {
  modelProviderId: string | null
  modelId: string | null
  modelAuthMethod: 'api-key' | 'oauth' | null
  modelOauthConnected: boolean | null
  persisted: boolean
  raw: unknown
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
  bootstrapExtraFilesEnabled: boolean
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
  permanent?: boolean
}

export interface RuntimeWorkspaceTrashFileSummary {
  trashPath: string
  relativePath: string
  absolutePath: string | null
  deletedAt: string | null
  raw: Record<string, unknown>
}

export interface RuntimeWorkspaceTrashData {
  trashDir: string | null
  files: RuntimeWorkspaceTrashFileSummary[]
  raw: unknown
}

export interface RuntimeWorkspaceTrashRestorePayload {
  trashPath: string
  overwrite?: boolean
}

export interface RuntimeOpenClawResetPayload {
  scope: 'config' | 'config+creds+sessions' | 'full'
  dryRun?: boolean
}

export interface RuntimeWorkspaceFileVersionSummary {
  versionId: string
  createdAt: string | null
  path: string | null
  sizeBytes: number | null
  raw: Record<string, unknown>
}

export interface RuntimeWorkspaceFileVersionsData {
  relativePath: string
  versionsDir: string | null
  versions: RuntimeWorkspaceFileVersionSummary[]
  raw: unknown
}

export interface RuntimeWorkspaceFileVersionRestorePayload {
  relativePath: string
  versionId: string
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

export function getBackendUrl() {
  const raw = process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_URL ?? DEFAULT_BACKEND_URL
  if (raw && !/^https?:\/\//i.test(raw)) {
    return `https://${raw}`
  }
  return raw
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

const RUNTIME_NESTED_RESULT_KEYS = ['result', 'data', 'payload'] as const

function extractObjectCandidate(
  result: unknown,
  keys: string[],
): Record<string, unknown> | null {
  const queue: unknown[] = [result]
  const visited = new Set<Record<string, unknown>>()
  let fallback: Record<string, unknown> | null = null

  for (let index = 0; index < queue.length && index < 30; index += 1) {
    const objectValue = toObject(queue[index])
    if (!objectValue || visited.has(objectValue)) {
      continue
    }

    visited.add(objectValue)
    fallback = objectValue

    if (keys.some((key) => Object.prototype.hasOwnProperty.call(objectValue, key))) {
      return objectValue
    }

    for (const nestedKey of RUNTIME_NESTED_RESULT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(objectValue, nestedKey)) {
        queue.push(objectValue[nestedKey])
      }
    }
  }

  return fallback
}

function extractArrayCandidates(result: unknown, keys: string[]): unknown[] {
  const queue: unknown[] = [result]
  const visited = new Set<Record<string, unknown>>()

  for (let index = 0; index < queue.length && index < 30; index += 1) {
    const value = queue[index]
    if (Array.isArray(value)) {
      return value
    }

    const objectValue = toObject(value)
    if (!objectValue || visited.has(objectValue)) {
      continue
    }
    visited.add(objectValue)

    for (const key of keys) {
      const arrayValue = objectValue[key]
      if (Array.isArray(arrayValue)) {
        return arrayValue
      }
    }

    for (const nestedKey of RUNTIME_NESTED_RESULT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(objectValue, nestedKey)) {
        queue.push(objectValue[nestedKey])
      }
    }
  }

  return []
}

function isValidRuntimeSessionKey(value: string): boolean {
  return /^[a-zA-Z0-9:_-]{1,160}$/.test(value)
}

function isUserFacingRuntimeSessionKey(value: string): boolean {
  return isValidRuntimeSessionKey(value)
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
    const hasStructuredSessionContainer = ['sessions', 'items', 'data', 'list', 'results'].some((key) =>
      Object.prototype.hasOwnProperty.call(objectValue, key),
    )
    const fallbackCollection =
      toObject(objectValue.sessions) ??
      toObject(objectValue.items) ??
      toObject(objectValue.data) ??
      (
        !hasStructuredSessionContainer &&
        Object.keys(objectValue).length > 0 &&
        Object.keys(objectValue).some((key) => isUserFacingRuntimeSessionKey(key.trim()))
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

  const toolEvent = extractToolLikeHistoryEvent(record)
  const roleValue = normalizeHistoryMessageRole(readString(record, ['role', 'type'])?.toLowerCase() ?? null)
  const resolvedRole = roleValue ?? (toolEvent ? 'system' : null)
  if (!resolvedRole) {
    return null
  }

  const content = toolEvent?.summary ?? extractHistoryMessageContent(record)
  if (!content) {
    return null
  }

  return {
    id: extractHistoryMessageId(record),
    role: toolEvent ? 'system' : resolvedRole,
    content,
    timestamp: readString(record, ['timestamp', 'createdAt', 'updatedAt', 'time']),
    toolEvent,
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

function normalizeHistoryMessageRole(
  value: string | null,
): RuntimeChatHistoryMessage['role'] | null {
  if (!value) {
    return null
  }
  if (value === 'user' || value === 'assistant' || value === 'system') {
    return value
  }
  if (value === 'tool' || value === 'function' || value === 'event' || value === 'observation') {
    return 'system'
  }
  return null
}

function extractHistoryMessageId(record: Record<string, unknown>): string | null {
  const direct = readString(record, [
    'id',
    'messageId',
    'message_id',
    'eventId',
    'event_id',
    'requestId',
    'request_id',
    'uuid',
  ])
  if (direct) {
    return direct
  }

  const nestedCandidates = [
    toObject(record.message),
    toObject(record.payload),
    toObject(record.data),
    toObject(record.result),
  ]
  for (const candidate of nestedCandidates) {
    if (!candidate) {
      continue
    }
    const nested = readString(candidate, [
      'id',
      'messageId',
      'message_id',
      'eventId',
      'event_id',
      'requestId',
      'request_id',
      'uuid',
    ])
    if (nested) {
      return nested
    }
  }

  return null
}

function truncateToolTitleValue(value: string, maxLength = 80): string {
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`
}

function extractToolTextFromUnknown(value: unknown, depth = 0): string | null {
  if (depth > 5 || value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && depth < 4) {
      try {
        const parsed = JSON.parse(trimmed)
        const nested = extractToolTextFromUnknown(parsed, depth + 1)
        if (nested) {
          return nested
        }
      } catch {
        // Fall through.
      }
    }
    return trimmed
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractToolTextFromUnknown(item, depth + 1))
      .filter((item): item is string => Boolean(item))
    if (parts.length === 0) {
      return null
    }
    return parts.join('\n').trim()
  }

  const record = toObject(value)
  if (!record) {
    return null
  }

  const direct = readString(record, ['text', 'content', 'message', 'error', 'output', 'result', 'stdout', 'stderr'])
  if (direct) {
    return direct
  }

  for (const key of ['content', 'text', 'message', 'error', 'output', 'result', 'stdout', 'stderr', 'details', 'data', 'payload']) {
    const nested = extractToolTextFromUnknown(record[key], depth + 1)
    if (nested) {
      return nested
    }
  }

  return null
}

function extractToolLikeHistoryEvent(record: Record<string, unknown>): RuntimeToolEvent | null {
  const rawRole = readString(record, ['role', 'type'])?.toLowerCase() ?? null
  const processRecord = toObject(record.process)
  const toolName = readString(record, ['tool', 'toolName', 'name'])
  const processName =
    readString(record, ['processName']) ??
    (typeof record.process === 'string' && record.process.trim() ? record.process.trim() : null) ??
    (processRecord ? readString(processRecord, ['name', 'label']) : null)
  const command = readString(record, ['command', 'cmd'])
  const status = readString(record, ['status', 'state'])
  const pid = readString(record, ['pid', 'processId']) ?? (processRecord ? readString(processRecord, ['pid', 'id']) : null)
  const error =
    readString(record, ['error']) ??
    extractToolTextFromUnknown(record.error) ??
    (
      status && /(error|failed|timeout|denied|rejected|unavailable)/i.test(status)
        ? (readString(record, ['message', 'reason']) ?? extractToolTextFromUnknown(record.message))
        : null
    )

  const outputCandidates = [record.output, record.result, record.stdout, record.stderr, record.details]
  let output: string | null = null
  for (const candidate of outputCandidates) {
    const extracted = extractToolTextFromUnknown(candidate)
    if (extracted) {
      output = extracted
      break
    }
  }

  const hasToolSignal =
    rawRole === 'tool'
    || rawRole === 'function'
    || rawRole === 'event'
    || rawRole === 'observation'
    || Boolean(toolName || processName || command || pid || error || output)

  if (!hasToolSignal) {
    return null
  }

  let kind: RuntimeToolEventKind = 'tool'
  if (command) {
    kind = 'exec'
  } else if (processName || pid || rawRole === 'process') {
    kind = 'process'
  }

  let title = 'Tool event'
  if (kind === 'exec' && command) {
    title = `Ran ${truncateToolTitleValue(command)} command`
  } else if (kind === 'process') {
    if (processName && pid) {
      title = `Process ${processName} (#${pid})`
    } else if (processName) {
      title = `Process ${processName}`
    } else if (pid) {
      title = `Process #${pid}`
    }
  } else if (toolName) {
    title = status ? `Tool ${toolName} (${status})` : `Tool ${toolName}`
  } else if (status) {
    title = `Tool event (${status})`
  }

  const summaryLines: string[] = [title]
  if (status && !title.toLowerCase().includes(status.toLowerCase())) {
    summaryLines.push(`Status: ${status}`)
  }
  if (error) {
    summaryLines.push(`Error: ${error}`)
  }

  return {
    kind,
    title,
    summary: summaryLines.join('\n').trim(),
    toolName: toolName ?? processName ?? null,
    command: command ?? null,
    status: status ?? null,
    pid: pid ?? null,
    error: error ?? null,
    output: output ?? null,
    raw: record,
  }
}

function extractHistoryMessageContent(record: Record<string, unknown>): string | null {
  const directContent = readString(record, ['content', 'text'])
  if (directContent) {
    return directContent
  }

  const nestedMessage = toObject(record.message)
  const nestedContent = nestedMessage ? readString(nestedMessage, ['content', 'text']) : null
  if (nestedContent) {
    return nestedContent
  }

  const structuredCandidates = [
    record.content,
    record.message,
    record.payload,
    record.data,
    record.result,
    record.details,
    record.error,
  ]

  for (const candidate of structuredCandidates) {
    const extracted = extractHistoryMessageContentFromUnknown(candidate)
    if (extracted) {
      return extracted
    }
  }

  const fallbackToolSummary = summarizeToolLikeHistoryRecord(record)
  return fallbackToolSummary
}

function extractHistoryMessageContentFromUnknown(value: unknown, depth = 0): string | null {
  if (depth > 5 || value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && depth < 4) {
      try {
        const parsed = JSON.parse(trimmed)
        const nested = extractHistoryMessageContentFromUnknown(parsed, depth + 1)
        if (nested) {
          return nested
        }
      } catch {
        // Fall back to returning original string.
      }
    }
    return trimmed
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractHistoryMessageContentFromUnknown(item, depth + 1))
      .filter((item): item is string => Boolean(item))
    if (parts.length === 0) {
      return null
    }
    return parts.join('\n').trim()
  }

  const record = toObject(value)
  if (!record) {
    return null
  }

  const direct = readString(record, ['text', 'content', 'message', 'error', 'output', 'result', 'stdout', 'stderr'])
  if (direct) {
    return direct
  }

  const toolSummary = summarizeToolLikeHistoryRecord(record)
  if (toolSummary) {
    return toolSummary
  }

  const nestedKeys = ['content', 'text', 'message', 'error', 'output', 'result', 'stdout', 'stderr', 'details', 'data', 'payload']
  for (const key of nestedKeys) {
    const nested = extractHistoryMessageContentFromUnknown(record[key], depth + 1)
    if (nested) {
      return nested
    }
  }

  return null
}

function summarizeToolLikeHistoryRecord(record: Record<string, unknown>): string | null {
  const toolEvent = extractToolLikeHistoryEvent(record)
  if (!toolEvent) {
    return null
  }

  const lines: string[] = []
  lines.push(toolEvent.title)
  if (toolEvent.command) {
    lines.push(`Command: ${toolEvent.command}`)
  }
  if (toolEvent.error) {
    lines.push(`Error: ${toolEvent.error}`)
  }
  if (toolEvent.output) {
    lines.push(toolEvent.output)
  }

  return lines.join('\n').trim() || null
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

  const objectValue = extractObjectCandidate(result, ['currentModelId', 'currentModel', 'activeModel', 'current', 'active', 'selected'])
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
  const hasExplicitModelCollection = Boolean(
    objectValue
    && (
      Array.isArray(objectValue.models)
      || Array.isArray(objectValue.items)
      || Array.isArray(objectValue.data)
      || Array.isArray(objectValue.available)
      || Array.isArray(objectValue.list)
    ),
  )
  if (parsed.length === 0 && objectValue && !hasExplicitModelCollection) {
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

  const root = toObject(result)
  const storedModelConfigRecord = toObject(root?.storedModelConfig)
  let parsedStoredModelConfig: RuntimeModelsData['storedModelConfig'] = null
  if (storedModelConfigRecord) {
    const rawModelAuthMethod = readString(storedModelConfigRecord, ['modelAuthMethod'])?.toLowerCase() ?? null
    let modelAuthMethod: 'api-key' | 'oauth' | null = null
    if (rawModelAuthMethod === 'api-key' || rawModelAuthMethod === 'oauth') {
      modelAuthMethod = rawModelAuthMethod
    }
    parsedStoredModelConfig = {
      modelProviderId: readString(storedModelConfigRecord, ['modelProviderId']),
      modelId: readString(storedModelConfigRecord, ['modelId']),
      modelAuthMethod,
      modelOauthConnected: readBoolean(storedModelConfigRecord, ['modelOauthConnected']),
    }
  }

  return {
    models: dedupeModels(parsed),
    currentModelId: parseCurrentModelId(result) ?? parsedStoredModelConfig?.modelId ?? null,
    storedModelConfig: parsedStoredModelConfig,
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

  const root = extractObjectCandidate(result, ['skills', 'items', 'list', 'results', 'data', 'available'])
  const arrayItems = extractArrayCandidates(root ?? result, ['skills', 'items', 'list', 'results', 'data', 'available'])
  for (const item of arrayItems) {
    const normalized = parseSkillItem(item)
    if (normalized) parsed.push(normalized)
  }

  const objectValue = root ?? toObject(result)
  if (parsed.length === 0 && objectValue) {
    const skillObject =
      toObject(objectValue.skills) ??
      toObject(objectValue.items) ??
      toObject(objectValue.data) ??
      toObject(objectValue.result) ??
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

function isValidRuntimeAgentId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(value)
}

function parseRuntimeConfigDocument(result: unknown): Record<string, unknown> | null {
  const root = extractObjectCandidate(result, ['config', 'agents', 'agent'])
  if (!root) {
    return null
  }

  const directConfig = toObject(root.config)
  if (directConfig) {
    return directConfig
  }

  if (typeof root.config === 'string') {
    try {
      const parsed = JSON.parse(root.config) as unknown
      const record = toObject(parsed)
      if (record) {
        return record
      }
    } catch {
      // Ignore invalid config JSON and fall back to the object payload.
    }
  }

  if (toObject(root.agents) || Array.isArray(root.agents) || toObject(root.agent) || Array.isArray(root.agent)) {
    return root
  }

  return null
}

function parseAgentItem(item: unknown, idFallback?: string): RuntimeAgentSummary | null {
  if (typeof item === 'string' && item.trim()) {
    const id = item.trim()
    if (!isValidRuntimeAgentId(id)) {
      return null
    }
    return {
      id,
      name: id,
      enabled: true,
      raw: { id },
    }
  }

  const record = toObject(item)
  if (!record) {
    return null
  }

  const id = readString(record, ['id', 'agentId', 'agent_id', 'key']) ?? idFallback?.trim() ?? null
  if (!id || !isValidRuntimeAgentId(id)) {
    return null
  }

  const enabledValue = readBoolean(record, ['enabled', 'active'])
  const disabledValue = readBoolean(record, ['disabled'])
  const enabled = enabledValue ?? (disabledValue === null ? true : !disabledValue)

  return {
    id,
    name: readString(record, ['name', 'label', 'title', 'displayName']) ?? id,
    enabled,
    raw: record,
  }
}

function dedupeAgentsById(agents: RuntimeAgentSummary[]): RuntimeAgentSummary[] {
  const byId = new Map<string, RuntimeAgentSummary>()
  for (const agent of agents) {
    if (byId.has(agent.id)) {
      continue
    }
    byId.set(agent.id, agent)
  }
  return Array.from(byId.values())
}

function parseAgents(result: unknown): RuntimeAgentsData {
  const parsed: RuntimeAgentSummary[] = []
  const config = parseRuntimeConfigDocument(result)
  if (!config) {
    return {
      agents: [],
      raw: result,
    }
  }

  const addItem = (item: unknown, fallbackId?: string) => {
    const normalized = parseAgentItem(item, fallbackId)
    if (normalized) {
      parsed.push(normalized)
    }
  }

  const addArray = (items: unknown[]) => {
    for (const item of items) {
      addItem(item)
    }
  }

  const singularAgent = toObject(config.agent)
  if (singularAgent && config.agents === undefined) {
    addItem(singularAgent, 'main')
  } else {
    const agentsValue = config.agents ?? config.agent
    if (Array.isArray(agentsValue)) {
      addArray(agentsValue)
    } else {
      const agentsRecord = toObject(agentsValue)
      if (agentsRecord) {
        const listItems = extractArrayCandidates(agentsRecord, ['list', 'items', 'results', 'data', 'agents'])
        if (listItems.length > 0) {
          addArray(listItems)
        }

        if (parsed.length === 0) {
          const ignoredMapKeys = new Set(['defaults', 'default', 'list', 'items', 'results', 'data', 'agents'])
          for (const [key, value] of Object.entries(agentsRecord)) {
            if (ignoredMapKeys.has(key)) {
              continue
            }
            addItem(value, key)
          }
        }
      }
    }
  }

  const hasMain = parsed.some((agent) => agent.id === 'main')
  const defaults = toObject(toObject(config.agents)?.defaults)
  if (!hasMain && defaults) {
    parsed.unshift({
      id: 'main',
      name: 'main',
      enabled: true,
      raw: { id: 'main' },
    })
  }

  return {
    agents: dedupeAgentsById(parsed),
    raw: result,
  }
}

function parseChannelsStatus(result: unknown): RuntimeChannelsStatusData {
  const root = extractObjectCandidate(result, ['channels', 'channelAccounts', 'channelLabels', 'channelOrder'])
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
  const root = extractObjectCandidate(result, [
    'workspaceDir',
    'workspace',
    'workspacePath',
    'workspace_dir',
    'workspace_path',
    'memoryDir',
    'memory_dir',
    'hooks',
    'files',
  ])
  const hooks = toObject(root?.hooks)
  const files = toObject(root?.files)
  return {
    workspaceDir: root ? readString(root, ['workspaceDir', 'workspace', 'workspacePath', 'workspace_dir', 'workspace_path']) : null,
    memoryDir: root ? readString(root, ['memoryDir', 'memory_dir']) : null,
    memoryDirExists: root ? (readBoolean(root, ['memoryDirExists', 'memory_dir_exists']) ?? false) : false,
    hooks: {
      internalEnabled: hooks ? (readBoolean(hooks, ['internalEnabled', 'internal_enabled', 'enabled']) ?? false) : false,
      bootMdEnabled: hooks ? (readBoolean(hooks, ['bootMdEnabled', 'boot_md_enabled']) ?? false) : false,
      commandLoggerEnabled: hooks ? (readBoolean(hooks, ['commandLoggerEnabled', 'command_logger_enabled']) ?? false) : false,
      sessionMemoryEnabled: hooks ? (readBoolean(hooks, ['sessionMemoryEnabled', 'session_memory_enabled']) ?? false) : false,
      bootstrapExtraFilesEnabled: hooks
        ? (readBoolean(hooks, ['bootstrapExtraFilesEnabled', 'bootstrap_extra_files_enabled']) ?? false)
        : false,
    },
    files: {
      memoryMdExists: files ? (readBoolean(files, ['memoryMdExists', 'memory_md_exists']) ?? false) : false,
      bootMdExists: files ? (readBoolean(files, ['bootMdExists', 'boot_md_exists']) ?? false) : false,
      agentsMdExists: files ? (readBoolean(files, ['agentsMdExists', 'agents_md_exists']) ?? false) : false,
    },
    repaired: root ? (readBoolean(root, ['repaired', 'isRepaired']) ?? false) : false,
    raw: result,
  }
}

function parseWorkspaceFiles(result: unknown): RuntimeWorkspaceFilesData {
  const root = extractObjectCandidate(result, [
    'workspaceDir',
    'workspace',
    'workspacePath',
    'workspace_dir',
    'workspace_path',
    'files',
    'items',
    'list',
    'data',
  ])
  const fileEntries = extractArrayCandidates(root ?? result, ['files', 'items', 'list', 'results', 'data'])
  const files = Array.from(
    new Set(
      fileEntries
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry.trim()
          }
          const record = toObject(entry)
          if (!record) {
            return ''
          }
          return readString(record, ['relativePath', 'path', 'file', 'name']) ?? ''
        })
        .filter(Boolean),
    ),
  )
  return {
    workspaceDir: root ? readString(root, ['workspaceDir', 'workspace', 'workspacePath', 'workspace_dir', 'workspace_path']) : null,
    files,
    raw: result,
  }
}

function parseWorkspaceFile(result: unknown): RuntimeWorkspaceFileData {
  const root = extractObjectCandidate(result, ['relativePath', 'path', 'content', 'contentBase64', 'exists'])
  const relativePath = root ? (readString(root, ['relativePath', 'path', 'file', 'name']) ?? '') : ''
  let content = root ? (readString(root, ['content']) ?? '') : ''
  if (!content && root) {
    const contentBase64 = readString(root, ['contentBase64', 'content_base64'])
    if (contentBase64 && typeof atob === 'function') {
      try {
        const binary = atob(contentBase64)
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
        content = new TextDecoder().decode(bytes)
      } catch {
        content = ''
      }
    }
  }
  const exists = root ? (readBoolean(root, ['exists', 'found']) ?? Boolean(content)) : Boolean(content)
  return {
    relativePath: relativePath.trim(),
    exists,
    content,
    raw: result,
  }
}

function parseWorkspaceTrash(result: unknown): RuntimeWorkspaceTrashData {
  const root = extractObjectCandidate(result, ['trashDir', 'trash_dir', 'files', 'items', 'list', 'data'])
  const fileEntries = extractArrayCandidates(root ?? result, ['files', 'items', 'list', 'results', 'data'])
  const files = fileEntries.length > 0
    ? fileEntries
      .map((item) => toObject(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((record) => ({
        trashPath: readString(record, ['trashPath', 'path']) ?? '',
        relativePath: readString(record, ['relativePath']) ?? '',
        absolutePath: readString(record, ['absolutePath']) ?? null,
        deletedAt: readString(record, ['deletedAt']) ?? null,
        raw: record,
      }))
      .filter((item) => item.trashPath.length > 0 && item.relativePath.length > 0)
    : []

  return {
    trashDir: root ? (readString(root, ['trashDir', 'trash_dir']) ?? null) : null,
    files,
    raw: result,
  }
}

function parseWorkspaceFileVersions(result: unknown): RuntimeWorkspaceFileVersionsData {
  const root = extractObjectCandidate(result, ['relativePath', 'versionsDir', 'versions', 'items', 'list', 'data'])
  const versionEntries = extractArrayCandidates(root ?? result, ['versions', 'items', 'list', 'results', 'data'])
  const versions = versionEntries.length > 0
    ? versionEntries
      .map((item) => toObject(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((record) => {
        const sizeValue = record.sizeBytes
        const sizeFromString = readString(record, ['sizeBytes', 'size_bytes'])
        const parsedSizeFromString =
          sizeFromString && !Number.isNaN(Number(sizeFromString))
            ? Number(sizeFromString)
            : null
        return {
          versionId: readString(record, ['versionId']) ?? '',
          createdAt: readString(record, ['createdAt']) ?? null,
          path: readString(record, ['path']) ?? null,
          sizeBytes: typeof sizeValue === 'number' ? sizeValue : parsedSizeFromString,
          raw: record,
        }
      })
      .filter((item) => item.versionId.length > 0)
    : []

  return {
    relativePath: readString(root ?? {}, ['relativePath', 'path']) ?? '',
    versionsDir: readString(root ?? {}, ['versionsDir', 'versions_dir']) ?? null,
    versions,
    raw: result,
  }
}

function parseWhatsAppLogin(result: unknown): RuntimeWhatsAppLoginData {
  const record = extractObjectCandidate(result, ['message', 'status', 'connected', 'qrDataUrl', 'qr_data_url'])
  const connected = record ? readBoolean(record, ['connected']) : null
  const qrDataUrl = readString(record ?? {}, ['qrDataUrl', 'qr_data_url'])
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

const runtimeRequestInFlight = new Map<string, Promise<unknown>>()
const runtimeDebugEnabled = (
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_RUNTIME_DEBUG === '1'
)

function runtimeDebugLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  details?: Record<string, unknown>,
): void {
  if (!runtimeDebugEnabled || typeof window === 'undefined') {
    return
  }

  const logger = level === 'error'
    ? console.error
    : level === 'warn'
      ? console.warn
      : console.info

  if (details) {
    logger(`[runtime-controls] ${message}`, details)
    return
  }
  logger(`[runtime-controls] ${message}`)
}

function buildRuntimeRequestKey(
  tenantId: string,
  path: string,
  init: RequestInit,
): string {
  const method = (init.method ?? 'GET').toUpperCase()
  const body = typeof init.body === 'string'
    ? init.body
    : init.body
      ? '[non-string-body]'
      : ''
  return `${tenantId}|${method}|${path}|${body}`
}

async function runtimeRequest<T>(
  tenantId: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const requestKey = buildRuntimeRequestKey(tenantId, path, init)
  const existing = runtimeRequestInFlight.get(requestKey)
  if (existing) {
    return existing as Promise<T>
  }

  const backendUrl = getBackendUrl()
  const requestPromise = (async () => {
    const headers = await buildTenantAuthHeaders(tenantId, {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    })

    const method = (init.method ?? 'GET').toUpperCase()
    const requestUrl = `${backendUrl}/api/v1/daemons/${encodeURIComponent(tenantId)}${path}`
    runtimeDebugLog('info', 'request:start', {
      tenantId,
      method,
      path,
      requestUrl,
      hasTenantHeader: Boolean(headers['x-tenant-id']),
      hasAuthorizationHeader: Boolean(headers.authorization),
      headerNames: Object.keys(headers),
    })

    let response: Response
    try {
      response = await fetch(requestUrl, {
        ...init,
        headers,
      })
    } catch (error) {
      runtimeDebugLog('warn', 'request:network-error', {
        tenantId,
        method,
        path,
        requestUrl,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }

    runtimeDebugLog('info', 'request:response', {
      tenantId,
      method,
      path,
      requestUrl,
      status: response.status,
      ok: response.ok,
      skillsSourceHeader: response.headers.get('x-clawpilot-skills-source'),
      contentType: response.headers.get('content-type'),
    })

    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok) {
      runtimeDebugLog('warn', 'request:error-response', {
        tenantId,
        method,
        path,
        requestUrl,
        status: response.status,
        payload: toObject(payload) ?? payload,
      })
      throw new RuntimeRequestError(response.status, payload)
    }

    // Normalize successful runtime responses to RuntimeEnvelope so callers can
    // safely read `.result` across backend variants:
    // - empty/non-JSON success body -> { result: null }
    // - direct payload object/array  -> { result: payload }
    // - envelope payload             -> passthrough
    if (payload === null || payload === undefined) {
      return { result: null } as T
    }

    const record = toObject(payload)
    if (record && Object.prototype.hasOwnProperty.call(record, 'result')) {
      return payload as T
    }

    return { result: payload } as T
  })()

  runtimeRequestInFlight.set(requestKey, requestPromise as Promise<unknown>)
  try {
    return await requestPromise
  } finally {
    runtimeRequestInFlight.delete(requestKey)
  }
}

export async function listRuntimeModels(
  tenantId: string,
  options: { syncRuntime?: boolean; includeModels?: boolean } = {},
): Promise<RuntimeModelsData> {
  const query = new URLSearchParams()
  if (options.syncRuntime) {
    query.set('syncRuntime', 'true')
  }
  if (options.includeModels === false) {
    query.set('includeModels', 'false')
  }

  const path = query.size > 0 ? `/runtime/models?${query.toString()}` : '/runtime/models'
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, path)
  return parseModels(payload.result)
}

export async function startRuntimeOpenAICodexOAuth(
  tenantId: string,
  payload: RuntimeOpenAICodexOAuthStartPayload = {},
): Promise<RuntimeOpenAICodexOAuthStartData> {
  const response = await runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/models/openai-codex/oauth/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const record = toObject(response.result)
  const sessionId = readString(record ?? {}, ['sessionId']) ?? ''
  const authUrl = readString(record ?? {}, ['authUrl']) ?? ''
  const expiresAt = readString(record ?? {}, ['expiresAt'])

  if (!sessionId || !authUrl) {
    throw new Error('OAuth start response did not include sessionId/authUrl.')
  }

  return {
    sessionId,
    authUrl,
    expiresAt,
    raw: response.result,
  }
}

export async function updateRuntimeModelConfig(
  tenantId: string,
  payload: RuntimeModelUpdatePayload,
): Promise<RuntimeModelUpdateData> {
  const response = await runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/models', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

  const record = toObject(response.result)
  const rawModelAuthMethod = readString(record ?? {}, ['modelAuthMethod'])?.toLowerCase() ?? null
  let modelAuthMethod: 'api-key' | 'oauth' | null = null
  if (rawModelAuthMethod === 'api-key' || rawModelAuthMethod === 'oauth') {
    modelAuthMethod = rawModelAuthMethod
  }

  return {
    modelProviderId: readString(record ?? {}, ['modelProviderId']),
    modelId: readString(record ?? {}, ['modelId']),
    modelAuthMethod,
    modelOauthConnected: readBoolean(record ?? {}, ['modelOauthConnected']),
    persisted: readBoolean(record ?? {}, ['persisted']) ?? true,
    raw: response.result,
  }
}

export async function completeRuntimeOpenAICodexOAuth(
  tenantId: string,
  payload: RuntimeOpenAICodexOAuthCompletePayload,
): Promise<RuntimeOpenAICodexOAuthCompleteData> {
  const response = await runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/models/openai-codex/oauth/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const record = toObject(response.result)

  return {
    providerId: readString(record ?? {}, ['providerId']),
    profileId: readString(record ?? {}, ['profileId']),
    modelId: readString(record ?? {}, ['modelId']),
    oauthConnected: readBoolean(record ?? {}, ['oauthConnected']) ?? false,
    raw: response.result,
  }
}

export async function listRuntimeWorkspaceFiles(
  tenantId: string,
  options?: {
    includeHidden?: boolean
    syncRuntime?: boolean
  },
): Promise<RuntimeWorkspaceFilesData> {
  const query = new URLSearchParams()
  if (options?.includeHidden !== undefined) query.set('includeHidden', String(options.includeHidden))
  if (options?.syncRuntime !== undefined) query.set('syncRuntime', String(options.syncRuntime))
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
  options?: {
    syncRuntime?: boolean
  },
): Promise<RuntimeWorkspaceFileData> {
  const query = new URLSearchParams({ relativePath })
  if (options?.syncRuntime !== undefined) query.set('syncRuntime', String(options.syncRuntime))
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, `/runtime/workspace/file?${query.toString()}`)
  return parseWorkspaceFile(payload.result)
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

