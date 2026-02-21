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

export const DEFAULT_CHAT_SESSION_KEY = 'agent:main:main'

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
      runtimeDebugLog('error', 'request:network-error', {
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

export async function terminateManagedDaemon(tenantId: string): Promise<{ terminated: boolean }> {
  try {
    await runtimeRequest<RuntimeEnvelope>(tenantId, '', {
      method: 'DELETE',
    })
    return { terminated: true }
  } catch (error) {
    if (error instanceof RuntimeRequestError && error.status === 404) {
      return { terminated: false }
    }
    throw error
  }
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

export async function listRuntimeSkills(
  tenantId: string,
  options?: {
    agentId?: string
    syncRuntime?: boolean
  },
): Promise<RuntimeSkillsData> {
  const query = new URLSearchParams()
  if (options?.agentId) query.set('agentId', options.agentId)
  if (options?.syncRuntime !== undefined) query.set('syncRuntime', String(options.syncRuntime))
  const queryString = query.toString()
  const path = queryString
    ? `/runtime/skills?${queryString}`
    : '/runtime/skills'
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, path)
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

export async function listRuntimeWorkspaceHealth(
  tenantId: string,
  options?: {
    syncRuntime?: boolean
  },
): Promise<RuntimeWorkspaceHealthData> {
  const query = new URLSearchParams()
  if (options?.syncRuntime !== undefined) query.set('syncRuntime', String(options.syncRuntime))
  const queryString = query.toString()
  const path = queryString
    ? `/runtime/workspace/health?${queryString}`
    : '/runtime/workspace/health'
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, path)
  return parseWorkspaceHealth(payload.result)
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

export async function listRuntimeWorkspaceTrashFiles(
  tenantId: string,
  options?: {
    retentionDays?: number
  },
): Promise<RuntimeWorkspaceTrashData> {
  const query = new URLSearchParams()
  if (options?.retentionDays !== undefined) query.set('retentionDays', String(options.retentionDays))
  const queryString = query.toString()
  const path = queryString
    ? `/runtime/workspace/trash?${queryString}`
    : '/runtime/workspace/trash'
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, path)
  return parseWorkspaceTrash(payload.result)
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

export async function listRuntimeWorkspaceFileVersions(
  tenantId: string,
  relativePath: string,
  options?: {
    limit?: number
  },
): Promise<RuntimeWorkspaceFileVersionsData> {
  const query = new URLSearchParams({ relativePath })
  if (options?.limit !== undefined) query.set('limit', String(options.limit))
  const payload = await runtimeRequest<RuntimeEnvelope>(tenantId, `/runtime/workspace/file-versions?${query.toString()}`)
  return parseWorkspaceFileVersions(payload.result)
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

export async function restoreRuntimeWorkspaceTrashFile(
  tenantId: string,
  payload: RuntimeWorkspaceTrashRestorePayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/workspace/trash/restore', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function purgeRuntimeWorkspaceTrashFile(
  tenantId: string,
  payload?: {
    trashPath?: string
  },
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/workspace/trash', {
    method: 'DELETE',
    body: JSON.stringify(payload ?? {}),
  })
}

export async function resetRuntimeOpenClawInstance(
  tenantId: string,
  payload: RuntimeOpenClawResetPayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/openclaw/reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function restoreRuntimeWorkspaceFileVersion(
  tenantId: string,
  payload: RuntimeWorkspaceFileVersionRestorePayload,
): Promise<RuntimeEnvelope> {
  return runtimeRequest<RuntimeEnvelope>(tenantId, '/runtime/workspace/file-versions/restore', {
    method: 'POST',
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
