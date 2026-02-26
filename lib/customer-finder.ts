import { buildTenantAuthHeaders } from '@/lib/backend-auth'
import { getBackendUrl } from '@/lib/runtime-controls'

const TENANT_QUEUE_SPACING_MS = 120
const TRANSIENT_LIMIT_RETRY_ATTEMPTS = 4
const TRANSIENT_LIMIT_BASE_BACKOFF_MS = 300
const tenantRequestQueueById = new Map<string, Promise<void>>()

export type LeadStage =
  | 'discovered'
  | 'qualified'
  | 'researching'
  | 'ready_for_outreach'
  | 'outreach_sent'
  | 'replied'
  | 'meeting_booked'
  | 'won'
  | 'disqualified'

export const LEAD_STAGE_ORDER: readonly LeadStage[] = [
  'discovered',
  'qualified',
  'researching',
  'ready_for_outreach',
  'outreach_sent',
  'replied',
  'meeting_booked',
  'won',
  'disqualified',
] as const

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  discovered: 'Discovered',
  qualified: 'Qualified',
  researching: 'Researching',
  ready_for_outreach: 'Ready for Outreach',
  outreach_sent: 'Outreach Sent',
  replied: 'Replied',
  meeting_booked: 'Meeting Booked',
  won: 'Won',
  disqualified: 'Disqualified',
}

export interface CustomerFinderConfig {
  leadSources: {
    linkedin: boolean
    webSearch: boolean
    directories: boolean
    social: boolean
    manualImport: boolean
    discoveryProvider: 'duckduckgo-html' | 'web-search-api'
    webSearchApi: {
      provider: 'none' | 'brave' | 'perplexity' | 'gemini'
      apiKey: string
      baseUrl: string
      model: string
      maxResults: number
      timeoutSeconds: number
    }
    browserAutomation: {
      enabled: boolean
      defaultProfile: string
      headless: boolean
    }
  }
  outreachChannels: {
    email: boolean
    linkedin: boolean
    x: boolean
    phone: boolean
  }
  outreachSetup: {
    email: {
      provider: 'none' | 'gmail' | 'smtp'
      fromEmail: string
      fromName: string
      replyTo: string
      gmailAppPassword: string
      smtpHost: string
      smtpPort: number
      smtpSecure: boolean
      smtpUsername: string
      smtpPassword: string
    }
  }
  outreachPolicy: {
    tone: 'professional' | 'friendly' | 'direct' | 'consultative'
    allowOutreach: boolean
    allowFollowUps: boolean
    maxFollowUpsPerLead: number
    cta: string
    signature: string
    blockedTerms: string[]
  }
  replyPolicy: {
    tone: 'professional' | 'friendly' | 'direct' | 'consultative'
    allowReplyHandling: boolean
    allowAutoReplies: boolean
    maxAutoRepliesPerLead: number
    escalateOnPricing: boolean
    escalateOnLegal: boolean
    escalateOnSecurity: boolean
    escalateOnNegativeSentiment: boolean
    blockedTerms: string[]
  }
  targeting: {
    industries: string[]
    locations: string[]
    includeKeywords: string[]
    excludeKeywords: string[]
    competitors: string[]
    intent: 'companies' | 'owners' | 'both'
    contactRoles: string[]
  }
  guardrails: {
    doNotContactDomains: string[]
    doNotContactCompanies: string[]
    blockPersonalEmails: boolean
    maxDailyOutreach: number
    requireHumanApproval: boolean
  }
  dataFields: {
    companyName: boolean
    contactName: boolean
    email: boolean
    phone: boolean
    website: boolean
    pageTitle: boolean
    contactPageUrl: boolean
  }
  execution: {
    autoResearch: boolean
    autoDraftReplies: boolean
    autoStageProgression: boolean
    autopilotEnabled: boolean
    autopilotIntervalMinutes: number
    autopilotLeadLimit: number
    autopilotIncludeContactPages: boolean
  }
}

export interface CustomerFinderLead {
  leadId: string
  runId?: string
  companyName: string
  contactName?: string
  email?: string
  phone?: string
  website?: string
  pageTitle?: string
  contactPageUrl?: string
  linkedinUrl?: string
  source: string
  tags: string[]
  score: number | null
  notes?: string
  stage: LeadStage
  createdAt: string
  updatedAt: string
  stageUpdatedAt: string
}

