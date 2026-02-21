'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock3,
  Circle,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  TriangleAlert,
  X,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Toggle } from '@/components/ui/toggle'
import {
  DEFAULT_CHAT_SESSION_KEY,
  getBackendUrl,
  listRuntimeChannelEvents,
  listRuntimeChannelsStatus,
  listRuntimeChatHistory,
  patchRuntimeSession,
  listRuntimeSessions,
  readStoredChatSessionKey,
  type RuntimeChannelEvent,
  type RuntimeChannelsStatusData,
  type RuntimeSessionSummary,
  writeStoredChatSessionKey,
} from '@/lib/runtime-controls'
import {
  insertPersistedRuntimeMessage,
  listPersistedRuntimeMessages,
  listPersistedRuntimeSessions,
  upsertPersistedRuntimeSession,
  type PersistedRuntimeMessage,
  type PersistedRuntimeSession,
} from '@/lib/runtime-persistence'
import { getBrowserAccessToken } from '@/lib/backend-auth'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import { buildSignInPath, getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'
import { Shimmer } from '@/components/ai-elements/shimmer'

interface ChatMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  channelId?: 'whatsapp' | 'telegram' | 'web'
  channelDirection?: 'inbound' | 'outbound'
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
type SetupPhase = 'checking' | 'provisioning' | 'installing' | 'starting' | 'ready' | null
type ChannelHealthStatus = 'connected' | 'running' | 'configured' | 'off'

const INPUT_LINE_HEIGHT = 24
const INPUT_VERTICAL_PADDING = 20
const INPUT_MIN_HEIGHT = INPUT_LINE_HEIGHT + INPUT_VERTICAL_PADDING
const INPUT_MAX_HEIGHT = INPUT_LINE_HEIGHT * 11 + INPUT_VERTICAL_PADDING
const ONLINE_STABILITY_MS = 1800
const ASSISTANT_PROGRESS_TICK_MS = 1000
const COMPOSER_TEMPLATE_COLLAPSED_COUNT = 4
const SESSIONS_SIDEBAR_PREFERENCE_KEY = 'clawpilot:chat:sessions-sidebar:expanded'
const PAYWALL_STORAGE_KEY_PREFIX = 'clawpilot:paywall:v1'
const PAYWALL_FREE_MESSAGE_LIMIT = 3
const PAYWALL_COUNTDOWN_DURATION_MS = 3 * 60 * 1000
const PAYWALL_FINAL_HOUR_MS = 60 * 1000
const PAYWALL_MONTHLY_PRICE_USD = 25
const PAYWALL_YEARLY_PRICE_USD = 240
const PAYWALL_FIRST_MONTH_DISCOUNT_RATE = 0.25
const PAYWALL_DISCOUNTED_FIRST_MONTH_PRICE_USD =
  Math.round(PAYWALL_MONTHLY_PRICE_USD * (1 - PAYWALL_FIRST_MONTH_DISCOUNT_RATE) * 100) / 100
const PAYWALL_DISCOUNT_STRIKE_DELAY_MS = 500
const PAYWALL_DISCOUNT_NEW_PRICE_DELAY_MS = 300
const PAYWALL_DISCOUNT_ANIMATION_MS = 2300
type PaywallStatus = 'not-triggered' | 'countdown' | 'deleted' | 'upgraded'
type PaywallPlan = 'monthly' | 'yearly'
type BillingPlan = 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY'
type DiscountAnimationPhase = 'initial' | 'struck' | 'counting' | 'done'
type PaywallModal =
  | 'none'
  | 'initial'
  | 'discount'
  | 'later-upgrade'
  | 'plan-pricing'
  | 'why-limit'
  | 'leave-warning'
  | 'deleted'
interface PersistedPaywallState {
  status: PaywallStatus
  freeMessageCount: number
  countdownEndsAtMs: number | null
}

interface SubscriptionSnapshot {
  state?: string
  plan?: string
  billingStatus?: string
  isPaidPlan?: boolean
  currentPeriodEndAt?: string | null
  subscriptionEndsAt?: string | null
  cancelAtPeriodEnd?: boolean
  graceEndsAt?: string | null
  trialEndsAt?: string | null
  paywall?: {
    freeMessageLimit?: number
    freeMessagesUsed?: number
    trialDurationMinutes?: number
    trialEndsAt?: string | null
    trialRemainingMs?: number | null
  }
}

interface WsPaywallPayload {
  freeMessageLimit?: number
  freeMessagesUsed?: number
  trialEndsAt?: string | null
}
const COMPOSER_PROMPT_TEMPLATES: ReadonlyArray<{ id: string; label: string; prompt: string }> = [
  {
    id: 'morning-brief',
    label: 'Morning brief',
    prompt:
      'Every day at [07:30] {time-zone}, send me weather for {city}, {country}, top priorities for today, and my first calendar event.',
  },
  {
    id: 'weather-rain-alert',
    label: 'Weather + rain',
    prompt:
      'Every day at [07:00] {time-zone}, send weather for {city}, {country}. If rain chance in the next 24 hours is above [40]%, send an extra alert.',
  },
  {
    id: 'workday-kickoff',
    label: 'Workday kickoff',
    prompt:
      "On weekdays at [09:00] {time-zone}, start with: 'What are your top 3 tasks and blockers today?' then suggest a focused plan.",
  },
  {
    id: 'midweek-followups',
    label: 'Midweek follow-ups',
    prompt:
      'Every Wednesday at [14:00] {time-zone}, remind me to follow up on pending messages and tasks from this week.',
  },
  {
    id: 'end-of-day-wrap',
    label: 'End-of-day wrap',
    prompt:
      "On weekdays at [18:00] {time-zone}, ask for progress and generate an end-of-day summary with tomorrow's top 3 tasks.",
  },
  {
    id: 'learning-nudge',
    label: 'Learning nudge',
    prompt: 'Every day at [20:00] {time-zone}, send me a 5-minute lesson on [topic].',
  },
  {
    id: 'bill-reminder',
    label: 'Bill reminder',
    prompt:
      'On day [5] of each month at [10:00] {time-zone}, remind me to pay [bill name] and ask me to confirm when done.',
  },
  {
    id: 'random-joke',
    label: 'Random joke',
    prompt:
      'Once per day at a random time between [10:00] and [18:00] {time-zone}, send me a short joke.',
  },
]

const CHANNEL_INTEGRATION_FAB_ICONS: ReadonlyArray<{ src: string; alt: string }> = [
  { src: '/integrations/whatsapp.svg', alt: 'WhatsApp' },
  { src: '/integrations/telegram.svg', alt: 'Telegram' },
  { src: '/integrations/discord.svg', alt: 'Discord' },
  { src: '/integrations/Slack.svg', alt: 'Slack' },
  { src: '/integrations/matrix.svg', alt: 'Matrix' },
]

function buildPaywallStorageKey(tenantId: string): string {
  const normalizedTenantId = tenantId.trim()
  return `${PAYWALL_STORAGE_KEY_PREFIX}:${normalizedTenantId || 'anonymous'}`
}

function normalizePaywallFreeMessageCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }
  const rounded = Math.round(value)
  if (rounded < 0) return 0
  return rounded
}

function normalizePaywallStatus(value: unknown): PaywallStatus {
  if (value === 'countdown' || value === 'deleted' || value === 'upgraded') {
    return value
  }
  return 'not-triggered'
}

function readPersistedPaywallState(tenantId: string): PersistedPaywallState | null {
  if (typeof window === 'undefined' || !tenantId.trim()) return null
  try {
    const raw = window.localStorage.getItem(buildPaywallStorageKey(tenantId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const record = parsed as Record<string, unknown>
    const countdownEndsAtRaw = record.countdownEndsAtMs
    const countdownEndsAtMs =
      typeof countdownEndsAtRaw === 'number' && Number.isFinite(countdownEndsAtRaw) && countdownEndsAtRaw > 0
        ? countdownEndsAtRaw
        : null
    return {
      status: normalizePaywallStatus(record.status),
      freeMessageCount: normalizePaywallFreeMessageCount(record.freeMessageCount),
      countdownEndsAtMs,
    }
  } catch {
    return null
  }
}

function writePersistedPaywallState(tenantId: string, state: PersistedPaywallState) {
  if (typeof window === 'undefined' || !tenantId.trim()) return
  try {
    window.localStorage.setItem(buildPaywallStorageKey(tenantId), JSON.stringify(state))
  } catch {
    // Ignore storage write failures in private mode.
  }
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function buildProfileInitial(value: string): string {
  const normalized = value.trim()
  if (!normalized) return 'A'

  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const initials = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
    if (initials.trim()) {
      return initials
    }
  }

  return normalized[0]?.toUpperCase() ?? 'A'
}

function buildPfpWebUrl(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return null
  }
  return `https://pfp.web/${encodeURIComponent(normalized)}`
}

function formatElapsed(startedAt: number): string {
  const seconds = Math.floor((Date.now() - startedAt) / 1000)
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function isGatewayUnavailableError(message: string): boolean {
  return /gateway_starting|bootstrapping|gateway_unavailable|gateway.*unavailable|gateway host unavailable|host unavailable|not running/i.test(
    message.trim(),
  )
}

function toChatAlertMessage(message: string): string {
  const normalized = message.trim()
  if (!normalized) {
    return 'Something went wrong. Please try again.'
  }
  if (isGatewayUnavailableError(normalized)) {
    return 'OpenClaw is starting. Please wait a few seconds and try again.'
  }
  return normalized
}

function getOpenClawStatusLabel({
  setupPhase,
  setupTimedOut,
  connectionStatus,
  sendError,
  isConnectionStable,
}: {
  setupPhase: SetupPhase
  setupTimedOut: boolean
  connectionStatus: ConnectionStatus
  sendError: string
  isConnectionStable: boolean
}): string {
  if (setupTimedOut) {
    return 'delayed'
  }

  if (
    setupPhase === 'checking' ||
    setupPhase === 'provisioning' ||
    setupPhase === 'installing' ||
    setupPhase === 'starting'
  ) {
    return 'connecting'
  }

  if (isGatewayUnavailableError(sendError)) {
    return 'connecting'
  }

  if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
    return 'offline'
  }

  if (connectionStatus === 'connected' && isConnectionStable) {
    return 'online'
  }

  return 'connecting'
}

function getTransientSendNotice(message: string): string | null {
  const normalized = message.trim()
  if (!normalized) return null

  if (isGatewayUnavailableError(normalized) || /openclaw is starting/i.test(normalized)) {
    return 'OpenClaw is warming up...'
  }

  if (/not connected|reconnecting/i.test(normalized)) {
    return 'Reconnecting to OpenClaw...'
  }

  return null
}

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readRecordBool(record: Record<string, unknown> | null | undefined, key: string): boolean | null {
  const value = record?.[key]
  return typeof value === 'boolean' ? value : null
}

function readRecordString(record: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = record?.[key]
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

function deriveChannelHealthStatus(record: Record<string, unknown> | null | undefined): ChannelHealthStatus {
  if (!record) return 'off'
  if (readRecordBool(record, 'connected') === true) return 'connected'
  if (readRecordBool(record, 'running') === true) return 'running'
  if (readRecordBool(record, 'configured') === true) return 'configured'
  return 'off'
}

function channelHealthStatusLabel(status: ChannelHealthStatus): string {
  const labels: Record<ChannelHealthStatus, string> = {
    connected: 'On',
    running: 'Run',
    configured: 'Cfg',
    off: 'Off',
  }
  return labels[status]
}

function shortenChannelDetail(detail: string | null): string | null {
  if (!detail) return null
  const normalized = detail.trim()
  if (!normalized) return null

  if (/^\+\d{7,}$/.test(normalized)) {
    return `...${normalized.slice(-4)}`
  }

  if (normalized.startsWith('@')) {
    const username = normalized.slice(1)
    return username.length > 8 ? `@${username.slice(0, 8)}…` : normalized
  }

  return normalized.length > 10 ? `${normalized.slice(0, 10)}…` : normalized
}

function extractWhatsAppLiveIdentity(snapshot: RuntimeChannelsStatusData | null): {
  status: ChannelHealthStatus
  e164: string | null
  jid: string | null
  detail: string | null
} {
  const waStatus = asObjectRecord(snapshot?.channels?.whatsapp)
  const waAccountsRaw = snapshot?.channelAccounts?.whatsapp ?? []
  const waAccounts = Array.isArray(waAccountsRaw)
    ? waAccountsRaw.map((item) => asObjectRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item))
    : []

  const status = deriveChannelHealthStatus(waStatus)
  const statusSelf = asObjectRecord(waStatus?.self)
  const statusE164 = readRecordString(statusSelf, 'e164')
  const statusJid = readRecordString(statusSelf, 'jid')

  if (statusE164 || statusJid) {
    return {
      status,
      e164: statusE164,
      jid: statusJid,
      detail: statusE164 ?? statusJid,
    }
  }

  for (const account of waAccounts) {
    const accountSelf = asObjectRecord(account.self)
    const e164 = readRecordString(accountSelf, 'e164')
    const jid = readRecordString(accountSelf, 'jid')
    if (e164 || jid) {
      return {
        status,
        e164,
        jid,
        detail: e164 ?? jid,
      }
    }
  }

  return {
    status,
    e164: null,
    jid: null,
    detail: null,
  }
}

function extractTelegramLiveIdentity(snapshot: RuntimeChannelsStatusData | null): {
  status: ChannelHealthStatus
  username: string | null
  detail: string | null
} {
  const tgStatus = asObjectRecord(snapshot?.channels?.telegram)
  const tgAccountsRaw = snapshot?.channelAccounts?.telegram ?? []
  const tgAccounts = Array.isArray(tgAccountsRaw)
    ? tgAccountsRaw.map((item) => asObjectRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item))
    : []
  const status = deriveChannelHealthStatus(tgStatus)

  for (const account of tgAccounts) {
    const probe = asObjectRecord(account.probe)
    const bot = asObjectRecord(probe?.bot)
    const usernameRaw = readRecordString(bot, 'username')
    if (usernameRaw) {
      const username = usernameRaw.startsWith('@') ? usernameRaw : `@${usernameRaw}`
      return {
        status,
        username,
        detail: username,
      }
    }
  }

  return {
    status,
    username: null,
    detail: null,
  }
}

function ChannelHealthPill({
  label,
  status,
  detail,
}: {
  label: string
  status: ChannelHealthStatus
  detail: string | null
}) {
  const statusTone = {
    connected: {
      shell: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
      dot: 'bg-emerald-500',
    },
    running: {
      shell: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
      dot: 'bg-amber-500',
    },
    configured: {
      shell: 'border-blue-200/70 bg-blue-500/10 text-blue-700',
      dot: 'bg-blue-500',
    },
    off: {
      shell: 'border-border/70 bg-card text-muted-foreground',
      dot: 'bg-zinc-400',
    },
  }[status]

  return (
    <span className={cn('inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors', statusTone.shell)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', statusTone.dot)} />
      <span className="font-medium">{label}</span>
      <span>{channelHealthStatusLabel(status)}</span>
      {detail ? <span className="truncate text-[10px] opacity-80">{detail}</span> : null}
    </span>
  )
}

function normalizeMessageTimestamp(timestamp: string): number {
  const parsed = Date.parse(timestamp)
  if (!Number.isFinite(parsed)) {
    return Number.MAX_SAFE_INTEGER
  }
  return parsed
}

function dedupeAndSortMessages(messages: ChatMessage[]): ChatMessage[] {
  const DEDUP_WINDOW_MS = 60_000
  const indexed = messages
    .map((message, index) => ({
      message,
      index,
      timestampMs: normalizeMessageTimestamp(message.timestamp),
    }))
    .filter(({ message }) => {
      const content = message.content.trim()
      if (!content) return false
      if (message.role !== 'system') return true
      return !isGatewayUnavailableError(content.replace(/^error:\s*/i, ''))
    })

  indexed.sort((left, right) => {
    if (left.timestampMs !== right.timestampMs) {
      return left.timestampMs - right.timestampMs
    }
    return left.index - right.index
  })

  const deduped: typeof indexed = []
  const lastTimestampBySignature = new Map<string, number>()

  for (const entry of indexed) {
    const signature = entry.message.id?.trim() || `${entry.message.role}\u0000${entry.message.content}`
    const previousTimestamp = lastTimestampBySignature.get(signature)
    if (
      previousTimestamp !== undefined &&
      Math.abs(entry.timestampMs - previousTimestamp) < DEDUP_WINDOW_MS
    ) {
      continue
    }
    lastTimestampBySignature.set(signature, entry.timestampMs)
    deduped.push(entry)
  }

  return deduped.map((entry) => entry.message)
}

function messageIdentitySignature(message: ChatMessage): string {
  const normalizedId = message.id?.trim()
  if (normalizedId) {
    return `id:${normalizedId}`
  }

  return [
    message.role,
    message.channelId ?? '',
    message.channelDirection ?? '',
    message.content.trim(),
  ].join('\u0000')
}

function areMessageListsEquivalent(left: ChatMessage[], right: ChatMessage[]): boolean {
  if (left === right) {
    return true
  }
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftMessage = left[index]
    const rightMessage = right[index]
    if (!leftMessage || !rightMessage) {
      return false
    }
    if (messageIdentitySignature(leftMessage) !== messageIdentitySignature(rightMessage)) {
      return false
    }
  }

  return true
}

function buildMessageRenderKey(message: ChatMessage, index: number): string {
  const normalizedId = message.id?.trim()
  if (normalizedId) {
    return normalizedId
  }

  return `${messageIdentitySignature(message)}\u0000${index}`
}

function formatAssistantProgressStatus(elapsedSeconds: number): string {
  if (elapsedSeconds <= 2) {
    return `Running ${elapsedSeconds}s`
  }
  if (elapsedSeconds <= 8) {
    return `Thinking ${elapsedSeconds}s`
  }
  if (elapsedSeconds <= 20) {
    return `Working ${elapsedSeconds}s`
  }
  return `Still running ${elapsedSeconds}s`
}

function normalizeRuntimeError(message: string): string {
  const normalized = message.trim()
  if (!normalized) {
    return 'Runtime information is not available yet. Please try again.'
  }
  if (/not found/i.test(normalized)) {
    return 'Your runtime is not fully ready yet. Open chat once, then refresh.'
  }
  if (/daemon_not_found|daemon not found/i.test(normalized)) {
    return 'Your runtime daemon was not found yet. Try again in a moment.'
  }
  if (/gateway_unavailable|gateway.*unavailable|not running/i.test(normalized)) {
    return 'OpenClaw is starting. Please wait a few seconds and refresh.'
  }
  if (/gateway_starting|bootstrapping/i.test(normalized)) {
    return 'OpenClaw is still bootstrapping. Please wait a few seconds and refresh.'
  }
  return normalized
}

