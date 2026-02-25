'use client'

import Link from 'next/link'
import { ChevronDown, Loader2, MessageSquare, Pause, Play, Plus, RefreshCw, Settings2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AgentPipeline } from '@/components/customer-finder/agent-pipeline'
import { LeadsPanel } from '@/components/customer-finder/leads-panel'
import { OpenClawUiLaunchButton } from '@/components/openclaw-ui-launch-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  activateCustomerFinderSetup,
  deleteCustomerFinderKnowledgeDocument,
  LEAD_STAGE_LABELS,
  LEAD_STAGE_ORDER,
  createDefaultCustomerFinderConfig,
  fetchCustomerFinderConfig,
  fetchCustomerFinderOverview,
  fetchCustomerFinderSetup,
  isOutreachEmailConfigured,
  manageCustomerFinderLeads,
  mergeWithDefaultCustomerFinderConfig,
  runCustomerFinderAgents,
  uploadCustomerFinderKnowledgeDocument,
  updateCustomerFinderConfig,
  updateCustomerFinderLeadStage,
  upsertCustomerFinderLeads,
  CustomerFinderRequestError,
  type CustomerFinderConfig,
  type CustomerFinderKnowledgeDocumentFormat,
  type CustomerFinderKnowledgeDocumentTarget,
  type CustomerFinderOverview,
  type CustomerFinderSetupState,
  type LeadStage,
} from '@/lib/customer-finder'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'
import {
  DiscoverIcon,
  OutreachIcon,
  ResearchIcon,
  ReplyIcon,
} from '@/components/customer-finder/icons'

/* ── Helpers ──────────────────────────────────────────────── */

function formatRelativeTime(value: string | null): string {
  if (!value) return 'Never'
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  const diff = Date.now() - parsed
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(parsed).toLocaleDateString()
}

function stageBadgeClasses(stage: LeadStage): string {
  if (stage === 'won') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
  if (stage === 'disqualified') return 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
  if (stage === 'replied' || stage === 'meeting_booked') return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20'
  if (stage === 'outreach_sent' || stage === 'ready_for_outreach') return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20'
  return 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20'
}