export interface CustomerFinderLeadInput {
  leadId?: string
  runId?: string
  companyName: string
  contactName?: string
  email?: string
  phone?: string
  website?: string
  pageTitle?: string
  contactPageUrl?: string
  linkedinUrl?: string
  source?: string
  tags?: string[]
  score?: number | null
  notes?: string
  stage?: LeadStage
}

export interface CustomerFinderAgentStatus {
  agentId: string
  name: string
  status: 'idle' | 'running' | 'blocked' | 'error'
  stage: string
  summary: string
  hidden?: boolean
  runId?: string
  processed?: number
  updated?: number
  leadId?: string
  updatedAt: string
}

export interface CustomerFinderOrchestratorLog {
  runId?: string
  agentId?: string
  level: 'info' | 'warn' | 'error'
  message: string
  timestamp: string
}

export interface CustomerFinderRunSummary {
  runId: string
  runName: string
  leadCount: number
  updatedAt: string
}

export type CustomerFinderKnowledgeDocumentTarget = 'outreach' | 'reply-handler' | 'both'
export type CustomerFinderKnowledgeDocumentFormat = 'md' | 'txt' | 'csv' | 'json'

export interface CustomerFinderKnowledgeDocument {
  documentId: string
  fileName: string
  format: CustomerFinderKnowledgeDocumentFormat
  target: CustomerFinderKnowledgeDocumentTarget
  relativePath: string
  contentPreview?: string
  sizeBytes?: number
  uploadedAt: string
  updatedAt: string
}

export type CustomerFinderSetupStatus = 'inactive' | 'provisioning' | 'active' | 'error'

export interface CustomerFinderSetupState {
  status: CustomerFinderSetupStatus
  includeReplyAgent: boolean
  requestedAt?: string
  activatedAt?: string
  lastProvisionedAt?: string
  lastError?: string
}

export interface CustomerFinderRecommendedAgent {
  agentId: string
  name: string
  stage: string
  summary: string
}

export interface CustomerFinderOverview {
  generatedAt: string
  leadStages: LeadStage[]
  config: CustomerFinderConfig
  setup: CustomerFinderSetupState
  pipeline: Array<{
    stage: LeadStage
    count: number
  }>
  totals: {
    leads: number
    contacted: number
    replied: number
    meetings: number
    won: number
    activeAgents: number
  }
  agents: CustomerFinderAgentStatus[]
  leads: CustomerFinderLead[]
  documents?: CustomerFinderKnowledgeDocument[]
  activeRunId?: string | null
  runs?: CustomerFinderRunSummary[]
  orchestratorLogs?: CustomerFinderOrchestratorLog[]
  lastEventAt: string | null
}

export interface CustomerFinderConfigResponse {
  persisted: boolean
  config: CustomerFinderConfig
  setup: CustomerFinderSetupState
  runtimeConfigUpdatedAt: string | null
}

export interface CustomerFinderSetupResponse {
  setup: CustomerFinderSetupState
  configPersisted: boolean
  runtimeConfigUpdatedAt: string | null
  recommendedAgents: CustomerFinderRecommendedAgent[]
}

export interface CustomerFinderLeadsResponse {
  leadStages: LeadStage[]
  leads: CustomerFinderLead[]
  total: number
  pipeline: Array<{
    stage: LeadStage
    count: number
  }>
  activeRunId?: string | null
  runs?: CustomerFinderRunSummary[]
  lastEventAt: string | null
}

export interface CustomerFinderLeadManagementResponse {
  action: 'start_fresh' | 'discard' | 'export' | 'export_discard' | 'approve_outreach'
  run?: {
    runId: string
    name: string
    status: 'active' | 'discarded'
    createdAt: string
    updatedAt: string
  }
  runId?: string | null
  scopedLeadCount?: number
  discarded?: number
  approved?: number
  remainingReady?: number
  export?: {
    format: 'csv' | 'json'
    fileName: string
    content: string
    leadCount: number
    runId: string | null
    runName: string | null
  }
  runs?: CustomerFinderRunSummary[]
  lastEventAt?: string | null
}