function toRuntimeSessionSummary(session: PersistedRuntimeSession): RuntimeSessionSummary {
  const sessionKey = session.sessionKey.trim()
  return {
    key: sessionKey,
    label: sessionKey === DEFAULT_CHAT_SESSION_KEY ? null : session.sessionLabel,
    modelId: null,
    updatedAt: session.lastSeenAt,
    raw: {
      isActive: session.isActive,
    },
  }
}

function toChatMessage(message: PersistedRuntimeMessage): ChatMessage {
  return {
    role: message.role,
    content: message.content,
    timestamp: message.timestamp ?? new Date().toISOString(),
  }
}

function normalizeChannelEventRole(event: RuntimeChannelEvent): 'user' | 'assistant' | 'system' {
  if (event.role === 'user' || event.role === 'assistant' || event.role === 'system') {
    return event.role
  }
  return event.direction === 'inbound' ? 'user' : 'assistant'
}

function toChatMessageFromChannelEvent(event: RuntimeChannelEvent): ChatMessage | null {
  const content = event.content?.trim()
  if (!content) {
    return null
  }

  if (event.channelId !== 'whatsapp') {
    return null
  }

  return {
    id: `channel-event:${event.eventId}`,
    role: normalizeChannelEventRole(event),
    content,
    timestamp: event.timestamp ?? new Date().toISOString(),
    channelId: 'whatsapp',
    channelDirection: event.direction,
  }
}

function createFallbackSession(key: string): RuntimeSessionSummary {
  return {
    key,
    label: 'Current session',
    modelId: null,
    updatedAt: null,
    raw: {},
  }
}

function mergeRuntimeSessions(
  runtimeSessions: RuntimeSessionSummary[],
  persistedSessions: RuntimeSessionSummary[],
  fallbackSessionKey: string,
): RuntimeSessionSummary[] {
  const merged = new Map<string, RuntimeSessionSummary>()

  for (const session of persistedSessions) {
    const key = session.key.trim()
    if (!isSidebarVisibleChatSessionKey(key)) continue
    merged.set(key, session)
  }

  for (const session of runtimeSessions) {
    const key = session.key.trim()
    if (!isSidebarVisibleChatSessionKey(key)) continue
    const existing = merged.get(key)
    merged.set(key, {
      ...session,
      label: session.label ?? existing?.label ?? null,
      modelId: session.modelId ?? existing?.modelId ?? null,
      updatedAt: session.updatedAt ?? existing?.updatedAt ?? null,
      raw: {
        ...(existing?.raw ?? {}),
        ...(session.raw ?? {}),
      },
    })
  }

  if (!merged.size) {
    merged.set(fallbackSessionKey, createFallbackSession(fallbackSessionKey))
  }

  return Array.from(merged.values())
}

function toSessionTimestamp(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toIsoTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeBillingPlan(value: unknown): BillingPlan | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toUpperCase()
  if (normalized === 'FREE' || normalized === 'PRO_MONTHLY' || normalized === 'PRO_YEARLY') {
    return normalized as BillingPlan
  }

  return null
}

function sortSessionsByActivity(sessions: RuntimeSessionSummary[]): RuntimeSessionSummary[] {
  return [...sessions].sort((left, right) => {
    const leftIsMain = left.key === DEFAULT_CHAT_SESSION_KEY
    const rightIsMain = right.key === DEFAULT_CHAT_SESSION_KEY
    if (leftIsMain && !rightIsMain) {
      return -1
    }
    if (!leftIsMain && rightIsMain) {
      return 1
    }

    const tsDiff = toSessionTimestamp(right.updatedAt) - toSessionTimestamp(left.updatedAt)
    if (tsDiff !== 0) {
      return tsDiff
    }
    return left.key.localeCompare(right.key)
  })
}

function isValidSessionKey(value: string | null | undefined): value is string {
  if (!value) return false
  return /^[a-zA-Z0-9:_-]{1,160}$/.test(value.trim())
}

function isUserFacingChatSessionKey(value: string | null | undefined): value is string {
  if (!isValidSessionKey(value)) {
    return false
  }
  return value.trim().startsWith('agent:main:')
}

function isSidebarVisibleChatSessionKey(value: string | null | undefined): value is string {
  if (!isUserFacingChatSessionKey(value)) {
    return false
  }
  const normalized = value.trim()
  return !normalized.startsWith('agent:main:clawpilot-')
}

function buildNewSessionKey() {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).slice(2, 8)
  return `agent:main:session-${timestamp}-${randomPart}`
}

