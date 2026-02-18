'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  Settings2,
  Wrench,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  createRuntimeWorkspaceTemplate,
  deleteRuntimeWorkspaceFile,
  installRuntimeSkill,
  readRuntimeWorkspaceFile,
  listRuntimeSkills,
  listRuntimeWorkspaceFiles,
  listRuntimeWorkspaceHealth,
  repairRuntimeWorkspaceEssentials,
  updateRuntimeSkill,
  upsertRuntimeWorkspaceFile,
  type RuntimeSkillSummary,
  type RuntimeWorkspaceHealthData,
} from '@/lib/runtime-controls'
import { getSkillOptionById, type SkillConfigField, type SkillOption } from '@/lib/skill-options'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

interface InstallOption {
  id: string
  label: string
}

interface MissingStatus {
  bins: string[]
  env: string[]
  config: string[]
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readBoolean(record: Record<string, unknown> | null, key: string): boolean | null {
  const value = record?.[key]
  if (typeof value === 'boolean') return value
  return null
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function readStringArray(record: Record<string, unknown> | null, key: string): string[] {
  const value = record?.[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function normalizeInstallOption(value: unknown): InstallOption | null {
  if (typeof value === 'string' && value.trim()) {
    const id = value.trim()
    return {
      id,
      label: `Install (${id})`,
    }
  }

  const record = toRecord(value)
  if (!record) return null

  const id = (
    readString(record, 'id') ??
    readString(record, 'installId') ??
    readString(record, 'key') ??
    readString(record, 'name')
  )
  if (!id) return null

  return {
    id,
    label: readString(record, 'label') ?? readString(record, 'title') ?? `Install (${id})`,
  }
}

function resolveSkillCanonicalKey(skill: RuntimeSkillSummary): string {
  const record = toRecord(skill.raw)
  return (
    readString(record, 'skillKey') ??
    readString(record, 'key') ??
    readString(record, 'id') ??
    skill.key
  )
}

function resolveSkillInstallName(skill: RuntimeSkillSummary): string {
  const record = toRecord(skill.raw)
  return (
    readString(record, 'id') ??
    readString(record, 'skillKey') ??
    readString(record, 'key') ??
    skill.key
  )
}

function skillIdentityTokens(skill: RuntimeSkillSummary): string[] {
  const record = toRecord(skill.raw)
  const rawTokens = [
    resolveSkillCanonicalKey(skill),
    resolveSkillInstallName(skill),
    skill.key,
    skill.name,
    readString(record, 'id'),
    readString(record, 'skillKey'),
    readString(record, 'key'),
    readString(record, 'name'),
  ]
  return rawTokens
    .map((value) => value?.trim().toLowerCase() ?? '')
    .filter(Boolean)
}

function matchesSkillByIdentity(skill: RuntimeSkillSummary, target: RuntimeSkillSummary): boolean {
  const targetTokens = new Set(skillIdentityTokens(target))
  if (targetTokens.size === 0) return false

  for (const token of skillIdentityTokens(skill)) {
    if (targetTokens.has(token)) {
      return true
    }
  }
  return false
}

function extractInstallResultProblem(payload: unknown): string | null {
  const record = toRecord(payload)
  if (!record) return null

  const directError = readString(record, 'error') ?? readString(record, 'message')
  const status = readString(record, 'status')?.toLowerCase() ?? null
  const ok = readBoolean(record, 'ok')
  const success = readBoolean(record, 'success')

  const nestedErrorRecord = toRecord(record.error)
  const nestedError =
    readString(nestedErrorRecord, 'message') ??
    readString(nestedErrorRecord, 'error') ??
    readString(nestedErrorRecord, 'reason')

  if (ok === false || success === false) {
    return nestedError ?? directError ?? 'Skill installation failed.'
  }

  if (status && ['failed', 'error', 'denied'].includes(status)) {
    return nestedError ?? directError ?? `Skill installation failed (${status}).`
  }

  return null
}

function detectWorkspacePlatform(workspaceDir: string | null | undefined): 'linux' | 'mac' | 'windows' | 'unknown' {
  const normalized = workspaceDir?.trim() ?? ''
  if (!normalized) return 'unknown'
  if (/^[A-Za-z]:[\\/]/.test(normalized)) return 'windows'
  if (normalized.startsWith('/Users/')) return 'mac'
  if (normalized.startsWith('/')) return 'linux'
  return 'unknown'
}

function installOptionTokens(option: InstallOption): string {
  return `${option.id} ${option.label}`.trim().toLowerCase()
}

function scoreInstallOption(
  option: InstallOption,
  platform: 'linux' | 'mac' | 'windows' | 'unknown',
): number {
  const tokens = installOptionTokens(option)

  const rank = (orderedNeedles: string[]): number => {
    for (let index = 0; index < orderedNeedles.length; index += 1) {
      if (tokens.includes(orderedNeedles[index])) {
        return index
      }
    }
    return orderedNeedles.length + 10
  }

  if (platform === 'linux') {
    const linuxRank = rank(['apt', 'apt-get', 'dnf', 'yum', 'pacman', 'pipx', 'pip', 'uv', 'npm', 'node', 'npx', 'brew'])
    return linuxRank
  }

  if (platform === 'mac') {
    const macRank = rank(['brew', 'pipx', 'pip', 'uv', 'npm', 'node', 'npx', 'apt', 'dnf', 'pacman'])
    return macRank
  }

  if (platform === 'windows') {
    const windowsRank = rank(['winget', 'choco', 'scoop', 'pip', 'npm', 'node', 'npx', 'brew', 'apt'])
    return windowsRank
  }

  const genericRank = rank(['pipx', 'pip', 'uv', 'npm', 'node', 'npx', 'apt', 'dnf', 'pacman', 'brew'])
  return genericRank
}

function pickPreferredInstallOption(
  options: InstallOption[],
  workspaceDir: string | null | undefined,
): InstallOption | null {
  if (options.length === 0) return null
  const platform = detectWorkspacePlatform(workspaceDir)
  const sorted = [...options].sort((left, right) => (
    scoreInstallOption(left, platform) - scoreInstallOption(right, platform)
  ))
  return sorted[0] ?? null
}

function extractInstallOptions(skill: RuntimeSkillSummary): InstallOption[] {
  const record = toRecord(skill.raw)
  const options: InstallOption[] = []

  const install = record?.install
  if (Array.isArray(install)) {
    for (const item of install) {
      const normalized = normalizeInstallOption(item)
      if (normalized) options.push(normalized)
    }
  } else if (install !== undefined) {
    const normalized = normalizeInstallOption(install)
    if (normalized) options.push(normalized)
  }

  const installer = record?.installer
  if (Array.isArray(installer)) {
    for (const item of installer) {
      const normalized = normalizeInstallOption(item)
      if (normalized) options.push(normalized)
    }
  } else if (installer !== undefined) {
    const normalized = normalizeInstallOption(installer)
    if (normalized) options.push(normalized)
  }

  const directInstallId = readString(record, 'installId')
  if (directInstallId) {
    const normalized = normalizeInstallOption(directInstallId)
    if (normalized) options.push(normalized)
  }

  const dedupedOptions = options.filter((option, index, collection) => (
    collection.findIndex((candidate) => candidate.id === option.id) === index
  ))

  const identity = resolveSkillCanonicalKey(skill).trim().toLowerCase()
  if (dedupedOptions.length === 0 && identity === 'clawhub') {
    return [{ id: 'node', label: 'Install clawhub (npm)' }]
  }

  return dedupedOptions
}

function extractMissingStatus(skill: RuntimeSkillSummary): MissingStatus {
  const record = toRecord(skill.raw)
  const missing = toRecord(record?.missing)
  return {
    bins: readStringArray(missing, 'bins'),
    env: readStringArray(missing, 'env'),
    config: readStringArray(missing, 'config'),
  }
}

function isSkillEligible(skill: RuntimeSkillSummary): boolean {
  const record = toRecord(skill.raw)
  const explicit = readBoolean(record, 'eligible')
  if (explicit !== null) return explicit
  const status = readString(record, 'status')?.toLowerCase() ?? null
  if (status && ['eligible', 'ready', 'installed'].includes(status)) {
    return true
  }
  const missing = extractMissingStatus(skill)
  return missing.bins.length === 0 && missing.env.length === 0 && missing.config.length === 0
}

function isSkillInstalled(skill: RuntimeSkillSummary): boolean {
  const record = toRecord(skill.raw)
  const explicit =
    readBoolean(record, 'installed') ??
    readBoolean(record, 'isInstalled')
  if (explicit !== null) return explicit
  const status = readString(record, 'status')?.toLowerCase() ?? null
  if (status && ['installed', 'ready', 'available', 'ok'].includes(status)) {
    return true
  }
  return extractMissingStatus(skill).bins.length === 0
}

function summarizeMissing(missing: MissingStatus): string {
  const parts: string[] = []
  if (missing.bins.length > 0) parts.push(`bins: ${missing.bins.join(', ')}`)
  if (missing.env.length > 0) parts.push(`env: ${missing.env.join(', ')}`)
  if (missing.config.length > 0) parts.push(`config: ${missing.config.join(', ')}`)
  return parts.join(' | ')
}

function findMatchingSkill(
  candidates: RuntimeSkillSummary[],
  target: RuntimeSkillSummary,
): RuntimeSkillSummary | null {
  for (const candidate of candidates) {
    if (matchesSkillByIdentity(candidate, target)) {
      return candidate
    }
  }
  return null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function findSkillOptionForRuntimeSkill(skill: RuntimeSkillSummary): SkillOption | null {
  const tokens = new Set(skillIdentityTokens(skill))
  for (const token of tokens) {
    const direct = getSkillOptionById(token)
    if (direct) return direct
  }

  const normalizedTokens = new Set(Array.from(tokens).map((token) => normalizeToken(token)))
  for (const token of normalizedTokens) {
    const direct = getSkillOptionById(token)
    if (direct) return direct
  }

  const record = toRecord(skill.raw)
  const installName = (
    readString(record, 'name') ??
    readString(record, 'label') ??
    readString(record, 'id') ??
    ''
  ).trim().toLowerCase()
  if (installName) {
    for (const optionToken of [installName, normalizeToken(installName)]) {
      const direct = getSkillOptionById(optionToken)
      if (direct) return direct
    }
  }

  return null
}

function looksSensitiveCredentialKey(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return (
    normalized.includes('api_key') ||
    normalized.includes('apikey') ||
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('password')
  )
}

function isSensitiveConfigField(field: SkillConfigField): boolean {
  return looksSensitiveCredentialKey(`${field.id} ${field.label}`)
}

function findOptionFieldForEnvKey(
  option: SkillOption | null,
  envKey: string,
): SkillConfigField | null {
  if (!option?.configFields?.length) return null
  const normalizedKey = normalizeToken(envKey)
  return option.configFields.find((field) => (
    normalizeToken(field.id) === normalizedKey || normalizeToken(field.label) === normalizedKey
  )) ?? null
}

function inferCredentialSourceHint(value: string): string | null {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes('openai')) {
    return 'Get it from OpenAI dashboard: https://platform.openai.com/api-keys'
  }
  if (normalized.includes('gemini') || normalized.includes('google_places') || normalized.includes('googleplaces')) {
    return 'Create it in Google AI Studio / Google Cloud credentials.'
  }
  if (normalized.includes('github')) {
    return 'Create a token in GitHub Settings -> Developer settings -> Personal access tokens.'
  }
  if (normalized.includes('elevenlabs')) {
    return 'Create it in ElevenLabs account settings/API section.'
  }
  if (normalized.includes('hue') || normalized.includes('bridge_key')) {
    return 'Create a Hue app key from your Hue bridge integration setup.'
  }
  if (normalized.includes('clawhub')) {
    return 'Create/retrieve token from your ClawHub account settings.'
  }
  if (normalized.includes('1password') || normalized.includes('op_')) {
    return '1Password skills usually use `op` CLI sign-in/session, not a generic API key.'
  }
  return null
}

function choosePrimarySensitiveField(
  option: SkillOption | null,
  requiredEnvKeys: string[],
): SkillConfigField | null {
  if (!option?.configFields?.length) return null

  for (const key of requiredEnvKeys) {
    const field = findOptionFieldForEnvKey(option, key)
    if (field && isSensitiveConfigField(field)) {
      return field
    }
  }

  return option.configFields.find((field) => field.required && isSensitiveConfigField(field))
    ?? option.configFields.find((field) => isSensitiveConfigField(field))
    ?? null
}

function parseExtraEnvLines(input: string): { env: Record<string, string>; error: string | null } {
  const env: Record<string, string> = {}
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines) {
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      return {
        env: {},
        error: `Invalid env line: "${line}". Use KEY=value format.`,
      }
    }
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1)
    if (!key) {
      return {
        env: {},
        error: `Invalid env line: "${line}". Missing key before '='.`,
      }
    }
    env[key] = value
  }

  return {
    env,
    error: null,
  }
}

function isValidRelativeMdPath(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) return false
  if (normalized.startsWith('/')) return false
  if (normalized.includes('..')) return false
  return /^[A-Za-z0-9._/-]+\.md$/i.test(normalized)
}