export interface CustomerFinderKnowledgeUploadResponse {
  document: CustomerFinderKnowledgeDocument
}

export interface CustomerFinderKnowledgeDeleteResponse {
  deleted: boolean
  documentId: string
}

export interface CustomerFinderDiscoveryRunResponse {
  runId: string
  query: string
  scannedUrls: number
  resultUrls: number
  skippedBlockedDomains: number
  skippedDuplicates: number
  discovered: number
  leads: CustomerFinderLead[]
}

export interface CustomerFinderAgentsRunResponse {
  runId: string
  ranAt: string
  mode: 'lead-discovery' | 'lead-research' | 'outreach' | 'reply-handler' | 'all'
  results: Array<{
    agentId: 'lead-discovery' | 'lead-research' | 'outreach' | 'reply-handler'
    processed: number
    updated: number
    summary: string
  }>
  totals: {
    leads: number
    pipeline: Array<{
      stage: LeadStage
      count: number
    }>
  }
}

export class CustomerFinderRequestError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, message: string, payload: unknown) {
    super(message)
    this.name = 'CustomerFinderRequestError'
    this.status = status
    this.payload = payload
  }
}

export function createDefaultCustomerFinderConfig(): CustomerFinderConfig {
  return {
    leadSources: {
      linkedin: true,
      webSearch: true,
      directories: true,
      social: false,
      manualImport: true,
      discoveryProvider: 'duckduckgo-html',
      webSearchApi: {
        provider: 'none',
        apiKey: '',
        baseUrl: '',
        model: '',
        maxResults: 5,
        timeoutSeconds: 30,
      },
      browserAutomation: {
        enabled: true,
        defaultProfile: 'openclaw',
        headless: false,
      },
    },
    outreachChannels: {
      email: true,
      linkedin: true,
      x: false,
      phone: false,
    },
    outreachSetup: {
      email: {
        provider: 'none',
        fromEmail: '',
        fromName: '',
        replyTo: '',
        gmailAppPassword: '',
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: true,
        smtpUsername: '',
        smtpPassword: '',
      },
    },
    outreachPolicy: {
      tone: 'professional',
      allowOutreach: true,
      allowFollowUps: true,
      maxFollowUpsPerLead: 2,
      cta: 'Would you be open to a quick 15-minute call this week?',
      signature: 'Lead Gen Team',
      blockedTerms: [],
    },
    replyPolicy: {
      tone: 'professional',
      allowReplyHandling: true,
      allowAutoReplies: true,
      maxAutoRepliesPerLead: 2,
      escalateOnPricing: true,
      escalateOnLegal: true,
      escalateOnSecurity: true,
      escalateOnNegativeSentiment: true,
      blockedTerms: [],
    },
    targeting: {
      industries: [],
      locations: [],
      includeKeywords: [],
      excludeKeywords: [],
      competitors: [],
      intent: 'companies',
      contactRoles: [],
    },
    guardrails: {
      doNotContactDomains: [],
      doNotContactCompanies: [],
      blockPersonalEmails: true,
      maxDailyOutreach: 50,
      requireHumanApproval: true,
    },
    dataFields: {
      companyName: true,
      contactName: true,
      email: true,
      phone: false,
      website: true,
      pageTitle: true,
      contactPageUrl: true,
    },
    execution: {
      autoResearch: true,
      autoDraftReplies: true,
      autoStageProgression: false,
      autopilotEnabled: false,
      autopilotIntervalMinutes: 10,
      autopilotLeadLimit: 25,
      autopilotIncludeContactPages: true,
    },
  }
}

export function isOutreachEmailConfigured(config: CustomerFinderConfig): boolean {
  const defaults = createDefaultCustomerFinderConfig()
  const outreachChannels = config.outreachChannels ?? defaults.outreachChannels
  if (!outreachChannels.email) {
    return false
  }

  const emailSetup = config.outreachSetup?.email ?? defaults.outreachSetup.email
  if (!emailSetup.fromEmail.trim()) {
    return false
  }

  if (emailSetup.provider === 'gmail') {
    return emailSetup.gmailAppPassword.trim().length > 0
  }
  if (emailSetup.provider === 'smtp') {
    return (
      emailSetup.smtpHost.trim().length > 0
      && emailSetup.smtpUsername.trim().length > 0
      && emailSetup.smtpPassword.trim().length > 0
      && Number.isFinite(emailSetup.smtpPort)
      && emailSetup.smtpPort > 0
    )
  }

  return false
}

