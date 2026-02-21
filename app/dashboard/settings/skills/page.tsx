'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FilePlus2,
  Info,
  Loader2,
  MessageSquare,
  RotateCcw,
  RefreshCw,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  createRuntimeWorkspaceTemplate,
  deleteRuntimeWorkspaceFile,
  installRuntimeSkill,
  listRuntimeWorkspaceFileVersions,
  listRuntimeWorkspaceTrashFiles,
  purgeRuntimeWorkspaceTrashFile,
  readRuntimeWorkspaceFile,
  resetRuntimeOpenClawInstance,
  restoreRuntimeWorkspaceFileVersion,
  restoreRuntimeWorkspaceTrashFile,
  listRuntimeSkills,
  listRuntimeWorkspaceFiles,
  listRuntimeWorkspaceHealth,
  repairRuntimeWorkspaceEssentials,
  updateRuntimeSkill,
  upsertRuntimeWorkspaceFile,
  type RuntimeSkillSummary,
  type RuntimeWorkspaceHealthData,
  type RuntimeWorkspaceTrashFileSummary,
  type RuntimeWorkspaceFileVersionSummary,
} from '@/lib/runtime-controls'
import { getSkillOptionById, type SkillConfigField, type SkillOption } from '@/lib/skill-options'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

interface InstallOption {
  id: string
  label: string
}

const SYSTEM_AUTO_INSTALL_ID = 'system-auto'

const SYSTEM_AUTO_PACKAGE_BY_BIN: Record<string, string> = {
  gh: 'gh',
  rg: 'ripgrep',
  jq: 'jq',
  git: 'git',
  curl: 'curl',
  ffmpeg: 'ffmpeg',
  op: '1password-cli',
}

interface MissingStatus {
  bins: string[]
  env: string[]
  config: string[]
  os: string[]
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

function isBrewInstallOption(option: InstallOption): boolean {
  const tokens = installOptionTokens(option)
  return tokens.includes('brew')
}

function resolveSystemAutoPackageForBin(bin: string): string | null {
  const normalized = bin.trim().toLowerCase()
  if (!normalized) return null
  return SYSTEM_AUTO_PACKAGE_BY_BIN[normalized] ?? null
}

function canAutoInstallMissingBins(missing: MissingStatus): boolean {
  if (missing.os.length > 0 || missing.bins.length === 0) {
    return false
  }
  return missing.bins.every((bin) => Boolean(resolveSystemAutoPackageForBin(bin)))
}

function looksLikeMissingBrewInstallError(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return (
    normalized.includes('brew not installed') ||
    normalized.includes('homebrew is not installed') ||
    normalized.includes('install it from https://brew.sh')
  )
}

function extractManualPackageNameFromInstallError(message: string): string | null {
  const match = message.match(/install\s+"([^"]+)"\s+manually/i)
  const candidate = match?.[1]?.trim() ?? ''
  return candidate || null
}

function normalizeInstallFailureMessage(
  rawMessage: string,
  installOption: InstallOption,
  workspaceDir: string | null | undefined,
): string {
  const normalized = rawMessage.trim().toUpperCase()
  if (normalized.includes('SKILL_UNSUPPORTED_ON_RUNTIME')) {
    return 'This skill is not supported on the current runtime OS.'
  }

  if (normalized.includes('SYSTEM_PACKAGE_MAPPING_MISSING')) {
    return `Automatic dependency install is not mapped yet for this skill. ${rawMessage}`
  }

  if (
    normalized.includes('SYSTEM_PACKAGE_INSTALL_FAILED')
    || normalized.includes('SYSTEM_PACKAGE_INSTALL_INCOMPLETE')
  ) {
    return `Automatic dependency install failed on the runtime host. ${rawMessage}`
  }

  if (
    detectWorkspacePlatform(workspaceDir) === 'linux' &&
    isBrewInstallOption(installOption) &&
    looksLikeMissingBrewInstallError(rawMessage)
  ) {
    const packageName = extractManualPackageNameFromInstallError(rawMessage)
    if (packageName) {
      return `Automatic install could not complete because brew is unavailable. Backend fallback for "${packageName}" did not finish. Retry Install, then check backend logs if it keeps failing.`
    }

    return 'Automatic install could not complete because brew is unavailable and backend fallback did not finish. Retry Install, then check backend logs if it keeps failing.'
  }

  return rawMessage
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
  const missing = extractMissingStatus(skill)
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

  if (dedupedOptions.length === 0 && canAutoInstallMissingBins(missing)) {
    return [{ id: SYSTEM_AUTO_INSTALL_ID, label: 'Install dependencies (auto)' }]
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
    os: readStringArray(missing, 'os'),
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
  if (missing.os.length > 0) {
    parts.push(`os: ${missing.os.join(', ')}`)
  }
  if (missing.bins.length > 0) parts.push(`bins: ${missing.bins.join(', ')}`)
  if (missing.env.length > 0) parts.push(`env: ${missing.env.join(', ')}`)
  if (missing.config.length > 0) parts.push(`config: ${missing.config.join(', ')}`)
  return parts.join(' | ')
}

function requiresInstallOrRuntimeSetupBeforeConfig(missing: MissingStatus): boolean {
  return missing.os.length > 0 || missing.bins.length > 0 || missing.config.length > 0
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
    (field.envKeys ?? []).some((key) => normalizeToken(key) === normalizedKey)
      || normalizeToken(field.id) === normalizedKey
      || normalizeToken(field.label) === normalizedKey
  )) ?? null
}

function inferCredentialSourceHint(value: string): string | null {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes('openai')) {
    return 'Create it in OpenAI dashboard -> API keys.'
  }
  if (normalized.includes('gemini') || normalized.includes('google_places') || normalized.includes('googleplaces')) {
    return 'Create it in Google AI Studio or Google Cloud Credentials (based on the skill).'
  }
  if (normalized.includes('github')) {
    return 'Create it in GitHub Settings -> Developer settings -> Personal access tokens.'
  }
  if (normalized.includes('elevenlabs')) {
    return 'Create it in ElevenLabs Settings -> API Keys.'
  }
  if (normalized.includes('giphy')) {
    return 'Create it in GIPHY Developers (create app -> API key).'
  }
  if (normalized.includes('hue') || normalized.includes('bridge_key')) {
    return 'Create a Hue app key from your Hue bridge integration setup.'
  }
  if (normalized.includes('spotify')) {
    return 'Create it in Spotify Developer Dashboard (app credentials).'
  }
  if (normalized.includes('app_password')) {
    return 'Generate an app password in your email provider security settings.'
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

function isValidRelativeMdPath(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) return false
  if (normalized.startsWith('/')) return false
  if (normalized.includes('..')) return false
  return /^[A-Za-z0-9._/-]+\.md$/i.test(normalized)
}