function healthRow(label: string, ok: boolean, optional = false) {
  if (ok) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2">
        <span className="text-sm">{label}</span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          OK
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2">
      <span className="text-sm">{label}</span>
      {optional ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          Optional
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
          <XCircle className="h-3.5 w-3.5" />
          Missing
        </span>
      )}
    </div>
  )
}

export default function SkillsManagementPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [skills, setSkills] = useState<RuntimeSkillSummary[]>([])
  const [health, setHealth] = useState<RuntimeWorkspaceHealthData | null>(null)
  const [markdownFiles, setMarkdownFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [actionPendingKey, setActionPendingKey] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [newFilePath, setNewFilePath] = useState('notes/new-note.md')
  const [newFileContent, setNewFileContent] = useState('')
  const [fileDialogOpen, setFileDialogOpen] = useState(false)
  const [fileDialogPath, setFileDialogPath] = useState('')
  const [fileDialogContent, setFileDialogContent] = useState('')
  const [fileDialogLoading, setFileDialogLoading] = useState(false)

  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [configSkill, setConfigSkill] = useState<RuntimeSkillSummary | null>(null)
  const [configApiKey, setConfigApiKey] = useState('')
  const [configRequiredEnvValues, setConfigRequiredEnvValues] = useState<Record<string, string>>({})
  const [configSuggestedValues, setConfigSuggestedValues] = useState<Record<string, string>>({})
  const [configExtraEnvLines, setConfigExtraEnvLines] = useState('')
  const [configError, setConfigError] = useState('')

  const redirectToSignIn = useCallback(() => {
    const currentPath = typeof window === 'undefined'
      ? '/dashboard/settings/skills'
      : `${window.location.pathname}${window.location.search}`
    router.replace(buildSignInPath(currentPath))
  }, [router])

  const refreshAll = useCallback(async (nextTenantId: string) => {
    setLoading(true)
    setError('')
    try {
      const [nextSkills, nextHealth, filesData] = await Promise.all([
        listRuntimeSkills(nextTenantId),
        listRuntimeWorkspaceHealth(nextTenantId),
        listRuntimeWorkspaceFiles(nextTenantId, { includeHidden: true }),
      ])
      setSkills(nextSkills.skills)
      setHealth(nextHealth)
      setMarkdownFiles(filesData.files)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load skills and workspace data.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          redirectToSignIn()
          return
        }
        const resolvedTenantId = deriveTenantIdFromUserId(session.user.id)
        if (cancelled) return
        setTenantId(resolvedTenantId)
        await refreshAll(resolvedTenantId)
        if (!cancelled) {
          setCheckingSession(false)
        }
      } catch {
        redirectToSignIn()
      }
    }

    void loadSession()
    return () => {
      cancelled = true
    }
  }, [redirectToSignIn, refreshAll])

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return skills
    return skills.filter((skill) => {
      const key = skill.key.toLowerCase()
      const name = skill.name.toLowerCase()
      return key.includes(query) || name.includes(query)
    })
  }, [search, skills])

  const clawhubSkill = useMemo(() => {
    return skills.find((skill) => {
      const tokens = new Set(skillIdentityTokens(skill))
      return tokens.has('clawhub') || Array.from(tokens).some((token) => token.includes('clawhub'))
    }) ?? null
  }, [skills])

  const configRequiredEnvKeys = useMemo(() => {
    if (!configSkill) return []
    return extractMissingStatus(configSkill).env
  }, [configSkill])

  const configSkillOption = useMemo(() => {
    if (!configSkill) return null
    return findSkillOptionForRuntimeSkill(configSkill)
  }, [configSkill])

  const configPrimarySensitiveField = useMemo(() => {
    return choosePrimarySensitiveField(configSkillOption, configRequiredEnvKeys)
  }, [configRequiredEnvKeys, configSkillOption])

  const shouldShowConfigApiKeyInput = useMemo(() => {
    const hasSensitiveRequiredEnv = configRequiredEnvKeys.some((key) => looksSensitiveCredentialKey(key))
    return Boolean(configPrimarySensitiveField) && !hasSensitiveRequiredEnv
  }, [configPrimarySensitiveField, configRequiredEnvKeys])

  const configSuggestedFields = useMemo(() => {
    if (!configSkillOption?.configFields?.length) return []
    const requiredEnvKeySet = new Set(configRequiredEnvKeys.map((key) => normalizeToken(key)))
    return configSkillOption.configFields.filter((field) => !requiredEnvKeySet.has(normalizeToken(field.id)))
  }, [configRequiredEnvKeys, configSkillOption])

  const handleRefresh = useCallback(async () => {
    if (!tenantId) return
    await refreshAll(tenantId)
  }, [refreshAll, tenantId])

  const waitForSkillInstall = useCallback(async (
    nextTenantId: string,
    targetSkill: RuntimeSkillSummary,
    timeoutMs = 45_000,
  ): Promise<{
    installed: boolean
    matchedSkill: RuntimeSkillSummary | null
    skills: RuntimeSkillSummary[]
  }> => {
    const startedAt = Date.now()
    let latestSkills: RuntimeSkillSummary[] = []
    let latestMatchedSkill: RuntimeSkillSummary | null = null

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const next = await listRuntimeSkills(nextTenantId)
        latestSkills = next.skills
        latestMatchedSkill = findMatchingSkill(next.skills, targetSkill)
        if (latestMatchedSkill && isSkillInstalled(latestMatchedSkill)) {
          return {
            installed: true,
            matchedSkill: latestMatchedSkill,
            skills: next.skills,
          }
        }
      } catch {
        // Ignore transient polling failures and keep waiting for install status.
      }
      await delay(2_500)
    }

    return {
      installed: false,
      matchedSkill: latestMatchedSkill,
      skills: latestSkills,
    }
  }, [])

  const handleInstall = useCallback(async (skill: RuntimeSkillSummary, installOption: InstallOption) => {
    if (!tenantId) return
    const actionKey = `install:${skill.key}`
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      setStatus(`Installing ${skill.name} using ${installOption.id}...`)
      const installPayload = await installRuntimeSkill(tenantId, {
        name: resolveSkillInstallName(skill),
        installId: installOption.id,
      })
      const installProblem = extractInstallResultProblem(
        toRecord(installPayload)?.result ?? installPayload,
      )
      if (installProblem) {
        throw new Error(installProblem)
      }

      const verification = await waitForSkillInstall(tenantId, skill)
      if (verification.skills.length > 0) {
        setSkills(verification.skills)
      }
      await refreshAll(tenantId)

      if (!verification.installed) {
        const missingSummary = verification.matchedSkill
          ? summarizeMissing(extractMissingStatus(verification.matchedSkill))
          : null
        throw new Error(
          missingSummary
            ? `Install ran, but ${skill.name} is still not installed. Still missing: ${missingSummary}.`
            : `Install ran, but ${skill.name} still appears as not installed.`,
        )
      }

      setStatus(`${skill.name} installed successfully (via ${installOption.id}).`)
    } catch (installError) {
      setStatus('')
      setError(installError instanceof Error ? installError.message : `Failed to install ${skill.name}.`)
    } finally {
      setActionPendingKey('')
    }
  }, [refreshAll, tenantId, waitForSkillInstall])

  const handleToggle = useCallback(async (skill: RuntimeSkillSummary, enabled: boolean) => {
    if (!tenantId) return
    const actionKey = `toggle:${skill.key}`
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await updateRuntimeSkill(tenantId, {
        skillKey: resolveSkillCanonicalKey(skill),
        enabled,
      })
      await refreshAll(tenantId)
      setStatus(`${skill.name} ${enabled ? 'enabled' : 'disabled'}.`)
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : `Failed to update ${skill.name}.`)
    } finally {
      setActionPendingKey('')
    }
  }, [refreshAll, tenantId])

  const openConfigureDialog = useCallback((skill: RuntimeSkillSummary) => {
    setConfigSkill(skill)
    setConfigApiKey('')
    const envDefaults: Record<string, string> = {}
    for (const key of extractMissingStatus(skill).env) {
      envDefaults[key] = ''
    }
    setConfigRequiredEnvValues(envDefaults)
    setConfigExtraEnvLines('')
    setConfigError('')
    setConfigDialogOpen(true)
  }, [])

  const handleSaveConfig = useCallback(async () => {
    if (!tenantId || !configSkill) return
    setConfigError('')
    setError('')
    setStatus('')

    const payload: {
      skillKey: string
      apiKey?: string
      env?: Record<string, string>
    } = {
      skillKey: resolveSkillCanonicalKey(configSkill),
    }

    const trimmedApiKey = configApiKey.trim()
    if (trimmedApiKey) {
      payload.apiKey = trimmedApiKey
    }

    const env: Record<string, string> = {}
    for (const key of configRequiredEnvKeys) {
      const value = configRequiredEnvValues[key]?.trim() ?? ''
      if (!value) {
        setConfigError(`Please fill ${key}.`)
        return
      }
      env[key] = value
    }

    const parsedExtra = parseExtraEnvLines(configExtraEnvLines)
    if (parsedExtra.error) {
      setConfigError(parsedExtra.error)
      return
    }

    for (const [key, value] of Object.entries(parsedExtra.env)) {
      env[key] = value
    }

    if (Object.keys(env).length > 0) {
      payload.env = env
    }

    if (!payload.apiKey && !payload.env) {
      setConfigError('This skill currently has no required API/env values from runtime.')
      return
    }

    const actionKey = `config:${configSkill.key}`
    setActionPendingKey(actionKey)
    try {
      await updateRuntimeSkill(tenantId, payload)
      setConfigDialogOpen(false)
      await refreshAll(tenantId)
      setStatus(`${configSkill.name} config updated.`)
    } catch (saveError) {
      setConfigError(saveError instanceof Error ? saveError.message : 'Failed to save skill config.')
    } finally {
      setActionPendingKey('')
    }
  }, [
    configApiKey,
    configExtraEnvLines,
    configRequiredEnvKeys,
    configRequiredEnvValues,
    configSkill,
    refreshAll,
    tenantId,
  ])

  const handleRepair = useCallback(async () => {
    if (!tenantId) return
    const actionKey = 'repair:workspace'
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      const repaired = await repairRuntimeWorkspaceEssentials(tenantId)
      setHealth(repaired)
      await refreshAll(tenantId)
      setStatus('Workspace essentials repaired.')
    } catch (repairError) {
      setError(repairError instanceof Error ? repairError.message : 'Failed to repair workspace essentials.')
    } finally {
      setActionPendingKey('')
    }
  }, [refreshAll, tenantId])

  const handleCreateTemplate = useCallback(async (template: 'memory-md' | 'boot-md' | 'daily-memory') => {
    if (!tenantId) return
    const actionKey = `template:${template}`
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await createRuntimeWorkspaceTemplate(tenantId, { template })
      await refreshAll(tenantId)
      setStatus(`Template created: ${template}.`)
    } catch (templateError) {
      setError(templateError instanceof Error ? templateError.message : 'Failed to create template.')
    } finally {
      setActionPendingKey('')
    }
  }, [refreshAll, tenantId])

  const handleCreateMarkdownFile = useCallback(async () => {
    if (!tenantId) return
    const normalizedPath = newFilePath.trim()
    if (!isValidRelativeMdPath(normalizedPath)) {
      setError('File path must be a relative .md path, for example: notes/project.md')
      return
    }

    const actionKey = `upsert:${normalizedPath}`
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await upsertRuntimeWorkspaceFile(tenantId, {
        relativePath: normalizedPath,
        content: newFileContent,
        overwrite: true,
      })
      await refreshAll(tenantId)
      setStatus(`${normalizedPath} saved.`)
      setNewFilePath('notes/new-note.md')
      setNewFileContent('')
    } catch (upsertError) {
      setError(upsertError instanceof Error ? upsertError.message : 'Failed to save markdown file.')
    } finally {
      setActionPendingKey('')
    }
  }, [newFileContent, newFilePath, refreshAll, tenantId])

  const handleOpenMarkdownFile = useCallback(async (relativePath: string) => {
    if (!tenantId) return
    setActionPendingKey(`view:${relativePath}`)
    setError('')
    setStatus('')
    setFileDialogPath(relativePath)
    setFileDialogLoading(true)
    setFileDialogOpen(true)

    try {
      const fileData = await readRuntimeWorkspaceFile(tenantId, relativePath)
      if (!fileData.exists) {
        setError(`${relativePath} was not found.`)
        setFileDialogOpen(false)
        return
      }
      setFileDialogPath(fileData.relativePath || relativePath)
      setFileDialogContent(fileData.content)
    } catch (readError) {
      setFileDialogOpen(false)
      setError(readError instanceof Error ? readError.message : `Failed to read ${relativePath}.`)
    } finally {
      setFileDialogLoading(false)
      setActionPendingKey('')
    }
  }, [tenantId])

  const handleSaveOpenedMarkdownFile = useCallback(async () => {
    if (!tenantId || !fileDialogPath) return
    const normalizedPath = fileDialogPath.trim()
    if (!isValidRelativeMdPath(normalizedPath)) {
      setError('File path must be a relative .md path, for example: notes/project.md')
      return
    }

    const actionKey = `save-opened:${normalizedPath}`
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await upsertRuntimeWorkspaceFile(tenantId, {
        relativePath: normalizedPath,
        content: fileDialogContent,
        overwrite: true,
      })
      await refreshAll(tenantId)
      setStatus(`${normalizedPath} saved.`)
      setFileDialogOpen(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `Failed to save ${normalizedPath}.`)
    } finally {
      setActionPendingKey('')
    }
  }, [fileDialogContent, fileDialogPath, refreshAll, tenantId])

  const handleDeleteMarkdownFile = useCallback(async (relativePath: string) => {
    if (!tenantId) return
    const confirmed = window.confirm(`Delete ${relativePath}?`)
    if (!confirmed) return

    const actionKey = `delete:${relativePath}`
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await deleteRuntimeWorkspaceFile(tenantId, { relativePath })
      await refreshAll(tenantId)
      setStatus(`${relativePath} deleted.`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `Failed to delete ${relativePath}.`)
    } finally {
      setActionPendingKey('')
    }
  }, [refreshAll, tenantId])

  if (checkingSession) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to settings
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        <div>
          <h1 className="text-lg font-semibold tracking-tight">Skills & Workspace</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Install and configure skills, then create and manage any Markdown files in workspace.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {status ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
            {status}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card className="border-border/70">
            <CardHeader className="space-y-3">
              <CardTitle className="text-base">Skills</CardTitle>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search skills by name"
                className="h-9"
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredSkills.map((skill) => {
                const missing = extractMissingStatus(skill)
                const installOptions = extractInstallOptions(skill)
                const preferredInstallOption = pickPreferredInstallOption(installOptions, health?.workspaceDir)
                const alternativeInstallOptions = preferredInstallOption
                  ? installOptions.filter((option) => option.id !== preferredInstallOption.id)
                  : []
                const eligible = isSkillEligible(skill)
                const installed = isSkillInstalled(skill)
                const toggleActionKey = `toggle:${skill.key}`
                const installActionKey = `install:${skill.key}`
                const configActionKey = `config:${skill.key}`
                return (
                  <div key={skill.key} className="rounded-xl border border-border/70 bg-card/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{skill.name}</p>
                        <p className="text-xs text-muted-foreground">{skill.key}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 ${installed ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                          {installed ? 'Installed' : 'Not installed'}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 ${eligible ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>
                          {eligible ? 'Eligible' : 'Needs setup'}
                        </span>
                        {skill.enabled !== null ? (
                          <span className={`rounded-full px-2 py-0.5 ${skill.enabled ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                            {skill.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {summarizeMissing(missing) ? (
                      <p className="mt-2 text-xs text-muted-foreground">{summarizeMissing(missing)}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {installOptions.length > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const option = preferredInstallOption ?? installOptions[0] ?? null
                            if (option) void handleInstall(skill, option)
                          }}
                          disabled={actionPendingKey === installActionKey}
                        >
                          {actionPendingKey === installActionKey ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          {installed ? 'Reinstall' : 'Install'}
                          {preferredInstallOption ? ` (${preferredInstallOption.id})` : ''}
                        </Button>
                      ) : null}

                      {alternativeInstallOptions.slice(0, 2).map((option) => (
                        <Button
                          key={`${skill.key}-installer-${option.id}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleInstall(skill, option)}
                          disabled={actionPendingKey === installActionKey}
                        >
                          Use {option.id}
                        </Button>
                      ))}

                      {skill.enabled !== null ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleToggle(skill, !skill.enabled)}
                          disabled={actionPendingKey === toggleActionKey}
                        >
                          {actionPendingKey === toggleActionKey ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          {skill.enabled ? 'Disable' : 'Enable'}
                        </Button>
                      ) : null}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openConfigureDialog(skill)}
                        disabled={actionPendingKey === configActionKey}
                      >
                        <Settings2 className="mr-2 h-3.5 w-3.5" />
                        Configure
                      </Button>
                    </div>
                  </div>
                )
              })}

              {filteredSkills.length === 0 ? (
                <p className="rounded-lg border border-border/70 px-3 py-4 text-sm text-muted-foreground">
                  No skills matched your search.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">ClawHub</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use ClawHub for marketplace-style skill discovery and installs.
                </p>
                {clawhubSkill ? (
                  <div className="rounded-lg border border-border/70 px-3 py-2 text-xs">
                    Status: {isSkillInstalled(clawhubSkill) ? 'Installed' : 'Not installed'}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {clawhubSkill ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const options = extractInstallOptions(clawhubSkill)
                        const option = pickPreferredInstallOption(options, health?.workspaceDir) ?? options[0] ?? null
                        if (option) void handleInstall(clawhubSkill, option)
                      }}
                      disabled={actionPendingKey === 'install:clawhub'}
                    >
                      {actionPendingKey === 'install:clawhub' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                      Install clawhub
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" asChild>
                    <a href="https://clawhub.ai" target="_blank" rel="noreferrer">
                      Open ClawHub
                      <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Workspace Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground break-all">
                  Workspace: {health?.workspaceDir ?? 'Unavailable'}
                </p>
                {healthRow('memory/ directory', Boolean(health?.memoryDirExists))}
                {healthRow('Hook: boot-md', Boolean(health?.hooks.bootMdEnabled))}
                {healthRow('Hook: command-logger', Boolean(health?.hooks.commandLoggerEnabled))}
                {healthRow('Hook: session-memory', Boolean(health?.hooks.sessionMemoryEnabled))}
                {healthRow('MEMORY.md (optional)', Boolean(health?.files.memoryMdExists), true)}
                {healthRow('BOOT.md (optional)', Boolean(health?.files.bootMdExists), true)}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleRepair()}
                    disabled={actionPendingKey === 'repair:workspace'}
                  >
                    {actionPendingKey === 'repair:workspace' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Wrench className="mr-2 h-3.5 w-3.5" />}
                    Repair essentials
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCreateTemplate('memory-md')}
                    disabled={actionPendingKey === 'template:memory-md'}
                  >
                    Create MEMORY.md template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCreateTemplate('boot-md')}
                    disabled={actionPendingKey === 'template:boot-md'}
                  >
                    Create BOOT.md template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCreateTemplate('daily-memory')}
                    disabled={actionPendingKey === 'template:daily-memory'}
                  >
                    Add daily memory note
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Markdown Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Create, update, or delete any Markdown file in workspace.
                </p>

                <div className="space-y-2 rounded-lg border border-border/70 p-3">
                  <Label htmlFor="new-md-path">File path (.md)</Label>
                  <Input
                    id="new-md-path"
                    value={newFilePath}
                    onChange={(event) => setNewFilePath(event.target.value)}
                    placeholder="notes/new-note.md"
                  />
                  <Label htmlFor="new-md-content">Content</Label>
                  <Textarea
                    id="new-md-content"
                    value={newFileContent}
                    onChange={(event) => setNewFileContent(event.target.value)}
                    className="min-h-28"
                    placeholder="# New note"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCreateMarkdownFile()}
                    disabled={actionPendingKey === `upsert:${newFilePath.trim()}`}
                  >
                    {actionPendingKey === `upsert:${newFilePath.trim()}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Save file
                  </Button>
                </div>

                <div className="max-h-64 space-y-2 overflow-auto rounded-lg border border-border/70 p-3">
                  {markdownFiles.length > 0 ? markdownFiles.map((relativePath) => (
                    <div key={relativePath} className="flex items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2">
                      <span className="truncate text-xs" title={relativePath}>{relativePath}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleOpenMarkdownFile(relativePath)}
                          disabled={actionPendingKey === `view:${relativePath}`}
                        >
                          {actionPendingKey === `view:${relativePath}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDeleteMarkdownFile(relativePath)}
                          disabled={actionPendingKey === `delete:${relativePath}`}
                        >
                          {actionPendingKey === `delete:${relativePath}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                          Delete
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground">No markdown files found yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure skill</DialogTitle>
            <DialogDescription>
              Fill only the values this skill needs. If a field is unclear, use the docs link below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {configSkillOption ? (
              <div className="rounded-lg border border-border/70 p-3 text-xs">
                <p className="font-medium text-foreground">{configSkillOption.label}</p>
                <p className="mt-1 text-muted-foreground">{configSkillOption.summary}</p>
                {configSkillOption.requiredFromUser.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                    {configSkillOption.requiredFromUser.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
                <a
                  href={configSkillOption.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Info className="h-3.5 w-3.5" />
                  Open skill docs
                </a>
              </div>
            ) : null}

            {shouldShowConfigApiKeyInput ? (
              <div className="space-y-1.5">
                <Label htmlFor="skill-api-key">
                  {configPrimarySensitiveField?.label ?? 'API key / token'}
                </Label>
                <Input
                  id="skill-api-key"
                  type="password"
                  value={configApiKey}
                  onChange={(event) => setConfigApiKey(event.target.value)}
                  placeholder={configPrimarySensitiveField?.placeholder ?? 'Paste credential value'}
                  autoComplete="off"
                />
                {configPrimarySensitiveField ? (
                  <p className="text-xs text-muted-foreground">
                    {inferCredentialSourceHint(configPrimarySensitiveField.id) ?? 'Check the skill docs link above for where to generate this credential.'}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                This skill does not appear to require a direct API key field.
              </p>
            )}

            {configRequiredEnvKeys.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-border/70 p-3">
                <p className="text-xs font-medium text-foreground">Required environment variables</p>
                {configRequiredEnvKeys.map((key) => {
                  const matchedField = findOptionFieldForEnvKey(configSkillOption, key)
                  const label = matchedField?.label ?? key
                  const hint = inferCredentialSourceHint(`${key} ${label}`)
                  const isSensitive = looksSensitiveCredentialKey(key) || Boolean(matchedField && isSensitiveConfigField(matchedField))
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={`env-required-${key}`}>{label}</Label>
                      <Input
                        id={`env-required-${key}`}
                        type={isSensitive ? 'password' : 'text'}
                        value={configRequiredEnvValues[key] ?? ''}
                        onChange={(event) => {
                          const nextValue = event.target.value
                          setConfigRequiredEnvValues((previous) => ({
                            ...previous,
                            [key]: nextValue,
                          }))
                        }}
                        placeholder={matchedField?.placeholder ?? `Enter ${key}`}
                        autoComplete="off"
                      />
                      {hint ? (
                        <p className="text-xs text-muted-foreground">{hint}</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="skill-extra-env-lines">Additional env variables (advanced)</Label>
              <Textarea
                id="skill-extra-env-lines"
                value={configExtraEnvLines}
                onChange={(event) => setConfigExtraEnvLines(event.target.value)}
                className="min-h-24 font-mono text-xs"
                placeholder={'OPENAI_API_BASE=https://api.example.com\nFEATURE_FLAG=true'}
              />
            </div>

            {configError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {configError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveConfig()}
              disabled={actionPendingKey === `config:${configSkill?.key ?? ''}`}
            >
              {actionPendingKey === `config:${configSkill?.key ?? ''}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>View Markdown file</DialogTitle>
            <DialogDescription>
              Read and edit existing markdown content in your runtime workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="open-md-path">File path</Label>
            <Input
              id="open-md-path"
              value={fileDialogPath}
              onChange={(event) => setFileDialogPath(event.target.value)}
              disabled={fileDialogLoading}
            />
            <Label htmlFor="open-md-content">Content</Label>
            <Textarea
              id="open-md-content"
              value={fileDialogContent}
              onChange={(event) => setFileDialogContent(event.target.value)}
              className="min-h-72 font-mono text-xs"
              disabled={fileDialogLoading}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFileDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveOpenedMarkdownFile()}
              disabled={fileDialogLoading || actionPendingKey === `save-opened:${fileDialogPath.trim()}`}
            >
              {fileDialogLoading || actionPendingKey === `save-opened:${fileDialogPath.trim()}` ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