export async function fetchCustomerFinderOverview(
  tenantId: string,
  options: { limit?: number; runId?: string; includeAllRuns?: boolean } = {},
): Promise<CustomerFinderOverview> {
  const query = new URLSearchParams()
  if (options.limit !== undefined) {
    query.set('limit', String(options.limit))
  }
  if (options.runId?.trim()) {
    query.set('runId', options.runId.trim())
  }
  if (options.includeAllRuns) {
    query.set('includeAllRuns', 'true')
  }
  const querySuffix = query.toString() ? `?${query.toString()}` : ''
  return customerFinderRequest<CustomerFinderOverview>(tenantId, `/overview${querySuffix}`)
}

export async function fetchCustomerFinderConfig(tenantId: string): Promise<CustomerFinderConfigResponse> {
  return customerFinderRequest<CustomerFinderConfigResponse>(tenantId, '/config')
}

export async function fetchCustomerFinderSetup(tenantId: string): Promise<CustomerFinderSetupResponse> {
  return customerFinderRequest<CustomerFinderSetupResponse>(tenantId, '/setup')
}

export async function activateCustomerFinderSetup(
  tenantId: string,
  options: {
    includeReplyAgent?: boolean
  } = {},
): Promise<{
  setup: CustomerFinderSetupState
  config: CustomerFinderConfig
  agents: CustomerFinderAgentStatus[]
  runtimeConfigUpdatedAt: string | null
}> {
  return customerFinderRequest<{
    setup: CustomerFinderSetupState
    config: CustomerFinderConfig
    agents: CustomerFinderAgentStatus[]
    runtimeConfigUpdatedAt: string | null
  }>(tenantId, '/setup/activate', {
    method: 'POST',
    body: JSON.stringify({
      includeReplyAgent: options.includeReplyAgent ?? true,
    }),
  })
}

export async function runCustomerFinderDiscovery(
  tenantId: string,
  input: {
    query?: string
    limit?: number
    includeContactPages?: boolean
    runId?: string
    runName?: string
    searchProvider?: 'default' | 'duckduckgo-html' | 'web-search-api'
    intent?: 'companies' | 'owners' | 'both'
  } = {},
): Promise<CustomerFinderDiscoveryRunResponse> {
  return customerFinderRequest<CustomerFinderDiscoveryRunResponse>(tenantId, '/discovery/run', {
    method: 'POST',
    body: JSON.stringify({
      query: input.query,
      limit: input.limit,
      includeContactPages: input.includeContactPages,
      runId: input.runId,
      runName: input.runName,
      searchProvider: input.searchProvider ?? 'default',
      intent: input.intent,
    }),
  })
}

export async function runCustomerFinderAgents(
  tenantId: string,
  input: {
    agentId?: 'lead-discovery' | 'lead-research' | 'outreach' | 'reply-handler' | 'all'
    query?: string
    limit?: number
    includeContactPages?: boolean
    runId?: string
    runName?: string
    searchProvider?: 'default' | 'duckduckgo-html' | 'web-search-api'
    intent?: 'companies' | 'owners' | 'both'
  } = {},
): Promise<CustomerFinderAgentsRunResponse> {
  return customerFinderRequest<CustomerFinderAgentsRunResponse>(tenantId, '/agents/run', {
    method: 'POST',
    body: JSON.stringify({
      agentId: input.agentId ?? 'all',
      query: input.query,
      limit: input.limit,
      includeContactPages: input.includeContactPages,
      runId: input.runId,
      runName: input.runName,
      searchProvider: input.searchProvider ?? 'default',
      intent: input.intent,
    }),
  })
}

export async function updateCustomerFinderConfig(
  tenantId: string,
  config: CustomerFinderConfig,
): Promise<CustomerFinderConfigResponse> {
  return customerFinderRequest<CustomerFinderConfigResponse>(tenantId, '/config', {
    method: 'PUT',
    body: JSON.stringify({
      config: mergeWithDefaultCustomerFinderConfig(config),
    }),
  })
}