function affectsWorkspaceHealthSummary(relativePath: string): boolean {
  const normalized = relativePath.trim().toLowerCase()
  if (!normalized) return false
  if (normalized.includes('/')) return false
  return normalized === 'memory.md' || normalized === 'boot.md' || normalized === 'agents.md'
}

function getPathFileName(relativePath: string): string {
  const normalized = relativePath.trim()
  if (!normalized) return ''
  const segments = normalized.split('/')
  return segments[segments.length - 1] ?? normalized
}

function resolveWorkspaceMarkdownPath(markdownFiles: string[], canonicalRelativePath: string): string {
  const normalized = canonicalRelativePath.trim().toLowerCase()
  return markdownFiles.find((path) => path.trim().toLowerCase() === normalized) ?? canonicalRelativePath
}

function isCriticalWorkspaceFile(relativePath: string): boolean {
  const normalized = relativePath.trim().toLowerCase()
  if (!normalized || normalized.includes('/')) {
    return false
  }

  return [
    'agents.md',
    'soul.md',
    'user.md',
    'identity.md',
    'tools.md',
    'heartbeat.md',
    'boot.md',
    'bootstrap.md',
    'memory.md',
  ].includes(normalized)
}

function workspaceFileRisk(
  relativePath: string,
): {
  level: 'critical' | 'operational' | 'normal'
  label: string
  message: string
} {
  if (isCriticalWorkspaceFile(relativePath)) {
    return {
      level: 'critical',
      label: 'Critical',
      message: 'Changing this file can alter startup behavior, memory, or core assistant behavior.',
    }
  }

  const normalized = relativePath.trim().toLowerCase()
  if (normalized.startsWith('memory/') || normalized.endsWith('/skill.md')) {
    return {
      level: 'operational',
      label: 'Operational',
      message: 'This file influences memory or skills. Changes can impact assistant quality.',
    }
  }

  return {
    level: 'normal',
    label: 'Normal',
    message: 'Standard markdown file.',
  }
}

function buildAbsoluteWorkspaceFilePath(workspaceDir: string | null | undefined, relativePath: string): string | null {
  const base = workspaceDir?.trim()
  if (!base) return null
  const rel = relativePath.trim().replace(/^\/+/, '')
  if (!rel) return null
  return `${base.replace(/\/+$/, '')}/${rel}`
}

function formatVersionTimestamp(value: string | null | undefined): string {
  const raw = value?.trim() ?? ''
  if (!raw) return 'Unknown'

  const normalized = raw.replace(/\.md$/i, '').replace(/-.*$/, '')
  if (!/^\d{8}T\d{6}Z$/.test(normalized)) return raw

  const iso = `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}T${normalized.slice(9, 11)}:${normalized.slice(11, 13)}:${normalized.slice(13, 15)}Z`
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleString()
}

