'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  Loader2,
  Menu,
  RefreshCw,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  DEFAULT_CHAT_SESSION_KEY,
  listRuntimeChatHistory,
  patchRuntimeSession,
  listRuntimeSessions,
  readStoredChatSessionKey,
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
import { buildSignInPath, getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
type SetupPhase = 'checking' | 'provisioning' | 'installing' | 'starting' | 'ready' | null

const INPUT_LINE_HEIGHT = 24
const INPUT_VERTICAL_PADDING = 20
const INPUT_MIN_HEIGHT = INPUT_LINE_HEIGHT + INPUT_VERTICAL_PADDING
const INPUT_MAX_HEIGHT = INPUT_LINE_HEIGHT * 11 + INPUT_VERTICAL_PADDING
const ONLINE_STABILITY_MS = 1800
const ASSISTANT_PROGRESS_TICK_MS = 1000

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
    const signature = `${entry.message.role}\u0000${entry.message.content}`
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

function formatAssistantProgressStatus(elapsedSeconds: number): string {
  if (elapsedSeconds <= 2) {
    return 'Running...'
  }
  if (elapsedSeconds <= 8) {
    return 'Thinking...'
  }
  if (elapsedSeconds <= 20) {
    return `Still working... ${elapsedSeconds}s`
  }
  return `Still running... ${elapsedSeconds}s`
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

// ─── Main chat page ──────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
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
  const historyPollInFlightRef = useRef(false)
  const wsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsInitialConnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const setShowConnectionIssue = useCallback((visible: boolean) => {
    showConnectionIssueRef.current = visible
    _setShowConnectionIssue(visible)
  }, [])

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
              setMessages(persistedMessages)
              scrollToBottom({ force: true })
            }
          }
        } catch (error) {
          console.error('Failed to load persisted runtime messages', error)
        }
      }

      const history = await listRuntimeChatHistory(tid, normalizedSessionKey, 250)
      if (!isCurrentRequest()) {
        return
      }
      if (history.messages.length > 0) {
        const mappedMessages = dedupeAndSortMessages(
          history.messages.map((message) => ({
            role: message.role,
            content: message.content,
            timestamp: message.timestamp ?? new Date().toISOString(),
          })),
        )
        if (shouldMerge) {
          setMessages((prev) => dedupeAndSortMessages([...prev, ...mappedMessages]))
        } else {
          setMessages(mappedMessages)
        }
        scrollToBottom({ force: !shouldMerge })
      } else if (!hasPersistedHistory && !shouldMerge) {
        setMessages([])
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

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4000'
      const query = new URLSearchParams({ tenantId: tid })
      const preferred = preferredSessionKey?.trim() || activeSessionKeyRef.current?.trim() || null
      const sessionKey = preferred && !isPendingSessionKey(preferred) ? preferred : null
      if (sessionKey !== null) {
        query.set('sessionKey', sessionKey)
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
            error?: string | { message?: string }
            sessionKey?: string
            reason?: string
            previousSessionKey?: string
            result?: { messages?: ChatMessage[] }
          }

          // Initial connection message
          if (data.type === 'connected') {
            setConnectionStatus('connected')
            beginConnectionStabilityCheck()
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
            return
          }

          // Error from server
          if (data.error) {
            resolvePendingResponse()
            const errMsg =
              typeof data.error === 'string'
                ? data.error
                : (data.error as { message?: string })?.message ?? JSON.stringify(data.error)
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
          }
        } catch {
          // ignore unparseable messages
        }
      }

      ws.onclose = () => {
        resetTypingState()
        resetConnectionStability()
        // Silently reconnect in the background — never block the UI.
        const currentPhase = setupPhaseRef.current
        const retryDelay = currentPhase && currentPhase !== 'ready' ? 15000 : 5000
        setConnectionStatus('connecting')
        if (!isUnmountingRef.current) {
          wsRetryRef.current = setTimeout(() => {
            connectWebSocket(tid, activeSessionKeyRef.current ?? undefined)
          }, retryDelay)
        }
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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4000'
      setSetupPhase('checking')
      setSetupStartedAt(Date.now())
      setSetupTimedOut(false)

      let wsAttempted = false

      const poll = async () => {
        try {
          const res = await fetch(`${backendUrl}/api/v1/daemons/${tid}/status`, {
            headers: { 'x-tenant-id': tid },
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
    [connectWebSocket, stopPolling],
  )

  // Use a ref for router to avoid re-triggering the effect on every render
  const routerRef = useRef(router)
  routerRef.current = router

  const redirectToSignIn = useCallback(() => {
    const currentPath = typeof window === 'undefined'
      ? '/dashboard/chat'
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
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4000'
          try {
            const res = await fetch(`${backendUrl}/api/v1/daemons/${tid}/status`, {
              headers: { 'x-tenant-id': tid },
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
      stopPolling()
      stopHistoryPolling()
      clearConnectionStableTimer()
      if (copySessionKeyTimeoutRef.current) {
        clearTimeout(copySessionKeyTimeoutRef.current)
        copySessionKeyTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function sendMessage() {
    const trimmed = input.trim()
    if (!trimmed) return
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

  const conversationsSidebar = (
    <Card className="border-border/70 lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
      <CardContent className="p-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sessions</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSessionsSidebar(false)}
              className="hidden h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:inline-flex"
              aria-label="Collapse sessions sidebar"
              title="Collapse sessions sidebar"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (tenantId) void loadSessions(tenantId)
              }}
              disabled={loadingSessions}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
              aria-label="Refresh"
              title="Refresh sessions"
            >
              {loadingSessions ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* New session button */}
        <div className="px-2 pt-2">
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
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/70 px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/20 hover:text-foreground"
            >
              <span className="text-sm leading-none">+</span>
              New session
            </button>
          )}
        </div>

        {sessionsError && (
          <p className="mx-2 mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive">
            {sessionsError}
          </p>
        )}

        {/* Session list */}
        <div className="mt-2 max-h-[56svh] space-y-0.5 overflow-y-auto px-2 pb-2 [scrollbar-width:thin] [scrollbar-color:hsl(var(--border)/0.78)_transparent] [-ms-overflow-style:auto] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[hsl(var(--border)/0.78)] lg:min-h-0 lg:flex-1 lg:max-h-none">
          {chatSessions.map((session) => {
            const sessionLabel = formatSessionLabel(session)
            const isActive = activeSessionKey === session.key
            return (
              <button
                key={session.key}
                type="button"
                onClick={() => selectSession(session.key)}
                className={cn(
                  'group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                  isActive
                    ? 'bg-primary/10 text-foreground'
                    : 'text-foreground/80 hover:bg-muted/40',
                )}
                aria-label={`Open ${sessionLabel}`}
              >
                <Circle className={cn(
                  'h-1.5 w-1.5 shrink-0 fill-current',
                  isActive ? 'text-primary' : 'text-transparent',
                )} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{sessionLabel}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation()
                    void copySessionKey(session.key)
                  }}
                  className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground group-hover:inline-flex"
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
          })}
        </div>
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
          <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex flex-1 items-center gap-2">
              {!showSessionsSidebar ? (
                <button
                  type="button"
                  onClick={() => setShowSessionsSidebar(true)}
                  className="hidden h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:inline-flex"
                  aria-label="Expand sessions sidebar"
                  title="Expand sessions sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
              <span className="inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-card p-0.5 sm:h-10 sm:w-10">
                <Image
                  src="/logo.png"
                  alt="ClawPilot"
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                />
              </span>
              <p className="truncate text-sm font-medium text-foreground sm:text-base">Agent Main</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
                    <Link href="/dashboard/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings/skills">Skills & Workspace</Link>
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
          <div className={cn('grid w-full gap-6', showSessionsSidebar ? 'lg:grid-cols-[260px_minmax(0,1fr)]' : 'lg:grid-cols-1')}>
            {showSessionsSidebar ? (
              <aside className="hidden lg:fixed lg:left-6 lg:top-20 lg:bottom-20 lg:z-30 lg:block lg:w-[260px]">
                {conversationsSidebar}
              </aside>
            ) : null}

            <section className={cn('min-w-0', showSessionsSidebar && 'lg:col-start-2')}>
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
                  if (msg.role === 'system') {
                    return (
                      <div key={`${msg.timestamp}-${index}`} className="flex w-full justify-center px-2 sm:px-3">
                        <p className="max-w-md rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground">
                          {msg.content}
                        </p>
                      </div>
                    )
                  }

                  if (msg.role === 'user') {
                    return (
                      <div key={`${msg.timestamp}-${index}`} className="flex w-full justify-end px-2 sm:px-3">
                        <div className="max-w-[74%] sm:max-w-[62%] chat-bubble-enter-user">
                          <article className="rounded-[18px] rounded-br-none border border-[hsl(var(--foreground)/0.14)] bg-[hsl(var(--foreground)/0.09)] px-3 py-2.5 text-[12px] leading-relaxed text-foreground shadow-[0_9px_22px_-16px_rgba(0,0,0,0.35)] sm:text-[13px]">
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </article>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={`${msg.timestamp}-${index}`} className="flex w-full justify-start px-2 sm:px-3">
                      <div className="w-full max-w-[88%] sm:max-w-[78%] chat-bubble-enter-assistant">
                        <article className="w-full px-1 py-0.5 text-[14px] leading-7 text-foreground sm:text-[15px]">
                          <MarkdownMessage content={msg.content} />
                        </article>
                      </div>
                    </div>
                  )
                })}

                {isAssistantTyping ? (
                  <div className="flex w-full justify-start px-2 sm:px-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-2.5 py-1.5">
                      <div className="h-5">
                        <div className="inline-flex items-end gap-1.5 chat-typing-shell" role="status" aria-label={`Assistant is typing. ${assistantProgressStatus}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/90 chat-typing-dot" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/90 chat-typing-dot chat-typing-dot-delay-1" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/90 chat-typing-dot chat-typing-dot-delay-2" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/90 chat-typing-dot chat-typing-dot-delay-3" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">{assistantProgressStatus}</p>
                    </div>
                  </div>
                ) : null}
                <div aria-hidden="true" className="h-px w-full" />
              </div>
            </section>
          </div>
        </main>
      </div>

      <Link
        href="/dashboard/channels"
        className="group fixed bottom-[5.6rem] right-3 z-40 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/95 p-1.5 shadow-md shadow-black/5 backdrop-blur transition-colors hover:border-primary/30 hover:bg-muted/40 sm:bottom-4 sm:right-4"
        aria-label="Open channel integrations"
        title="Configure channels"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background">
          <Image src="/integrations/whatsapp.svg" alt="WhatsApp" width={18} height={18} />
        </span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background">
          <Image src="/integrations/telegram.svg" alt="Telegram" width={18} height={18} />
        </span>
      </Link>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-background via-background/90 to-transparent" />
      <div className="fixed inset-x-0 bottom-0 z-30 pb-4 sm:pb-6">
        <div className="w-full px-4 sm:px-6">
          <div className={cn('grid', showSessionsSidebar ? 'lg:grid-cols-[260px_minmax(0,1fr)]' : 'lg:grid-cols-1')}>
            {showSessionsSidebar ? <div className="hidden lg:block" /> : null}
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
                      placeholder="Message OpenClaw..."
                      rows={1}
                      className="flex-1 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2.5 text-[14px] leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
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
                      disabled={!input.trim()}
                      aria-label="Send message"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