export async function listCustomerFinderLeads(
  tenantId: string,
  options: { stage?: LeadStage; search?: string; limit?: number; runId?: string; includeAllRuns?: boolean } = {},
): Promise<CustomerFinderLeadsResponse> {
  const query = new URLSearchParams()
  if (options.stage) query.set('stage', options.stage)
  if (options.search?.trim()) query.set('search', options.search.trim())
  if (options.limit !== undefined) query.set('limit', String(options.limit))
  if (options.runId?.trim()) query.set('runId', options.runId.trim())
  if (options.includeAllRuns) query.set('includeAllRuns', 'true')
  const querySuffix = query.toString() ? `?${query.toString()}` : ''
  return customerFinderRequest<CustomerFinderLeadsResponse>(tenantId, `/leads${querySuffix}`)
}

export async function upsertCustomerFinderLeads(
  tenantId: string,
  leads: CustomerFinderLeadInput[],
  source?: string,
): Promise<{ leads: CustomerFinderLead[]; total: number }> {
  return customerFinderRequest<{ leads: CustomerFinderLead[]; total: number }>(tenantId, '/leads', {
    method: 'POST',
    body: JSON.stringify({
      leads,
      source,
    }),
  })
}

export async function updateCustomerFinderLeadStage(
  tenantId: string,
  leadId: string,
  stage: LeadStage,
  reason?: string,
): Promise<{ lead: CustomerFinderLead }> {
  return customerFinderRequest<{ lead: CustomerFinderLead }>(
    tenantId,
    `/leads/${encodeURIComponent(leadId)}/stage`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        stage,
        reason,
      }),
    },
  )
}

export async function manageCustomerFinderLeads(
  tenantId: string,
  input: {
    action: 'start_fresh' | 'discard' | 'export' | 'export_discard' | 'approve_outreach'
    runId?: string
    runName?: string
    includeAllRuns?: boolean
    format?: 'csv' | 'json'
  },
): Promise<CustomerFinderLeadManagementResponse> {
  return customerFinderRequest<CustomerFinderLeadManagementResponse>(tenantId, '/leads/manage', {
    method: 'POST',
    body: JSON.stringify({
      action: input.action,
      runId: input.runId,
      runName: input.runName,
      includeAllRuns: input.includeAllRuns ?? false,
      format: input.format ?? 'csv',
    }),
  })
}

export async function uploadCustomerFinderKnowledgeDocument(
  tenantId: string,
  input: {
    fileName: string
    format: CustomerFinderKnowledgeDocumentFormat
    target: CustomerFinderKnowledgeDocumentTarget
    content: string
  },
): Promise<CustomerFinderKnowledgeUploadResponse> {
  return customerFinderRequest<CustomerFinderKnowledgeUploadResponse>(tenantId, '/knowledge/documents', {
    method: 'POST',
    body: JSON.stringify({
      fileName: input.fileName,
      format: input.format,
      target: input.target,
      content: input.content,
    }),
  })
}

export async function deleteCustomerFinderKnowledgeDocument(
  tenantId: string,
  documentId: string,
): Promise<CustomerFinderKnowledgeDeleteResponse> {
  return customerFinderRequest<CustomerFinderKnowledgeDeleteResponse>(
    tenantId,
    `/knowledge/documents/${encodeURIComponent(documentId)}`,
    {
      method: 'DELETE',
    },
  )
}