function hashSessionKeyForCopy(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function buildCopyableSessionId(sessionKey: string): string {
  const normalized = sessionKey.trim()
  const agentMatch = normalized.match(/^agent:([a-zA-Z0-9_-]{1,64}):/)
  const agentId = agentMatch?.[1] ?? null

  let sessionId: string
  if (normalized === DEFAULT_CHAT_SESSION_KEY) {
    sessionId = 'main'
  } else {
    const sessionMatch = normalized.match(/(?:^|:)session-([a-zA-Z0-9_-]{4,160})$/)
    sessionId = sessionMatch ? `session-${sessionMatch[1]}` : `session-${hashSessionKeyForCopy(normalized || 'empty')}`
  }

  return agentId ? `${agentId}:${sessionId}` : sessionId
}

function buildSessionLabelFromMessage(message: string): string {
  const normalized = message.replace(/\s+/g, ' ').trim()
  if (!normalized) return 'New session'
  return normalized.length > 40 ? `${normalized.slice(0, 40).trimEnd()}...` : normalized
}

function formatSessionLabel(session: RuntimeSessionSummary): string {
  if (session.key === DEFAULT_CHAT_SESSION_KEY) return 'main'
  const explicitLabel = session.label?.trim()
  if (explicitLabel) return explicitLabel

  if (session.updatedAt) {
    const parsed = new Date(session.updatedAt)
    if (!Number.isNaN(parsed.getTime())) {
      return `Session ${parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
  }

  return 'Session'
}

function hasCronKeyword(value: string | null | undefined): boolean {
  if (!value) return false
  return /(cron|scheduler|scheduled|automation)/i.test(value.trim())
}

function hasCronMetadata(record: Record<string, unknown> | null | undefined): boolean {
  if (!record) return false

  for (const key of Object.keys(record)) {
    if (/(cron|scheduler)/i.test(key)) {
      return true
    }
  }

  for (const key of ['spawnedBy', 'spawned_by', 'source', 'origin', 'type', 'kind', 'category', 'trigger', 'reason']) {
    const value = readRecordString(record, key)
    if (hasCronKeyword(value)) {
      return true
    }
  }

  const nestedRecords = [
    asObjectRecord(record.metadata),
    asObjectRecord(record.meta),
    asObjectRecord(record.context),
  ]

  for (const nested of nestedRecords) {
    if (hasCronMetadata(nested)) {
      return true
    }
  }

  return false
}

function isCronSessionSummary(session: RuntimeSessionSummary): boolean {
  const normalizedKey = session.key.trim().toLowerCase()
  if (/(?:^|:)cron(?:$|[:-])/.test(normalizedKey)) {
    return true
  }

  const normalizedLabel = session.label?.trim().toLowerCase() ?? ''
  if (normalizedLabel.startsWith('cron:')) {
    return true
  }

  return hasCronMetadata(asObjectRecord(session.raw))
}

// ─── Setup progress view ──────────────────────────────────────────────

interface SetupStep {
  label: string
  description: string
  status: 'pending' | 'active' | 'done'
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-3 whitespace-pre-wrap text-[14px] leading-7 text-foreground/95 last:mb-0 sm:text-[15px]">
            {children}
          </p>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5 text-[14px] leading-7 sm:text-[15px]">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5 text-[14px] leading-7 sm:text-[15px]">{children}</ol>,
        li: ({ children }) => <li className="leading-7 marker:text-muted-foreground">{children}</li>,
        h1: ({ children }) => <h1 className="mb-2 mt-4 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-semibold leading-snug tracking-tight sm:text-xl">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-base font-semibold leading-snug tracking-tight sm:text-lg">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-border/90 pl-3 text-[14px] italic leading-7 text-muted-foreground sm:text-[15px]">
            {children}
          </blockquote>
        ),
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
        code: ({ className, children }) => {
          const codeContent = String(children).replace(/\n$/, '')
          const isBlock = Boolean(className?.includes('language-')) || codeContent.includes('\n')
          if (!isBlock) {
            return (
              <code className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[0.86em]">
                {codeContent}
              </code>
            )
          }
          return (
            <pre className="my-3 overflow-x-auto rounded-xl border border-border/70 bg-muted/55 p-3">
              <code className="font-mono text-[12px] leading-relaxed sm:text-[13px]">{codeContent}</code>
            </pre>
          )
        },
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px] sm:text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="border-b border-border/80">{children}</thead>,
        th: ({ children }) => <th className="px-2.5 py-2 font-medium">{children}</th>,
        td: ({ children }) => <td className="border-t border-border/60 px-2.5 py-2">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function SetupProgressView({
  steps,
  startedAt,
  timedOut,
  onRetry,
  onSkip,
}: {
  steps: SetupStep[]
  startedAt: number
  timedOut: boolean
  onRetry: () => void
  onSkip: () => void
}) {
  const [elapsed, setElapsed] = useState('0s')

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatElapsed(startedAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-full border border-border/70 bg-card p-5">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>

          <h1 className="mt-6 text-lg font-semibold tracking-tight">Setting up your assistant</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We&apos;re preparing your OpenClaw instance. This usually takes 3-5 minutes.
          </p>
        </div>

        <Card className="mt-8 border-border/70 shadow-sm shadow-primary/10">
          <CardContent className="p-5">
            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step.label} className="flex gap-3">
                  {/* Vertical line + icon column */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors',
                        step.status === 'done'
                          ? 'border-emerald-500/30 bg-emerald-500/10'
                          : step.status === 'active'
                            ? 'border-primary/30 bg-primary/10'
                            : 'border-border/70 bg-muted/30',
                      )}
                    >
                      {step.status === 'done' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : step.status === 'active' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Circle className="h-2.5 w-2.5 text-muted-foreground/40" />
                      )}
                    </div>
                    {index < steps.length - 1 ? (
                      <div
                        className={cn(
                          'my-1 w-px flex-1',
                          step.status === 'done' ? 'bg-emerald-500/30' : 'bg-border/70',
                        )}
                        style={{ minHeight: '16px' }}
                      />
                    ) : null}
                  </div>

                  {/* Label + description */}
                  <div className="pb-4">
                    <p
                      className={cn(
                        'text-sm font-medium leading-7',
                        step.status === 'done'
                          ? 'text-emerald-600'
                          : step.status === 'active'
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-muted-foreground">
            Elapsed: {elapsed}
          </p>

          {timedOut ? (
            <>
              <p className="text-xs text-amber-600">
                This is taking longer than expected.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Retry
                </Button>
                <Button variant="ghost" size="sm" onClick={onSkip}>
                  Use preview mode
                </Button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-muted-foreground/60 underline-offset-2 transition-colors hover:text-muted-foreground hover:underline"
            >
              Skip and use preview mode
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const ChatTimeline = memo(function ChatTimeline({
  assistantProgressStatus,
  historyReady,
  isAssistantTyping,
  messages,
  openClawStatusLabel,
}: {
  assistantProgressStatus: string
  historyReady: boolean
  isAssistantTyping: boolean
  messages: ChatMessage[]
  openClawStatusLabel: string
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-7">
      {messages.length === 0 && historyReady ? (
        <div className="flex min-h-[46vh] flex-col items-center justify-center py-10 text-center">
          <span className="inline-flex h-24 w-24 overflow-hidden rounded-full border border-border/70 bg-card sm:h-28 sm:w-28">
            <Image
              src="/pfp.webp"
              alt="Lobster"
              width={112}
              height={112}
              className="h-full w-full object-cover"
            />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            OpenClaw is {openClawStatusLabel}.
          </h1>
          <p className="mt-2 max-w-md text-[13px] text-muted-foreground sm:text-sm">
            Ask anything. Delegate the work.
          </p>
        </div>
      ) : null}

      {messages.map((msg, index) => {
        const messageKey = buildMessageRenderKey(msg, index)

        if (msg.role === 'system') {
          return (
            <div key={messageKey} className="flex w-full justify-center px-2 sm:px-3">
              <p className="max-w-md rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground">
                {msg.content}
              </p>
            </div>
          )
        }

        if (msg.role === 'user') {
          return (
            <div key={messageKey} className="flex w-full justify-end px-2 sm:px-3">
              <div className="max-w-[74%] sm:max-w-[62%] chat-bubble-enter-user">
                {msg.channelId === 'whatsapp' ? (
                  <p className="mb-1 text-right text-[11px] uppercase tracking-wide text-muted-foreground">
                    WhatsApp
                  </p>
                ) : null}
                <article className="rounded-[18px] rounded-br-none border border-[hsl(var(--foreground)/0.14)] bg-[hsl(var(--foreground)/0.09)] px-3 py-2.5 text-[12px] leading-relaxed text-foreground shadow-[0_9px_22px_-16px_rgba(0,0,0,0.35)] sm:text-[13px]">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </article>
              </div>
            </div>
          )
        }

        return (
          <div key={messageKey} className="flex w-full justify-start px-2 sm:px-3">
            <div className="w-full max-w-[88%] sm:max-w-[78%] chat-bubble-enter-assistant">
              {msg.channelId === 'whatsapp' ? (
                <p className="mb-1 px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  WhatsApp
                </p>
              ) : null}
              <article className="w-full px-1 py-0.5 text-[14px] leading-7 text-foreground sm:text-[15px]">
                <MarkdownMessage content={msg.content} />
              </article>
            </div>
          </div>
        )
      })}

      {isAssistantTyping ? (
        <div className="flex w-full justify-start px-2 sm:px-3">
          <div
            className="inline-flex items-center rounded-full border border-border/70 bg-card/80 px-2.5 py-1.5"
            role="status"
            aria-label={`Assistant is typing. ${assistantProgressStatus}`}
          >
            <Shimmer as="p" className="text-xs font-medium">
              {assistantProgressStatus}
            </Shimmer>
          </div>
        </div>
      ) : null}
      <div aria-hidden="true" className="h-px w-full" />
    </div>
  )
})

// ─── Main chat page ──────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [showAllComposerTemplates, setShowAllComposerTemplates] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [isAssistantTyping, setIsAssistantTyping] = useState(false)
  const [showConnectionIssue, _setShowConnectionIssue] = useState(false)
  const [chatSessions, setChatSessions] = useState<RuntimeSessionSummary[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionsError, setSessionsError] = useState('')
  const [activeSessionKey, setActiveSessionKey] = useState(DEFAULT_CHAT_SESSION_KEY)
  const [showNewSessionConfirm, setShowNewSessionConfirm] = useState(false)
  const [copiedSessionKey, setCopiedSessionKey] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('Account')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileInitial, setProfileInitial] = useState('A')
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showSessionsSidebar, setShowSessionsSidebar] = useState(true)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [sendError, setSendError] = useState('')
  const [historyReady, setHistoryReady] = useState(false)
  const [isConnectionStable, setIsConnectionStable] = useState(false)
  const [assistantWaitSeconds, setAssistantWaitSeconds] = useState(0)
  const [channelStatusSnapshot, setChannelStatusSnapshot] = useState<RuntimeChannelsStatusData | null>(null)
  const [hasHydratedSidebarPreference, setHasHydratedSidebarPreference] = useState(false)
  const [paywallStatus, _setPaywallStatus] = useState<PaywallStatus>('not-triggered')
  const [paywallModal, setPaywallModal] = useState<PaywallModal>('none')
  const [freeMessageCount, _setFreeMessageCount] = useState(0)
  const [paywallCountdownEndsAtMs, setPaywallCountdownEndsAtMs] = useState<number | null>(null)
  const [paywallRemainingMs, setPaywallRemainingMs] = useState<number | null>(null)
  const [subscriptionDeletionWarning, setSubscriptionDeletionWarning] = useState<{
    reason: 'grace' | 'scheduled-cancel'
    endsAtMs: number
  } | null>(null)
  const [hasLoadedPaywallState, setHasLoadedPaywallState] = useState(false)
  const [selectedPaywallPlan, setSelectedPaywallPlan] = useState<PaywallPlan>('yearly')
  const [discountAnimatedPriceUsd, setDiscountAnimatedPriceUsd] = useState(PAYWALL_MONTHLY_PRICE_USD)
  const [discountAnimationPhase, setDiscountAnimationPhase] = useState<DiscountAnimationPhase>('initial')
  const [isDiscountAnimating, setIsDiscountAnimating] = useState(false)
  const [isHeadsUpDiscountEligible, setIsHeadsUpDiscountEligible] = useState(false)
  const [isCheckoutRedirecting, setIsCheckoutRedirecting] = useState(false)
  const [activeBillingPlan, setActiveBillingPlan] = useState<BillingPlan | null>(null)
  const [hasResolvedBillingPlan, setHasResolvedBillingPlan] = useState(false)
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null)
  const [isOpeningOpenClawUi, setIsOpeningOpenClawUi] = useState(false)

  // Setup progress state
  const [setupPhase, _setSetupPhase] = useState<SetupPhase>(null)
  const [setupStartedAt, setSetupStartedAt] = useState<number>(0)
  const [setupTimedOut, setSetupTimedOut] = useState(false)

  // Wrapper to keep ref in sync with state (so WebSocket callbacks see latest value)
  const setSetupPhase = useCallback((value: SetupPhase | ((prev: SetupPhase) => SetupPhase)) => {
    if (typeof value === 'function') {
      _setSetupPhase((prev) => {
        const next = value(prev)
        setupPhaseRef.current = next
        return next
      })
    } else {
      setupPhaseRef.current = value
      _setSetupPhase(value)
    }
  }, [])

  const wsRef = useRef<WebSocket | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const rpcIdRef = useRef(0)
  const pendingResponsesRef = useRef(0)
  const backendTypingRef = useRef(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const historyPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelsPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const historyPollInFlightRef = useRef(false)
  const wsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsInitialConnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const accessTokenRef = useRef('')
  const connectionStableTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyRequestIdRef = useRef(0)
  const hasHydratedSessionsOnConnectRef = useRef(false)
  const lastRequestedSessionKeyRef = useRef<string | null>(null)
  const sessionMismatchRetryRef = useRef(false)
  const setupPhaseRef = useRef<SetupPhase>(null)
  const activeSessionKeyRef = useRef<string | null>(null)
  const pendingSessionKeysRef = useRef<Set<string>>(new Set())
  const userIdRef = useRef('')
  const showConnectionIssueRef = useRef(false)
  const hasConnectedOnceRef = useRef(false)
  const isUnmountingRef = useRef(false)
  const copySessionKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoFollowRef = useRef(true)
  const assistantWaitStartedAtRef = useRef<number | null>(null)
  const templateChipsScrollerRef = useRef<HTMLDivElement>(null)
  const templateChipsDragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    moved: false,
  })
  const templateChipsIgnoreClickUntilRef = useRef(0)
  const paywallStatusRef = useRef<PaywallStatus>('not-triggered')
  const freeMessageCountRef = useRef(0)
  const paywallDeletionHandledRef = useRef(false)
  const paywallDeletionSyncRef = useRef<Promise<void> | null>(null)
  const hasRunInitialEntitlementSyncRef = useRef(false)
  const lastHandledCheckoutOutcomeRef = useRef<string | null>(null)

  const setPaywallStatus = useCallback((value: PaywallStatus | ((prev: PaywallStatus) => PaywallStatus)) => {
    if (typeof value !== 'function') {
      paywallStatusRef.current = value
    }
    _setPaywallStatus((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      paywallStatusRef.current = next
      return next
    })
  }, [])

  const setFreeMessageCount = useCallback((value: number | ((prev: number) => number)) => {
    if (typeof value !== 'function') {
      freeMessageCountRef.current = normalizePaywallFreeMessageCount(value)
    }
    _setFreeMessageCount((prev) => {
      const nextRaw = typeof value === 'function' ? value(prev) : value
      const next = normalizePaywallFreeMessageCount(nextRaw)
      freeMessageCountRef.current = next
      return next
    })
  }, [])

  const { regularChatSessions, cronChatSessions } = useMemo(() => {
    const regular: RuntimeSessionSummary[] = []
    const cron: RuntimeSessionSummary[] = []

    for (const session of chatSessions) {
      if (isCronSessionSummary(session)) {
        cron.push(session)
      } else {
        regular.push(session)
      }
    }

    return {
      regularChatSessions: regular,
      cronChatSessions: cron,
    }
  }, [chatSessions])
  const hasCronSessions = cronChatSessions.length > 0

  const setShowConnectionIssue = useCallback((visible: boolean) => {
    showConnectionIssueRef.current = visible
    _setShowConnectionIssue(visible)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const storedPreference = window.localStorage.getItem(SESSIONS_SIDEBAR_PREFERENCE_KEY)
      if (storedPreference === 'true') {
        setShowSessionsSidebar(true)
      } else if (storedPreference === 'false') {
        setShowSessionsSidebar(false)
      }
    } catch {
      // Ignore storage failures in private mode or blocked storage.
    } finally {
      setHasHydratedSidebarPreference(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydratedSidebarPreference) {
      return
    }

    try {
      window.localStorage.setItem(SESSIONS_SIDEBAR_PREFERENCE_KEY, String(showSessionsSidebar))
    } catch {
      // Ignore storage failures in private mode or blocked storage.
    }
  }, [hasHydratedSidebarPreference, showSessionsSidebar])

  const buildTenantRequestHeaders = useCallback(
    async (
      targetTenantId: string,
      headers: Record<string, string> = {},
    ): Promise<Record<string, string>> => {
      let accessToken = accessTokenRef.current.trim()
      if (!accessToken) {
        const resolvedToken = await getBrowserAccessToken()
        accessToken = resolvedToken?.trim() ?? ''
        if (accessToken) {
          accessTokenRef.current = accessToken
        }
      }
      return {
        ...headers,
        'x-tenant-id': targetTenantId,
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      }
    },
    [],
  )

  const activateFrontendUpgrade = useCallback(
    async (options?: { plan?: PaywallPlan; applyDiscount?: boolean }) => {
      if (isCheckoutRedirecting) {
        return
      }

      if (!tenantId.trim()) {
        setSendError('Missing tenant context. Please refresh and try again.')
        return
      }

      setSendError('')
      setIsCheckoutRedirecting(true)

      const selectedPlan = options?.plan ?? selectedPaywallPlan
      const applyDiscount = Boolean(options?.applyDiscount && selectedPlan === 'monthly')
      const backendUrl = getBackendUrl()

      const successUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/dashboard/chat?checkout=success&session_id={CHECKOUT_SESSION_ID}`
          : undefined
      const cancelUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/dashboard/chat?checkout=cancel`
          : undefined

      try {
        const headers = await buildTenantRequestHeaders(tenantId, {
          'content-type': 'application/json',
        })
        const response = await fetch(`${backendUrl}/api/v1/billing/stripe/checkout/session`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            plan: selectedPlan,
            applyDiscount,
            successUrl,
            cancelUrl,
            customerEmail: profileEmail || undefined,
          }),
        })

        const payloadText = await response.text()
        let payload: Record<string, unknown> | null = null
        try {
          payload = payloadText ? (JSON.parse(payloadText) as Record<string, unknown>) : null
        } catch {
          payload = null
        }

        if (!response.ok) {
          const message =
            typeof payload?.message === 'string' && payload.message.trim().length > 0
              ? payload.message
              : 'Could not start checkout. Please try again.'
          throw new Error(message)
        }

        const checkoutUrl = typeof payload?.url === 'string' ? payload.url.trim() : ''
        if (!checkoutUrl) {
          throw new Error('Checkout session was created without a redirect URL.')
        }

        window.location.assign(checkoutUrl)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not start checkout. Please try again.'
        setSendError(message)
        setIsCheckoutRedirecting(false)
      }
    },
    [buildTenantRequestHeaders, isCheckoutRedirecting, profileEmail, selectedPaywallPlan, tenantId],
  )

  const applySubscriptionSnapshotToPaywall = useCallback(
    (snapshot: SubscriptionSnapshot, options?: { openPaywallModalOnLimit?: boolean }) => {
      setHasResolvedBillingPlan(true)
      const now = Date.now()
      const normalizedState = typeof snapshot.state === 'string' ? snapshot.state.trim().toUpperCase() : ''
      const normalizedPlan = normalizeBillingPlan(snapshot.plan)
      if (normalizedPlan) {
        setActiveBillingPlan(normalizedPlan)
      }
      const graceEndsAtMs = toIsoTimestampMs(snapshot.graceEndsAt ?? null)
      const scheduledDeleteAtMs = toIsoTimestampMs(snapshot.subscriptionEndsAt ?? snapshot.currentPeriodEndAt ?? null)
      if (normalizedState === 'GRACE' && graceEndsAtMs !== null && graceEndsAtMs > now) {
        setSubscriptionDeletionWarning({
          reason: 'grace',
          endsAtMs: graceEndsAtMs,
        })
      } else if (snapshot.cancelAtPeriodEnd === true && scheduledDeleteAtMs !== null && scheduledDeleteAtMs > now) {
        setSubscriptionDeletionWarning({
          reason: 'scheduled-cancel',
          endsAtMs: scheduledDeleteAtMs,
        })
      } else {
        setSubscriptionDeletionWarning(null)
      }

      const freeMessagesUsedRaw = snapshot.paywall?.freeMessagesUsed
      const freeMessagesUsed =
        typeof freeMessagesUsedRaw === 'number' && Number.isFinite(freeMessagesUsedRaw)
          ? Math.max(0, Math.round(freeMessagesUsedRaw))
          : null
      if (freeMessagesUsed !== null) {
        setFreeMessageCount((current) => Math.max(current, freeMessagesUsed))
      }

      const isPaidPlan = snapshot.isPaidPlan === true
      if (isPaidPlan) {
        if (normalizedPlan === 'PRO_MONTHLY' || normalizedPlan === 'PRO_YEARLY') {
          setActiveBillingPlan(normalizedPlan)
        } else if (activeBillingPlan !== 'PRO_MONTHLY' && activeBillingPlan !== 'PRO_YEARLY') {
          setActiveBillingPlan('PRO_MONTHLY')
        }
        setPaywallStatus('upgraded')
        setPaywallModal('none')
        setPaywallCountdownEndsAtMs(null)
        setPaywallRemainingMs(null)
        setIsHeadsUpDiscountEligible(false)
        setSendError('')
        return 'paid' as const
      }

      const trialEndsAtMs = toIsoTimestampMs(snapshot.paywall?.trialEndsAt ?? snapshot.trialEndsAt ?? null)
      if (normalizedState === 'TERMINATED' || (trialEndsAtMs !== null && trialEndsAtMs <= now)) {
        setActiveBillingPlan('FREE')
        setPaywallStatus('deleted')
        setPaywallCountdownEndsAtMs(null)
        setPaywallRemainingMs(0)
        setPaywallModal('deleted')
        setSubscriptionDeletionWarning(null)
        return 'terminated' as const
      }

      if (trialEndsAtMs !== null && trialEndsAtMs > now) {
        setPaywallStatus('countdown')
        setPaywallCountdownEndsAtMs(trialEndsAtMs)
        setPaywallRemainingMs(Math.max(0, trialEndsAtMs - now))
        if (
          options?.openPaywallModalOnLimit &&
          (paywallModal === 'none' || paywallModal === 'later-upgrade') &&
          paywallStatusRef.current !== 'deleted'
        ) {
          setPaywallModal('initial')
        }
        return 'trialing' as const
      }

      if (
        paywallStatusRef.current === 'countdown' &&
        typeof paywallCountdownEndsAtMs === 'number' &&
        paywallCountdownEndsAtMs > now
      ) {
        setPaywallStatus('countdown')
        setPaywallCountdownEndsAtMs(paywallCountdownEndsAtMs)
        setPaywallRemainingMs(Math.max(0, paywallCountdownEndsAtMs - now))
        return 'trialing' as const
      }

      setActiveBillingPlan('FREE')
      setPaywallStatus('not-triggered')

      const effectiveFreeMessagesUsed = freeMessagesUsed ?? freeMessageCount
      if (
        options?.openPaywallModalOnLimit &&
        effectiveFreeMessagesUsed >= PAYWALL_FREE_MESSAGE_LIMIT &&
        paywallModal === 'none'
      ) {
        setPaywallModal('initial')
      }

      return 'free' as const
    },
    [activeBillingPlan, freeMessageCount, paywallCountdownEndsAtMs, paywallModal, setFreeMessageCount, setPaywallStatus],
  )

  const fetchSubscriptionSnapshot = useCallback(
    async (tid: string): Promise<SubscriptionSnapshot | null> => {
      const normalizedTenantId = tid.trim()
      if (!normalizedTenantId) {
        return null
      }
      const backendUrl = getBackendUrl()
      try {
        const headers = await buildTenantRequestHeaders(normalizedTenantId)
        const response = await fetch(`${backendUrl}/api/v1/subscription`, {
          method: 'GET',
          headers,
        })

        const payloadText = await response.text()
        let payload: Record<string, unknown> | null = null
        try {
          payload = payloadText ? (JSON.parse(payloadText) as Record<string, unknown>) : null
        } catch {
          payload = null
        }

        if (response.status === 403 && payload?.error === 'TENANT_TERMINATED') {
          return {
            state: 'TERMINATED',
            isPaidPlan: false,
          }
        }

        if (!response.ok || !payload) {
          return null
        }

        return payload as SubscriptionSnapshot
      } catch {
        return null
      }
    },
    [buildTenantRequestHeaders],
  )

  const refreshSubscriptionEntitlement = useCallback(
    async (options?: { tenantId?: string; retryUntilPaid?: boolean; openPaywallModalOnLimit?: boolean }) => {
      const targetTenantId = options?.tenantId?.trim() || tenantId.trim()
      if (!targetTenantId) {
        return null
      }

      const attempts = options?.retryUntilPaid ? 8 : 3
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const snapshot = await fetchSubscriptionSnapshot(targetTenantId)
        if (!snapshot) {
          if (attempt + 1 < attempts) {
            await new Promise((resolve) => setTimeout(resolve, 700 + attempt * 800))
            continue
          }
          return null
        }

        const outcome = applySubscriptionSnapshotToPaywall(snapshot, {
          openPaywallModalOnLimit: options?.openPaywallModalOnLimit,
        })
        if (!options?.retryUntilPaid || outcome === 'paid' || outcome === 'terminated') {
          return snapshot
        }

        if (attempt + 1 < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 + attempt * 1000))
        }
      }

      return null
    },
    [applySubscriptionSnapshotToPaywall, fetchSubscriptionSnapshot, tenantId],
  )

  const confirmStripeCheckoutSession = useCallback(
    async (
      tid: string,
      sessionId: string,
    ): Promise<{ upgraded: boolean; plan: BillingPlan | null }> => {
      const normalizedTenantId = tid.trim()
      const normalizedSessionId = sessionId.trim()
      if (!normalizedTenantId || !normalizedSessionId) {
        return {
          upgraded: false,
          plan: null,
        }
      }

      const backendUrl = getBackendUrl()
      try {
        const headers = await buildTenantRequestHeaders(normalizedTenantId, {
          'content-type': 'application/json',
        })
        const response = await fetch(`${backendUrl}/api/v1/billing/stripe/checkout/confirm`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sessionId: normalizedSessionId,
          }),
        })

        const payloadText = await response.text()
        let payload: Record<string, unknown> | null = null
        try {
          payload = payloadText ? (JSON.parse(payloadText) as Record<string, unknown>) : null
        } catch {
          payload = null
        }

        if (!response.ok || !payload) {
          return {
            upgraded: false,
            plan: null,
          }
        }

        return {
          upgraded: payload.upgraded === true,
          plan: normalizeBillingPlan(payload.plan),
        }
      } catch {
        return {
          upgraded: false,
          plan: null,
        }
      }
    },
    [buildTenantRequestHeaders],
  )

  const handleBackendPaywallPayload = useCallback(
    (payload: WsPaywallPayload & { status?: string }) => {
      const freeMessagesUsedRaw = payload.freeMessagesUsed
      const freeMessagesUsed =
        typeof freeMessagesUsedRaw === 'number' && Number.isFinite(freeMessagesUsedRaw)
          ? Math.max(0, Math.round(freeMessagesUsedRaw))
          : null
      if (freeMessagesUsed !== null) {
        setFreeMessageCount((current) => Math.max(current, freeMessagesUsed))
      }

      const trialEndsAtMs = toIsoTimestampMs(payload.trialEndsAt ?? null)
      const now = Date.now()
      if (trialEndsAtMs !== null && trialEndsAtMs <= now) {
        setPaywallStatus('deleted')
        setPaywallCountdownEndsAtMs(null)
        setPaywallRemainingMs(0)
        setPaywallModal('deleted')
        return
      }

      if (trialEndsAtMs !== null && trialEndsAtMs > now) {
        setPaywallStatus('countdown')
        setPaywallCountdownEndsAtMs(trialEndsAtMs)
        setPaywallRemainingMs(Math.max(0, trialEndsAtMs - now))
        if (
          payload.status === 'trial_started' &&
          paywallStatusRef.current !== 'deleted' &&
          paywallStatusRef.current !== 'upgraded' &&
          (paywallModal === 'none' || paywallModal === 'later-upgrade')
        ) {
          setPaywallModal('initial')
        }
        return
      }

      if (
        freeMessagesUsed !== null &&
        freeMessagesUsed >= PAYWALL_FREE_MESSAGE_LIMIT &&
        paywallStatusRef.current === 'not-triggered' &&
        (paywallModal === 'none' || paywallModal === 'later-upgrade')
      ) {
        setPaywallModal('initial')
      }
    },
    [paywallModal, setFreeMessageCount, setPaywallStatus],
  )

  const startPaywallCountdown = useCallback((options?: {
    showNote?: boolean
    keepDiscountForHeadsUp?: boolean
    countdownEndsAtMs?: number
  }) => {
    const now = Date.now()
    const existingCountdownEndsAt =
      paywallStatusRef.current === 'countdown' &&
      typeof paywallCountdownEndsAtMs === 'number' &&
      paywallCountdownEndsAtMs > now
        ? paywallCountdownEndsAtMs
        : null
    const countdownEndsAt =
      options?.countdownEndsAtMs && Number.isFinite(options.countdownEndsAtMs) && options.countdownEndsAtMs > now
        ? options.countdownEndsAtMs
        : existingCountdownEndsAt ?? now + PAYWALL_COUNTDOWN_DURATION_MS
    paywallDeletionHandledRef.current = false
    setPaywallStatus('countdown')
    setPaywallModal(options?.showNote ? 'why-limit' : 'none')
    setIsHeadsUpDiscountEligible(Boolean(options?.showNote && options?.keepDiscountForHeadsUp))
    setPaywallCountdownEndsAtMs(countdownEndsAt)
    setPaywallRemainingMs(Math.max(0, countdownEndsAt - now))
    setPendingLeaveHref(null)
    setSendError('')
  }, [paywallCountdownEndsAtMs])

  const startBackendManagedPaywallCountdown = useCallback(
    async (options?: { showNote?: boolean; keepDiscountForHeadsUp?: boolean }) => {
      const normalizedTenantId = tenantId.trim()
      if (!normalizedTenantId) {
        startPaywallCountdown(options)
        return
      }

      const backendUrl = getBackendUrl()
      try {
        const headers = await buildTenantRequestHeaders(normalizedTenantId, {
          'content-type': 'application/json',
        })
        const response = await fetch(`${backendUrl}/api/v1/subscription/paywall/start-trial`, {
          method: 'POST',
          headers,
          body: '{}',
        })

        const payloadText = await response.text()
        let payload: Record<string, unknown> | null = null
        try {
          payload = payloadText ? (JSON.parse(payloadText) as Record<string, unknown>) : null
        } catch {
          payload = null
        }

        if (response.ok && payload) {
          const state = typeof payload.state === 'string' ? payload.state.trim().toUpperCase() : ''
          if (state === 'TERMINATED') {
            setPaywallStatus('deleted')
            setPaywallCountdownEndsAtMs(null)
            setPaywallRemainingMs(0)
            setPaywallModal('deleted')
            return
          }

          const trialEndsAtMs = toIsoTimestampMs(
            typeof payload.trialEndsAt === 'string' ? payload.trialEndsAt : null,
          )
          if (trialEndsAtMs !== null && trialEndsAtMs > Date.now()) {
            startPaywallCountdown({
              ...options,
              countdownEndsAtMs: trialEndsAtMs,
            })
            return
          }
        }
      } catch {
        // Fall through to local countdown fallback.
      }

      startPaywallCountdown(options)
    },
    [buildTenantRequestHeaders, startPaywallCountdown, tenantId],
  )

  const closePaywallModal = useCallback(() => {
    if (paywallModal === 'initial') {
      setSelectedPaywallPlan('monthly')
      setPaywallModal('discount')
      return
    }
    if (paywallModal === 'discount') {
      void startBackendManagedPaywallCountdown({ showNote: true, keepDiscountForHeadsUp: true })
      return
    }
    if (paywallModal === 'leave-warning') {
      setPendingLeaveHref(null)
    }
    if (paywallModal === 'why-limit') {
      setIsHeadsUpDiscountEligible(false)
    }
    if (paywallModal === 'deleted') {
      return
    }
    setPaywallModal('none')
  }, [paywallModal, startBackendManagedPaywallCountdown])

  const handlePaywallNavigationInterception = useCallback(
    (event: React.MouseEvent<HTMLElement>, href: string) => {
      if (href.startsWith('/dashboard')) {
        return
      }
      if (paywallStatus !== 'countdown') {
        return
      }
      event.preventDefault()
      setPendingLeaveHref(href)
      setPaywallModal('leave-warning')
    },
    [paywallStatus],
  )

  const continueLeaveNavigation = useCallback(() => {
    const targetHref = pendingLeaveHref
    setPaywallModal('none')
    setPendingLeaveHref(null)
    if (!targetHref) return
    if (typeof window !== 'undefined') {
      window.location.assign(targetHref)
      return
    }
    router.push(targetHref)
  }, [pendingLeaveHref, router])

  const openPlanPricingModal = useCallback(() => {
    setSelectedPaywallPlan(activeBillingPlan === 'PRO_YEARLY' ? 'yearly' : 'monthly')
    setPaywallModal('plan-pricing')
  }, [activeBillingPlan])

  const kickStartPaywallTest = useCallback(() => {
    setPaywallStatus('not-triggered')
    setPaywallCountdownEndsAtMs(null)
    setPaywallRemainingMs(null)
    setSubscriptionDeletionWarning(null)
    setPaywallModal('initial')
    setFreeMessageCount(0)
    paywallDeletionHandledRef.current = false
    setPendingLeaveHref(null)
    setSendError('')
  }, [])

  useEffect(() => {
    if (!tenantId) return
    const persisted = readPersistedPaywallState(tenantId)
    if (!persisted) {
      setPaywallStatus('not-triggered')
      setPaywallModal('none')
      setFreeMessageCount(0)
      setPaywallCountdownEndsAtMs(null)
      setPaywallRemainingMs(null)
      setHasLoadedPaywallState(true)
      return
    }

    const now = Date.now()
    const persistedCountdownEndsAtMs = persisted.countdownEndsAtMs
    const hasCountdown =
      persisted.status === 'countdown' &&
      typeof persistedCountdownEndsAtMs === 'number' &&
      persistedCountdownEndsAtMs > now

    if (hasCountdown) {
      setPaywallStatus('countdown')
      setPaywallCountdownEndsAtMs(persistedCountdownEndsAtMs)
      setPaywallRemainingMs(persistedCountdownEndsAtMs - now)
    } else if (persisted.status === 'countdown' || persisted.status === 'deleted') {
      setPaywallStatus('deleted')
      setPaywallCountdownEndsAtMs(null)
      setPaywallRemainingMs(0)
      setPaywallModal('deleted')
    } else {
      setPaywallStatus(persisted.status === 'upgraded' ? 'not-triggered' : persisted.status)
      setPaywallCountdownEndsAtMs(null)
      setPaywallRemainingMs(null)
    }

    setFreeMessageCount(normalizePaywallFreeMessageCount(persisted.freeMessageCount))
    setHasLoadedPaywallState(true)
  }, [tenantId])

  useEffect(() => {
    hasRunInitialEntitlementSyncRef.current = false
    lastHandledCheckoutOutcomeRef.current = null
    setHasResolvedBillingPlan(false)
    setActiveBillingPlan(null)
  }, [tenantId])

  useEffect(() => {
    if (checkingSession || !tenantId || !hasLoadedPaywallState) {
      return
    }
    if (hasRunInitialEntitlementSyncRef.current) {
      return
    }

    hasRunInitialEntitlementSyncRef.current = true
    void refreshSubscriptionEntitlement({
      openPaywallModalOnLimit: true,
    })
  }, [checkingSession, hasLoadedPaywallState, refreshSubscriptionEntitlement, tenantId])

  useEffect(() => {
    if (checkingSession || !tenantId || typeof window === 'undefined') {
      return
    }

    const refreshOnFocus = () => {
      void refreshSubscriptionEntitlement({
        openPaywallModalOnLimit: true,
      })
    }

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshOnFocus()
      }
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisible)
    return () => {
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisible)
    }
  }, [checkingSession, refreshSubscriptionEntitlement, tenantId])

  useEffect(() => {
    if (checkingSession || !tenantId || hasResolvedBillingPlan) {
      return
    }

    let cancelled = false
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    const run = async () => {
      if (cancelled || hasResolvedBillingPlan) {
        return
      }
      await refreshSubscriptionEntitlement({
        openPaywallModalOnLimit: true,
      })
      if (cancelled || hasResolvedBillingPlan) {
        return
      }
      timeoutHandle = setTimeout(() => {
        void run()
      }, 1200)
    }

    void run()
    return () => {
      cancelled = true
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
    }
  }, [checkingSession, hasResolvedBillingPlan, refreshSubscriptionEntitlement, tenantId])

  useEffect(() => {
    if (checkingSession || !tenantId || typeof window === 'undefined') {
      return
    }

    const query = new URLSearchParams(window.location.search)
    const checkout = query.get('checkout')
    const checkoutSessionId = query.get('session_id')?.trim() ?? ''
    if (checkout !== 'success' && checkout !== 'cancel') {
      return
    }

    const checkoutOutcomeKey = `${checkout}:${checkoutSessionId || 'none'}`
    if (lastHandledCheckoutOutcomeRef.current === checkoutOutcomeKey) {
      return
    }
    lastHandledCheckoutOutcomeRef.current = checkoutOutcomeKey

    query.delete('checkout')
    query.delete('session_id')
    const nextQuery = query.toString()
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(nextHref, { scroll: false })

    if (checkout === 'success') {
      setSendError('Finalizing your upgrade...')
      void (async () => {
        let upgradedViaConfirm = false
        let confirmedPlan: BillingPlan | null = null

        if (checkoutSessionId) {
          for (let attempt = 0; attempt < 5; attempt += 1) {
            const confirmed = await confirmStripeCheckoutSession(tenantId, checkoutSessionId)
            if (confirmed.upgraded) {
              upgradedViaConfirm = true
              confirmedPlan = confirmed.plan
              break
            }

            if (attempt + 1 < 5) {
              await new Promise((resolve) => setTimeout(resolve, 1000 + attempt * 500))
            }
          }
        }

        if (upgradedViaConfirm) {
          if (confirmedPlan === 'PRO_MONTHLY' || confirmedPlan === 'PRO_YEARLY') {
            setActiveBillingPlan(confirmedPlan)
          }
          setPaywallStatus('upgraded')
          setPaywallModal('none')
          setPaywallCountdownEndsAtMs(null)
          setPaywallRemainingMs(null)
          setIsHeadsUpDiscountEligible(false)
          setSendError('')
          void refreshSubscriptionEntitlement({
            retryUntilPaid: true,
          })
          return
        }

        const snapshot = await refreshSubscriptionEntitlement({
          retryUntilPaid: true,
        })
        const upgraded = snapshot?.isPaidPlan === true
        if (!upgraded) {
          setSendError('Payment is processing. Try again in a few seconds.')
          return
        }

        const snapshotPlan = normalizeBillingPlan(snapshot?.plan)
        if (snapshotPlan === 'PRO_MONTHLY' || snapshotPlan === 'PRO_YEARLY') {
          setActiveBillingPlan(snapshotPlan)
        }
        setSendError('')
      })()
      return
    }

    setSendError('Checkout canceled.')
    void refreshSubscriptionEntitlement({
      openPaywallModalOnLimit: true,
    }).then((snapshot) => {
      const upgraded = snapshot?.isPaidPlan === true
      if (upgraded) {
        setSendError('')
        return
      }

      if (paywallStatusRef.current !== 'deleted') {
        setPaywallModal('later-upgrade')
      }
    })
  }, [checkingSession, confirmStripeCheckoutSession, pathname, refreshSubscriptionEntitlement, router, tenantId])

  useEffect(() => {
    if (!tenantId || !hasLoadedPaywallState) return
    writePersistedPaywallState(tenantId, {
      status: paywallStatus === 'upgraded' ? 'not-triggered' : paywallStatus,
      freeMessageCount,
      countdownEndsAtMs: paywallStatus === 'countdown' ? paywallCountdownEndsAtMs : null,
    })
  }, [freeMessageCount, hasLoadedPaywallState, paywallCountdownEndsAtMs, paywallStatus, tenantId])

  useEffect(() => {
    if (!hasLoadedPaywallState || !historyReady) return
    if (paywallStatus !== 'not-triggered') return
    if (paywallModal !== 'none') return
    if (freeMessageCount < PAYWALL_FREE_MESSAGE_LIMIT) return
    setPaywallModal('initial')
  }, [
    freeMessageCount,
    hasLoadedPaywallState,
    historyReady,
    paywallModal,
    paywallStatus,
  ])

  useEffect(() => {
    if (paywallStatus !== 'countdown' || !paywallCountdownEndsAtMs) {
      if (paywallStatus !== 'deleted') {
        setPaywallRemainingMs(null)
      }
      return
    }

    const countdownEndsAtMs = paywallCountdownEndsAtMs
    function tickCountdown() {
      const nextRemaining = countdownEndsAtMs - Date.now()
      if (nextRemaining <= 0) {
        setPaywallRemainingMs(0)
        setPaywallStatus('deleted')
        setPaywallCountdownEndsAtMs(null)
        setPaywallModal('deleted')
        return
      }
      setPaywallRemainingMs(nextRemaining)
    }

    tickCountdown()
    const interval = setInterval(tickCountdown, 1000)
    return () => clearInterval(interval)
  }, [paywallCountdownEndsAtMs, paywallStatus])

  useEffect(() => {
    if (paywallModal !== 'discount') {
      setDiscountAnimatedPriceUsd(PAYWALL_MONTHLY_PRICE_USD)
      setDiscountAnimationPhase('initial')
      setIsDiscountAnimating(false)
      return
    }

    const from = PAYWALL_MONTHLY_PRICE_USD
    const to = PAYWALL_DISCOUNTED_FIRST_MONTH_PRICE_USD
    let frameId = 0
    let strikeTimer: ReturnType<typeof setTimeout> | null = null
    let revealTimer: ReturnType<typeof setTimeout> | null = null

    setDiscountAnimatedPriceUsd(from)
    setDiscountAnimationPhase('initial')
    setIsDiscountAnimating(true)

    strikeTimer = setTimeout(() => {
      setDiscountAnimationPhase('struck')

      revealTimer = setTimeout(() => {
        setDiscountAnimationPhase('counting')

        const startAt = performance.now()
        const tick = (now: number) => {
          const elapsed = now - startAt
          const progress = Math.min(1, elapsed / PAYWALL_DISCOUNT_ANIMATION_MS)
          const eased = 1 - Math.pow(1 - progress, 2.2)
          const nextValue = from - (from - to) * eased
          const rounded = Math.round(nextValue * 100) / 100
          setDiscountAnimatedPriceUsd(rounded)
          if (progress < 1) {
            frameId = requestAnimationFrame(tick)
            return
          }
          setDiscountAnimatedPriceUsd(to)
          setDiscountAnimationPhase('done')
          setIsDiscountAnimating(false)
        }

        frameId = requestAnimationFrame(tick)
      }, PAYWALL_DISCOUNT_NEW_PRICE_DELAY_MS)
    }, PAYWALL_DISCOUNT_STRIKE_DELAY_MS)

    return () => {
      if (strikeTimer) clearTimeout(strikeTimer)
      if (revealTimer) clearTimeout(revealTimer)
      cancelAnimationFrame(frameId)
    }
  }, [paywallModal])

  const clearConnectionStableTimer = useCallback(() => {
    if (connectionStableTimeoutRef.current) {
      clearTimeout(connectionStableTimeoutRef.current)
      connectionStableTimeoutRef.current = null
    }
  }, [])

  const resetConnectionStability = useCallback(() => {
    clearConnectionStableTimer()
    setIsConnectionStable(false)
  }, [clearConnectionStableTimer])

  const beginConnectionStabilityCheck = useCallback(() => {
    clearConnectionStableTimer()
    setIsConnectionStable(false)
    connectionStableTimeoutRef.current = setTimeout(() => {
      connectionStableTimeoutRef.current = null
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        setIsConnectionStable(true)
      }
    }, ONLINE_STABILITY_MS)
  }, [clearConnectionStableTimer])

  const copySessionKey = useCallback(async (sessionKey: string) => {
    const copyValue = buildCopyableSessionId(sessionKey)
    try {
      await navigator.clipboard.writeText(copyValue)
      setCopiedSessionKey(sessionKey)
      if (copySessionKeyTimeoutRef.current) {
        clearTimeout(copySessionKeyTimeoutRef.current)
      }
      copySessionKeyTimeoutRef.current = setTimeout(() => {
        setCopiedSessionKey((current) => (current === sessionKey ? null : current))
      }, 1800)
    } catch (error) {
      console.error('Failed to copy session ID', error)
    }
  }, [])

  const updateSessionInUrl = useCallback((sessionKey: string) => {
    if (!pathname) return
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.set('session', sessionKey)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router])

  const clearSessionInUrl = useCallback(() => {
    if (!pathname) return
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.delete('session')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router])

  const persistSession = useCallback(
    (
      tid: string,
      sessionKey: string,
      sessionLabel?: string | null,
      options?: {
        touchLastSeen?: boolean
      },
    ) => {
      const normalizedSessionKey = sessionKey.trim()
      const normalizedUserId = userIdRef.current.trim()
      if (!tid || !normalizedUserId || !normalizedSessionKey) {
        return
      }
      const isActive = normalizedSessionKey === (activeSessionKeyRef.current || DEFAULT_CHAT_SESSION_KEY)

      void upsertPersistedRuntimeSession({
        userId: normalizedUserId,
        tenantId: tid,
        sessionKey: normalizedSessionKey,
        sessionLabel,
        isActive,
        touchLastSeen: options?.touchLastSeen ?? false,
      }).catch((error) => {
        console.error('Failed to persist runtime session', error)
      })
    },
    [],
  )

  const persistMessage = useCallback(
    (tid: string, sessionKey: string, message: ChatMessage) => {
      const normalizedUserId = userIdRef.current.trim()
      const normalizedSessionKey = sessionKey.trim()
      const normalizedContent = message.content.trim()
      if (!normalizedUserId || !tid || !normalizedSessionKey || !normalizedContent) {
        return
      }
      if (message.role === 'system' && isGatewayUnavailableError(normalizedContent.replace(/^error:\s*/i, ''))) {
        return
      }

      void insertPersistedRuntimeMessage({
        userId: normalizedUserId,
        tenantId: tid,
        sessionKey: normalizedSessionKey,
        role: message.role,
        content: normalizedContent,
        timestamp: message.timestamp,
      }).catch((error) => {
        console.error('Failed to persist runtime message', error)
      })
    },
    [],
  )

  const touchSessionActivity = useCallback(
    (tid: string, sessionKey: string, sessionLabel?: string | null) => {
      const normalizedSessionKey = sessionKey.trim()
      if (!tid || !normalizedSessionKey) {
        return
      }

      const nowIso = new Date().toISOString()
      setChatSessions((previous) => {
        const hasSession = previous.some((session) => session.key === normalizedSessionKey)
        if (!hasSession) {
          return sortSessionsByActivity([
            {
              key: normalizedSessionKey,
              label: sessionLabel ?? null,
              modelId: null,
              updatedAt: nowIso,
              raw: {},
            },
            ...previous,
          ])
        }

        return sortSessionsByActivity(
          previous.map((session) => {
            if (session.key !== normalizedSessionKey) {
              return session
            }
            return {
              ...session,
              label: sessionLabel ?? session.label,
              updatedAt: nowIso,
            }
          }),
        )
      })

      persistSession(tid, normalizedSessionKey, sessionLabel, { touchLastSeen: true })
    },
    [persistSession],
  )

  const isPendingSessionKey = useCallback((sessionKey: string | null | undefined) => {
    const normalized = sessionKey?.trim()
    if (!normalized) {
      return false
    }
    return pendingSessionKeysRef.current.has(normalized)
  }, [])

  const syncSessionKey = useCallback((
    tid: string,
    sessionKey: string | null,
    sessionLabel?: string | null,
    options?: {
      persist?: boolean
      storeInLocalStorage?: boolean
    },
  ) => {
    const normalized = sessionKey?.trim() || null
    const fallback = normalized || DEFAULT_CHAT_SESSION_KEY
    activeSessionKeyRef.current = fallback
    setActiveSessionKey(fallback)
    if (options?.storeInLocalStorage ?? true) {
      writeStoredChatSessionKey(tid, fallback)
    }
    const normalizedLabel =
      typeof sessionLabel === 'string' && sessionLabel.trim().length > 0
        ? sessionLabel
        : undefined
    const shouldPersist = options?.persist ?? !pendingSessionKeysRef.current.has(fallback)
    if (shouldPersist) {
      persistSession(tid, fallback, normalizedLabel)
    }
  }, [persistSession])

  const registerPendingSession = useCallback((tid: string, sessionKey: string, sessionLabel = 'New session') => {
    const normalizedSessionKey = sessionKey.trim()
    if (!tid || !normalizedSessionKey || !pendingSessionKeysRef.current.has(normalizedSessionKey)) {
      return
    }
    pendingSessionKeysRef.current.delete(normalizedSessionKey)
    syncSessionKey(tid, normalizedSessionKey, sessionLabel)
  }, [syncSessionKey])

  const loadPersistedSessions = useCallback(async (tid: string): Promise<RuntimeSessionSummary[]> => {
    const normalizedUserId = userIdRef.current.trim()
    if (!tid || !normalizedUserId) {
      return []
    }

    const persisted = await listPersistedRuntimeSessions(normalizedUserId, tid)
    return persisted
      .map((session) => toRuntimeSessionSummary(session))
      .filter((session) => isSidebarVisibleChatSessionKey(session.key))
  }, [])

  const loadSessions = useCallback(async (tid: string, options?: { silent?: boolean }) => {
    if (!tid) return
    const shouldToggleLoading = !options?.silent
    if (shouldToggleLoading) {
      setLoadingSessions(true)
    }
    setSessionsError('')
    const fallbackSessionKey = isSidebarVisibleChatSessionKey(activeSessionKeyRef.current)
      ? activeSessionKeyRef.current.trim()
      : DEFAULT_CHAT_SESSION_KEY
    const sessionsFallbackKey = isPendingSessionKey(fallbackSessionKey)
      ? DEFAULT_CHAT_SESSION_KEY
      : fallbackSessionKey

    let persistedSessions: RuntimeSessionSummary[] = []
    try {
      persistedSessions = await loadPersistedSessions(tid)
      if (persistedSessions.length > 0) {
        setChatSessions(sortSessionsByActivity(mergeRuntimeSessions([], persistedSessions, sessionsFallbackKey)))
      }
    } catch (error) {
      console.error('Failed to load persisted sessions', error)
    }

    try {
      const response = await listRuntimeSessions(tid, {
        includeGlobal: false,
        includeUnknown: false,
        agentId: 'main',
      })
      const runtimeSessions = response.sessions.filter(
        (session) => isSidebarVisibleChatSessionKey(session.key) && !isPendingSessionKey(session.key),
      )
      const nextSessions = mergeRuntimeSessions(runtimeSessions, persistedSessions, sessionsFallbackKey)
      setChatSessions(sortSessionsByActivity(nextSessions))
      setSessionsError('')
      for (const session of nextSessions) {
        const sessionLabel =
          typeof session.label === 'string' && session.label.trim().length > 0
            ? session.label
            : undefined
        persistSession(tid, session.key, sessionLabel)
      }
    } catch (error) {
      if (persistedSessions.length > 0) {
        setChatSessions(sortSessionsByActivity(mergeRuntimeSessions([], persistedSessions, sessionsFallbackKey)))
      } else {
        const message = normalizeRuntimeError(error instanceof Error ? error.message : '')
        setSessionsError(message)
        setChatSessions([createFallbackSession(sessionsFallbackKey)])
      }
    } finally {
      if (shouldToggleLoading) {
        setLoadingSessions(false)
      }
    }
  }, [loadPersistedSessions, persistSession])

  const refreshChannelStatus = useCallback(async (tid: string) => {
    if (!tid) return
    try {
      const snapshot = await listRuntimeChannelsStatus(tid, { probe: true, timeoutMs: 8_000 })
      setChannelStatusSnapshot(snapshot)
    } catch {
      // Ignore transient probe failures here. This is a best-effort live indicator.
    }
  }, [])

  const isNearBottom = useCallback((threshold = 100) => {
    if (typeof window === 'undefined') return true
    const root = document.documentElement
    const scrolled = window.scrollY || root.scrollTop
    const visibleHeight = window.innerHeight
    const totalHeight = Math.max(root.scrollHeight, document.body.scrollHeight)
    const distanceToBottom = totalHeight - (scrolled + visibleHeight)
    return distanceToBottom <= threshold
  }, [])

  const scrollToBottom = useCallback((options?: { force?: boolean; behavior?: ScrollBehavior }) => {
    if (typeof window === 'undefined') return

    const shouldAutoFollow = options?.force || autoFollowRef.current || isNearBottom()
    if (!shouldAutoFollow) return

    const root = document.documentElement
    const totalHeight = Math.max(root.scrollHeight, document.body.scrollHeight)
    window.scrollTo({
      top: totalHeight,
      behavior: options?.behavior ?? 'auto',
    })
    autoFollowRef.current = true
  }, [isNearBottom])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = () => {
      autoFollowRef.current = isNearBottom()
      setShowScrollToBottom(!isNearBottom(400))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [isNearBottom])

  const loadSessionHistory = useCallback(async (
    tid: string,
    sessionKey: string,
    options?: {
      merge?: boolean
    },
  ) => {
    const normalizedSessionKey = sessionKey.trim()
    if (!tid || !normalizedSessionKey) return
    const shouldMerge = options?.merge ?? false

    const requestId = historyRequestIdRef.current + 1
    historyRequestIdRef.current = requestId

    const isCurrentRequest = () =>
      historyRequestIdRef.current === requestId && activeSessionKeyRef.current === normalizedSessionKey

    const normalizedUserId = userIdRef.current.trim()
    let hasPersistedHistory = false

    try {
      // When merging (history polling), skip the Supabase fetch – those
      // messages are already in state because we persist them in real-time.
      // Fetching from both Supabase and the runtime API during merge caused
      // duplicates because the two sources store different timestamps for the
      // same logical message.
      if (normalizedUserId && !shouldMerge) {
        try {
          const persistedHistory = await listPersistedRuntimeMessages(normalizedUserId, tid, normalizedSessionKey)
          if (persistedHistory.length > 0) {
            hasPersistedHistory = true
            if (isCurrentRequest()) {
              const persistedMessages = dedupeAndSortMessages(
                persistedHistory.map((message) => toChatMessage(message)),
              )
              setMessages((prev) => (areMessageListsEquivalent(prev, persistedMessages) ? prev : persistedMessages))
              scrollToBottom({ force: true })
            }
          }
        } catch (error) {
          console.error('Failed to load persisted runtime messages', error)
        }
      }

      const [history, whatsappEvents] = await Promise.all([
        listRuntimeChatHistory(tid, normalizedSessionKey, 250),
        listRuntimeChannelEvents(tid, {
          channelId: 'whatsapp',
          sessionKey: normalizedSessionKey,
          limit: 250,
        }).catch(() => []),
      ])
      if (!isCurrentRequest()) {
        return
      }
      const mappedMessages = history.messages.map((message) => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp ?? new Date().toISOString(),
      }))
      const mappedWhatsAppMessages = whatsappEvents
        .map((event) => toChatMessageFromChannelEvent(event))
        .filter((message): message is ChatMessage => Boolean(message))

      const combinedRuntimeMessages = dedupeAndSortMessages([
        ...mappedMessages,
        ...mappedWhatsAppMessages,
      ])

      if (combinedRuntimeMessages.length > 0) {
        if (shouldMerge) {
          setMessages((prev) => {
            const merged = dedupeAndSortMessages([...prev, ...combinedRuntimeMessages])
            return areMessageListsEquivalent(prev, merged) ? prev : merged
          })
        } else {
          setMessages((prev) => (areMessageListsEquivalent(prev, combinedRuntimeMessages) ? prev : combinedRuntimeMessages))
        }
        scrollToBottom({ force: !shouldMerge })
      } else if (!hasPersistedHistory && !shouldMerge) {
        setMessages((prev) => (prev.length === 0 ? prev : []))
      }
    } catch (error) {
      if (!hasPersistedHistory) {
        console.error('Failed to load runtime session history', error)
      }
    } finally {
      if (historyRequestIdRef.current === requestId) {
        setHistoryReady(true)
      }
    }
  }, [scrollToBottom])

  const syncTypingIndicator = useCallback(() => {
    setIsAssistantTyping(backendTypingRef.current || pendingResponsesRef.current > 0)
  }, [])

  const resetTypingState = useCallback(() => {
    pendingResponsesRef.current = 0
    assistantWaitStartedAtRef.current = null
    backendTypingRef.current = false
    setAssistantWaitSeconds(0)
    setIsAssistantTyping(false)
  }, [])

  const beginPendingResponse = useCallback(() => {
    if (pendingResponsesRef.current === 0 || assistantWaitStartedAtRef.current === null) {
      assistantWaitStartedAtRef.current = Date.now()
      setAssistantWaitSeconds(0)
    }
    pendingResponsesRef.current += 1
    syncTypingIndicator()
  }, [syncTypingIndicator])

  const resolvePendingResponse = useCallback(() => {
    pendingResponsesRef.current = Math.max(0, pendingResponsesRef.current - 1)
    if (pendingResponsesRef.current === 0) {
      assistantWaitStartedAtRef.current = null
      setAssistantWaitSeconds(0)
    }
    syncTypingIndicator()
  }, [syncTypingIndicator])

  useEffect(() => {
    if (!isAssistantTyping) {
      setAssistantWaitSeconds(0)
      return
    }

    if (assistantWaitStartedAtRef.current === null) {
      assistantWaitStartedAtRef.current = Date.now()
    }

    const updateElapsed = () => {
      const startedAt = assistantWaitStartedAtRef.current
      if (!startedAt) {
        setAssistantWaitSeconds(0)
        return
      }
      setAssistantWaitSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, ASSISTANT_PROGRESS_TICK_MS)
    return () => {
      clearInterval(interval)
    }
  }, [isAssistantTyping])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (wsInitialConnectTimeoutRef.current) {
      clearTimeout(wsInitialConnectTimeoutRef.current)
      wsInitialConnectTimeoutRef.current = null
    }
    if (wsRetryRef.current) {
      clearTimeout(wsRetryRef.current)
      wsRetryRef.current = null
    }
  }, [])

  const stopHistoryPolling = useCallback(() => {
    if (historyPollRef.current) {
      clearInterval(historyPollRef.current)
      historyPollRef.current = null
    }
    historyPollInFlightRef.current = false
  }, [])

  useEffect(() => {
    if (!tenantId || !hasLoadedPaywallState || paywallStatus !== 'deleted') return
    if (paywallDeletionHandledRef.current || paywallDeletionSyncRef.current) return

    paywallDeletionSyncRef.current = (async () => {
      const backendUrl = getBackendUrl()
      try {
        const headers = await buildTenantRequestHeaders(tenantId, {
          'content-type': 'application/json',
        })
        await fetch(`${backendUrl}/api/v1/subscription/paywall/expire`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ force: true }),
        })
      } catch (error) {
        console.error('Failed to finalize trial expiry on backend', error)
      }

      stopPolling()
      stopHistoryPolling()
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.onmessage = null
        wsRef.current.close()
        wsRef.current = null
      }
      setConnectionStatus('disconnected')
    })().finally(() => {
      paywallDeletionHandledRef.current = true
      paywallDeletionSyncRef.current = null
    })
  }, [buildTenantRequestHeaders, hasLoadedPaywallState, paywallStatus, stopHistoryPolling, stopPolling, tenantId])

  const startHistoryPolling = useCallback(
    (tid: string, sessionKey: string) => {
      const normalizedSessionKey = sessionKey.trim()
      if (!tid || !normalizedSessionKey) {
        return
      }

      stopHistoryPolling()
      historyPollRef.current = setInterval(() => {
        const activeKey = activeSessionKeyRef.current
        if (activeKey !== normalizedSessionKey || historyPollInFlightRef.current) {
          return
        }
        historyPollInFlightRef.current = true
        void loadSessionHistory(tid, normalizedSessionKey, { merge: true })
          .catch(() => undefined)
          .finally(() => {
            historyPollInFlightRef.current = false
          })
      }, 4000)
    },
    [loadSessionHistory, stopHistoryPolling],
  )

  const sendSessionSelectionRpc = useCallback((sessionKey: string): boolean => {
    const ws = wsRef.current
    const normalized = sessionKey.trim()
    if (!ws || ws.readyState !== WebSocket.OPEN || !normalized) {
      return false
    }
    lastRequestedSessionKeyRef.current = normalized
    rpcIdRef.current += 1
    ws.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: rpcIdRef.current,
        method: 'chat.session.select',
        params: { sessionKey: normalized },
      }),
    )
    return true
  }, [])

  const connectWebSocket = useCallback(
    (tid: string, preferredSessionKey?: string) => {
      if (isUnmountingRef.current) return
      if (paywallStatusRef.current === 'deleted') {
        setConnectionStatus('disconnected')
        resetConnectionStability()
        resetTypingState()
        return
      }

      // Clear any pending retry to prevent cascade
      if (wsRetryRef.current) {
        clearTimeout(wsRetryRef.current)
        wsRetryRef.current = null
      }

      // Detach handlers from old socket before closing to prevent its
      // onclose from scheduling another retry
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.onmessage = null
        wsRef.current.close()
        wsRef.current = null
      }

      setConnectionStatus('connecting')
      resetConnectionStability()
      resetTypingState()

      const backendUrl = getBackendUrl()
      const query = new URLSearchParams({ tenantId: tid })
      const preferred = preferredSessionKey?.trim() || activeSessionKeyRef.current?.trim() || null
      const sessionKey = preferred && !isPendingSessionKey(preferred) ? preferred : null
      if (sessionKey !== null) {
        query.set('sessionKey', sessionKey)
      }
      const accessToken = accessTokenRef.current.trim()
      if (accessToken) {
        query.set('accessToken', accessToken)
      }
      lastRequestedSessionKeyRef.current = sessionKey ?? null
      const wsUrl = backendUrl.replace(/^http/, 'ws') + `/ws/chat?${query.toString()}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        hasConnectedOnceRef.current = true
        setShowConnectionIssue(false)
        setSendError('')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            type?: string
            status?: string
            message?: ChatMessage | string
            error?:
              | string
              | {
                  code?: string
                  message?: string
                  paywall?: WsPaywallPayload
                }
            sessionKey?: string
            reason?: string
            previousSessionKey?: string
            result?: { messages?: ChatMessage[] }
            freeMessageLimit?: number
            freeMessagesUsed?: number
            trialEndsAt?: string | null
          }

          // Initial connection message
          if (data.type === 'connected') {
            setConnectionStatus('connected')
            beginConnectionStabilityCheck()
            void refreshChannelStatus(tid)
            if (typeof data.sessionKey === 'string' && data.sessionKey.trim()) {
              const normalizedSessionKey = data.sessionKey.trim()
              const requestedSessionKey = lastRequestedSessionKeyRef.current?.trim() || null
              if (
                requestedSessionKey &&
                normalizedSessionKey !== requestedSessionKey &&
                !sessionMismatchRetryRef.current
              ) {
                sessionMismatchRetryRef.current = true
                const requestedSessionIsPending = isPendingSessionKey(requestedSessionKey)
                syncSessionKey(tid, requestedSessionKey, null, {
                  persist: !requestedSessionIsPending,
                  storeInLocalStorage: !requestedSessionIsPending,
                })
                if (!requestedSessionIsPending) {
                  updateSessionInUrl(requestedSessionKey)
                }
                connectWebSocket(tid, requestedSessionKey)
                return
              }
              sessionMismatchRetryRef.current = false
              const sessionIsPending = isPendingSessionKey(normalizedSessionKey)
              syncSessionKey(tid, normalizedSessionKey, null, {
                persist: !sessionIsPending,
                storeInLocalStorage: !sessionIsPending,
              })
              if (!sessionIsPending) {
                updateSessionInUrl(normalizedSessionKey)
              }
              void loadSessionHistory(tid, normalizedSessionKey)
              startHistoryPolling(tid, normalizedSessionKey)
            } else {
              sessionMismatchRetryRef.current = false
            }
            setSetupPhase('ready')
            if (!hasHydratedSessionsOnConnectRef.current) {
              hasHydratedSessionsOnConnectRef.current = true
              void loadSessions(tid, { silent: true })
            }
            stopPolling()
            setTimeout(() => setSetupPhase(null), 600)
            return
          }

          if (data.type === 'chat.session') {
            if (typeof data.sessionKey === 'string' && data.sessionKey.trim()) {
              const normalizedSessionKey = data.sessionKey.trim()
              const activeKey = activeSessionKeyRef.current || DEFAULT_CHAT_SESSION_KEY
              const previousSessionKey =
                typeof data.previousSessionKey === 'string' && data.previousSessionKey.trim()
                  ? data.previousSessionKey.trim()
                  : null
              const shouldApplySelection =
                data.reason === 'selected' ||
                normalizedSessionKey === activeKey ||
                previousSessionKey === activeKey

              if (shouldApplySelection) {
                const sessionIsPending = isPendingSessionKey(normalizedSessionKey)
                syncSessionKey(tid, normalizedSessionKey, null, {
                  persist: !sessionIsPending,
                  storeInLocalStorage: !sessionIsPending,
                })
                if (!sessionIsPending) {
                  updateSessionInUrl(normalizedSessionKey)
                }
                void loadSessionHistory(tid, normalizedSessionKey)
                startHistoryPolling(tid, normalizedSessionKey)
              } else {
                if (!isPendingSessionKey(normalizedSessionKey)) {
                  persistSession(tid, normalizedSessionKey)
                }
              }
            }
            return
          }

          if (data.type === 'chat.status') {
            backendTypingRef.current = data.status === 'typing'
            syncTypingIndicator()
            scrollToBottom()
            return
          }

          if (data.type === 'billing.paywall') {
            handleBackendPaywallPayload({
              status: data.status,
              freeMessageLimit: data.freeMessageLimit,
              freeMessagesUsed: data.freeMessagesUsed,
              trialEndsAt: data.trialEndsAt,
            })
            return
          }

          // Assistant response
          if (data.type === 'chat.message' && data.message && typeof data.message === 'object') {
            resolvePendingResponse()
            const assistantMessage = data.message as ChatMessage
            const targetSessionKey =
              typeof data.sessionKey === 'string' && data.sessionKey.trim()
                ? data.sessionKey.trim()
                : activeSessionKeyRef.current || DEFAULT_CHAT_SESSION_KEY
            persistMessage(tid, targetSessionKey, assistantMessage)
            touchSessionActivity(tid, targetSessionKey)
            if (targetSessionKey === (activeSessionKeyRef.current || DEFAULT_CHAT_SESSION_KEY)) {
              setMessages((prev) => dedupeAndSortMessages([...prev, assistantMessage]))
              scrollToBottom({ behavior: 'smooth' })
            }
            void refreshChannelStatus(tid)
            return
          }

          // Error from server
          if (data.error) {
            resolvePendingResponse()
            const errorRecord =
              typeof data.error === 'object' && data.error !== null
                ? (data.error as { code?: string; message?: string; paywall?: WsPaywallPayload })
                : null
            const errorCode = typeof errorRecord?.code === 'string' ? errorRecord.code.trim() : ''
            const errMsg =
              typeof data.error === 'string'
                ? data.error
                : errorRecord?.message ?? JSON.stringify(data.error)
            const paywallPayload = errorRecord?.paywall
            if (paywallPayload) {
              handleBackendPaywallPayload(paywallPayload)
            }

            if (errorCode === 'TENANT_TERMINATED') {
              setPaywallStatus('deleted')
              setPaywallCountdownEndsAtMs(null)
              setPaywallRemainingMs(0)
              setPaywallModal('deleted')
              setSendError(errMsg || 'Trial ended. Your OpenClaw instance was deleted.')
              return
            }

            if (errorCode === 'PAYWALL_REQUIRED') {
              if (paywallStatusRef.current !== 'deleted' && paywallStatusRef.current !== 'upgraded') {
                setPaywallModal('initial')
              }
              setSendError(errMsg || 'Upgrade to keep your OpenClaw running.')
              return
            }
            if (errorCode === 'TENANT_SUSPENDED') {
              if (paywallStatusRef.current !== 'deleted') {
                setPaywallModal('later-upgrade')
              }
              setSendError(errMsg || 'Billing is inactive. Upgrade to continue.')
              return
            }

            if (isGatewayUnavailableError(errMsg)) {
              setSendError(toChatAlertMessage(errMsg))
              setShowConnectionIssue(true)
              return
            }
            const systemMessage: ChatMessage = {
              role: 'system',
              content: `Error: ${toChatAlertMessage(errMsg)}`,
              timestamp: new Date().toISOString(),
            }
            const targetSessionKey =
              typeof data.sessionKey === 'string' && data.sessionKey.trim()
                ? data.sessionKey.trim()
                : activeSessionKeyRef.current || DEFAULT_CHAT_SESSION_KEY
            persistMessage(tid, targetSessionKey, systemMessage)
            touchSessionActivity(tid, targetSessionKey)
            if (targetSessionKey === (activeSessionKeyRef.current || DEFAULT_CHAT_SESSION_KEY)) {
              setMessages((prev) => dedupeAndSortMessages([...prev, systemMessage]))
              scrollToBottom({ behavior: 'smooth' })
            }
            void refreshChannelStatus(tid)
          }
        } catch {
          // ignore unparseable messages
        }
      }

      ws.onclose = () => {
        resetTypingState()
        resetConnectionStability()
        if (isUnmountingRef.current || paywallStatusRef.current === 'deleted') {
          setConnectionStatus('disconnected')
          return
        }
        // Silently reconnect in the background — never block the UI.
        const currentPhase = setupPhaseRef.current
        const retryDelay = currentPhase && currentPhase !== 'ready' ? 15000 : 5000
        setConnectionStatus('connecting')
        wsRetryRef.current = setTimeout(() => {
          connectWebSocket(tid, activeSessionKeyRef.current ?? undefined)
        }, retryDelay)
      }

      ws.onerror = () => {
        resetTypingState()
        resetConnectionStability()
        // Keep reconnecting silently — errors surface only when user sends.
        setConnectionStatus('connecting')
      }
    },
    [
      loadSessionHistory,
      loadSessions,
      beginConnectionStabilityCheck,
      handleBackendPaywallPayload,
      refreshChannelStatus,
      persistMessage,
      resetConnectionStability,
      resetTypingState,
      resolvePendingResponse,
      scrollToBottom,
      setShowConnectionIssue,
      stopPolling,
      syncSessionKey,
      syncTypingIndicator,
      touchSessionActivity,
      updateSessionInUrl,
      startHistoryPolling,
    ],
  )

  // Skip setup and connect immediately.
  const skipSetup = useCallback(() => {
    stopPolling()
    setSetupPhase(null)
    if (tenantId) {
      connectWebSocket(tenantId, activeSessionKeyRef.current ?? undefined)
    }
  }, [tenantId, connectWebSocket, stopPolling])

  // Poll instance status and progress through setup phases
  const startSetupPolling = useCallback(
    (tid: string) => {
      const backendUrl = getBackendUrl()
      setSetupPhase('checking')
      setSetupStartedAt(Date.now())
      setSetupTimedOut(false)

      let wsAttempted = false

      const poll = async () => {
        try {
          const headers = await buildTenantRequestHeaders(tid)
          const res = await fetch(`${backendUrl}/api/v1/daemons/${tid}/status`, {
            headers,
          })

          if (!res.ok) {
            // Daemon might not exist yet — keep as provisioning
            setSetupPhase('provisioning')
            return
          }

          const data = (await res.json()) as {
            daemon?: { runtimeMode?: string }
            instance?: { instanceState?: string; instanceId?: string; setupComplete?: boolean }
          }

          const instanceState = data.instance?.instanceState
          const setupComplete = data.instance?.setupComplete === true

          if (!instanceState || instanceState === 'new') {
            setSetupPhase('provisioning')
          } else if (instanceState === 'active') {
            if (!setupComplete) {
              setSetupPhase('installing')
            } else if (!wsAttempted) {
              setSetupPhase('installing')
              // Mark immediately so repeated poll ticks don't queue duplicate timers.
              wsAttempted = true
              // Give the daemon a short warm-up window, then connect. If it is not
              // ready yet, the WebSocket onclose retry loop handles retries.
              wsInitialConnectTimeoutRef.current = setTimeout(() => {
                setSetupPhase('starting')
                connectWebSocket(tid, activeSessionKeyRef.current ?? undefined)
                wsInitialConnectTimeoutRef.current = null
              }, 4000)
            }
          } else {
            setSetupPhase('starting')
          }
        } catch {
          // Network error — keep polling
        }
      }

      // Initial check
      void poll()

      // Poll every 8 seconds
      pollRef.current = setInterval(poll, 8000)

      // Timeout after 10 minutes
      setTimeout(() => {
        setSetupTimedOut(true)
      }, 600000)
    },
    [buildTenantRequestHeaders, connectWebSocket, stopPolling],
  )

  // Use a ref for router to avoid re-triggering the effect on every render
  const routerRef = useRef(router)
  routerRef.current = router

  const redirectToSignIn = useCallback(() => {
    const currentPath = typeof window === 'undefined'
      ? '/chat'
      : `${window.location.pathname}${window.location.search}`
    routerRef.current.replace(buildSignInPath(currentPath))
  }, [])

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) {
      return
    }

    try {
      setIsSigningOut(true)
      const supabase = getSupabaseAuthClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Failed to sign out', error)
      }
    } catch (error) {
      console.error('Failed to sign out', error)
    } finally {
      router.replace('/signin')
    }
  }, [isSigningOut, router])

  useEffect(() => {
    let unsubscribe = () => {}
    try {
      const supabase = getSupabaseAuthClient()
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        accessTokenRef.current = session?.access_token?.trim() ?? ''
      })
      unsubscribe = () => {
        data.subscription.unsubscribe()
      }
    } catch {
      accessTokenRef.current = ''
    }

    return () => {
      unsubscribe()
    }
  }, [])

  const handleOpenOpenClawUi = useCallback(async () => {
    if (!tenantId.trim() || isOpeningOpenClawUi) {
      return
    }

    const openedWindow = window.open('about:blank', '_blank')
    if (!openedWindow) {
      setSendError('Popup blocked. Allow popups to open OpenClaw in a new tab.')
      return
    }
    try {
      openedWindow.opener = null
      openedWindow.document.title = 'Opening OpenClaw...'
    } catch {
      // Ignore cross-window assignment errors.
    }

    setIsOpeningOpenClawUi(true)
    try {
      const session = await getRecoveredSupabaseSession({ timeoutMs: 2_500 })
      const accessToken = session?.access_token?.trim() ?? ''
      if (!accessToken) {
        if (!openedWindow.closed) {
          openedWindow.close()
        }
        redirectToSignIn()
        return
      }

      const response = await fetch('/api/openclaw/launch', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      let payload: unknown = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      const payloadRecord =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : null
      const launchRecord =
        payloadRecord?.launch && typeof payloadRecord.launch === 'object' && !Array.isArray(payloadRecord.launch)
          ? (payloadRecord.launch as Record<string, unknown>)
          : null
      const message =
        typeof payloadRecord?.message === 'string' && payloadRecord.message.trim()
          ? payloadRecord.message.trim()
          : null

      if (!response.ok) {
        throw new Error(message ?? 'Unable to open OpenClaw right now.')
      }

      const launchUrl =
        typeof launchRecord?.url === 'string' && launchRecord.url.trim()
          ? launchRecord.url.trim()
          : null

      if (!launchUrl) {
        throw new Error('Launch URL is missing. Please try again.')
      }

      if (openedWindow.closed) {
        throw new Error('Launch tab was closed before OpenClaw could load.')
      }
      openedWindow.location.replace(launchUrl)
    } catch (error) {
      if (!openedWindow.closed) {
        openedWindow.close()
      }
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Unable to open OpenClaw right now.'
      setSendError(message)
    } finally {
      setIsOpeningOpenClawUi(false)
    }
  }, [isOpeningOpenClawUi, redirectToSignIn, tenantId])

  useEffect(() => {
    isUnmountingRef.current = false
    hasHydratedSessionsOnConnectRef.current = false
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          redirectToSignIn()
          return
        }
        const complete = await isOnboardingComplete(session, { backfillFromProvisionedTenant: true })
        if (!complete) {
          router.replace('/dashboard')
          return
        }

        const userMetadata = (session.user.user_metadata ?? {}) as Record<string, unknown>
        const fullName = typeof userMetadata.full_name === 'string' ? userMetadata.full_name.trim() : ''
        const fallbackName = typeof userMetadata.name === 'string' ? userMetadata.name.trim() : ''
        const email = session.user.email?.trim() ?? ''
        const displayName = fullName || fallbackName || email || 'Account'
        const pfpWebAvatar = buildPfpWebUrl(email)
        const metadataAvatar =
          typeof userMetadata.avatar_url === 'string' && userMetadata.avatar_url.trim()
            ? userMetadata.avatar_url.trim()
            : typeof userMetadata.picture === 'string' && userMetadata.picture.trim()
              ? userMetadata.picture.trim()
              : null

        setProfileName(displayName)
        setProfileEmail(email)
        setProfileInitial(buildProfileInitial(displayName || email))
        setProfileImageUrl(pfpWebAvatar ?? metadataAvatar)

        const tid = deriveTenantIdFromUserId(session.user.id)
        userIdRef.current = session.user.id
        accessTokenRef.current = session.access_token?.trim() ?? ''

        let persistedSessions: RuntimeSessionSummary[] = []
        try {
          persistedSessions = await loadPersistedSessions(tid)
        } catch (error) {
          console.error('Failed to load persisted sessions during startup', error)
        }

        const persistedActiveSession = persistedSessions.find((sessionItem) => sessionItem.raw.isActive === true)
        const persistedActiveSessionKey = persistedActiveSession?.key?.trim() || null
        const querySessionKeyRaw =
          typeof window === 'undefined'
            ? null
            : new URLSearchParams(window.location.search).get('session')
        const querySessionKey = isSidebarVisibleChatSessionKey(querySessionKeyRaw) ? querySessionKeyRaw.trim() : null
        const storedSessionKey =
          querySessionKey ??
          (() => {
            const stored = readStoredChatSessionKey(tid)
            return isSidebarVisibleChatSessionKey(stored) ? stored : null
          })() ??
          persistedActiveSessionKey
        syncSessionKey(tid, storedSessionKey, persistedActiveSession?.label ?? null)
        if (storedSessionKey) {
          updateSessionInUrl(storedSessionKey)
          void loadSessionHistory(tid, storedSessionKey)
          startHistoryPolling(tid, storedSessionKey)
        }

        if (persistedSessions.length > 0) {
          const fallbackSessionKey = storedSessionKey?.trim() || DEFAULT_CHAT_SESSION_KEY
          setChatSessions(sortSessionsByActivity(mergeRuntimeSessions([], persistedSessions, fallbackSessionKey)))
        }

        hasHydratedSessionsOnConnectRef.current = true
        void loadSessions(tid, { silent: true })

        if (!cancelled) {
          setTenantId(tid)
          setCheckingSession(false)

          // Check if instance exists and what state it's in
          const backendUrl = getBackendUrl()
          try {
            const headers = await buildTenantRequestHeaders(tid)
            const res = await fetch(`${backendUrl}/api/v1/daemons/${tid}/status`, {
              headers,
            })

            if (res.ok) {
              const data = (await res.json()) as {
                daemon?: { runtimeMode?: string; status?: string }
                instance?: { instanceState?: string; setupComplete?: boolean }
              }
              const isInstanceReady = data.instance?.instanceState === 'active' && data.instance?.setupComplete === true

              if (data.daemon?.runtimeMode === 'digitalocean' && !isInstanceReady) {
                startSetupPolling(tid)
                return
              }

              if (data.daemon?.runtimeMode === 'digitalocean' && isInstanceReady) {
                connectWebSocket(tid, storedSessionKey ?? undefined)
                return
              }
            }
          } catch {
            // Status check failed — connect WebSocket directly
          }

          // Default: connect WebSocket directly when no daemon status is available yet.
          connectWebSocket(tid, storedSessionKey ?? undefined)
        }
      } catch {
        redirectToSignIn()
      }
    }

    void loadSession()

    return () => {
      cancelled = true
      isUnmountingRef.current = true
      userIdRef.current = ''
      accessTokenRef.current = ''
      stopPolling()
      stopHistoryPolling()
      clearConnectionStableTimer()
      if (copySessionKeyTimeoutRef.current) {
        clearTimeout(copySessionKeyTimeoutRef.current)
        copySessionKeyTimeoutRef.current = null
      }
      if (channelsPollRef.current) {
        clearInterval(channelsPollRef.current)
        channelsPollRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [
    connectWebSocket,
    loadPersistedSessions,
    loadSessionHistory,
    loadSessions,
    redirectToSignIn,
    startSetupPolling,
    startHistoryPolling,
    clearConnectionStableTimer,
    stopHistoryPolling,
    stopPolling,
    syncSessionKey,
    updateSessionInUrl,
  ])

  useEffect(() => {
    if (checkingSession || !tenantId || typeof window === 'undefined') {
      return
    }

    const applySessionFromUrl = () => {
      const querySessionKey = new URLSearchParams(window.location.search).get('session')
      if (!isSidebarVisibleChatSessionKey(querySessionKey)) {
        return
      }

      const normalized = querySessionKey.trim()
      if (normalized === activeSessionKeyRef.current) {
        return
      }

      const selected = chatSessions.find((session) => session.key === normalized)
      if (!isPendingSessionKey(normalized)) {
        pendingSessionKeysRef.current.clear()
      }
      syncSessionKey(tenantId, normalized, selected?.label ?? null)
      setShowConnectionIssue(false)
      void loadSessionHistory(tenantId, normalized)
      startHistoryPolling(tenantId, normalized)
      if (!sendSessionSelectionRpc(normalized)) {
        connectWebSocket(tenantId, normalized)
      }
    }

    applySessionFromUrl()
    window.addEventListener('popstate', applySessionFromUrl)
    return () => {
      window.removeEventListener('popstate', applySessionFromUrl)
    }
  }, [
    chatSessions,
    checkingSession,
    connectWebSocket,
    loadSessionHistory,
    sendSessionSelectionRpc,
    setShowConnectionIssue,
    startHistoryPolling,
    syncSessionKey,
    tenantId,
  ])

  useEffect(() => {
    if (checkingSession || !tenantId) {
      return
    }

    void refreshChannelStatus(tenantId)

    if (channelsPollRef.current) {
      clearInterval(channelsPollRef.current)
      channelsPollRef.current = null
    }

    channelsPollRef.current = setInterval(() => {
      void refreshChannelStatus(tenantId)
    }, 15_000)

    return () => {
      if (channelsPollRef.current) {
        clearInterval(channelsPollRef.current)
        channelsPollRef.current = null
      }
    }
  }, [checkingSession, refreshChannelStatus, tenantId])

  function handleTemplateChipsPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!showAllComposerTemplates) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const scroller = templateChipsScrollerRef.current
    if (!scroller) return

    templateChipsDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: scroller.scrollLeft,
      moved: false,
    }
  }

  function handleTemplateChipsPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = templateChipsDragRef.current
    if (!state.active || state.pointerId !== event.pointerId) return

    const scroller = templateChipsScrollerRef.current
    if (!scroller) return

    const deltaX = event.clientX - state.startX
    const deltaY = event.clientY - state.startY

    if (!state.moved) {
      const horizontalIntent = Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) + 2
      if (!horizontalIntent) {
        return
      }

      state.moved = true
      if (!scroller.hasPointerCapture(event.pointerId)) {
        scroller.setPointerCapture(event.pointerId)
      }
    }

    if (state.moved) {
      event.preventDefault()
      scroller.scrollLeft = state.startScrollLeft - deltaX
    }
  }

  function handleTemplateChipsPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const state = templateChipsDragRef.current
    if (!state.active || state.pointerId !== event.pointerId) return

    if (state.moved) {
      templateChipsIgnoreClickUntilRef.current = Date.now() + 160
    }

    const scroller = templateChipsScrollerRef.current
    if (scroller?.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId)
    }

    templateChipsDragRef.current = {
      active: false,
      pointerId: -1,
      startX: 0,
      startY: 0,
      startScrollLeft: 0,
      moved: false,
    }
  }

  function applyComposerTemplate(prompt: string) {
    setInput(prompt)
    setShowAllComposerTemplates(false)

    requestAnimationFrame(() => {
      const textarea = inputRef.current
      if (!textarea) return

      textarea.focus()
      textarea.style.height = `${INPUT_MIN_HEIGHT}px`
      textarea.style.height = `${Math.min(textarea.scrollHeight, INPUT_MAX_HEIGHT)}px`
      const cursor = prompt.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  function sendMessage() {
    const trimmed = input.trim()
    if (!trimmed) return
    if (isInstanceDeleted) {
      setSendError('Instance deleted. Redeploy OpenClaw or upgrade to continue.')
      setPaywallModal('deleted')
      return
    }
    if (paywallStatusRef.current === 'not-triggered' && !hasLoadedPaywallState) {
      setSendError('Loading your trial status... try again in a second.')
      return
    }
    if (paywallStatusRef.current === 'not-triggered' && !historyReady) {
      setSendError('Loading your chat... try again in a second.')
      return
    }
    if (
      paywallModal === 'initial' ||
      paywallModal === 'discount' ||
      paywallModal === 'later-upgrade' ||
      paywallModal === 'plan-pricing'
    ) {
      setSendError('Upgrade to keep your OpenClaw running.')
      return
    }
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setSendError('Not connected. Reconnecting...')
      if (tenantId) {
        const reconnectSessionKey = activeSessionKeyRef.current
        connectWebSocket(
          tenantId,
          reconnectSessionKey && !isPendingSessionKey(reconnectSessionKey)
            ? reconnectSessionKey
            : undefined,
        )
      }
      return
    }
    setSendError('')

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    const currentSessionKey = activeSessionKeyRef.current || DEFAULT_CHAT_SESSION_KEY
    if (tenantId && isPendingSessionKey(currentSessionKey)) {
      registerPendingSession(tenantId, currentSessionKey)
      updateSessionInUrl(currentSessionKey)
    }
    setMessages((prev) => dedupeAndSortMessages([...prev, userMessage]))
    persistMessage(tenantId, currentSessionKey, userMessage)
    touchSessionActivity(tenantId, currentSessionKey)

    const currentSession = chatSessions.find((session) => session.key === currentSessionKey)
    const currentLabel = currentSession?.label?.trim() ?? ''
    const shouldAutoLabel =
      currentSessionKey !== DEFAULT_CHAT_SESSION_KEY &&
      (
        !currentLabel ||
        currentLabel === 'Chat' ||
        currentLabel === 'Current session' ||
        currentLabel === 'New session' ||
        currentLabel === 'Session'
      )

    if (tenantId && shouldAutoLabel) {
      const autoLabel = buildSessionLabelFromMessage(trimmed)
      touchSessionActivity(tenantId, currentSessionKey, autoLabel)
      void patchRuntimeSession(tenantId, { key: currentSessionKey, label: autoLabel }).catch(() => undefined)
    }

    beginPendingResponse()
    autoFollowRef.current = true
    scrollToBottom({ force: true, behavior: 'smooth' })

    rpcIdRef.current += 1
    wsRef.current.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: rpcIdRef.current,
        method: 'chat.send',
        params: {
          message: trimmed,
          sessionKey: currentSessionKey,
        },
      }),
    )

    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = `${INPUT_MIN_HEIGHT}px`
    }
    inputRef.current?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  function reconnect() {
    if (tenantId) {
      setSendError('')
      connectWebSocket(tenantId, activeSessionKeyRef.current ?? undefined)
    }
  }

  function selectSession(sessionKey: string) {
    if (!tenantId) return
    const normalized = sessionKey.trim()
    if (!normalized) return

    if (!isPendingSessionKey(normalized)) {
      pendingSessionKeysRef.current.clear()
    }
    const selected = chatSessions.find((session) => session.key === normalized)
    syncSessionKey(tenantId, normalized, selected?.label ?? null)
    updateSessionInUrl(normalized)
    setHistoryReady(false)
    void loadSessionHistory(tenantId, normalized)
    startHistoryPolling(tenantId, normalized)
    setShowNewSessionConfirm(false)
    setMobileSidebarOpen(false)
    setShowConnectionIssue(false)
    if (!sendSessionSelectionRpc(normalized)) {
      connectWebSocket(tenantId, normalized)
    }
  }

  function createNewSession() {
    if (!tenantId) return

    const newSessionKey = buildNewSessionKey()
    const defaultLabel = 'New session'
    pendingSessionKeysRef.current.clear()

    // Immediately persist and activate — no deferred creation.
    syncSessionKey(tenantId, newSessionKey, defaultLabel, {
      persist: true,
      storeInLocalStorage: true,
    })
    updateSessionInUrl(newSessionKey)

    // Add to session list right away so it's visible and active in the sidebar.
    const nowIso = new Date().toISOString()
    setChatSessions((prev) =>
      sortSessionsByActivity([
        {
          key: newSessionKey,
          label: defaultLabel,
          modelId: null,
          updatedAt: nowIso,
          raw: {},
        },
        ...prev,
      ]),
    )

    setHistoryReady(true)
    setMessages([])
    startHistoryPolling(tenantId, newSessionKey)
    setShowNewSessionConfirm(false)
    setMobileSidebarOpen(false)
    setShowConnectionIssue(false)

    // Tell the backend about the new session
    if (!sendSessionSelectionRpc(newSessionKey)) {
      connectWebSocket(tenantId, newSessionKey)
    }
  }

  const sidebarListClassName = 'space-y-0.5 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:hsl(var(--border)/0.78)_transparent] [-ms-overflow-style:auto] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[hsl(var(--border)/0.78)]'

  const renderSidebarSessionRows = (sessions: RuntimeSessionSummary[], emptyStateLabel: string) => {
    if (!sessions.length) {
      return (
        <p className="rounded-md border border-dashed border-border/60 px-2.5 py-2 text-[11px] text-muted-foreground">
          {emptyStateLabel}
        </p>
      )
    }

    return sessions.map((session) => {
      const sessionLabel = formatSessionLabel(session)
      const isActive = activeSessionKey === session.key
      return (
        <button
          key={session.key}
          type="button"
          onClick={() => selectSession(session.key)}
          className={cn(
            'group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 ease-out',
            isActive
              ? 'bg-primary/10 text-foreground'
              : 'text-foreground/80 hover:bg-muted/40',
          )}
          aria-label={`Open ${sessionLabel}`}
        >
          <Circle
            className={cn(
              'h-1.5 w-1.5 shrink-0 fill-current',
              isActive ? 'text-primary' : 'text-transparent',
            )}
          />
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{sessionLabel}</span>
          <span
            role="button"
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation()
              void copySessionKey(session.key)
            }}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 pointer-events-none transition-[opacity,color] duration-150 ease-out hover:text-foreground group-hover:opacity-100 group-hover:pointer-events-auto"
            aria-label={`Copy session ID for ${sessionLabel}`}
            title="Copy session ID"
          >
            {copiedSessionKey === session.key ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </span>
        </button>
      )
    })
  }

  const renderNewSessionAction = () => (
    <div className="px-1.5 pt-1.5">
      {showNewSessionConfirm ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Start a new session? It won&apos;t share context with previous sessions.
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Button variant="default" size="sm" className="h-6 px-2 text-[11px]" onClick={createNewSession}>
              Create
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => setShowNewSessionConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewSessionConfirm(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/70 px-2.5 py-2 text-xs text-muted-foreground transition-colors duration-150 ease-out hover:border-primary/30 hover:bg-muted/20 hover:text-foreground"
        >
          <span className="text-sm leading-none">+</span>
          New session
        </button>
      )}
    </div>
  )

  const conversationsSidebar = (
    <Card className="border-border/70 lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
      <CardContent className="p-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {hasCronSessions ? 'Conversations' : 'Sessions'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (tenantId) void loadSessions(tenantId)
            }}
            disabled={loadingSessions}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
            aria-label="Refresh sessions and cron jobs"
            title="Refresh sessions and cron jobs"
          >
            {loadingSessions ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </button>
        </div>

        {sessionsError && (
          <p className="mx-2 mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive">
            {sessionsError}
          </p>
        )}

        {/* Session list(s) */}
        {hasCronSessions ? (
          <div className="mt-2 grid gap-2 px-2 pb-2 lg:min-h-0 lg:flex-1 lg:grid-rows-2">
            <div className="flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card/35 lg:min-h-0">
              <div className="border-b border-border/60 px-2.5 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sessions</p>
              </div>
              {renderNewSessionAction()}
              <div className={cn(sidebarListClassName, 'max-h-[24svh] p-1.5 lg:min-h-0 lg:flex-1 lg:max-h-none')}>
                {renderSidebarSessionRows(regularChatSessions, 'No direct sessions yet.')}
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card/35 lg:min-h-0">
              <div className="border-b border-border/60 px-2.5 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cron Jobs</p>
              </div>
              <div className={cn(sidebarListClassName, 'max-h-[24svh] p-1.5 lg:min-h-0 lg:flex-1 lg:max-h-none')}>
                {renderSidebarSessionRows(cronChatSessions, 'No cron jobs yet.')}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2 px-2 pb-2 lg:min-h-0 lg:flex-1">
            {renderNewSessionAction()}
            <div className={cn(sidebarListClassName, 'max-h-[56svh] lg:min-h-0 lg:flex-1 lg:max-h-none')}>
              {renderSidebarSessionRows(regularChatSessions, 'No sessions yet.')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const openClawStatusLabel = getOpenClawStatusLabel({
    setupPhase,
    setupTimedOut,
    connectionStatus,
    sendError,
    isConnectionStable,
  })
  const transientSendNotice = getTransientSendNotice(sendError)
  const assistantProgressStatus = formatAssistantProgressStatus(assistantWaitSeconds)
  const liveWhatsApp = useMemo(() => extractWhatsAppLiveIdentity(channelStatusSnapshot), [channelStatusSnapshot])
  const liveTelegram = useMemo(() => extractTelegramLiveIdentity(channelStatusSnapshot), [channelStatusSnapshot])
  const liveWhatsAppDetail = useMemo(() => shortenChannelDetail(liveWhatsApp.detail), [liveWhatsApp.detail])
  const liveTelegramDetail = useMemo(() => shortenChannelDetail(liveTelegram.detail), [liveTelegram.detail])
  const showComposerTemplates = input.trim().length === 0
  const hasConnectedMessagingChannel = liveWhatsApp.status === 'connected' || liveTelegram.status === 'connected'
  const hasChannelSetupInProgress = liveWhatsApp.status !== 'off' || liveTelegram.status !== 'off'
  const shouldShowConnectChannelTemplate =
    showComposerTemplates && channelStatusSnapshot !== null && !hasConnectedMessagingChannel
  const connectChannelTemplateLabel = hasChannelSetupInProgress ? 'Finish setup' : 'Connect channel'
  const hasMoreComposerTemplates = COMPOSER_PROMPT_TEMPLATES.length > COMPOSER_TEMPLATE_COLLAPSED_COUNT
  const visibleComposerTemplates = showAllComposerTemplates
    ? COMPOSER_PROMPT_TEMPLATES
    : COMPOSER_PROMPT_TEMPLATES.slice(0, COMPOSER_TEMPLATE_COLLAPSED_COUNT)
  const isCountdownActive = paywallStatus === 'countdown' && typeof paywallRemainingMs === 'number' && paywallRemainingMs > 0
  const isFinalHourWarning = isCountdownActive && paywallRemainingMs <= PAYWALL_FINAL_HOUR_MS
  const countdownLabel = isCountdownActive ? formatCountdown(paywallRemainingMs) : '00:00:00'
  const subscriptionWarningRemainingMs =
    subscriptionDeletionWarning === null ? null : Math.max(0, subscriptionDeletionWarning.endsAtMs - Date.now())
  const subscriptionWarningDaysRemaining =
    subscriptionWarningRemainingMs === null ? null : Math.max(1, Math.ceil(subscriptionWarningRemainingMs / (24 * 60 * 60 * 1000)))
  const subscriptionWarningReasonLabel =
    subscriptionDeletionWarning?.reason === 'grace'
      ? `Payment grace active. You have ${subscriptionWarningDaysRemaining ?? 0} day${subscriptionWarningDaysRemaining === 1 ? '' : 's'} to pay before deletion.`
      : subscriptionDeletionWarning?.reason === 'scheduled-cancel'
        ? `Subscription canceled. This instance will be deleted in ${subscriptionWarningDaysRemaining ?? 0} day${subscriptionWarningDaysRemaining === 1 ? '' : 's'}.`
        : ''
  const shouldShowSubscriptionWarningBanner =
    !isCountdownActive && subscriptionWarningRemainingMs !== null && subscriptionWarningRemainingMs > 0
  const isInstanceDeleted = paywallStatus === 'deleted'
  const isComposerDisabled = isInstanceDeleted
  const shouldShowPaywallOverlay = paywallModal !== 'none'
  const activePlanBadgeLabel =
    activeBillingPlan === 'PRO_YEARLY'
      ? 'Pro yearly'
      : activeBillingPlan === 'PRO_MONTHLY'
        ? 'Pro monthly'
        : activeBillingPlan === 'FREE'
          ? 'Free plan'
          : hasResolvedBillingPlan
            ? 'Free plan'
            : 'Plan loading'
  const activePlanBadgeClassName =
    activeBillingPlan === null && !hasResolvedBillingPlan
      ? 'border-border/70 bg-muted/50 text-muted-foreground hover:bg-muted'
      : activeBillingPlan === 'FREE'
        ? 'border-slate-300/70 bg-slate-500/10 text-slate-700 hover:bg-slate-500/15'
        : 'border-emerald-300/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15'

  // ─── Loading state ─────────────────────────────────────────────────

  if (checkingSession) {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-background">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </p>
      </div>
    )
  }

  // ─── Setup progress state ─────────────────────────────────────────

  if (setupPhase && setupPhase !== 'ready') {
    const steps: SetupStep[] = [
      {
        label: 'Launching instance',
        description: 'Spinning up your dedicated cloud server',
        status:
          setupPhase === 'checking' || setupPhase === 'provisioning'
            ? 'active'
            : 'done',
      },
      {
        label: 'Installing OpenClaw',
        description: 'Installing dependencies and configuring your assistant',
        status:
          setupPhase === 'installing'
            ? 'active'
            : setupPhase === 'starting'
              ? 'done'
              : 'pending',
      },
      {
        label: 'Starting your assistant',
        description: 'Connecting to the OpenClaw gateway',
        status:
          setupPhase === 'starting'
            ? 'active'
            : 'pending',
      },
    ]

    return (
      <SetupProgressView
        steps={steps}
        startedAt={setupStartedAt}
        timedOut={setupTimedOut}
        onRetry={() => {
          if (tenantId) {
            stopPolling()
            startSetupPolling(tenantId)
          }
        }}
        onSkip={skipSetup}
      />
    )
  }

  // ─── Chat interface ───────────────────────────────────────────────

  return (
    <div className="relative min-h-[100svh] bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.045),transparent_45%)]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />

      <div className="relative z-10 flex min-h-[100svh] flex-col">
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          {isCountdownActive ? (
            <div
              className={cn(
                'border-b',
                isFinalHourWarning
                  ? 'border-destructive/35 bg-destructive/10'
                  : 'border-amber-200/70 bg-amber-500/10',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-2 sm:px-6">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-semibold text-foreground sm:text-sm">
                    {isFinalHourWarning ? (
                      <TriangleAlert className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock3 className="h-4 w-4 text-amber-600" />
                    )}
                    Your OpenClaw instance deletes in {countdownLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
                    We can only keep private instances running with an active plan.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-[11px] sm:h-8 sm:px-3 sm:text-xs"
                    onClick={() => setPaywallModal('later-upgrade')}
                  >
                    Upgrade
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] sm:h-8 sm:px-3 sm:text-xs"
                    onClick={() => setPaywallModal('why-limit')}
                  >
                    Why this timer?
                  </Button>
                </div>
              </div>
            </div>
          ) : shouldShowSubscriptionWarningBanner ? (
            <div className="border-b border-amber-200/70 bg-amber-500/10">
              <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-2 sm:px-6">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-semibold text-foreground sm:text-sm">
                    <TriangleAlert className="h-4 w-4 text-amber-700" />
                    {subscriptionWarningReasonLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
                    Keep billing active to prevent runtime deletion.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-[11px] sm:h-8 sm:px-3 sm:text-xs"
                    onClick={() => setPaywallModal('later-upgrade')}
                  >
                    Update billing
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex flex-1 items-center gap-2">
              <Toggle
                pressed={showSessionsSidebar}
                onPressedChange={setShowSessionsSidebar}
                variant="outline"
                size="sm"
                className="hidden h-9 w-9 rounded-md border-border/70 bg-card p-0 text-muted-foreground transition-all duration-200 ease-out hover:bg-muted/40 hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-muted-foreground data-[state=on]:hover:bg-muted/40 data-[state=on]:hover:text-foreground motion-reduce:transition-none lg:inline-flex"
                aria-label={showSessionsSidebar ? 'Collapse sessions sidebar' : 'Expand sessions sidebar'}
                title={showSessionsSidebar ? 'Collapse sessions sidebar' : 'Expand sessions sidebar'}
              >
                <span className="relative h-4 w-4">
                  <PanelLeftClose
                    className={cn(
                      'absolute inset-0 h-4 w-4 transition-all duration-200 ease-out motion-reduce:transition-none',
                      showSessionsSidebar ? 'rotate-0 scale-100 opacity-100' : '-rotate-12 scale-75 opacity-0',
                    )}
                  />
                  <PanelLeftOpen
                    className={cn(
                      'absolute inset-0 h-4 w-4 transition-all duration-200 ease-out motion-reduce:transition-none',
                      showSessionsSidebar ? 'rotate-12 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100',
                    )}
                  />
                </span>
              </Toggle>
              <span className="inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-card p-0.5 sm:h-10 sm:w-10">
                <Image
                  src="/logo.png"
                  alt="ClawPilot"
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground sm:text-base">Agent Main</p>
                  {activePlanBadgeLabel ? (
                    <button
                      type="button"
                      onClick={openPlanPricingModal}
                      className={cn(
                        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        activePlanBadgeClassName,
                      )}
                    >
                      {activePlanBadgeLabel}
                    </button>
                  ) : null}
                </div>
                {channelStatusSnapshot ? (
                  <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
                    <Link
                      href="/dashboard/channels"
                      onClick={(event) => handlePaywallNavigationInterception(event, '/dashboard/channels')}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                      title="Open channel settings"
                    >
                      <ChannelHealthPill label="WA" status={liveWhatsApp.status} detail={liveWhatsAppDetail} />
                    </Link>
                    <Link
                      href="/dashboard/channels"
                      onClick={(event) => handlePaywallNavigationInterception(event, '/dashboard/channels')}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                      title="Open channel settings"
                    >
                      <ChannelHealthPill label="TG" status={liveTelegram.status} detail={liveTelegramDetail} />
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs"
                type="button"
                onClick={handleOpenOpenClawUi}
                disabled={!tenantId || isOpeningOpenClawUi}
              >
                {isOpeningOpenClawUi ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                )}
                Open OpenClaw UI
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={kickStartPaywallTest}
              >
                Test paywall
              </Button>
              <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-card transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
                    aria-label="Open conversations"
                    title="Open conversations"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[90vw] max-w-sm overflow-y-auto p-3 sm:p-4">
                  <div className="mt-6">{conversationsSidebar}</div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Open account menu"
                  >
                    <Avatar className="h-8 w-8">
                      {profileImageUrl ? <AvatarImage src={profileImageUrl} alt={profileName} /> : null}
                      <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                        {profileInitial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="py-2">
                    <p className="truncate text-xs font-medium text-foreground">{profileName}</p>
                    {profileEmail ? <p className="truncate text-[11px] text-muted-foreground">{profileEmail}</p> : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/settings"
                      onClick={(event) => handlePaywallNavigationInterception(event, '/dashboard/settings')}
                    >
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/settings/skills"
                      onClick={(event) => handlePaywallNavigationInterception(event, '/dashboard/settings/skills')}
                    >
                      Skills & Workspace
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      void handleSignOut()
                    }}
                    disabled={isSigningOut}
                    className="text-destructive focus:text-destructive"
                  >
                    {isSigningOut ? 'Signing out...' : 'Sign out'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-40 pt-4 sm:px-6 sm:pt-5">
          <div
            className={cn(
              'relative w-full transition-[padding-left] duration-300 ease-out motion-reduce:transition-none',
              showSessionsSidebar ? 'lg:pl-[284px]' : 'lg:pl-0',
            )}
          >
            <aside
              className={cn(
                'pointer-events-none hidden lg:fixed lg:left-6 lg:top-20 lg:bottom-20 lg:z-30 lg:block lg:w-[260px] lg:transition-all lg:duration-300 lg:ease-out lg:motion-reduce:transition-none',
                showSessionsSidebar ? 'lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto' : 'lg:-translate-x-6 lg:opacity-0',
              )}
            >
              <div
                className={cn(
                  'h-full transition-transform duration-300 ease-out motion-reduce:transition-none',
                  showSessionsSidebar ? 'scale-100' : 'scale-[0.985]',
                )}
              >
                {conversationsSidebar}
              </div>
            </aside>

            <section className="min-w-0">
              <ChatTimeline
                assistantProgressStatus={assistantProgressStatus}
                historyReady={historyReady}
                isAssistantTyping={isAssistantTyping}
                messages={messages}
                openClawStatusLabel={openClawStatusLabel}
              />
            </section>
          </div>
        </main>
      </div>

      <Link
        href="/dashboard/channels"
        onClick={(event) => handlePaywallNavigationInterception(event, '/dashboard/channels')}
        className="group fixed bottom-[5.6rem] right-3 z-40 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/95 p-1.5 shadow-md shadow-black/5 backdrop-blur transition-colors hover:border-primary/30 hover:bg-muted/40 sm:bottom-4 sm:right-4"
        aria-label="Open channel integrations"
        title="Configure channels"
      >
        <div className="inline-flex items-center -space-x-1">
          {CHANNEL_INTEGRATION_FAB_ICONS.map((icon) => (
            <span
              key={icon.src}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background"
            >
              <Image src={icon.src} alt={icon.alt} width={18} height={18} className="h-[18px] w-[18px] object-contain" />
            </span>
          ))}
        </div>
      </Link>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-background via-background/90 to-transparent" />
      <div className="fixed inset-x-0 bottom-0 z-30 pb-4 sm:pb-6">
        <div className="w-full px-4 sm:px-6">
          <div
            className={cn(
              'transition-[padding-left] duration-300 ease-out motion-reduce:transition-none',
              showSessionsSidebar ? 'lg:pl-[284px]' : 'lg:pl-0',
            )}
          >
            <div className="w-full px-0 sm:px-2">
              <div className="relative mx-auto w-full max-w-3xl">
                {/* Scroll to bottom FAB */}
                {showScrollToBottom && (
                  <div className="pointer-events-auto mb-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => scrollToBottom({ force: true, behavior: 'smooth' })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-card/95 shadow-md backdrop-blur transition-all hover:bg-muted/60 active:scale-95"
                      aria-label="Scroll to bottom"
                    >
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
                {sendError ? (
                  <div className="pointer-events-auto mb-2 px-1">
                    {transientSendNotice ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/90 px-3 py-2 text-xs text-muted-foreground sm:text-sm">
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                        <p className="min-w-0 flex-1 truncate sm:whitespace-normal">{transientSendNotice}</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:text-sm">
                        <p className="min-w-0 flex-1 truncate sm:whitespace-normal">{sendError}</p>
                        <button
                          type="button"
                          onClick={reconnect}
                          className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
                <div className="pointer-events-none absolute inset-x-6 bottom-1 h-12 rounded-full bg-foreground/10 blur-2xl" />
                <div className="pointer-events-auto relative rounded-[28px] border border-border/80 bg-card/95 p-2.5 backdrop-blur transition focus-within:border-primary/30">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isComposerDisabled ? 'Instance deleted. Redeploy or upgrade to continue.' : 'Message OpenClaw...'}
                      rows={1}
                      className="flex-1 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2.5 text-[14px] leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
                      disabled={isComposerDisabled}
                      style={{ minHeight: `${INPUT_MIN_HEIGHT}px`, maxHeight: `${INPUT_MAX_HEIGHT}px` }}
                      onInput={(event) => {
                        const target = event.target as HTMLTextAreaElement
                        target.style.height = `${INPUT_MIN_HEIGHT}px`
                        target.style.height = `${Math.min(target.scrollHeight, INPUT_MAX_HEIGHT)}px`
                      }}
                    />
                    <Button
                      size="icon"
                      className="mb-1 h-9 w-9 shrink-0 rounded-full"
                      onClick={sendMessage}
                      disabled={isComposerDisabled || !input.trim()}
                      aria-label="Send message"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {showComposerTemplates ? (
                  <div className="pointer-events-auto mt-2 px-1">
                    <div
                      ref={templateChipsScrollerRef}
                      onPointerDown={handleTemplateChipsPointerDown}
                      onPointerMove={handleTemplateChipsPointerMove}
                      onPointerUp={handleTemplateChipsPointerEnd}
                      onPointerCancel={handleTemplateChipsPointerEnd}
                      className={cn(
                        'flex items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                        showAllComposerTemplates && 'touch-pan-x select-none cursor-grab active:cursor-grabbing',
                      )}
                    >
                      {shouldShowConnectChannelTemplate ? (
                        <Link
                          href="/dashboard/channels"
                          onClick={(event) => {
                            if (Date.now() < templateChipsIgnoreClickUntilRef.current) {
                              event.preventDefault()
                              return
                            }
                            handlePaywallNavigationInterception(event, '/dashboard/channels')
                          }}
                          className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary shadow-sm transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          title={
                            hasChannelSetupInProgress
                              ? 'Finish pairing to deliver scheduled tasks.'
                              : 'Recurring tasks deliver through connected channels.'
                          }
                        >
                          {connectChannelTemplateLabel}
                        </Link>
                      ) : null}
                      {visibleComposerTemplates.map((template) => {
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={(event) => {
                              if (Date.now() < templateChipsIgnoreClickUntilRef.current) {
                                event.preventDefault()
                                return
                              }
                              applyComposerTemplate(template.prompt)
                            }}
                            className="shrink-0 rounded-full border border-border/75 bg-card/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            title={template.prompt}
                          >
                            {template.label}
                          </button>
                        )
                      })}
                      {hasMoreComposerTemplates ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            if (Date.now() < templateChipsIgnoreClickUntilRef.current) {
                              event.preventDefault()
                              return
                            }
                            setShowAllComposerTemplates((current) => !current)
                          }}
                          className="shrink-0 rounded-full border border-border/75 bg-card/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {showAllComposerTemplates ? 'Fewer' : 'More'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {shouldShowPaywallOverlay ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            onClick={closePaywallModal}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border/80 bg-card p-5 shadow-2xl shadow-black/10 sm:p-6">
            {paywallModal !== 'deleted' ? (
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={closePaywallModal}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {paywallModal === 'initial' ? (
              <div>
                <p className="text-xl font-semibold text-foreground">Keep your OpenClaw running</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Your private OpenClaw instance is running in the cloud. Hosting it costs real servers, so continuing requires an upgrade.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPaywallPlan('monthly')}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors sm:p-5',
                      selectedPaywallPlan === 'monthly'
                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/70 bg-background/60 hover:border-border',
                    )}
                    aria-pressed={selectedPaywallPlan === 'monthly'}
                  >
                    <p className={cn('text-xs font-medium uppercase tracking-wide', selectedPaywallPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground')}>
                      Monthly
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatUsd(PAYWALL_MONTHLY_PRICE_USD)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">/mo</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaywallPlan('yearly')}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors sm:p-5',
                      selectedPaywallPlan === 'yearly'
                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/70 bg-background/60 hover:border-border',
                    )}
                    aria-pressed={selectedPaywallPlan === 'yearly'}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-xs font-medium uppercase tracking-wide', selectedPaywallPlan === 'yearly' ? 'text-primary' : 'text-muted-foreground')}>
                        Yearly
                      </p>
                      <span className="rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Save 20%
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatUsd(PAYWALL_YEARLY_PRICE_USD)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">/year</p>
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Choose monthly or yearly. Both are under $1/day.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  OpenClaw is free. You pay for secure managed hosting (no hardware to buy or manage) and a simpler UI.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button
                    onClick={() => {
                      void activateFrontendUpgrade({ plan: selectedPaywallPlan })
                    }}
                    disabled={isCheckoutRedirecting}
                  >
                    {isCheckoutRedirecting
                      ? 'Redirecting...'
                      : `Upgrade (${selectedPaywallPlan === 'yearly' ? 'Yearly' : 'Monthly'})`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPaywallPlan('monthly')
                      setPaywallModal('discount')
                    }}
                  >
                    Not now
                  </Button>
                </div>
              </div>
            ) : null}

            {paywallModal === 'discount' ? (
              <div>
                <p className="text-xl font-semibold text-foreground">Before you go: 25% off (one-time deal)</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Looks like you&apos;re about to go, and we don&apos;t want to let you go.
                  Take 25% off from us as a one-time deal on your first month.
                </p>
                <div className="mt-4">
                  <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 sm:p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">Monthly (first month)</p>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <p
                        className={cn(
                          'text-2xl font-semibold transition-colors',
                          discountAnimationPhase === 'initial'
                            ? 'text-foreground'
                            : 'text-muted-foreground line-through',
                        )}
                      >
                        {formatUsd(PAYWALL_MONTHLY_PRICE_USD)}/mo
                      </p>
                      {discountAnimationPhase === 'counting' || discountAnimationPhase === 'done' ? (
                        <>
                          <p className="pb-0.5 text-xs text-muted-foreground">down to</p>
                          <p className="text-2xl font-semibold text-emerald-600">
                            {formatUsd(discountAnimatedPriceUsd)}
                          </p>
                          <p className="pb-0.5 text-sm text-muted-foreground">/mo</p>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {discountAnimationPhase === 'counting'
                        ? 'Dropping your first-month price...'
                        : isDiscountAnimating
                          ? 'Applying one-time 25% off...'
                          : 'One-time 25% off first month.'}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  OpenClaw is free. You pay for secure managed hosting (no hardware to buy or manage) and a simpler UI.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button
                    onClick={() => {
                      setSelectedPaywallPlan('monthly')
                      void activateFrontendUpgrade({ plan: 'monthly', applyDiscount: true })
                    }}
                    disabled={isCheckoutRedirecting}
                  >
                    {isCheckoutRedirecting ? 'Redirecting...' : 'Claim 25% off'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void startBackendManagedPaywallCountdown({ showNote: true, keepDiscountForHeadsUp: true })
                    }}
                  >
                    No thanks, start 3-min timer
                  </Button>
                </div>
              </div>
            ) : null}

            {paywallModal === 'later-upgrade' ? (
              <div>
                <p className="text-xl font-semibold text-foreground">Upgrade to keep your OpenClaw running</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Upgrade to keep your private OpenClaw instance online.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPaywallPlan('monthly')}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors sm:p-5',
                      selectedPaywallPlan === 'monthly'
                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/70 bg-background/60 hover:border-border',
                    )}
                    aria-pressed={selectedPaywallPlan === 'monthly'}
                  >
                    <p className={cn('text-xs font-medium uppercase tracking-wide', selectedPaywallPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground')}>
                      Monthly
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatUsd(PAYWALL_MONTHLY_PRICE_USD)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">/mo</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaywallPlan('yearly')}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors sm:p-5',
                      selectedPaywallPlan === 'yearly'
                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/70 bg-background/60 hover:border-border',
                    )}
                    aria-pressed={selectedPaywallPlan === 'yearly'}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-xs font-medium uppercase tracking-wide', selectedPaywallPlan === 'yearly' ? 'text-primary' : 'text-muted-foreground')}>
                        Yearly
                      </p>
                      <span className="rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Save 20%
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatUsd(PAYWALL_YEARLY_PRICE_USD)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">/year</p>
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Choose monthly or yearly. Both are under $1/day.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  OpenClaw is free. You pay for secure managed hosting (no hardware to buy or manage) and a simpler UI.
                </p>
                <div className="mt-5">
                  <Button
                    className="w-full"
                    onClick={() => {
                      void activateFrontendUpgrade({ plan: selectedPaywallPlan })
                    }}
                    disabled={isCheckoutRedirecting}
                  >
                    {isCheckoutRedirecting
                      ? 'Redirecting...'
                      : `Upgrade (${selectedPaywallPlan === 'yearly' ? 'Yearly' : 'Monthly'})`}
                  </Button>
                </div>
              </div>
            ) : null}

            {paywallModal === 'plan-pricing' ? (
              <div>
                <p className="text-xl font-semibold text-foreground">Plan pricing</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Managed hosting pricing.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeBillingPlan === 'PRO_YEARLY') return
                      setSelectedPaywallPlan('monthly')
                    }}
                    disabled={activeBillingPlan === 'PRO_YEARLY'}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors sm:p-5 disabled:cursor-not-allowed disabled:opacity-60',
                      selectedPaywallPlan === 'monthly'
                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/70 bg-background/60 hover:border-border',
                    )}
                    aria-pressed={selectedPaywallPlan === 'monthly'}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-xs font-medium uppercase tracking-wide', selectedPaywallPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground')}>
                        Monthly
                      </p>
                      {activeBillingPlan === 'PRO_MONTHLY' ? (
                        <span className="rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatUsd(PAYWALL_MONTHLY_PRICE_USD)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">/mo</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaywallPlan('yearly')}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition-colors sm:p-5',
                      selectedPaywallPlan === 'yearly'
                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/70 bg-background/60 hover:border-border',
                    )}
                    aria-pressed={selectedPaywallPlan === 'yearly'}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-xs font-medium uppercase tracking-wide', selectedPaywallPlan === 'yearly' ? 'text-primary' : 'text-muted-foreground')}>
                        Yearly
                      </p>
                      {activeBillingPlan === 'PRO_YEARLY' ? (
                        <span className="rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatUsd(PAYWALL_YEARLY_PRICE_USD)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">/year</p>
                  </button>
                </div>
                {activeBillingPlan === 'PRO_MONTHLY' ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    You can upgrade this account to yearly here.
                  </p>
                ) : null}
                <div className="mt-5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setPaywallModal('none')}
                    >
                      Close
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => {
                        if (activeBillingPlan === 'PRO_YEARLY') return
                        if (activeBillingPlan === 'PRO_MONTHLY') {
                          if (selectedPaywallPlan !== 'yearly') return
                          void activateFrontendUpgrade({ plan: 'yearly' })
                          return
                        }
                        void activateFrontendUpgrade({ plan: selectedPaywallPlan })
                      }}
                      disabled={
                        isCheckoutRedirecting
                        || activeBillingPlan === 'PRO_YEARLY'
                        || (activeBillingPlan === 'PRO_MONTHLY' && selectedPaywallPlan !== 'yearly')
                      }
                    >
                      {isCheckoutRedirecting
                        ? 'Redirecting...'
                        : activeBillingPlan === 'PRO_MONTHLY'
                          ? 'Upgrade to yearly'
                          : activeBillingPlan === 'PRO_YEARLY'
                            ? 'Yearly active'
                            : `Upgrade (${selectedPaywallPlan === 'yearly' ? 'Yearly' : 'Monthly'})`}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {paywallModal === 'why-limit' ? (
              <div>
                <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Quick heads-up
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">This is a 3-minute trial. When the timer ends, we will delete your instance.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  OpenClaw is free. You pay for secure managed hosting (no hardware to buy or manage) and a simpler UI.
                </p>
                {isHeadsUpDiscountEligible ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    One-time 25% off is still active:{' '}
                    <span className="font-semibold text-emerald-700">
                      {formatUsd(PAYWALL_DISCOUNTED_FIRST_MONTH_PRICE_USD)}/mo
                    </span>{' '}
                    for month one. If you skip this now, you will not see this discount again.
                  </p>
                ) : null}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (isHeadsUpDiscountEligible) {
                        setSelectedPaywallPlan('monthly')
                        void activateFrontendUpgrade({ plan: 'monthly', applyDiscount: true })
                        return
                      }
                      void activateFrontendUpgrade({ plan: selectedPaywallPlan })
                    }}
                    disabled={isCheckoutRedirecting}
                  >
                    {isCheckoutRedirecting
                      ? 'Redirecting...'
                      : isHeadsUpDiscountEligible
                        ? `Keep my instance for ${formatUsd(PAYWALL_DISCOUNTED_FIRST_MONTH_PRICE_USD)}`
                        : 'Keep my instance running'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsHeadsUpDiscountEligible(false)
                      setPaywallModal('none')
                    }}
                  >
                    No thanks, delete in 3 min
                  </Button>
                </div>
              </div>
            ) : null}

            {paywallModal === 'leave-warning' ? (
              <div>
                <p className="text-xl font-semibold text-foreground">Leaving now?</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Your OpenClaw instance will be deleted when the timer ends unless you upgrade.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPaywallModal('none')
                      setPendingLeaveHref(null)
                      if (typeof window !== 'undefined') {
                        window.location.assign('/dashboard')
                        return
                      }
                      router.push('/dashboard')
                    }}
                  >
                    Go to dashboard
                  </Button>
                  <Button onClick={continueLeaveNavigation}>Leave</Button>
                </div>
              </div>
            ) : null}

            {paywallModal === 'deleted' ? (
              <div>
                <p className="text-xl font-semibold text-foreground">Instance deleted</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Your 3-minute trial ended, so we deleted your OpenClaw instance. Upgrade to launch a new one.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" onClick={() => setPaywallModal('later-upgrade')}>
                    Redeploy OpenClaw
                  </Button>
                  <Button
                    onClick={() => {
                      void activateFrontendUpgrade({ plan: selectedPaywallPlan })
                    }}
                    disabled={isCheckoutRedirecting}
                  >
                    {isCheckoutRedirecting ? 'Redirecting...' : 'Upgrade'}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