function formatBytes(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
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
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false)
  const [fileDialogOpen, setFileDialogOpen] = useState(false)
  const [fileDialogMode, setFileDialogMode] = useState<'view' | 'edit'>('view')
  const [fileDialogPath, setFileDialogPath] = useState('')
  const [fileDialogContent, setFileDialogContent] = useState('')
  const [fileDialogLoading, setFileDialogLoading] = useState(false)
  const [fileVersions, setFileVersions] = useState<RuntimeWorkspaceFileVersionSummary[]>([])
  const [fileVersionsLoading, setFileVersionsLoading] = useState(false)
  const [trashFiles, setTrashFiles] = useState<RuntimeWorkspaceTrashFileSummary[]>([])
  const [trashRetentionDays, setTrashRetentionDays] = useState(30)
  const [copiedValue, setCopiedValue] = useState('')
  const [resetMode, setResetMode] = useState<'workspace' | 'factory'>('workspace')
  const [trashDialogOpen, setTrashDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [configSkill, setConfigSkill] = useState<RuntimeSkillSummary | null>(null)
  const [configApiKey, setConfigApiKey] = useState('')
  const [configRequiredEnvValues, setConfigRequiredEnvValues] = useState<Record<string, string>>({})
  const [configError, setConfigError] = useState('')

  const redirectToSignIn = useCallback(() => {
    const currentPath = typeof window === 'undefined'
      ? '/dashboard/settings/skills'
      : `${window.location.pathname}${window.location.search}`
    router.replace(buildSignInPath(currentPath))
  }, [router])

  const refreshSkills = useCallback(async (nextTenantId: string, syncRuntime = false) => {
    const nextSkills = await listRuntimeSkills(nextTenantId, {
      syncRuntime,
    })
    setSkills(nextSkills.skills)
    return nextSkills
  }, [])

  const refreshWorkspaceHealth = useCallback(async (nextTenantId: string, syncRuntime = false) => {
    const nextHealth = await listRuntimeWorkspaceHealth(nextTenantId, {
      syncRuntime,
    })
    setHealth(nextHealth)
    return nextHealth
  }, [])

  const refreshWorkspaceFiles = useCallback(async (nextTenantId: string, syncRuntime = false) => {
    const filesData = await listRuntimeWorkspaceFiles(nextTenantId, {
      includeHidden: true,
      syncRuntime,
    })
    setMarkdownFiles(filesData.files)
    return filesData
  }, [])

  const refreshWorkspaceTrash = useCallback(async (nextTenantId: string, retentionDays = 30) => {
    const trashData = await listRuntimeWorkspaceTrashFiles(nextTenantId, {
      retentionDays,
    })
    setTrashFiles(trashData.files)
  }, [])

  const refreshWorkspaceAfterFileMutation = useCallback(async (nextTenantId: string, relativePath: string) => {
    if (affectsWorkspaceHealthSummary(relativePath)) {
      await Promise.all([
        refreshWorkspaceFiles(nextTenantId),
        refreshWorkspaceHealth(nextTenantId),
      ])
      return
    }
    await refreshWorkspaceFiles(nextTenantId)
  }, [refreshWorkspaceFiles, refreshWorkspaceHealth])

  const refreshAll = useCallback(async (nextTenantId: string) => {
    setLoading(true)
    setError('')
    try {
      const [nextSkills, nextHealth, nextFiles] = await Promise.all([
        // Force fresh runtime reads on initial load so the page does not
        // silently render stale/empty snapshot state.
        refreshSkills(nextTenantId, true),
        refreshWorkspaceHealth(nextTenantId, true),
        refreshWorkspaceFiles(nextTenantId, true),
        refreshWorkspaceTrash(nextTenantId, trashRetentionDays),
      ])
      if (nextSkills.skills.length === 0 && !nextHealth.workspaceDir && nextFiles.files.length === 0) {
        setStatus('Runtime returned no skills/files yet. Verify daemon/runtime is reachable, then click Refresh.')
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load skills and workspace data.'
      console.error('[skills-page] initial refresh failed', {
        tenantId: nextTenantId,
        message,
        error: loadError,
      })
      setError(message)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }, [refreshSkills, refreshWorkspaceFiles, refreshWorkspaceHealth, refreshWorkspaceTrash, trashRetentionDays])

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

  const filteredMarkdownFiles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return markdownFiles
    return markdownFiles.filter((relativePath) => (
      relativePath.toLowerCase().includes(query) ||
      getPathFileName(relativePath).toLowerCase().includes(query)
    ))
  }, [markdownFiles, search])

  const workspaceHealthMarkdownFiles = useMemo(() => {
    const resolvePath = (canonicalRelativePath: string) => resolveWorkspaceMarkdownPath(markdownFiles, canonicalRelativePath)
    return [
      {
        key: 'agents',
        label: 'AGENTS.md',
        relativePath: resolvePath('agents.md'),
        exists: Boolean(health?.files.agentsMdExists),
        optional: false,
        template: undefined as 'memory-md' | 'boot-md' | undefined,
      },
      {
        key: 'memory',
        label: 'MEMORY.md',
        relativePath: resolvePath('memory.md'),
        exists: Boolean(health?.files.memoryMdExists),
        optional: true,
        template: 'memory-md' as const,
      },
      {
        key: 'boot',
        label: 'BOOT.md',
        relativePath: resolvePath('boot.md'),
        exists: Boolean(health?.files.bootMdExists),
        optional: true,
        template: 'boot-md' as const,
      },
    ]
  }, [health?.files.agentsMdExists, health?.files.bootMdExists, health?.files.memoryMdExists, markdownFiles])

  const latestMemoryNotePath = useMemo(() => {
    const memoryNotes = markdownFiles
      .filter((relativePath) => {
        const normalized = relativePath.trim().toLowerCase()
        return normalized.startsWith('memory/') && normalized.endsWith('.md')
      })
      .sort((left, right) => right.localeCompare(left))
    return memoryNotes[0] ?? null
  }, [markdownFiles])

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

  const configNeedsUserInput = useMemo(() => {
    return shouldShowConfigApiKeyInput || configRequiredEnvKeys.length > 0
  }, [configRequiredEnvKeys.length, shouldShowConfigApiKeyInput])

  const configRuntimeSetupHint = useMemo(() => {
    if (!configSkill) return null
    const missing = extractMissingStatus(configSkill)
    if (missing.os.length > 0) {
      return `This skill is not supported on the current runtime OS. Required OS: ${missing.os.join(', ')}.`
    }
    const parts: string[] = []
    if (missing.bins.length > 0) {
      parts.push(`missing binaries: ${missing.bins.join(', ')}`)
    }
    if (missing.config.length > 0) {
      parts.push(`missing runtime config: ${missing.config.join(', ')}`)
    }
    return parts.length > 0
      ? `No API/env values are required. Remaining setup: ${parts.join(' | ')}.`
      : 'No API/env values are required for this skill.'
  }, [configSkill])

  const handleRefresh = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      const [nextSkills, nextHealth, nextFiles] = await Promise.all([
        refreshSkills(tenantId, true),
        refreshWorkspaceHealth(tenantId, true),
        refreshWorkspaceFiles(tenantId, true),
        refreshWorkspaceTrash(tenantId, trashRetentionDays),
      ])
      if (nextSkills.skills.length === 0 && !nextHealth.workspaceDir && nextFiles.files.length === 0) {
        setStatus('Runtime returned no skills/files yet. Verify daemon/runtime is reachable, then click Refresh.')
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load skills and workspace data.'
      console.error('[skills-page] manual refresh failed', {
        tenantId,
        message,
        error: loadError,
      })
      setError(message)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }, [refreshSkills, refreshWorkspaceFiles, refreshWorkspaceHealth, refreshWorkspaceTrash, tenantId, trashRetentionDays])

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

    const pollIntervalsMs = [1_500, 2_500, 3_500, 5_000, 5_000, 7_000, 7_000]
    let pollIndex = 0
    let pollAttempts = 0

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const shouldSyncRuntime = pollAttempts === 0 || pollAttempts % 3 === 0
        const next = await listRuntimeSkills(nextTenantId, {
          syncRuntime: shouldSyncRuntime,
        })
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
      pollAttempts += 1
      const waitMs = pollIntervalsMs[Math.min(pollIndex, pollIntervalsMs.length - 1)]
      pollIndex += 1
      await delay(waitMs)
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
      if (installOption.id === SYSTEM_AUTO_INSTALL_ID) {
        setStatus(`Installing ${skill.name} dependencies automatically...`)
      } else {
        setStatus(`Installing ${skill.name} using ${installOption.id}...`)
      }
      const installPayload = await installRuntimeSkill(tenantId, {
        name: resolveSkillInstallName(skill),
        installId: installOption.id,
      })
      const installResult = toRecord(installPayload)?.result ?? installPayload
      const installProblem = extractInstallResultProblem(installResult)
      if (installProblem) {
        throw new Error(installProblem)
      }
      const installResultRecord = toRecord(installResult)
      const usedFallback = readBoolean(installResultRecord, 'fallbackUsed') === true

      const verification = await waitForSkillInstall(tenantId, skill)
      if (verification.skills.length > 0) {
        setSkills(verification.skills)
      }
      await Promise.all([
        refreshSkills(tenantId),
        refreshWorkspaceHealth(tenantId),
      ])

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

      if (usedFallback) {
        setStatus(`${skill.name} installed successfully. Dependency setup was handled automatically in the backend.`)
      } else if (installOption.id === SYSTEM_AUTO_INSTALL_ID) {
        setStatus(`${skill.name} dependencies installed automatically.`)
      } else {
        setStatus(`${skill.name} installed successfully (via ${installOption.id}).`)
      }
    } catch (installError) {
      setStatus('')
      const rawMessage = installError instanceof Error ? installError.message : `Failed to install ${skill.name}.`
      setError(normalizeInstallFailureMessage(rawMessage, installOption, health?.workspaceDir))
    } finally {
      setActionPendingKey('')
    }
  }, [health?.workspaceDir, refreshSkills, refreshWorkspaceHealth, tenantId, waitForSkillInstall])

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
      await refreshSkills(tenantId, false)
      setStatus(`${skill.name} ${enabled ? 'enabled' : 'disabled'}.`)
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : `Failed to update ${skill.name}.`)
    } finally {
      setActionPendingKey('')
    }
  }, [refreshSkills, tenantId])

  const openConfigureDialog = useCallback((skill: RuntimeSkillSummary) => {
    const missing = extractMissingStatus(skill)
    if (requiresInstallOrRuntimeSetupBeforeConfig(missing)) {
      const blockers: string[] = []
      if (missing.os.length > 0) {
        blockers.push(`unsupported runtime OS (requires: ${missing.os.join(', ')})`)
      }
      if (missing.bins.length > 0) {
        blockers.push(`missing binaries: ${missing.bins.join(', ')}`)
      }
      if (missing.config.length > 0) {
        blockers.push(`missing runtime config: ${missing.config.join(', ')}`)
      }
      const suffix = blockers.length > 0 ? ` (${blockers.join(' | ')})` : ''
      setStatus(`${skill.name}: install/setup required before configuration${suffix}.`)
      return
    }

    setConfigSkill(skill)
    setConfigApiKey('')
    const envDefaults: Record<string, string> = {}
    for (const key of missing.env) {
      envDefaults[key] = ''
    }
    setConfigRequiredEnvValues(envDefaults)
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

    if (Object.keys(env).length > 0) {
      payload.env = env
    }

    if (!payload.apiKey && !payload.env) {
      setConfigDialogOpen(false)
      if (configSkill) {
        const missing = extractMissingStatus(configSkill)
        const setupParts: string[] = []
        if (missing.os.length > 0) {
          setupParts.push(`required OS: ${missing.os.join(', ')}`)
        }
        if (missing.bins.length > 0) {
          setupParts.push(`bins: ${missing.bins.join(', ')}`)
        }
        if (missing.config.length > 0) {
          setupParts.push(`runtime config: ${missing.config.join(', ')}`)
        }
        if (setupParts.length > 0) {
          setStatus(`${configSkill.name}: no API/env values required. Remaining setup: ${setupParts.join(' | ')}.`)
        } else {
          setStatus(`${configSkill.name}: no API/env values required.`)
        }
      }
      return
    }

    const actionKey = `config:${configSkill.key}`
    setActionPendingKey(actionKey)
    try {
      await updateRuntimeSkill(tenantId, payload)
      setConfigDialogOpen(false)
      await refreshSkills(tenantId, false)
      setStatus(`${configSkill.name} config updated.`)
    } catch (saveError) {
      setConfigError(saveError instanceof Error ? saveError.message : 'Failed to save skill config.')
    } finally {
      setActionPendingKey('')
    }
  }, [
    configApiKey,
    configRequiredEnvKeys,
    configRequiredEnvValues,
    configSkill,
    refreshSkills,
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
      await Promise.all([
        refreshWorkspaceHealth(tenantId),
        refreshWorkspaceFiles(tenantId),
      ])
      setStatus('Workspace essentials repaired.')
    } catch (repairError) {
      setError(repairError instanceof Error ? repairError.message : 'Failed to repair workspace essentials.')
    } finally {
      setActionPendingKey('')
    }
  }, [refreshWorkspaceFiles, refreshWorkspaceHealth, tenantId])

  const handleCreateTemplate = useCallback(async (template: 'memory-md' | 'boot-md' | 'daily-memory') => {
    if (!tenantId) return
    const actionKey = `template:${template}`
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await createRuntimeWorkspaceTemplate(tenantId, { template })
      await Promise.all([
        refreshWorkspaceHealth(tenantId),
        refreshWorkspaceFiles(tenantId),
      ])
      setStatus(`Template created: ${template}.`)
    } catch (templateError) {
      setError(templateError instanceof Error ? templateError.message : 'Failed to create template.')
    } finally {
      setActionPendingKey('')
    }
  }, [refreshWorkspaceFiles, refreshWorkspaceHealth, tenantId])

  const applyNewFileTemplate = useCallback((kind: 'note' | 'skill' | 'memory') => {
    if (kind === 'skill') {
      setNewFilePath('skills/new-skill/SKILL.md')
      setNewFileContent([
        '# Skill Name',
        '',
        '## Purpose',
        '-',
        '',
        '## Usage',
        '-',
        '',
      ].join('\n'))
      return
    }

    if (kind === 'memory') {
      const date = new Date().toISOString().slice(0, 10)
      setNewFilePath(`memory/${date}.md`)
      setNewFileContent('# Session Memory\n\n- Context:\n- Decisions:\n- Next steps:\n')
      return
    }

    setNewFilePath('notes/new-note.md')
    setNewFileContent('# New note\n')
  }, [])

  const handleCopyValue = useCallback(async (value: string, label: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmed)
      } else {
        throw new Error('Clipboard API unavailable')
      }
      setCopiedValue(trimmed)
      setStatus(`${label} copied.`)
      setTimeout(() => {
        setCopiedValue((current) => (current === trimmed ? '' : current))
      }, 1800)
    } catch {
      setError(`Unable to copy ${label.toLowerCase()}.`)
    }
  }, [])

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
      await refreshWorkspaceAfterFileMutation(tenantId, normalizedPath)
      setStatus(`${normalizedPath} saved.`)
      setNewFileDialogOpen(false)
      setNewFilePath('notes/new-note.md')
      setNewFileContent('')
    } catch (upsertError) {
      setError(upsertError instanceof Error ? upsertError.message : 'Failed to save markdown file.')
    } finally {
      setActionPendingKey('')
    }
  }, [newFileContent, newFilePath, refreshWorkspaceAfterFileMutation, tenantId])

  const handleOpenMarkdownFile = useCallback(async (relativePath: string) => {
    if (!tenantId) return
    setActionPendingKey(`view:${relativePath}`)
    setError('')
    setStatus('')
    setFileDialogMode('view')
    setFileDialogPath(relativePath)
    setFileDialogLoading(true)
    setFileVersions([])
    setFileVersionsLoading(isCriticalWorkspaceFile(relativePath))
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
      const filePath = fileData.relativePath || relativePath
      if (isCriticalWorkspaceFile(filePath)) {
        try {
          const versionsData = await listRuntimeWorkspaceFileVersions(tenantId, filePath, {
            limit: 20,
          })
          setFileVersions(versionsData.versions)
        } catch {
          // Non-fatal: keep file open even if versions fail to load.
        }
      }
    } catch (readError) {
      setFileDialogOpen(false)
      setError(readError instanceof Error ? readError.message : `Failed to read ${relativePath}.`)
    } finally {
      setFileDialogLoading(false)
      setFileVersionsLoading(false)
      setActionPendingKey('')
    }
  }, [tenantId])

  const openBootReferenceFromHealth = useCallback(() => {
    const bootFile = workspaceHealthMarkdownFiles.find((file) => file.key === 'boot')
    if (bootFile?.exists) {
      void handleOpenMarkdownFile(bootFile.relativePath)
      return
    }
    setStatus('BOOT.md is missing. Create BOOT.md template to manage boot hook behavior.')
  }, [handleOpenMarkdownFile, workspaceHealthMarkdownFiles])

  const openMemoryReferenceFromHealth = useCallback((source: 'memory-dir' | 'command-logger' | 'session-memory') => {
    if (latestMemoryNotePath) {
      void handleOpenMarkdownFile(latestMemoryNotePath)
      return
    }

    const memoryFile = workspaceHealthMarkdownFiles.find((file) => file.key === 'memory')
    if (memoryFile?.exists) {
      void handleOpenMarkdownFile(memoryFile.relativePath)
      return
    }

    if (source === 'memory-dir') {
      setStatus('No memory markdown note exists yet. Add one from "Add Markdown File" or create MEMORY.md.')
      return
    }

    setStatus('No memory markdown file exists yet. Create MEMORY.md template to configure memory-related hooks.')
  }, [handleOpenMarkdownFile, latestMemoryNotePath, workspaceHealthMarkdownFiles])

  const handleSaveOpenedMarkdownFile = useCallback(async () => {
    if (!tenantId || !fileDialogPath) return
    const normalizedPath = fileDialogPath.trim()
    if (!isValidRelativeMdPath(normalizedPath)) {
      setError('File path must be a relative .md path, for example: notes/project.md')
      return
    }

    if (isCriticalWorkspaceFile(normalizedPath)) {
      const confirmed = window.confirm(
        `Save changes to critical file "${normalizedPath}"? This may affect OpenClaw startup and behavior.`,
      )
      if (!confirmed) return
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
      await refreshWorkspaceAfterFileMutation(tenantId, normalizedPath)
      setStatus(`${normalizedPath} saved.`)
      setFileDialogMode('view')
      if (isCriticalWorkspaceFile(normalizedPath)) {
        setFileVersionsLoading(true)
        try {
          const versionsData = await listRuntimeWorkspaceFileVersions(tenantId, normalizedPath, {
            limit: 20,
          })
          setFileVersions(versionsData.versions)
        } catch {
          // keep dialog open without blocking on history refresh
        } finally {
          setFileVersionsLoading(false)
        }
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `Failed to save ${normalizedPath}.`)
    } finally {
      setActionPendingKey('')
    }
  }, [fileDialogContent, fileDialogPath, refreshWorkspaceAfterFileMutation, tenantId])

  const handleDeleteMarkdownFile = useCallback(async (relativePath: string) => {
    if (!tenantId) return
    const risk = workspaceFileRisk(relativePath)
    if (risk.level === 'critical') {
      const confirmation = window.prompt(
        `Delete critical file "${relativePath}"? This can break OpenClaw behavior.\n\nType the exact path to confirm.`,
      )
      if (confirmation?.trim() !== relativePath) return
    } else {
      const confirmed = window.confirm(`Move ${relativePath} to trash?`)
      if (!confirmed) return
    }

    const actionKey = `delete:${relativePath}`
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await deleteRuntimeWorkspaceFile(tenantId, {
        relativePath,
        permanent: false,
      })
      await Promise.all([
        refreshWorkspaceAfterFileMutation(tenantId, relativePath),
        refreshWorkspaceTrash(tenantId, trashRetentionDays),
      ])
      setStatus(`${relativePath} moved to trash.`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `Failed to delete ${relativePath}.`)
    } finally {
      setActionPendingKey('')
    }
  }, [refreshWorkspaceAfterFileMutation, refreshWorkspaceTrash, tenantId, trashRetentionDays])

  const handleRestoreFileVersion = useCallback(async (version: RuntimeWorkspaceFileVersionSummary) => {
    if (!tenantId || !fileDialogPath) return
    const normalizedPath = fileDialogPath.trim()
    if (!normalizedPath) return

    const confirmed = window.confirm(
      `Restore version ${version.versionId} for ${normalizedPath}? Current file content will be replaced.`,
    )
    if (!confirmed) return

    const actionKey = `version-restore:${version.versionId}`
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await restoreRuntimeWorkspaceFileVersion(tenantId, {
        relativePath: normalizedPath,
        versionId: version.versionId,
      })

      const [fileData, versionsData] = await Promise.all([
        readRuntimeWorkspaceFile(tenantId, normalizedPath),
        listRuntimeWorkspaceFileVersions(tenantId, normalizedPath, { limit: 20 }),
      ])
      if (fileData.exists) {
        setFileDialogContent(fileData.content)
      }
      setFileVersions(versionsData.versions)
      setFileDialogMode('view')
      await refreshWorkspaceAfterFileMutation(tenantId, normalizedPath)
      setStatus(`Restored ${normalizedPath} from version ${version.versionId}.`)
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : `Failed to restore version ${version.versionId}.`)
    } finally {
      setActionPendingKey('')
    }
  }, [fileDialogPath, refreshWorkspaceAfterFileMutation, tenantId])

  const handleRestoreTrashedFile = useCallback(async (trashFile: RuntimeWorkspaceTrashFileSummary) => {
    if (!tenantId) return
    const actionKey = `restore:${trashFile.trashPath}`
    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await restoreRuntimeWorkspaceTrashFile(tenantId, {
        trashPath: trashFile.trashPath,
        overwrite: false,
      })
      await Promise.all([
        refreshWorkspaceFiles(tenantId),
        refreshWorkspaceTrash(tenantId, trashRetentionDays),
        refreshWorkspaceHealth(tenantId),
      ])
      setStatus(`${trashFile.relativePath} restored from trash.`)
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : `Failed to restore ${trashFile.relativePath}.`)
    } finally {
      setActionPendingKey('')
    }
  }, [refreshWorkspaceFiles, refreshWorkspaceHealth, refreshWorkspaceTrash, tenantId, trashRetentionDays])

  const handlePurgeTrash = useCallback(async (trashFile?: RuntimeWorkspaceTrashFileSummary) => {
    if (!tenantId) return
    const actionKey = trashFile ? `purge:${trashFile.trashPath}` : 'purge:all'
    const confirmed = window.confirm(
      trashFile
        ? `Permanently delete ${trashFile.relativePath} from trash?`
        : 'Permanently empty the trash?',
    )
    if (!confirmed) return

    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await purgeRuntimeWorkspaceTrashFile(tenantId, trashFile ? { trashPath: trashFile.trashPath } : {})
      await refreshWorkspaceTrash(tenantId, trashRetentionDays)
      setStatus(trashFile ? `${trashFile.relativePath} permanently deleted.` : 'Trash emptied.')
    } catch (purgeError) {
      setError(purgeError instanceof Error ? purgeError.message : 'Failed to purge trash.')
    } finally {
      setActionPendingKey('')
    }
  }, [refreshWorkspaceTrash, tenantId, trashRetentionDays])

  const handleResetOpenClaw = useCallback(async () => {
    if (!tenantId) return
    const actionKey = 'reset:openclaw'
    if (resetMode === 'workspace') {
      const confirmed = window.confirm(
        'Reset workspace only? This moves Markdown files to trash and rebuilds essentials while keeping API/config values.',
      )
      if (!confirmed) return

      setActionPendingKey(actionKey)
      setError('')
      setStatus('')
      try {
        const filesToReset = [...markdownFiles]
        for (const relativePath of filesToReset) {
          await deleteRuntimeWorkspaceFile(tenantId, {
            relativePath,
            permanent: false,
          })
        }

        const repaired = await repairRuntimeWorkspaceEssentials(tenantId)
        setHealth(repaired)
        await Promise.all([
          refreshWorkspaceHealth(tenantId),
          refreshWorkspaceFiles(tenantId),
          refreshWorkspaceTrash(tenantId, trashRetentionDays),
        ])

        const movedCount = filesToReset.length
        setStatus(
          movedCount > 0
            ? `Workspace reset completed. ${movedCount} file${movedCount === 1 ? '' : 's'} moved to trash. API/config values were not changed.`
            : 'Workspace reset completed. Workspace essentials were rebuilt and API/config values were not changed.',
        )
        setResetDialogOpen(false)
      } catch (resetError) {
        setError(resetError instanceof Error ? resetError.message : 'Failed to reset workspace.')
      } finally {
        setActionPendingKey('')
      }
      return
    }

    const confirmed = window.confirm('Run full OpenClaw factory reset? This wipes workspace and runtime state.')
    if (!confirmed) return

    const typed = window.prompt('Type RESET to confirm factory reset.')
    if (typed?.trim().toUpperCase() !== 'RESET') return

    setActionPendingKey(actionKey)
    setError('')
    setStatus('')
    try {
      await resetRuntimeOpenClawInstance(tenantId, {
        scope: 'full',
      })

      setStatus('Factory reset executed. Redirecting to onboarding...')
      setResetDialogOpen(false)
      window.setTimeout(() => {
        router.push('/dashboard/open-cloud')
      }, 900)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset OpenClaw.')
    } finally {
      setActionPendingKey('')
    }
  }, [
    markdownFiles,
    refreshWorkspaceFiles,
    refreshWorkspaceHealth,
    refreshWorkspaceTrash,
    resetMode,
    router,
    setResetDialogOpen,
    tenantId,
    trashRetentionDays,
  ])

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

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/chat">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
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
              <CardTitle className="text-base">Skills Explorer</CardTitle>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search skills, file names, or paths"
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
                const unsupportedOnRuntime = missing.os.length > 0
                const requiresInstallFirst = requiresInstallOrRuntimeSetupBeforeConfig(missing)
                const canConfigure = !requiresInstallFirst
                const primaryInstallLabel = preferredInstallOption?.id === SYSTEM_AUTO_INSTALL_ID
                  ? (installed ? 'Reinstall deps (auto)' : 'Install deps (auto)')
                  : `${installed ? 'Reinstall' : 'Install'}${preferredInstallOption ? ` (${preferredInstallOption.id})` : ''}`
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
                    {unsupportedOnRuntime ? (
                      <p className="mt-2 text-xs text-amber-700">
                        This skill is not supported on this runtime OS. Required OS: {missing.os.join(', ')}.
                      </p>
                    ) : null}
                    {!unsupportedOnRuntime && requiresInstallFirst && installOptions.length === 0 ? (
                      <p className="mt-2 text-xs text-amber-700">
                        {missing.bins.length > 0
                          ? `Install/setup is required before configuration. No automatic installer mapping is available yet for required binaries: ${missing.bins.join(', ')}.`
                          : `Runtime setup is required before configuration: ${missing.config.join(', ')}.`}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {!unsupportedOnRuntime && installOptions.length > 0 ? (
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
                          {primaryInstallLabel}
                        </Button>
                      ) : null}

                      {!unsupportedOnRuntime && alternativeInstallOptions.slice(0, 2).map((option) => (
                        <Button
                          key={`${skill.key}-installer-${option.id}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleInstall(skill, option)}
                          disabled={actionPendingKey === installActionKey}
                        >
                          Use {option.id === SYSTEM_AUTO_INSTALL_ID ? 'auto deps' : option.id}
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

                      {canConfigure ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfigureDialog(skill)}
                          disabled={actionPendingKey === configActionKey}
                        >
                          <Settings2 className="mr-2 h-3.5 w-3.5" />
                          Configure
                        </Button>
                      ) : null}
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
                <div
                  className="group flex cursor-pointer items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2 transition-colors hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    openMemoryReferenceFromHealth('memory-dir')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openMemoryReferenceFromHealth('memory-dir')
                    }
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm">memory/ directory</p>
                    <p className="text-[11px] text-muted-foreground">
                      Opens latest memory note when available.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      Open
                    </span>
                    {Boolean(health?.memoryDirExists) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <XCircle className="h-3.5 w-3.5" />
                        Missing
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="group flex cursor-pointer items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2 transition-colors hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    openBootReferenceFromHealth()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openBootReferenceFromHealth()
                    }
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm">Hook: boot-md</p>
                    <p className="text-[11px] text-muted-foreground">
                      Opens BOOT.md.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      Open
                    </span>
                    {Boolean(health?.hooks.bootMdEnabled) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <XCircle className="h-3.5 w-3.5" />
                        Missing
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="group flex cursor-pointer items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2 transition-colors hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    openMemoryReferenceFromHealth('command-logger')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openMemoryReferenceFromHealth('command-logger')
                    }
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm">Hook: command-logger</p>
                    <p className="text-[11px] text-muted-foreground">
                      Opens memory file used by logging flow.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      Open
                    </span>
                    {Boolean(health?.hooks.commandLoggerEnabled) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <XCircle className="h-3.5 w-3.5" />
                        Missing
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="group flex cursor-pointer items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2 transition-colors hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    openMemoryReferenceFromHealth('session-memory')
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openMemoryReferenceFromHealth('session-memory')
                    }
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm">Hook: session-memory</p>
                    <p className="text-[11px] text-muted-foreground">
                      Opens memory file used by session snapshots.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      Open
                    </span>
                    {Boolean(health?.hooks.sessionMemoryEnabled) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <XCircle className="h-3.5 w-3.5" />
                        Missing
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm">Hook: bootstrap-extra-files</p>
                    <p className="text-[11px] text-muted-foreground">
                      Injects additional bootstrap markdown files via agent bootstrap.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {Boolean(health?.hooks.bootstrapExtraFilesEnabled) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <XCircle className="h-3.5 w-3.5" />
                        Missing
                      </span>
                    )}
                  </div>
                </div>
                {workspaceHealthMarkdownFiles.map((file) => {
                  const deleteActionKey = `delete:${file.relativePath}`
                  const deletePending = actionPendingKey === deleteActionKey
                  const deleteButtonClass = deletePending
                    ? 'h-7 px-2 text-destructive opacity-100'
                    : 'h-7 px-2 text-destructive opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'

                  return (
                    <div
                      key={file.key}
                      className={`group flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2 ${file.exists ? 'cursor-pointer hover:bg-muted/40' : ''}`}
                      role={file.exists ? 'button' : undefined}
                      tabIndex={file.exists ? 0 : -1}
                      onClick={() => {
                        if (!file.exists) return
                        void handleOpenMarkdownFile(file.relativePath)
                      }}
                      onKeyDown={(event) => {
                        if (!file.exists) return
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          void handleOpenMarkdownFile(file.relativePath)
                        }
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm">{file.optional ? `${file.label} (optional)` : file.label}</p>
                        <p className="truncate text-[11px] text-muted-foreground" title={file.relativePath}>
                          {file.relativePath}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {file.exists ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className={deleteButtonClass}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleDeleteMarkdownFile(file.relativePath)
                            }}
                            disabled={deletePending}
                          >
                            {deletePending ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Delete
                          </Button>
                        ) : file.optional && file.template ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-muted-foreground"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              if (!file.template) return
                              void handleCreateTemplate(file.template)
                            }}
                            disabled={actionPendingKey === `template:${file.template}`}
                          >
                            {actionPendingKey === `template:${file.template}` ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Create
                          </Button>
                        ) : null}

                        {file.exists ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            OK
                          </span>
                        ) : file.optional ? (
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
                    </div>
                  )
                })}

                <div className="pt-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8">
                        Workspace actions
                        <ChevronDown className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-60">
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          void handleRepair()
                        }}
                        disabled={actionPendingKey === 'repair:workspace'}
                      >
                        {actionPendingKey === 'repair:workspace'
                          ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          : <Wrench className="mr-2 h-3.5 w-3.5" />}
                        Repair essentials
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          void handleCreateTemplate('memory-md')
                        }}
                        disabled={actionPendingKey === 'template:memory-md'}
                      >
                        {actionPendingKey === 'template:memory-md'
                          ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          : <FilePlus2 className="mr-2 h-3.5 w-3.5" />}
                        Create MEMORY.md template
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          void handleCreateTemplate('boot-md')
                        }}
                        disabled={actionPendingKey === 'template:boot-md'}
                      >
                        {actionPendingKey === 'template:boot-md'
                          ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          : <FilePlus2 className="mr-2 h-3.5 w-3.5" />}
                        Create BOOT.md template
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          void handleCreateTemplate('daily-memory')
                        }}
                        disabled={actionPendingKey === 'template:daily-memory'}
                      >
                        {actionPendingKey === 'template:daily-memory'
                          ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          : <FilePlus2 className="mr-2 h-3.5 w-3.5" />}
                        Add daily memory note
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Markdown Files</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5"
                    onClick={() => setNewFileDialogOpen(true)}
                  >
                    <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click a file row to open it. Hover to reveal quick actions.
                </p>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 space-y-1.5 overflow-auto rounded-lg border border-border/70 p-2">
                  {filteredMarkdownFiles.length > 0 ? filteredMarkdownFiles.map((relativePath) => {
                    const fileRisk = workspaceFileRisk(relativePath)
                    const fileName = getPathFileName(relativePath)
                    const deletePending = actionPendingKey === `delete:${relativePath}`
                    return (
                      <div
                        key={relativePath}
                        className="group flex w-full cursor-pointer items-center justify-between rounded-md border border-transparent px-2 py-2 text-left transition-colors hover:border-border/70 hover:bg-muted/35 focus-within:border-border/70 focus-within:bg-muted/35"
                        role="button"
                        tabIndex={0}
                        onClick={() => void handleOpenMarkdownFile(relativePath)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            void handleOpenMarkdownFile(relativePath)
                          }
                        }}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-xs font-medium" title={fileName}>{fileName}</p>
                          <p className="truncate text-[11px] text-muted-foreground" title={relativePath}>{relativePath}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                              fileRisk.level === 'critical'
                                ? 'bg-destructive/15 text-destructive'
                                : fileRisk.level === 'operational'
                                  ? 'bg-amber-500/15 text-amber-700'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {fileRisk.label}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleCopyValue(relativePath, 'Relative path')
                            }}
                          >
                            <ClipboardCopy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={deletePending
                              ? 'h-7 w-7 p-0 text-destructive'
                              : 'h-7 w-7 p-0 text-destructive opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleDeleteMarkdownFile(relativePath)
                            }}
                            disabled={deletePending}
                          >
                            {deletePending
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    )
                  }) : (
                    <p className="px-1 py-2 text-xs text-muted-foreground">No markdown files matched your search.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Maintenance Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTrashDialogOpen(true)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Manage Trash ({trashFiles.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                    Reset OpenClaw
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={newFileDialogOpen} onOpenChange={setNewFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Markdown file</DialogTitle>
            <DialogDescription>
              Create notes, memory files, or SKILL.md templates in one focused flow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyNewFileTemplate('note')}
              >
                Note template
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyNewFileTemplate('skill')}
              >
                New SKILL.md
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyNewFileTemplate('memory')}
              >
                Daily memory
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-md-path">File path (.md)</Label>
              <Input
                id="new-md-path"
                value={newFilePath}
                onChange={(event) => setNewFilePath(event.target.value)}
                placeholder="notes/new-note.md"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-md-content">Content</Label>
              <Textarea
                id="new-md-content"
                value={newFileContent}
                onChange={(event) => setNewFileContent(event.target.value)}
                className="min-h-44"
                placeholder="# New note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateMarkdownFile()}
              disabled={actionPendingKey === `upsert:${newFilePath.trim()}`}
            >
              {actionPendingKey === `upsert:${newFilePath.trim()}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trashDialogOpen} onOpenChange={setTrashDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Trash</DialogTitle>
            <DialogDescription>
              Deleted Markdown files stay in trash until restored or purged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="trash-retention-days" className="text-xs text-muted-foreground">
                Auto-purge days
              </Label>
              <Input
                id="trash-retention-days"
                type="number"
                min={1}
                max={90}
                value={trashRetentionDays}
                onChange={(event) => {
                  const parsed = Number(event.target.value)
                  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 90) {
                    setTrashRetentionDays(parsed)
                  }
                }}
                className="h-8 w-24"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!tenantId) return
                  void refreshWorkspaceTrash(tenantId, trashRetentionDays)
                }}
                disabled={!tenantId}
              >
                Refresh
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handlePurgeTrash()}
                disabled={actionPendingKey === 'purge:all' || trashFiles.length === 0}
              >
                {actionPendingKey === 'purge:all' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                Empty trash
              </Button>
            </div>

            <div className="max-h-64 space-y-2 overflow-auto rounded-lg border border-border/70 p-3">
              {trashFiles.length > 0 ? trashFiles.map((trashFile) => (
                <div key={trashFile.trashPath} className="rounded-md border border-border/70 px-3 py-2">
                  <p className="truncate text-xs font-medium" title={trashFile.relativePath}>
                    {trashFile.relativePath}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground" title={trashFile.deletedAt ?? ''}>
                    Deleted: {trashFile.deletedAt ?? 'Unknown'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleRestoreTrashedFile(trashFile)}
                      disabled={actionPendingKey === `restore:${trashFile.trashPath}`}
                    >
                      {actionPendingKey === `restore:${trashFile.trashPath}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handlePurgeTrash(trashFile)}
                      disabled={actionPendingKey === `purge:${trashFile.trashPath}`}
                    >
                      {actionPendingKey === `purge:${trashFile.trashPath}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                      Purge
                    </Button>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">Trash is empty.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTrashDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset OpenClaw</DialogTitle>
            <DialogDescription>Choose how you want to reset your instance.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <p className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                High impact action
              </p>
              <p className="mt-1">
                Factory reset wipes runtime state and workspace. Re-onboarding is required after full reset.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reset mode</Label>
              <label className="flex items-start gap-2 rounded-md border border-border/70 px-3 py-2 text-xs">
                <input
                  type="radio"
                  name="openclaw-reset-mode"
                  value="workspace"
                  checked={resetMode === 'workspace'}
                  onChange={() => setResetMode('workspace')}
                />
                <span>
                  <span className="block font-medium text-foreground">Workspace reset (keep API/config)</span>
                  <span className="block text-muted-foreground">
                    Moves workspace Markdown files to trash and rebuilds essentials.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-md border border-border/70 px-3 py-2 text-xs">
                <input
                  type="radio"
                  name="openclaw-reset-mode"
                  value="factory"
                  checked={resetMode === 'factory'}
                  onChange={() => setResetMode('factory')}
                />
                <span>
                  <span className="block font-medium text-foreground">Factory reset (full OpenClaw)</span>
                  <span className="block text-muted-foreground">
                    Wipes runtime state and workspace, then sends you to onboarding.
                  </span>
                </span>
              </label>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleResetOpenClaw()}
              disabled={actionPendingKey === 'reset:openclaw'}
            >
              {actionPendingKey === 'reset:openclaw' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />}
              {resetMode === 'workspace'
                ? 'Reset Workspace (Keep API/Config)'
                : 'Factory Reset OpenClaw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    {configPrimarySensitiveField.howToGet
                      ?? inferCredentialSourceHint(configPrimarySensitiveField.id)
                      ?? 'Check the skill docs link above for where to generate this credential.'}
                  </p>
                ) : null}
              </div>
            ) : configRequiredEnvKeys.length > 0 ? (
              <p className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                This skill does not appear to require a direct API key field.
              </p>
            ) : null}

            {!configNeedsUserInput ? (
              <p className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {configRuntimeSetupHint ?? 'No API/env values are required for this skill.'}
              </p>
            ) : null}

            {configRequiredEnvKeys.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-border/70 p-3">
                <p className="text-xs font-medium text-foreground">Required environment variables</p>
                {configRequiredEnvKeys.map((key) => {
                  const matchedField = findOptionFieldForEnvKey(configSkillOption, key)
                  const label = matchedField?.label ?? key
                  const hint = matchedField?.howToGet ?? inferCredentialSourceHint(`${key} ${label}`)
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
              {configNeedsUserInput ? 'Save' : 'Done'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>View Markdown file</DialogTitle>
            <DialogDescription>
              Read file contents safely. Switch to edit mode only when you want to change this file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="open-md-path">File path</Label>
            <div className="flex items-center gap-2">
              <Input
                id="open-md-path"
                value={fileDialogPath}
                disabled
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleCopyValue(fileDialogPath, 'File path')
                }}
              >
                <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                {copiedValue === fileDialogPath ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {workspaceFileRisk(fileDialogPath).level === 'critical' ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <p className="flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Critical file
                </p>
                <p className="mt-1">
                  Editing this file can break startup behavior or the overall OpenClaw instance.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {workspaceFileRisk(fileDialogPath).message}
                </p>
              </div>
            )}

            <Label htmlFor="open-md-content">Content</Label>
            {fileDialogMode === 'view' ? (
              <pre
                id="open-md-content"
                className="min-h-72 overflow-auto rounded-md border border-border/70 bg-muted/20 p-3 font-mono text-xs whitespace-pre-wrap"
              >
                {fileDialogContent || '(empty file)'}
              </pre>
            ) : (
              <Textarea
                id="open-md-content"
                value={fileDialogContent}
                onChange={(event) => setFileDialogContent(event.target.value)}
                className="min-h-72 font-mono text-xs"
                disabled={fileDialogLoading}
              />
            )}

            {isCriticalWorkspaceFile(fileDialogPath) ? (
              <div className="space-y-2 rounded-md border border-border/70 p-3">
                <p className="text-xs font-medium text-foreground">Version history (auto snapshots)</p>
                {fileVersionsLoading ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading versions...
                  </p>
                ) : fileVersions.length > 0 ? (
                  <div className="max-h-40 space-y-2 overflow-auto">
                    {fileVersions.map((version) => (
                      <div key={version.versionId} className="flex items-center justify-between gap-2 rounded border border-border/70 px-2 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium">{version.versionId}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {formatVersionTimestamp(version.createdAt)} · {formatBytes(version.sizeBytes)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleRestoreFileVersion(version)}
                          disabled={actionPendingKey === `version-restore:${version.versionId}`}
                        >
                          {actionPendingKey === `version-restore:${version.versionId}` ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No snapshots yet. A snapshot is created before each save on critical files.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFileDialogOpen(false)}>
              Cancel
            </Button>
            {fileDialogMode === 'view' ? (
              <Button
                variant="outline"
                onClick={() => setFileDialogMode('edit')}
                disabled={fileDialogLoading}
              >
                Edit
              </Button>
            ) : (
              <Button
                onClick={() => void handleSaveOpenedMarkdownFile()}
                disabled={fileDialogLoading || actionPendingKey === `save-opened:${fileDialogPath.trim()}`}
              >
                {fileDialogLoading || actionPendingKey === `save-opened:${fileDialogPath.trim()}` ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