async function customerFinderRequest<T>(
  tenantId: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return await runQueuedTenantRequest(tenantId, async () => {
    const backendUrl = getBackendUrl()
    const headers = await buildTenantAuthHeaders(tenantId, {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    })

    for (let attempt = 1; attempt <= TRANSIENT_LIMIT_RETRY_ATTEMPTS; attempt += 1) {
      const response = await fetch(`${backendUrl}/api/v1/customer-finder${path}`, {
        ...init,
        headers,
        cache: 'no-store',
      })

      const payload = await readJsonBody(response)
      if (response.ok) {
        return payload as T
      }

      const payloadRecord = readRecord(payload)
      const errorCode = readString(payloadRecord?.error)
      const isRetryableLimitError = response.status === 429
        && (errorCode === 'CONCURRENCY_LIMIT_EXCEEDED' || errorCode === 'RATE_LIMIT_EXCEEDED')
      if (isRetryableLimitError && attempt < TRANSIENT_LIMIT_RETRY_ATTEMPTS) {
        const jitterMs = Math.floor(Math.random() * 120)
        const backoffMs = (TRANSIENT_LIMIT_BASE_BACKOFF_MS * (2 ** (attempt - 1))) + jitterMs
        await wait(backoffMs)
        continue
      }

      const limit = readNumber(payloadRecord?.limit)
      let message =
        readString(payloadRecord?.message) ??
        readString(payloadRecord?.error) ??
        `Customer finder request failed (${response.status})`
      if (
        limit !== null
        && (errorCode === 'CONCURRENCY_LIMIT_EXCEEDED' || errorCode === 'RATE_LIMIT_EXCEEDED')
      ) {
        message = `${message} (limit: ${limit})`
      }
      throw new CustomerFinderRequestError(response.status, message, payload)
    }

    throw new CustomerFinderRequestError(
      429,
      'Customer finder request retried too many times due to tenant limits.',
      null,
    )
  })
}

async function readJsonBody(response: Response): Promise<unknown> {
  const bodyText = await response.text()
  if (!bodyText) {
    return null
  }
  try {
    return JSON.parse(bodyText)
  } catch {
    return {
      raw: bodyText,
    }
  }
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return null
}