/* Agent icon mapping */
const AGENT_VISUALS: Record<string, { Icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  discovered: { Icon: DiscoverIcon, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  researching: { Icon: ResearchIcon, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  ready_for_outreach: { Icon: OutreachIcon, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  replied: { Icon: ReplyIcon, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
}

function getAgentVisual(stage: string) {
  return AGENT_VISUALS[stage] ?? { Icon: DiscoverIcon, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' }
}

type RunnableAgentMode = 'all' | 'lead-discovery' | 'lead-research' | 'outreach' | 'reply-handler'

const RUN_MODE_OPTIONS: Array<{ value: RunnableAgentMode; label: string; description: string }> = [
  {
    value: 'all',
    label: 'Full pipeline',
    description: 'Run discovery, research, outreach, and reply handling in order.',
  },
  {
    value: 'lead-discovery',
    label: 'Lead discovery only',
    description: 'Find new prospects from web search and websites.',
  },
  {
    value: 'lead-research',
    label: 'Research only',
    description: 'Score discovered leads and move them to the next stage.',
  },
  {
    value: 'outreach',
    label: 'Outreach only',
    description: 'Prepare or send outreach for ready leads.',
  },
  {
    value: 'reply-handler',
    label: 'Reply handler only',
    description: 'Process replied leads and detect meeting intent.',
  },
]

function runModeRequiresEmailSetup(mode: RunnableAgentMode): boolean {
  return mode === 'all' || mode === 'outreach' || mode === 'reply-handler'
}

function getSuggestedDiscoveryQuery(config: CustomerFinderConfig): string {
  const intentHint = config.targeting.intent === 'owners'
    ? `${config.targeting.contactRoles[0] || 'owner'} OR founder OR ceo`
    : config.targeting.intent === 'both'
      ? 'companies and owners'
      : 'businesses'
  return [
    config.targeting.industries[0] ?? '',
    config.targeting.locations[0] ?? '',
    config.targeting.includeKeywords[0] ?? '',
    intentHint,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

function hasDiscoveryTargeting(config: CustomerFinderConfig): boolean {
  return [
    ...config.targeting.industries,
    ...config.targeting.locations,
    ...config.targeting.includeKeywords,
    ...config.targeting.contactRoles,
  ].some((value) => value.trim().length > 0)
}

function readRequestErrorCode(error: CustomerFinderRequestError): string | null {
  const payload = error.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }
  const code = (payload as Record<string, unknown>).error
  return typeof code === 'string' ? code : null
}

function resolveLeadRunScope(input: {
  leadRunFilter: 'latest' | 'all' | string
  runs: Array<{ runId: string; runName: string }> | undefined
}): {
  includeAllRuns: boolean
  runId?: string
  label: string
} {
  if (input.leadRunFilter === 'all') {
    return {
      includeAllRuns: true,
      label: 'all runs',
    }
  }
  if (input.leadRunFilter === 'latest') {
    const latestRun = input.runs?.[0]
    if (!latestRun) {
      return {
        includeAllRuns: false,
        label: 'latest run',
      }
    }
    return {
      includeAllRuns: false,
      runId: latestRun.runId,
      label: latestRun.runName || 'latest run',
    }
  }
  const selectedRun = (input.runs ?? []).find((run) => run.runId === input.leadRunFilter)
  return {
    includeAllRuns: false,
    runId: input.leadRunFilter,
    label: selectedRun?.runName || input.leadRunFilter.slice(0, 8),
  }
}

function downloadLeadExportFile(input: {
  fileName: string
  content: string
  format: 'csv' | 'json'
}): void {
  const mimeType = input.format === 'csv'
    ? 'text/csv;charset=utf-8'
    : 'application/json;charset=utf-8'
  const blob = new Blob([input.content], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = input.fileName
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

function splitCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinCommaSeparated(values: string[] | undefined): string {
  return (values ?? []).join(', ')
}

function inferKnowledgeDocumentFormat(fileName: string): CustomerFinderKnowledgeDocumentFormat | null {
  const normalized = fileName.trim().toLowerCase()
  if (normalized.endsWith('.md')) return 'md'
  if (normalized.endsWith('.txt')) return 'txt'
  if (normalized.endsWith('.csv')) return 'csv'
  if (normalized.endsWith('.json')) return 'json'
  return null
}

/* ── Page Component ───────────────────────────────────────── */

export default function CustomerFinderDashboardPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [loadingSetup, setLoadingSetup] = useState(true)
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [setupState, setSetupState] = useState<CustomerFinderSetupState | null>(null)
  const [includeReplyAgent, setIncludeReplyAgent] = useState(true)
  const [overview, setOverview] = useState<CustomerFinderOverview | null>(null)
  const [configDraft, setConfigDraft] = useState<CustomerFinderConfig | null>(null)
  const [configDirty, setConfigDirty] = useState(false)
  const configDirtyRef = useRef(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [stageUpdatingLeadId, setStageUpdatingLeadId] = useState<string | null>(null)
  const [leadFilterStage, setLeadFilterStage] = useState<'all' | LeadStage>('all')
  const [leadRunFilter, setLeadRunFilter] = useState<'latest' | 'all' | string>('latest')
  const [leadSearch, setLeadSearch] = useState('')
  const [addingLead, setAddingLead] = useState(false)
  const [managingLeads, setManagingLeads] = useState(false)
  const [newLeadCompany, setNewLeadCompany] = useState('')
  const [newLeadContact, setNewLeadContact] = useState('')
  const [newLeadEmail, setNewLeadEmail] = useState('')
  const [newLeadSource, setNewLeadSource] = useState('manual')

  // Modal states
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [startFindingOpen, setStartFindingOpen] = useState(false)
  const [emailSetupRequiredOpen, setEmailSetupRequiredOpen] = useState(false)
  const [knowledgeUploadTarget, setKnowledgeUploadTarget] = useState<CustomerFinderKnowledgeDocumentTarget>('both')
  const [knowledgeUploading, setKnowledgeUploading] = useState(false)
  const [deletingKnowledgeDocumentId, setDeletingKnowledgeDocumentId] = useState<string | null>(null)
  const [openClawUiError, setOpenClawUiError] = useState('')
  const [runningFinder, setRunningFinder] = useState(false)
  const [autopilotSaving, setAutopilotSaving] = useState(false)
  const [runMode, setRunMode] = useState<RunnableAgentMode>('all')
  const [runQuery, setRunQuery] = useState('')
  const [runLimit, setRunLimit] = useState('25')
  const [runIncludeContactPages, setRunIncludeContactPages] = useState(true)
  const [runSearchProvider, setRunSearchProvider] = useState<'default' | 'duckduckgo-html' | 'web-search-api'>('default')
  const [runIntent, setRunIntent] = useState<'companies' | 'owners' | 'both'>('companies')
  const [runEnableAutopilot, setRunEnableAutopilot] = useState(true)
  const [runAutopilotIntervalMinutes, setRunAutopilotIntervalMinutes] = useState('10')
  const leadRunFilterRef = useRef<'latest' | 'all' | string>('latest')
  const dashboardLoadInFlightRef = useRef(false)
  const setupLoadInFlightRef = useRef(false)

  useEffect(() => {
    configDirtyRef.current = configDirty
  }, [configDirty])

  useEffect(() => {
    leadRunFilterRef.current = leadRunFilter
  }, [leadRunFilter])

  /* ── Data loading (unchanged business logic) ────────────── */

  const loadDashboardData = useCallback(async (
    id: string,
    options: { silent?: boolean; skipRefreshState?: boolean } = {},
  ) => {
    if (!id) return
    if (dashboardLoadInFlightRef.current) return
    dashboardLoadInFlightRef.current = true
    if (options.silent && !options.skipRefreshState) setRefreshing(true)
    if (!options.silent) setLoadingOverview(true)

    try {
      const [nextOverview, nextConfig] = await Promise.all([
        fetchCustomerFinderOverview(id, {
          limit: 500,
          includeAllRuns: leadRunFilterRef.current === 'all',
          runId:
            leadRunFilterRef.current !== 'all' && leadRunFilterRef.current !== 'latest'
              ? leadRunFilterRef.current
              : undefined,
        }),
        fetchCustomerFinderConfig(id),
      ])
      setOverview(nextOverview)
      setConfigDraft((prev) => {
        if (configDirtyRef.current && prev) return prev
        return nextConfig.config
      })
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard.')
    } finally {
      dashboardLoadInFlightRef.current = false
      if (!options.skipRefreshState) setRefreshing(false)
      if (!options.silent) setLoadingOverview(false)
    }
  }, [])

  const loadSetupState = useCallback(async (
    id: string,
    options: { silent?: boolean } = {},
  ) => {
    if (!id) return
    if (setupLoadInFlightRef.current) return
    setupLoadInFlightRef.current = true
    if (options.silent) setRefreshing(true)
    else setLoadingSetup(true)

    try {
      const resp = await fetchCustomerFinderSetup(id)
      setSetupState(resp.setup)
      setIncludeReplyAgent(resp.setup.includeReplyAgent)
      setError('')

      if (resp.setup.status === 'active') {
        await loadDashboardData(id, { silent: options.silent, skipRefreshState: true })
      } else {
        setLoadingOverview(false)
        setOverview(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load setup.')
    } finally {
      setupLoadInFlightRef.current = false
      setRefreshing(false)
      setLoadingSetup(false)
    }
  }, [loadDashboardData])

  useEffect(() => {
    let cancelled = false
    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) { router.replace('/signin'); return }
        const complete = await isOnboardingComplete(session, { backfillFromProvisionedTenant: true })
        if (!complete) { router.replace('/dashboard'); return }
        const tid = deriveTenantIdFromUserId(session.user.id)
        if (!cancelled) { setTenantId(tid); setCheckingSession(false); void loadSetupState(tid) }
      } catch { router.replace('/signin') }
    }
    void loadSession()
    return () => { cancelled = true }
  }, [loadSetupState, router])

  useEffect(() => {
    if (!tenantId || !setupState) return
    if (setupState.status !== 'active' && setupState.status !== 'provisioning') return
    const handle = setInterval(() => {
      if (setupState.status === 'active') void loadDashboardData(tenantId, { silent: true })
      else void loadSetupState(tenantId, { silent: true })
    }, setupState.status === 'active' ? 5_000 : 3_000)
    return () => clearInterval(handle)
  }, [loadDashboardData, loadSetupState, setupState, tenantId])

  const filteredLeads = useMemo(() => {
    const records = overview?.leads ?? []
    const search = leadSearch.trim().toLowerCase()
    return records.filter((lead) => {
      if (leadFilterStage !== 'all' && lead.stage !== leadFilterStage) return false
      if (!search) return true
      return [
        lead.companyName,
        lead.contactName ?? '',
        lead.email ?? '',
        lead.phone ?? '',
        lead.pageTitle ?? '',
        lead.source,
        lead.notes ?? '',
        ...(lead.tags ?? []),
      ]
        .join(' ').toLowerCase().includes(search)
    })
  }, [leadFilterStage, leadSearch, overview?.leads])

  const visibleAgents = useMemo(
    () => (overview?.agents ?? []).filter((agent) => !agent.hidden),
    [overview?.agents],
  )

  const orchestratorAgent = useMemo(
    () => (overview?.agents ?? []).find((agent) => agent.agentId === 'orchestrator'),
    [overview?.agents],
  )
  const recentOrchestratorLogs = useMemo(
    () => (overview?.orchestratorLogs ?? []).slice(-3).reverse(),
    [overview?.orchestratorLogs],
  )
  const knowledgeDocuments = useMemo(
    () => (overview?.documents ?? []).slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [overview?.documents],
  )

  const defaultConfig = createDefaultCustomerFinderConfig()
  const config = mergeWithDefaultCustomerFinderConfig(configDraft ?? defaultConfig)
  const dataFields = config.dataFields ?? defaultConfig.dataFields
  const outreachEmailSetup = config.outreachSetup?.email ?? defaultConfig.outreachSetup.email
  const outreachEmailReady = isOutreachEmailConfigured(config)

  function patchConfig(updater: (prev: CustomerFinderConfig) => CustomerFinderConfig) {
    setConfigDraft((prev) => updater(prev ?? createDefaultCustomerFinderConfig()))
    setConfigDirty(true)
    setActionMessage('')
  }

  async function saveConfig() {
    if (!tenantId || !configDraft) return
    setSavingConfig(true); setError(''); setActionMessage('')
    try {
      const resp = await updateCustomerFinderConfig(tenantId, configDraft)
      setConfigDraft(resp.config); setConfigDirty(false); setActionMessage('Configuration saved.')
      await loadDashboardData(tenantId, { silent: true })
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.') }
    finally { setSavingConfig(false) }
  }

  function openStartFindingModal() {
    setRunMode('all')
    setRunQuery(getSuggestedDiscoveryQuery(config))
    setRunLimit(String(config.execution.autopilotLeadLimit || 25))
    setRunIncludeContactPages(config.execution.autopilotIncludeContactPages && dataFields.contactPageUrl)
    setRunSearchProvider('default')
    setRunIntent(config.targeting.intent)
    setRunEnableAutopilot(true)
    setRunAutopilotIntervalMinutes(String(config.execution.autopilotIntervalMinutes || 10))
    setStartFindingOpen(true)
    setError('')
    setActionMessage('')
  }

  async function startFindingCustomers() {
    if (!tenantId || !setupIsActive) return

    const normalizedQuery = runQuery.trim()
    const numericLimit = Number(runLimit)
    if (!Number.isFinite(numericLimit) || numericLimit < 1) {
      setError('Lead limit must be at least 1.')
      return
    }
    const safeLimit = Math.min(200, Math.round(numericLimit))
    const numericAutopilotInterval = Number(runAutopilotIntervalMinutes)
    if (runEnableAutopilot && (!Number.isFinite(numericAutopilotInterval) || numericAutopilotInterval < 1)) {
      setError('Autopilot interval must be at least 1 minute.')
      return
    }
    const safeAutopilotInterval = Math.min(240, Math.round(numericAutopilotInterval))
    if ((runMode === 'all' || runMode === 'lead-discovery') && !normalizedQuery && !hasDiscoveryTargeting(config)) {
      setError('Add who you want to target first (example: "roofing companies in Austin").')
      return
    }
    const effectiveSearchProvider = runSearchProvider === 'default'
      ? config.leadSources.discoveryProvider
      : runSearchProvider
    if (
      (runMode === 'all' || runMode === 'lead-discovery')
      && effectiveSearchProvider === 'web-search-api'
      && (
        config.leadSources.webSearchApi.provider === 'none'
        || !config.leadSources.webSearchApi.apiKey.trim()
      )
    ) {
      setError('Web search API is selected but API provider/key are missing in Settings.')
      return
    }
    if (runModeRequiresEmailSetup(runMode) && !outreachEmailReady) {
      setEmailSetupRequiredOpen(true)
      setError('')
      return
    }

    setRunningFinder(true)
    setError('')
    setActionMessage('')
    try {
      const shouldPersistAutopilot =
        config.execution.autopilotEnabled !== runEnableAutopilot ||
        config.execution.autopilotLeadLimit !== safeLimit ||
        config.execution.autopilotIncludeContactPages !== runIncludeContactPages ||
        (runEnableAutopilot && config.execution.autopilotIntervalMinutes !== safeAutopilotInterval)

      let autopilotSummary = ''
      if (shouldPersistAutopilot) {
        const nextConfig: CustomerFinderConfig = {
          ...config,
          execution: {
            ...config.execution,
            autopilotEnabled: runEnableAutopilot,
            autopilotIntervalMinutes: runEnableAutopilot
              ? safeAutopilotInterval
              : config.execution.autopilotIntervalMinutes,
            autopilotLeadLimit: safeLimit,
            autopilotIncludeContactPages: runIncludeContactPages,
          },
        }
        const saved = await updateCustomerFinderConfig(tenantId, nextConfig)
        setConfigDraft(saved.config)
        setConfigDirty(false)
        autopilotSummary = runEnableAutopilot
          ? ` Autopilot enabled (every ${saved.config.execution.autopilotIntervalMinutes} min).`
          : ' Autopilot is off.'
      }

      const result = await runCustomerFinderAgents(tenantId, {
        agentId: runMode,
        query: normalizedQuery || undefined,
        limit: safeLimit,
        includeContactPages: runIncludeContactPages,
        searchProvider: runSearchProvider,
        intent: runIntent,
        runId: leadRunFilter !== 'all' && leadRunFilter !== 'latest'
          ? leadRunFilter
          : undefined,
      })
      const summaries = result.results
        .map((item) => item.summary.trim())
        .filter(Boolean)
      setActionMessage(
        summaries.length > 0
          ? `[${result.runId}] ${summaries.join(' ')}${autopilotSummary}`.trim()
          : `[${result.runId}] Customer finding run completed.${autopilotSummary}`.trim(),
      )
      if (leadRunFilter === 'all' || leadRunFilter === 'latest') {
        setLeadRunFilter(result.runId)
      }
      setStartFindingOpen(false)
      await loadDashboardData(tenantId, { silent: true })
    } catch (e) {
      if (e instanceof CustomerFinderRequestError) {
        const code = readRequestErrorCode(e)
        if (code === 'DISCOVERY_QUERY_REQUIRED') {
          setError('Add a target query to run discovery (example: "roofers in Dallas").')
        } else if (code === 'LEAD_SOURCE_DISABLED') {
          setError('Web search source is disabled. Enable it from Settings before discovery.')
        } else if (code === 'WEB_SEARCH_API_NOT_CONFIGURED') {
          setError('Web search API is selected but not configured. Add API provider + key in Settings.')
        } else if (code === 'OUTREACH_EMAIL_SETUP_REQUIRED') {
          setError('')
          setEmailSetupRequiredOpen(true)
        } else {
          setError(e.message)
        }
      } else {
        setError(e instanceof Error ? e.message : 'Failed to run customer finding.')
      }
    } finally {
      setRunningFinder(false)
    }
  }

  async function stopAutopilot() {
    if (!tenantId || !setupIsActive || !config.execution.autopilotEnabled) return
    setAutopilotSaving(true)
    setError('')
    setActionMessage('')
    try {
      const nextConfig: CustomerFinderConfig = {
        ...config,
        execution: {
          ...config.execution,
          autopilotEnabled: false,
        },
      }
      const saved = await updateCustomerFinderConfig(tenantId, nextConfig)
      setConfigDraft(saved.config)
      setConfigDirty(false)
      setActionMessage('Autopilot stopped. Agents will stay idle until you start again.')
      await loadDashboardData(tenantId, { silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to stop autopilot.')
    } finally {
      setAutopilotSaving(false)
    }
  }

  async function handleLeadStageChange(leadId: string, stage: LeadStage) {
    if (!tenantId) return
    setStageUpdatingLeadId(leadId); setError(''); setActionMessage('')
    try {
      await updateCustomerFinderLeadStage(tenantId, leadId, stage, 'manual_dashboard_update')
      setActionMessage('Stage updated.')
      await loadDashboardData(tenantId, { silent: true })
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to update stage.') }
    finally { setStageUpdatingLeadId(null) }
  }

  async function addLead() {
    if (!tenantId) return
    if (!newLeadCompany.trim()) { setError('Company name is required.'); return }
    const targetRunId = leadRunFilter !== 'all' && leadRunFilter !== 'latest' ? leadRunFilter : undefined
    setAddingLead(true); setError(''); setActionMessage('')
    try {
      await upsertCustomerFinderLeads(tenantId, [{
        runId: targetRunId,
        companyName: newLeadCompany.trim(),
        contactName: newLeadContact.trim() || undefined,
        email: newLeadEmail.trim() || undefined,
        source: newLeadSource.trim() || 'manual',
        stage: 'discovered',
      }])
      setNewLeadCompany(''); setNewLeadContact(''); setNewLeadEmail(''); setNewLeadSource('manual')
      setActionMessage('Lead added.')
      setAddLeadOpen(false)
      await loadDashboardData(tenantId, { silent: true })
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to add lead.') }
    finally { setAddingLead(false) }
  }

  async function uploadKnowledgeFile(file: File) {
    if (!tenantId) return

    const format = inferKnowledgeDocumentFormat(file.name)
    if (!format) {
      setError('Supported knowledge file formats: .md, .txt, .csv, .json.')
      return
    }
    if (file.size > 350_000) {
      setError('Knowledge file is too large. Keep it under 350 KB for best results.')
      return
    }

    setKnowledgeUploading(true)
    setError('')
    setActionMessage('')
    try {
      const content = await file.text()
      if (!content.trim()) {
        setError('The selected file is empty.')
        return
      }
      await uploadCustomerFinderKnowledgeDocument(tenantId, {
        fileName: file.name,
        format,
        target: knowledgeUploadTarget,
        content,
      })
      setActionMessage(`Uploaded "${file.name}" for ${knowledgeUploadTarget === 'both' ? 'Outreach + Reply' : knowledgeUploadTarget}.`)
      await loadDashboardData(tenantId, { silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload knowledge document.')
    } finally {
      setKnowledgeUploading(false)
    }
  }

  async function deleteKnowledgeDocument(documentId: string) {
    if (!tenantId) return

    setDeletingKnowledgeDocumentId(documentId)
    setError('')
    setActionMessage('')
    try {
      await deleteCustomerFinderKnowledgeDocument(tenantId, documentId)
      setActionMessage('Knowledge document removed.')
      await loadDashboardData(tenantId, { silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete knowledge document.')
    } finally {
      setDeletingKnowledgeDocumentId(null)
    }
  }

  async function startFreshLeadList() {
    if (!tenantId) return
    const suggestedName = `Leads ${new Date().toLocaleDateString()}`
    const runNameInput = window.prompt('Name this lead list:', suggestedName)
    if (runNameInput === null) {
      return
    }
    const runName = runNameInput.trim()

    setManagingLeads(true)
    setError('')
    setActionMessage('')
    try {
      const response = await manageCustomerFinderLeads(tenantId, {
        action: 'start_fresh',
        runName: runName || undefined,
      })
      if (response.run?.runId) {
        setLeadRunFilter(response.run.runId)
      } else {
        setLeadRunFilter('latest')
      }
      setLeadFilterStage('all')
      setLeadSearch('')
      setActionMessage(
        response.run?.name
          ? `Started fresh lead list: ${response.run.name}.`
          : 'Started a fresh lead list.',
      )
      await loadDashboardData(tenantId, { silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start a fresh lead list.')
    } finally {
      setManagingLeads(false)
    }
  }

  async function exportScopedLeads() {
    if (!tenantId) return
    const scope = resolveLeadRunScope({
      leadRunFilter,
      runs: overview?.runs,
    })
    setManagingLeads(true)
    setError('')
    setActionMessage('')
    try {
      const response = await manageCustomerFinderLeads(tenantId, {
        action: 'export',
        runId: scope.runId,
        includeAllRuns: scope.includeAllRuns,
        format: 'csv',
      })
      if (response.export) {
        downloadLeadExportFile(response.export)
      }
      setActionMessage(`Exported ${response.export?.leadCount ?? 0} leads from ${scope.label}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export leads.')
    } finally {
      setManagingLeads(false)
    }
  }

  async function discardScopedLeads() {
    if (!tenantId) return
    const scope = resolveLeadRunScope({
      leadRunFilter,
      runs: overview?.runs,
    })
    const confirmed = window.confirm(`Discard leads from ${scope.label}? This action cannot be undone.`)
    if (!confirmed) {
      return
    }
    setManagingLeads(true)
    setError('')
    setActionMessage('')
    try {
      const response = await manageCustomerFinderLeads(tenantId, {
        action: 'discard',
        runId: scope.runId,
        includeAllRuns: scope.includeAllRuns,
      })
      if (scope.includeAllRuns || (scope.runId && leadRunFilter === scope.runId)) {
        setLeadRunFilter('latest')
      }
      setLeadFilterStage('all')
      setActionMessage(`Discarded ${response.discarded ?? 0} leads from ${scope.label}.`)
      await loadDashboardData(tenantId, { silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to discard leads.')
    } finally {
      setManagingLeads(false)
    }
  }

  async function exportAndDiscardScopedLeads() {
    if (!tenantId) return
    const scope = resolveLeadRunScope({
      leadRunFilter,
      runs: overview?.runs,
    })
    const confirmed = window.confirm(`Export and then discard leads from ${scope.label}?`)
    if (!confirmed) {
      return
    }
    setManagingLeads(true)
    setError('')
    setActionMessage('')
    try {
      const response = await manageCustomerFinderLeads(tenantId, {
        action: 'export_discard',
        runId: scope.runId,
        includeAllRuns: scope.includeAllRuns,
        format: 'csv',
      })
      if (response.export) {
        downloadLeadExportFile(response.export)
      }
      if (scope.includeAllRuns || (scope.runId && leadRunFilter === scope.runId)) {
        setLeadRunFilter('latest')
      }
      setLeadFilterStage('all')
      setActionMessage(
        `Exported ${response.export?.leadCount ?? 0} leads and discarded ${response.discarded ?? 0} from ${scope.label}.`,
      )
      await loadDashboardData(tenantId, { silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export and discard leads.')
    } finally {
      setManagingLeads(false)
    }
  }

  const activateSetup = useCallback(async () => {
    if (!tenantId) return
    setActivating(true)
    setError('')
    setActionMessage('')
    try {
      const resp = await activateCustomerFinderSetup(tenantId, { includeReplyAgent })
      setSetupState(resp.setup); setConfigDraft(resp.config); setConfigDirty(false)
      if (resp.setup.status === 'active') {
        setActionMessage('Growth Agent enabled.')
        await loadDashboardData(tenantId, { silent: true, skipRefreshState: true })
      } else {
        setActionMessage('Enabling Growth Agent. This usually takes less than a minute.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enable Growth Agent.')
    }
    finally { setActivating(false) }
  }, [includeReplyAgent, loadDashboardData, tenantId])

  const setupStatus = setupState?.status ?? 'inactive'
  const setupIsActive = setupStatus === 'active'

  useEffect(() => {
    if (!tenantId || setupStatus !== 'active') return
    void loadDashboardData(tenantId, { silent: true })
  }, [leadRunFilter, loadDashboardData, setupStatus, tenantId])

  function redirectToSignIn() {
    const currentPath = typeof window === 'undefined'
      ? '/dashboard/customer-finder'
      : `${window.location.pathname}${window.location.search}`
    router.replace(buildSignInPath(currentPath))
  }

  /* ── Loading ────────────────────────────────────────────── */

  if (checkingSession || loadingSetup) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-foreground">Growth Agent</h1>
              {setupIsActive && (
                <span className="inline-flex h-5 items-center rounded-full bg-emerald-500/10 px-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Active
                </span>
              )}
              {setupIsActive && config.execution.autopilotEnabled && (
                <span className="inline-flex h-5 items-center rounded-full bg-violet-500/10 px-2 text-[10px] font-semibold text-violet-700 dark:text-violet-400">
                  Autopilot
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {setupIsActive && config.execution.autopilotEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void stopAutopilot()}
                disabled={autopilotSaving || runningFinder || loadingOverview || activating}
                className="h-8 gap-1.5 px-3 text-xs"
              >
                {autopilotSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Stop Autopilot</span>
                <span className="sm:hidden">Stop</span>
              </Button>
            ) : setupIsActive ? (
              <Button
                size="sm"
                onClick={openStartFindingModal}
                disabled={runningFinder || loadingOverview || activating || autopilotSaving}
                className="h-8 gap-1.5 bg-violet-600 px-3 text-xs text-white hover:bg-violet-700"
              >
                {runningFinder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Start Finding Customers</span>
                <span className="sm:hidden">Start</span>
              </Button>
            ) : setupStatus === 'provisioning' || activating ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-8 gap-1.5 px-3 text-xs"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Enabling…</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => void activateSetup()}
                className="h-8 gap-1.5 bg-violet-600 px-3 text-xs text-white hover:bg-violet-700"
              >
                <Play className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Enable Growth Agent</span>
                <span className="sm:hidden">Enable</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
              <Link href="/chat">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open Chat</span>
              </Link>
            </Button>
            <OpenClawUiLaunchButton
              tenantId={tenantId}
              label="OpenClaw UI"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
              onLaunchStart={() => setOpenClawUiError('')}
              onError={setOpenClawUiError}
              onUnauthorized={redirectToSignIn}
            />
            {setupIsActive && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setAddLeadOpen(true)} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add Lead</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} className="gap-1.5 text-xs">
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (tenantId) {
                  if (setupIsActive) void loadDashboardData(tenantId, { silent: true })
                  else void loadSetupState(tenantId, { silent: true })
                }
              }}
              disabled={refreshing || loadingOverview || activating}
              className="text-xs"
            >
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* ── Toast messages ──────────────────────────────── */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button type="button" onClick={() => setError('')} className="text-red-500/60 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {openClawUiError && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5">
            <p className="text-sm text-red-700 dark:text-red-400">{openClawUiError}</p>
            <button type="button" onClick={() => setOpenClawUiError('')} className="text-red-500/60 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {actionMessage && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{actionMessage}</p>
            <button type="button" onClick={() => setActionMessage('')} className="text-emerald-500/60 hover:text-emerald-500"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {!setupIsActive ? (
          <div className="mx-auto max-w-2xl py-10 sm:py-14">
            <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-7">
              <h2 className="text-base font-semibold text-foreground">Enable Growth Agent</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This workflow is optional. Enable it when you want autonomous lead discovery, research, outreach, and reply handling.
              </p>

              <label className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Include Reply Agent</p>
                  <p className="text-xs text-muted-foreground">Allow inbound reply handling from day one.</p>
                </div>
                <Switch
                  checked={includeReplyAgent}
                  onCheckedChange={setIncludeReplyAgent}
                  disabled={activating || setupStatus === 'provisioning'}
                />
              </label>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => void activateSetup()}
                  disabled={activating || setupStatus === 'provisioning'}
                  className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
                >
                  {activating || setupStatus === 'provisioning' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {activating || setupStatus === 'provisioning' ? 'Enabling...' : 'Enable Growth Agent'}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/templates">Back to Workflows</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── KPI Stats (4 key numbers) ───────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Leads', value: overview?.totals.leads ?? 0 },
                { label: 'Contacted', value: overview?.totals.contacted ?? 0 },
                { label: 'Replied', value: overview?.totals.replied ?? 0 },
                { label: 'Won', value: overview?.totals.won ?? 0 },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/60 bg-card px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* ── Agents Pipeline ─────────────────────────── */}
            <AgentPipeline
              agents={visibleAgents}
              orchestratorAgent={orchestratorAgent}
              orchestratorLogs={overview?.orchestratorLogs}
            />

            {/* ── Leads ───────────────────────────────── */}
            <LeadsPanel
              leads={filteredLeads}
              overview={overview}
              leadSearch={leadSearch}
              onSearchChange={setLeadSearch}
              leadRunFilter={leadRunFilter}
              onRunFilterChange={(v) => setLeadRunFilter(v as 'latest' | 'all' | string)}
              leadFilterStage={leadFilterStage}
              onStageFilterChange={(v) => setLeadFilterStage(v as LeadStage | 'all')}
              stageUpdatingLeadId={stageUpdatingLeadId}
              onLeadStageChange={(leadId, stage) => void handleLeadStageChange(leadId, stage)}
              managingLeads={managingLeads}
              onStartFresh={() => void startFreshLeadList()}
              onExportLeads={() => void exportScopedLeads()}
              onDiscardLeads={() => void discardScopedLeads()}
              onExportAndDiscardLeads={() => void exportAndDiscardScopedLeads()}
            />
          </div>
        )}
      </main>

      {/* ── Add Lead Modal ────────────────────────────────── */}
      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
            <DialogDescription>Manually add a new lead to your pipeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-company" className="text-xs">Company *</Label>
              <Input id="m-company" value={newLeadCompany} onChange={(e) => setNewLeadCompany(e.target.value)} placeholder="Acme Roofing" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-contact" className="text-xs">Contact</Label>
              <Input id="m-contact" value={newLeadContact} onChange={(e) => setNewLeadContact(e.target.value)} placeholder="John Doe" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-email" className="text-xs">Email</Label>
              <Input id="m-email" value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} placeholder="john@acme.com" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-source" className="text-xs">Source</Label>
              <Input id="m-source" value={newLeadSource} onChange={(e) => setNewLeadSource(e.target.value)} placeholder="linkedin" className="h-9" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddLeadOpen(false)}>Cancel</Button>
            <Button onClick={() => void addLead()} disabled={addingLead} className="bg-violet-600 text-white hover:bg-violet-700">
              {addingLead && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Start Finding Modal ──────────────────────────── */}
      <Dialog
        open={startFindingOpen}
        onOpenChange={(nextOpen) => {
          if (!runningFinder) {
            setStartFindingOpen(nextOpen)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Finding Customers</DialogTitle>
            <DialogDescription>
              Kick off your growth agents with a target market and run mode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="run-query" className="text-xs">Who should we find?</Label>
              <Input
                id="run-query"
                value={runQuery}
                onChange={(e) => setRunQuery(e.target.value)}
                placeholder="Roofing companies in Austin"
                className="h-9"
                disabled={runningFinder}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Run mode</Label>
                <Select value={runMode} onValueChange={(v) => setRunMode(v as RunnableAgentMode)} disabled={runningFinder}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RUN_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="run-limit" className="text-xs">Lead limit</Label>
                <Input
                  id="run-limit"
                  type="number"
                  min={1}
                  max={200}
                  value={runLimit}
                  onChange={(e) => setRunLimit(e.target.value)}
                  className="h-9"
                  disabled={runningFinder}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Search provider</Label>
                <Select
                  value={runSearchProvider}
                  onValueChange={(value) => setRunSearchProvider(value as 'default' | 'duckduckgo-html' | 'web-search-api')}
                  disabled={runningFinder}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use saved setting ({config.leadSources.discoveryProvider})</SelectItem>
                    <SelectItem value="duckduckgo-html">DuckDuckGo HTML</SelectItem>
                    <SelectItem value="web-search-api">Web Search API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discovery intent</Label>
                <Select
                  value={runIntent}
                  onValueChange={(value) => setRunIntent(value as 'companies' | 'owners' | 'both')}
                  disabled={runningFinder}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="companies">Companies only</SelectItem>
                    <SelectItem value="owners">Owners / decision makers</SelectItem>
                    <SelectItem value="both">Companies + owners</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <div>
                <p className="font-medium">Run continuously (autopilot)</p>
                <p className="text-[11px] text-muted-foreground">Keep agents running on a schedule until you stop them.</p>
              </div>
              <Switch
                checked={runEnableAutopilot}
                onCheckedChange={setRunEnableAutopilot}
                disabled={runningFinder}
              />
            </label>
            {runEnableAutopilot && (
              <div className="space-y-1.5">
                <Label htmlFor="run-autopilot-interval" className="text-xs">Autopilot interval (minutes)</Label>
                <Input
                  id="run-autopilot-interval"
                  type="number"
                  min={1}
                  max={240}
                  value={runAutopilotIntervalMinutes}
                  onChange={(e) => setRunAutopilotIntervalMinutes(e.target.value)}
                  className="h-9"
                  disabled={runningFinder}
                />
              </div>
            )}
            <label className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <div>
                <p className="font-medium">Scan contact pages</p>
                <p className="text-[11px] text-muted-foreground">Also scan contact pages to capture public emails.</p>
              </div>
              <Switch
                checked={runIncludeContactPages}
                onCheckedChange={setRunIncludeContactPages}
                disabled={runningFinder || !dataFields.contactPageUrl}
              />
            </label>
            {runModeRequiresEmailSetup(runMode) && !outreachEmailReady && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                Outreach and Reply agents need email setup first. Click Start and we will guide you to configure Gmail or SMTP.
              </div>
            )}
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
              {RUN_MODE_OPTIONS.find((option) => option.value === runMode)?.description}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setStartFindingOpen(false)} disabled={runningFinder}>
              Cancel
            </Button>
            <Button
              onClick={() => void startFindingCustomers()}
              disabled={runningFinder}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              {runningFinder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Finding Customers
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Email Setup Required Modal ───────────────────── */}
      <Dialog open={emailSetupRequiredOpen} onOpenChange={setEmailSetupRequiredOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email setup required</DialogTitle>
            <DialogDescription>
              Outreach and Reply agents need a sending mailbox before they can run.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-xs font-medium text-foreground">Gmail</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Select Gmail, add your sender email, then paste a Google App Password.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-xs font-medium text-foreground">Other email providers</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Select SMTP and enter host, port, encryption, username, and password from your provider.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEmailSetupRequiredOpen(false)}>
              Not now
            </Button>
            <Button
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => {
                setEmailSetupRequiredOpen(false)
                setStartFindingOpen(false)
                setSettingsOpen(true)
              }}
            >
              Open Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Settings Modal ────────────────────────────────── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Configure automation behavior and guardrails.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Lead Discovery Targeting</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Define intent and targeting so discovery avoids generic articles and captures the right contacts.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Intent</Label>
                  <Select
                    value={config.targeting.intent}
                    onValueChange={(intent) => patchConfig((p) => ({
                      ...p,
                      targeting: {
                        ...p.targeting,
                        intent: intent as CustomerFinderConfig['targeting']['intent'],
                      },
                    }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="companies">Companies only</SelectItem>
                      <SelectItem value="owners">Owners / decision makers</SelectItem>
                      <SelectItem value="both">Companies + owners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default search provider</Label>
                  <Select
                    value={config.leadSources.discoveryProvider}
                    onValueChange={(provider) => patchConfig((p) => ({
                      ...p,
                      leadSources: {
                        ...p.leadSources,
                        discoveryProvider: provider as CustomerFinderConfig['leadSources']['discoveryProvider'],
                      },
                    }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="duckduckgo-html">DuckDuckGo HTML</SelectItem>
                      <SelectItem value="web-search-api">Web Search API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="target-industries" className="text-xs">Industries (comma separated)</Label>
                  <Input
                    id="target-industries"
                    value={joinCommaSeparated(config.targeting.industries)}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      targeting: {
                        ...p.targeting,
                        industries: splitCommaSeparated(e.target.value),
                      },
                    }))}
                    placeholder="roofing, hvac, dental"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="target-locations" className="text-xs">Locations (comma separated)</Label>
                  <Input
                    id="target-locations"
                    value={joinCommaSeparated(config.targeting.locations)}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      targeting: {
                        ...p.targeting,
                        locations: splitCommaSeparated(e.target.value),
                      },
                    }))}
                    placeholder="Austin, Dallas"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="target-include" className="text-xs">Include keywords (comma separated)</Label>
                  <Input
                    id="target-include"
                    value={joinCommaSeparated(config.targeting.includeKeywords)}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      targeting: {
                        ...p.targeting,
                        includeKeywords: splitCommaSeparated(e.target.value),
                      },
                    }))}
                    placeholder="commercial, emergency service"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="target-roles" className="text-xs">Contact roles (comma separated)</Label>
                  <Input
                    id="target-roles"
                    value={joinCommaSeparated(config.targeting.contactRoles)}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      targeting: {
                        ...p.targeting,
                        contactRoles: splitCommaSeparated(e.target.value),
                      },
                    }))}
                    placeholder="owner, founder, ceo"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Web Search API</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Optional: configure an API provider for discovery when you want deterministic search results.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">API provider</Label>
                  <Select
                    value={config.leadSources.webSearchApi.provider}
                    onValueChange={(provider) => patchConfig((p) => ({
                      ...p,
                      leadSources: {
                        ...p.leadSources,
                        webSearchApi: {
                          ...p.leadSources.webSearchApi,
                          provider: provider as CustomerFinderConfig['leadSources']['webSearchApi']['provider'],
                        },
                      },
                    }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not configured</SelectItem>
                      <SelectItem value="brave">Brave</SelectItem>
                      <SelectItem value="perplexity">Perplexity</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="search-api-key" className="text-xs">API key</Label>
                  <Input
                    id="search-api-key"
                    type="password"
                    value={config.leadSources.webSearchApi.apiKey}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      leadSources: {
                        ...p.leadSources,
                        webSearchApi: {
                          ...p.leadSources.webSearchApi,
                          apiKey: e.target.value,
                        },
                      },
                    }))}
                    placeholder="Paste API key"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="search-api-url" className="text-xs">Base URL (optional)</Label>
                  <Input
                    id="search-api-url"
                    value={config.leadSources.webSearchApi.baseUrl}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      leadSources: {
                        ...p.leadSources,
                        webSearchApi: {
                          ...p.leadSources.webSearchApi,
                          baseUrl: e.target.value,
                        },
                      },
                    }))}
                    placeholder="Provider default URL"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="search-api-model" className="text-xs">Model (optional)</Label>
                  <Input
                    id="search-api-model"
                    value={config.leadSources.webSearchApi.model}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      leadSources: {
                        ...p.leadSources,
                        webSearchApi: {
                          ...p.leadSources.webSearchApi,
                          model: e.target.value,
                        },
                      },
                    }))}
                    placeholder="sonar, gemini-2.5-flash"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="search-api-max-results" className="text-xs">Max results</Label>
                  <Input
                    id="search-api-max-results"
                    type="number"
                    min={1}
                    max={10}
                    value={String(config.leadSources.webSearchApi.maxResults)}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      leadSources: {
                        ...p.leadSources,
                        webSearchApi: {
                          ...p.leadSources.webSearchApi,
                          maxResults: Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                        },
                      },
                    }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="search-api-timeout" className="text-xs">Timeout (seconds)</Label>
                  <Input
                    id="search-api-timeout"
                    type="number"
                    min={5}
                    max={120}
                    value={String(config.leadSources.webSearchApi.timeoutSeconds)}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      leadSources: {
                        ...p.leadSources,
                        webSearchApi: {
                          ...p.leadSources.webSearchApi,
                          timeoutSeconds: Math.max(5, Math.min(120, Number(e.target.value) || 30)),
                        },
                      },
                    }))}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Browser Agent</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Installs browser tooling for deeper owner-level research and site navigation tasks.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Enable browser automation</span>
                  <Switch
                    checked={config.leadSources.browserAutomation.enabled}
                    onCheckedChange={(checked) => patchConfig((p) => ({
                      ...p,
                      leadSources: {
                        ...p.leadSources,
                        browserAutomation: {
                          ...p.leadSources.browserAutomation,
                          enabled: checked,
                        },
                      },
                    }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Run browser headless</span>
                  <Switch
                    checked={config.leadSources.browserAutomation.headless}
                    onCheckedChange={(checked) => patchConfig((p) => ({
                      ...p,
                      leadSources: {
                        ...p.leadSources,
                        browserAutomation: {
                          ...p.leadSources.browserAutomation,
                          headless: checked,
                        },
                      },
                    }))}
                  />
                </label>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="browser-profile" className="text-xs">Default browser profile</Label>
                  <Input
                    id="browser-profile"
                    value={config.leadSources.browserAutomation.defaultProfile}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      leadSources: {
                        ...p.leadSources,
                        browserAutomation: {
                          ...p.leadSources.browserAutomation,
                          defaultProfile: e.target.value,
                        },
                      },
                    }))}
                    placeholder="openclaw"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <div>
                <p className="font-medium">Auto Research</p>
                <p className="text-[11px] text-muted-foreground">Automatically research new leads</p>
              </div>
              <Switch
                checked={config.execution.autoResearch}
                onCheckedChange={(v) => patchConfig((p) => ({ ...p, execution: { ...p.execution, autoResearch: v } }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <div>
                <p className="font-medium">Auto Draft Replies</p>
                <p className="text-[11px] text-muted-foreground">Generate reply drafts automatically</p>
              </div>
              <Switch
                checked={config.execution.autoDraftReplies}
                onCheckedChange={(v) => patchConfig((p) => ({ ...p, execution: { ...p.execution, autoDraftReplies: v } }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <div>
                <p className="font-medium">Require Approval</p>
                <p className="text-[11px] text-muted-foreground">Human review before outreach</p>
              </div>
              <Switch
                checked={config.guardrails.requireHumanApproval}
                onCheckedChange={(v) => patchConfig((p) => ({ ...p, guardrails: { ...p.guardrails, requireHumanApproval: v } }))}
              />
            </label>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Outreach Channel Setup</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Configure your sending email before running Outreach or Reply agents.
              </p>
              <label className="mb-2 flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                <span>Email outreach enabled</span>
                <Switch
                  checked={config.outreachChannels.email}
                  onCheckedChange={(v) => patchConfig((p) => ({ ...p, outreachChannels: { ...p.outreachChannels, email: v } }))}
                />
              </label>
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email provider</Label>
                  <Select
                    value={outreachEmailSetup.provider}
                    onValueChange={(provider) => patchConfig((p) => ({
                      ...p,
                      outreachSetup: {
                        email: {
                          ...(p.outreachSetup?.email ?? defaultConfig.outreachSetup.email),
                          provider: provider as 'none' | 'gmail' | 'smtp',
                        },
                      },
                    }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not configured</SelectItem>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="smtp">Other email (SMTP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="outreach-from-email" className="text-xs">From email</Label>
                    <Input
                      id="outreach-from-email"
                      value={outreachEmailSetup.fromEmail}
                      onChange={(e) => patchConfig((p) => ({
                        ...p,
                        outreachSetup: {
                          email: {
                            ...(p.outreachSetup?.email ?? defaultConfig.outreachSetup.email),
                            fromEmail: e.target.value,
                          },
                        },
                      }))}
                      placeholder="founder@yourcompany.com"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outreach-from-name" className="text-xs">From name</Label>
                    <Input
                      id="outreach-from-name"
                      value={outreachEmailSetup.fromName}
                      onChange={(e) => patchConfig((p) => ({
                        ...p,
                        outreachSetup: {
                          email: {
                            ...(p.outreachSetup?.email ?? defaultConfig.outreachSetup.email),
                            fromName: e.target.value,
                          },
                        },
                      }))}
                      placeholder="Acme Growth Team"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="outreach-reply-to" className="text-xs">Reply-to (optional)</Label>
                    <Input
                      id="outreach-reply-to"
                      value={outreachEmailSetup.replyTo}
                      onChange={(e) => patchConfig((p) => ({
                        ...p,
                        outreachSetup: {
                          email: {
                            ...(p.outreachSetup?.email ?? defaultConfig.outreachSetup.email),
                            replyTo: e.target.value,
                          },
                        },
                      }))}
                      placeholder="sales@yourcompany.com"
                      className="h-9"
                    />
                  </div>
                </div>

                {outreachEmailSetup.provider === 'gmail' && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="outreach-gmail-app-password" className="text-xs">Gmail app password</Label>
                      <Input
                        id="outreach-gmail-app-password"
                        type="password"
                        value={outreachEmailSetup.gmailAppPassword}
                        onChange={(e) => patchConfig((p) => ({
                          ...p,
                          outreachSetup: {
                            email: {
                              ...(p.outreachSetup?.email ?? defaultConfig.outreachSetup.email),
                              gmailAppPassword: e.target.value,
                            },
                          },
                        }))}
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="h-9"
                      />
                    </div>
                    <div className="rounded-md border border-border/50 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
                      Gmail setup: enable 2-Step Verification in your Google account, create an App Password, and paste it here.
                    </div>
                  </>
                )}

                {outreachEmailSetup.provider === 'smtp' && (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="outreach-smtp-host" className="text-xs">SMTP host</Label>
                        <Input
                          id="outreach-smtp-host"
                          value={outreachEmailSetup.smtpHost}
                          onChange={(e) => patchConfig((p) => ({
                            ...p,
                            outreachSetup: {
                              email: {
                                ...(p.outreachSetup?.email ?? defaultConfig.outreachSetup.email),
                                smtpHost: e.target.value,
                              },
                            },
                          }))}
                          placeholder="smtp.mailprovider.com"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="outreach-smtp-port" className="text-xs">SMTP port</Label>
                        <Input
                          id="outreach-smtp-port"
                          type="number"
                          min={1}
                          max={65535}
                          value={String(outreachEmailSetup.smtpPort)}
                          onChange={(e) => patchConfig((p) => ({
                            ...p,
                            outreachSetup: {
                              email: {
                                ...(p.outreachSetup?.email ?? defaultConfig.outreachSetup.email),
                                smtpPort: Number(e.target.value) || 587,
                              },
                            },
                          }))}
                          className="h-9"
                        />
                      </div>
                      <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                        <span>Use TLS/SSL</span>
                        <Switch
                          checked={outreachEmailSetup.smtpSecure}
                          onCheckedChange={(checked) => patchConfig((p) => ({
                            ...p,
                            outreachSetup: {
                              email: {
                                ...(p.outreachSetup?.email ?? defaultConfig.outreachSetup.email),
                                smtpSecure: checked,
                              },
                            },
                          }))}
                        />
                      </label>
                      <div className="space-y-1.5">
                        <Label htmlFor="outreach-smtp-username" className="text-xs">SMTP username</Label>
                        <Input
                          id="outreach-smtp-username"
                          value={outreachEmailSetup.smtpUsername}
                          onChange={(e) => patchConfig((p) => ({
                            ...p,
                            outreachSetup: {
                              email: {
                                ...(p.outreachSetup?.email ?? defaultConfig.outreachSetup.email),
                                smtpUsername: e.target.value,
                              },
                            },
                          }))}
                          placeholder="smtp-user"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="outreach-smtp-password" className="text-xs">SMTP password</Label>
                        <Input
                          id="outreach-smtp-password"
                          type="password"
                          value={outreachEmailSetup.smtpPassword}
                          onChange={(e) => patchConfig((p) => ({
                            ...p,
                            outreachSetup: {
                              email: {
                                ...(p.outreachSetup?.email ?? defaultConfig.outreachSetup.email),
                                smtpPassword: e.target.value,
                              },
                            },
                          }))}
                          placeholder="••••••••"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="rounded-md border border-border/50 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
                      SMTP setup: use your provider&apos;s SMTP host, port, encryption mode, username, and password.
                    </div>
                  </>
                )}

                {outreachEmailSetup.provider === 'none' && (
                  <div className="rounded-md border border-border/50 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
                    Select Gmail or SMTP to unlock Outreach and Reply agents.
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Outreach Policy</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Define what Outreach Agent is allowed to send and what should be blocked.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tone</Label>
                  <Select
                    value={config.outreachPolicy.tone}
                    onValueChange={(tone) => patchConfig((p) => ({
                      ...p,
                      outreachPolicy: {
                        ...(p.outreachPolicy ?? defaultConfig.outreachPolicy),
                        tone: tone as CustomerFinderConfig['outreachPolicy']['tone'],
                      },
                    }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="consultative">Consultative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="outreach-max-followups" className="text-xs">Max follow-ups per lead</Label>
                  <Input
                    id="outreach-max-followups"
                    type="number"
                    min={0}
                    max={10}
                    value={String(config.outreachPolicy.maxFollowUpsPerLead)}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      outreachPolicy: {
                        ...(p.outreachPolicy ?? defaultConfig.outreachPolicy),
                        maxFollowUpsPerLead: Math.max(0, Math.min(10, Number(e.target.value) || 0)),
                      },
                    }))}
                    className="h-9"
                  />
                </div>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Allow outreach sends</span>
                  <Switch
                    checked={config.outreachPolicy.allowOutreach}
                    onCheckedChange={(checked) => patchConfig((p) => ({
                      ...p,
                      outreachPolicy: {
                        ...(p.outreachPolicy ?? defaultConfig.outreachPolicy),
                        allowOutreach: checked,
                      },
                    }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Allow follow-ups</span>
                  <Switch
                    checked={config.outreachPolicy.allowFollowUps}
                    onCheckedChange={(checked) => patchConfig((p) => ({
                      ...p,
                      outreachPolicy: {
                        ...(p.outreachPolicy ?? defaultConfig.outreachPolicy),
                        allowFollowUps: checked,
                      },
                    }))}
                  />
                </label>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="outreach-cta" className="text-xs">Primary CTA</Label>
                  <Input
                    id="outreach-cta"
                    value={config.outreachPolicy.cta}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      outreachPolicy: {
                        ...(p.outreachPolicy ?? defaultConfig.outreachPolicy),
                        cta: e.target.value,
                      },
                    }))}
                    placeholder="Would you be open to a quick 15-minute call this week?"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="outreach-signature" className="text-xs">Signature</Label>
                  <Input
                    id="outreach-signature"
                    value={config.outreachPolicy.signature}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      outreachPolicy: {
                        ...(p.outreachPolicy ?? defaultConfig.outreachPolicy),
                        signature: e.target.value,
                      },
                    }))}
                    placeholder="Growth Team"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="outreach-blocked-terms" className="text-xs">Blocked terms (comma separated)</Label>
                  <Input
                    id="outreach-blocked-terms"
                    value={joinCommaSeparated(config.outreachPolicy.blockedTerms)}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      outreachPolicy: {
                        ...(p.outreachPolicy ?? defaultConfig.outreachPolicy),
                        blockedTerms: splitCommaSeparated(e.target.value),
                      },
                    }))}
                    placeholder="guaranteed results, clickbait"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Reply Policy</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Control when Reply Agent can auto-handle replies vs escalate to a human.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tone</Label>
                  <Select
                    value={config.replyPolicy.tone}
                    onValueChange={(tone) => patchConfig((p) => ({
                      ...p,
                      replyPolicy: {
                        ...(p.replyPolicy ?? defaultConfig.replyPolicy),
                        tone: tone as CustomerFinderConfig['replyPolicy']['tone'],
                      },
                    }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="consultative">Consultative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reply-max-auto" className="text-xs">Max auto replies per lead</Label>
                  <Input
                    id="reply-max-auto"
                    type="number"
                    min={0}
                    max={10}
                    value={String(config.replyPolicy.maxAutoRepliesPerLead)}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      replyPolicy: {
                        ...(p.replyPolicy ?? defaultConfig.replyPolicy),
                        maxAutoRepliesPerLead: Math.max(0, Math.min(10, Number(e.target.value) || 0)),
                      },
                    }))}
                    className="h-9"
                  />
                </div>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Allow reply handling</span>
                  <Switch
                    checked={config.replyPolicy.allowReplyHandling}
                    onCheckedChange={(checked) => patchConfig((p) => ({
                      ...p,
                      replyPolicy: {
                        ...(p.replyPolicy ?? defaultConfig.replyPolicy),
                        allowReplyHandling: checked,
                      },
                    }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Allow auto replies</span>
                  <Switch
                    checked={config.replyPolicy.allowAutoReplies}
                    onCheckedChange={(checked) => patchConfig((p) => ({
                      ...p,
                      replyPolicy: {
                        ...(p.replyPolicy ?? defaultConfig.replyPolicy),
                        allowAutoReplies: checked,
                      },
                    }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Escalate pricing replies</span>
                  <Switch
                    checked={config.replyPolicy.escalateOnPricing}
                    onCheckedChange={(checked) => patchConfig((p) => ({
                      ...p,
                      replyPolicy: {
                        ...(p.replyPolicy ?? defaultConfig.replyPolicy),
                        escalateOnPricing: checked,
                      },
                    }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Escalate legal replies</span>
                  <Switch
                    checked={config.replyPolicy.escalateOnLegal}
                    onCheckedChange={(checked) => patchConfig((p) => ({
                      ...p,
                      replyPolicy: {
                        ...(p.replyPolicy ?? defaultConfig.replyPolicy),
                        escalateOnLegal: checked,
                      },
                    }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Escalate security replies</span>
                  <Switch
                    checked={config.replyPolicy.escalateOnSecurity}
                    onCheckedChange={(checked) => patchConfig((p) => ({
                      ...p,
                      replyPolicy: {
                        ...(p.replyPolicy ?? defaultConfig.replyPolicy),
                        escalateOnSecurity: checked,
                      },
                    }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Escalate negative sentiment</span>
                  <Switch
                    checked={config.replyPolicy.escalateOnNegativeSentiment}
                    onCheckedChange={(checked) => patchConfig((p) => ({
                      ...p,
                      replyPolicy: {
                        ...(p.replyPolicy ?? defaultConfig.replyPolicy),
                        escalateOnNegativeSentiment: checked,
                      },
                    }))}
                  />
                </label>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="reply-blocked-terms" className="text-xs">Blocked terms (comma separated)</Label>
                  <Input
                    id="reply-blocked-terms"
                    value={joinCommaSeparated(config.replyPolicy.blockedTerms)}
                    onChange={(e) => patchConfig((p) => ({
                      ...p,
                      replyPolicy: {
                        ...(p.replyPolicy ?? defaultConfig.replyPolicy),
                        blockedTerms: splitCommaSeparated(e.target.value),
                      },
                    }))}
                    placeholder="legal advice, guarantee"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Company Knowledge (Outreach + Reply)</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Upload company context so outreach and reply drafts stay on-message. Supported formats: <code>.md</code>, <code>.txt</code>, <code>.csv</code>, <code>.json</code> (max 350 KB each).
              </p>
              <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                <div className="space-y-1.5">
                  <Label className="text-xs">Target agent</Label>
                  <Select
                    value={knowledgeUploadTarget}
                    onValueChange={(value) => setKnowledgeUploadTarget(value as CustomerFinderKnowledgeDocumentTarget)}
                    disabled={knowledgeUploading}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Outreach + Reply</SelectItem>
                      <SelectItem value="outreach">Outreach only</SelectItem>
                      <SelectItem value="reply-handler">Reply only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="knowledge-upload-input" className="text-xs">Upload file</Label>
                  <Input
                    id="knowledge-upload-input"
                    type="file"
                    accept=".md,.txt,.csv,.json,text/markdown,text/plain,text/csv,application/json"
                    className="h-9"
                    disabled={knowledgeUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.currentTarget.value = ''
                      if (!file) {
                        return
                      }
                      void uploadKnowledgeFile(file)
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
                Files are stored in runtime workspace markdown paths under <code>growth-agent/knowledge/*</code> so agents can access them directly.
              </div>
              <div className="mt-3 space-y-2">
                {knowledgeDocuments.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border/60 px-2.5 py-2 text-[11px] text-muted-foreground">
                    No knowledge files uploaded yet.
                  </p>
                ) : (
                  knowledgeDocuments.map((document) => (
                    <div key={document.documentId} className="rounded-md border border-border/60 px-2.5 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">{document.fileName}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {document.target} • {document.format} • {formatRelativeTime(document.updatedAt)}
                          </p>
                          {document.contentPreview && (
                            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{document.contentPreview}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => void deleteKnowledgeDocument(document.documentId)}
                          disabled={deletingKnowledgeDocumentId === document.documentId || knowledgeUploading}
                        >
                          {deletingKnowledgeDocumentId === document.documentId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Remove'
                          )}
                        </Button>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">{document.relativePath}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Collected Data Fields</p>
              <p className="mb-2 text-[11px] text-muted-foreground">Choose exactly which fields discovery should capture.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Contact Name</span>
                  <Switch
                    checked={dataFields.contactName}
                    onCheckedChange={(v) => patchConfig((p) => ({ ...p, dataFields: { ...p.dataFields, contactName: v } }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Email</span>
                  <Switch
                    checked={dataFields.email}
                    onCheckedChange={(v) => patchConfig((p) => ({ ...p, dataFields: { ...p.dataFields, email: v } }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Phone</span>
                  <Switch
                    checked={dataFields.phone}
                    onCheckedChange={(v) => patchConfig((p) => ({ ...p, dataFields: { ...p.dataFields, phone: v } }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Website</span>
                  <Switch
                    checked={dataFields.website}
                    onCheckedChange={(v) => patchConfig((p) => ({ ...p, dataFields: { ...p.dataFields, website: v } }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Page Title</span>
                  <Switch
                    checked={dataFields.pageTitle}
                    onCheckedChange={(v) => patchConfig((p) => ({ ...p, dataFields: { ...p.dataFields, pageTitle: v } }))}
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-2 text-xs">
                  <span>Contact Page URL</span>
                  <Switch
                    checked={dataFields.contactPageUrl}
                    onCheckedChange={(v) => patchConfig((p) => ({ ...p, dataFields: { ...p.dataFields, contactPageUrl: v } }))}
                  />
                </label>
              </div>
            </div>
            <div className="space-y-1.5 rounded-lg border border-border/60 p-3">
              <Label htmlFor="m-max" className="text-xs font-medium">Max Daily Outreach</Label>
              <Input
                id="m-max" type="number" min={1}
                value={String(config.guardrails.maxDailyOutreach)}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (!Number.isFinite(v) || v <= 0) return
                  patchConfig((p) => ({ ...p, guardrails: { ...p.guardrails, maxDailyOutreach: Math.round(v) } }))
                }}
                className="h-9"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Close</Button>
            <Button
              onClick={() => void saveConfig()}
              disabled={!configDirty || savingConfig}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