async function runQueuedTenantRequest<T>(tenantId: string, operation: () => Promise<T>): Promise<T> {
  const prior = tenantRequestQueueById.get(tenantId) ?? Promise.resolve()
  let releaseCurrent: () => void = () => {}
  const current = new Promise<void>((resolve) => {
    releaseCurrent = () => resolve()
  })
  tenantRequestQueueById.set(tenantId, prior.then(() => current))

  await prior
  try {
    const result = await operation()
    await wait(TENANT_QUEUE_SPACING_MS)
    return result
  } finally {
    releaseCurrent()
    if (tenantRequestQueueById.get(tenantId) === current) {
      tenantRequestQueueById.delete(tenantId)
    }
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  const deduped = new Set<string>()
  for (const item of values) {
    if (typeof item !== 'string') {
      continue
    }
    const normalized = item.trim()
    if (!normalized) {
      continue
    }
    deduped.add(normalized)
  }
  return [...deduped]
}

export function mergeWithDefaultCustomerFinderConfig(
  input: Partial<CustomerFinderConfig> | CustomerFinderConfig,
): CustomerFinderConfig {
  const defaults = createDefaultCustomerFinderConfig()
  const requestedProvider = input.outreachSetup?.email?.provider
  const emailProvider = requestedProvider === 'gmail' || requestedProvider === 'smtp' || requestedProvider === 'none'
    ? requestedProvider
    : defaults.outreachSetup.email.provider

  return {
    leadSources: {
      linkedin: input.leadSources?.linkedin ?? defaults.leadSources.linkedin,
      webSearch: input.leadSources?.webSearch ?? defaults.leadSources.webSearch,
      directories: input.leadSources?.directories ?? defaults.leadSources.directories,
      social: input.leadSources?.social ?? defaults.leadSources.social,
      manualImport: input.leadSources?.manualImport ?? defaults.leadSources.manualImport,
      discoveryProvider: normalizeDiscoveryProvider(
        input.leadSources?.discoveryProvider,
        defaults.leadSources.discoveryProvider,
      ),
      webSearchApi: {
        provider: normalizeSearchApiProvider(
          input.leadSources?.webSearchApi?.provider,
          defaults.leadSources.webSearchApi.provider,
        ),
        apiKey: normalizeTrimmedText(input.leadSources?.webSearchApi?.apiKey),
        baseUrl: normalizeTrimmedText(input.leadSources?.webSearchApi?.baseUrl),
        model: normalizeTrimmedText(input.leadSources?.webSearchApi?.model),
        maxResults: normalizeBoundedInteger(
          input.leadSources?.webSearchApi?.maxResults,
          1,
          10,
          defaults.leadSources.webSearchApi.maxResults,
        ),
        timeoutSeconds: normalizeBoundedInteger(
          input.leadSources?.webSearchApi?.timeoutSeconds,
          5,
          120,
          defaults.leadSources.webSearchApi.timeoutSeconds,
        ),
      },
      browserAutomation: {
        enabled: input.leadSources?.browserAutomation?.enabled ?? defaults.leadSources.browserAutomation.enabled,
        defaultProfile:
          normalizeTrimmedText(input.leadSources?.browserAutomation?.defaultProfile)
          || defaults.leadSources.browserAutomation.defaultProfile,
        headless: input.leadSources?.browserAutomation?.headless ?? defaults.leadSources.browserAutomation.headless,
      },
    },
    outreachChannels: {
      email: input.outreachChannels?.email ?? defaults.outreachChannels.email,
      linkedin: input.outreachChannels?.linkedin ?? defaults.outreachChannels.linkedin,
      x: input.outreachChannels?.x ?? defaults.outreachChannels.x,
      phone: input.outreachChannels?.phone ?? defaults.outreachChannels.phone,
    },
    outreachSetup: {
      email: {
        provider: emailProvider,
        fromEmail: normalizeTrimmedText(input.outreachSetup?.email?.fromEmail),
        fromName: normalizeTrimmedText(input.outreachSetup?.email?.fromName),
        replyTo: normalizeTrimmedText(input.outreachSetup?.email?.replyTo),
        gmailAppPassword: normalizeTrimmedText(input.outreachSetup?.email?.gmailAppPassword),
        smtpHost: normalizeTrimmedText(input.outreachSetup?.email?.smtpHost),
        smtpPort: normalizePort(input.outreachSetup?.email?.smtpPort, defaults.outreachSetup.email.smtpPort),
        smtpSecure: input.outreachSetup?.email?.smtpSecure ?? defaults.outreachSetup.email.smtpSecure,
        smtpUsername: normalizeTrimmedText(input.outreachSetup?.email?.smtpUsername),
        smtpPassword: normalizeTrimmedText(input.outreachSetup?.email?.smtpPassword),
      },
    },
    outreachPolicy: {
      tone: normalizePolicyTone(input.outreachPolicy?.tone, defaults.outreachPolicy.tone),
      allowOutreach: input.outreachPolicy?.allowOutreach ?? defaults.outreachPolicy.allowOutreach,
      allowFollowUps: input.outreachPolicy?.allowFollowUps ?? defaults.outreachPolicy.allowFollowUps,
      maxFollowUpsPerLead: normalizeBoundedInteger(
        input.outreachPolicy?.maxFollowUpsPerLead,
        0,
        10,
        defaults.outreachPolicy.maxFollowUpsPerLead,
      ),
      cta: normalizeTrimmedText(input.outreachPolicy?.cta) || defaults.outreachPolicy.cta,
      signature: normalizeTrimmedText(input.outreachPolicy?.signature) || defaults.outreachPolicy.signature,
      blockedTerms: normalizeStringList(input.outreachPolicy?.blockedTerms),
    },
    replyPolicy: {
      tone: normalizePolicyTone(input.replyPolicy?.tone, defaults.replyPolicy.tone),
      allowReplyHandling: input.replyPolicy?.allowReplyHandling ?? defaults.replyPolicy.allowReplyHandling,
      allowAutoReplies: input.replyPolicy?.allowAutoReplies ?? defaults.replyPolicy.allowAutoReplies,
      maxAutoRepliesPerLead: normalizeBoundedInteger(
        input.replyPolicy?.maxAutoRepliesPerLead,
        0,
        10,
        defaults.replyPolicy.maxAutoRepliesPerLead,
      ),
      escalateOnPricing: input.replyPolicy?.escalateOnPricing ?? defaults.replyPolicy.escalateOnPricing,
      escalateOnLegal: input.replyPolicy?.escalateOnLegal ?? defaults.replyPolicy.escalateOnLegal,
      escalateOnSecurity: input.replyPolicy?.escalateOnSecurity ?? defaults.replyPolicy.escalateOnSecurity,
      escalateOnNegativeSentiment:
        input.replyPolicy?.escalateOnNegativeSentiment ?? defaults.replyPolicy.escalateOnNegativeSentiment,
      blockedTerms: normalizeStringList(input.replyPolicy?.blockedTerms),
    },
    targeting: {
      industries: normalizeStringList(input.targeting?.industries),
      locations: normalizeStringList(input.targeting?.locations),
      includeKeywords: normalizeStringList(input.targeting?.includeKeywords),
      excludeKeywords: normalizeStringList(input.targeting?.excludeKeywords),
      competitors: normalizeStringList(input.targeting?.competitors),
      intent: normalizeTargetIntent(input.targeting?.intent, defaults.targeting.intent),
      contactRoles: normalizeStringList(input.targeting?.contactRoles),
    },
    guardrails: {
      doNotContactDomains: normalizeStringList(input.guardrails?.doNotContactDomains).map((item) => item.toLowerCase()),
      doNotContactCompanies: normalizeStringList(input.guardrails?.doNotContactCompanies),
      blockPersonalEmails: input.guardrails?.blockPersonalEmails ?? defaults.guardrails.blockPersonalEmails,
      maxDailyOutreach: normalizePositiveInteger(input.guardrails?.maxDailyOutreach, defaults.guardrails.maxDailyOutreach),
      requireHumanApproval: input.guardrails?.requireHumanApproval ?? defaults.guardrails.requireHumanApproval,
    },
    dataFields: {
      companyName: input.dataFields?.companyName ?? defaults.dataFields.companyName,
      contactName: input.dataFields?.contactName ?? defaults.dataFields.contactName,
      email: input.dataFields?.email ?? defaults.dataFields.email,
      phone: input.dataFields?.phone ?? defaults.dataFields.phone,
      website: input.dataFields?.website ?? defaults.dataFields.website,
      pageTitle: input.dataFields?.pageTitle ?? defaults.dataFields.pageTitle,
      contactPageUrl: input.dataFields?.contactPageUrl ?? defaults.dataFields.contactPageUrl,
    },
    execution: {
      autoResearch: input.execution?.autoResearch ?? defaults.execution.autoResearch,
      autoDraftReplies: input.execution?.autoDraftReplies ?? defaults.execution.autoDraftReplies,
      autoStageProgression: input.execution?.autoStageProgression ?? defaults.execution.autoStageProgression,
      autopilotEnabled: input.execution?.autopilotEnabled ?? defaults.execution.autopilotEnabled,
      autopilotIntervalMinutes: normalizePositiveInteger(
        input.execution?.autopilotIntervalMinutes,
        defaults.execution.autopilotIntervalMinutes,
      ),
      autopilotLeadLimit: normalizePositiveInteger(
        input.execution?.autopilotLeadLimit,
        defaults.execution.autopilotLeadLimit,
      ),
      autopilotIncludeContactPages:
        input.execution?.autopilotIncludeContactPages ?? defaults.execution.autopilotIncludeContactPages,
    },
  }
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  const rounded = Math.round(value)
  return rounded > 0 ? rounded : fallback
}

function normalizePort(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  const rounded = Math.round(value)
  if (rounded < 1 || rounded > 65_535) {
    return fallback
  }
  return rounded
}

function normalizeTrimmedText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

function normalizeBoundedInteger(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  const rounded = Math.round(value)
  if (rounded < min || rounded > max) {
    return fallback
  }
  return rounded
}

function normalizePolicyTone(
  value: unknown,
  fallback: 'professional' | 'friendly' | 'direct' | 'consultative',
): 'professional' | 'friendly' | 'direct' | 'consultative' {
  if (value === 'professional' || value === 'friendly' || value === 'direct' || value === 'consultative') {
    return value
  }
  return fallback
}

function normalizeTargetIntent(
  value: unknown,
  fallback: 'companies' | 'owners' | 'both',
): 'companies' | 'owners' | 'both' {
  if (value === 'companies' || value === 'owners' || value === 'both') {
    return value
  }
  return fallback
}

function normalizeDiscoveryProvider(
  value: unknown,
  fallback: 'duckduckgo-html' | 'web-search-api',
): 'duckduckgo-html' | 'web-search-api' {
  if (value === 'duckduckgo-html' || value === 'web-search-api') {
    return value
  }
  return fallback
}

function normalizeSearchApiProvider(
  value: unknown,
  fallback: 'none' | 'brave' | 'perplexity' | 'gemini',
): 'none' | 'brave' | 'perplexity' | 'gemini' {
  if (value === 'none' || value === 'brave' || value === 'perplexity' || value === 'gemini') {
    return value
  }
  return fallback
}
