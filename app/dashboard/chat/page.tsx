'use client'

import Link from 'next/link'
import { ArrowLeft, Bot, Check, Circle, Loader2, MessageSquare, Send, ShieldCheck, Sparkles, User, WifiOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
type SetupPhase = 'checking' | 'provisioning' | 'installing' | 'starting' | 'ready' | null

const QUICK_PROMPTS = [
  'Summarize the last customer issues from chat channels.',
  'Draft a friendly response for a delayed shipment complaint.',
  'Give me the top 3 risks from today’s support traffic.',
] as const

function deriveTenantIdFromUserId(userId: string) {
  const normalized = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `tenant_${normalized}`.slice(0, 64)
}

function formatElapsed(startedAt: number): string {
  const seconds = Math.floor((Date.now() - startedAt) / 1000)
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

// ─── Setup progress view ──────────────────────────────────────────────

interface SetupStep {
  label: string
  description: string
  status: 'pending' | 'active' | 'done'
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
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-4">
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
          <div className="relative">
            <div className="rounded-full border border-border/70 bg-card p-5">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-background bg-primary p-1">
              <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
            </div>
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
  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [mode, setMode] = useState<string | null>(null)

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const rpcIdRef = useRef(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsInitialConnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setupPhaseRef = useRef<SetupPhase>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }, 50)
  }, [])

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

  const connectWebSocket = useCallback(
    (tid: string) => {
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

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4000'
      const wsUrl = backendUrl.replace(/^http/, 'ws') + `/ws/chat?tenantId=${encodeURIComponent(tid)}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnectionStatus('connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            type?: string
            mode?: string
            message?: ChatMessage | string
            error?: string
            result?: { messages?: ChatMessage[] }
          }

          // Initial connection message
          if (data.type === 'connected') {
            const connectedMode = data.mode ?? null
            setMode(connectedMode)
            setSetupPhase('ready')
            stopPolling()
            setTimeout(() => setSetupPhase(null), 600)

            setMessages((prev) => [
              ...prev,
              {
                role: 'system',
                content: typeof data.message === 'string' ? data.message : 'Connected to OpenClaw.',
                timestamp: new Date().toISOString(),
              },
            ])
            scrollToBottom()
            return
          }

          // Assistant response
          if (data.type === 'chat.message' && data.message && typeof data.message === 'object') {
            setMessages((prev) => [...prev, data.message as ChatMessage])
            scrollToBottom()
            return
          }

          // Error from server
          if (data.error) {
            const errMsg =
              typeof data.error === 'string'
                ? data.error
                : (data.error as { message?: string })?.message ?? JSON.stringify(data.error)
            setMessages((prev) => [
              ...prev,
              {
                role: 'system',
                content: `Error: ${errMsg}`,
                timestamp: new Date().toISOString(),
              },
            ])
            scrollToBottom()
          }
        } catch {
          // ignore unparseable messages
        }
      }

      ws.onclose = () => {
        // If still in setup phase, retry connection after a delay
        const currentPhase = setupPhaseRef.current
        if (currentPhase && currentPhase !== 'ready') {
          setConnectionStatus('connecting')
          wsRetryRef.current = setTimeout(() => {
            connectWebSocket(tid)
          }, 15000)
        } else {
          setConnectionStatus('disconnected')
        }
      }

      ws.onerror = () => {
        // Don't show error state during setup — the retry in onclose handles it
        const currentPhase = setupPhaseRef.current
        if (!currentPhase || currentPhase === 'ready') {
          setConnectionStatus('error')
        }
      }
    },
    [scrollToBottom, stopPolling],
  )

  // Skip setup and connect immediately.
  const skipSetup = useCallback(() => {
    stopPolling()
    setSetupPhase(null)
    if (tenantId) {
      connectWebSocket(tenantId)
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

          if (!instanceState || instanceState === 'new') {
            setSetupPhase('provisioning')
          } else if (instanceState === 'active') {
            if (!wsAttempted) {
              setSetupPhase('installing')
              // Mark immediately so repeated poll ticks don't queue duplicate timers.
              wsAttempted = true
              // Give the daemon a short warm-up window, then connect. If it is not
              // ready yet, the WebSocket onclose retry loop handles retries.
              wsInitialConnectTimeoutRef.current = setTimeout(() => {
                setSetupPhase('starting')
                connectWebSocket(tid)
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

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          redirectToSignIn()
          return
        }

        const tid = deriveTenantIdFromUserId(session.user.id)

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

              // If DigitalOcean mode and instance isn't fully ready, show setup progress
              if (
                data.daemon?.runtimeMode === 'digitalocean' &&
                data.instance?.instanceState !== 'active'
              ) {
                startSetupPolling(tid)
                return
              }

              // If DigitalOcean mode and instance is active, try connecting.
              // The onclose retry loop will keep retrying every 15s if it fails.
              if (data.daemon?.runtimeMode === 'digitalocean' && data.instance?.instanceState === 'active') {
                setSetupPhase('starting')
                setSetupStartedAt(Date.now())
                connectWebSocket(tid)
                return
              }
            }
          } catch {
            // Status check failed — connect WebSocket directly
          }

          // Default: connect WebSocket directly when no daemon status is available yet.
          connectWebSocket(tid)
        }
      } catch {
        redirectToSignIn()
      }
    }

    void loadSession()

    return () => {
      cancelled = true
      stopPolling()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectWebSocket, redirectToSignIn, startSetupPolling, stopPolling])

  function sendMessage() {
    const trimmed = input.trim()
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    scrollToBottom()

    rpcIdRef.current += 1
    wsRef.current.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: rpcIdRef.current,
        method: 'chat.send',
        params: { message: trimmed },
      }),
    )

    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = '44px'
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
      setMessages([])
      connectWebSocket(tenantId)
    }
  }

  function applyPrompt(prompt: string) {
    setInput(prompt)
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.style.height = '44px'
    }
  }

  // ─── Loading state ─────────────────────────────────────────────────

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
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-55"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.09),transparent_44%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.07),transparent_40%)]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/90 via-background/75 to-background" />

      <div className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-7xl flex-col px-3 py-3 sm:px-5 sm:py-4">
        <header className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm shadow-primary/10 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Workspace</p>
                <CardTitle className="text-base">OpenClaw Chat</CardTitle>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500'
                      : connectionStatus === 'connecting'
                        ? 'bg-amber-500'
                        : 'bg-destructive',
                  )}
                />
                {connectionStatus}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                {mode ? `${mode} mode` : 'Live mode'}
              </span>
              {connectionStatus === 'disconnected' || connectionStatus === 'error' ? (
                <Button variant="outline" size="sm" onClick={reconnect}>
                  Reconnect
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 flex-col gap-3 lg:flex">
            <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm shadow-primary/10">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assistant</p>
              <div className="mt-3 flex items-start gap-3">
                <div className="rounded-xl border border-border/70 bg-background p-2">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">OpenClaw Runtime</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Connected workspace agent for support and operations workflows.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm shadow-primary/10">
              <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Quick Prompts
              </p>
              <div className="mt-3 space-y-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => applyPrompt(prompt)}
                    className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm shadow-primary/10">
            <div className="border-b border-border/70 px-4 py-3 sm:px-6">
              <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                Conversation
              </p>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 px-4 py-5 sm:px-6">
                {messages.length === 0 && connectionStatus === 'connected' ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="rounded-full border border-border/70 bg-background p-4">
                      <Bot className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="mt-4 text-sm font-medium">Start a conversation</p>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      Ask for summaries, drafting, classification, or workflow actions.
                    </p>
                  </div>
                ) : null}

                {connectionStatus === 'error' ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="rounded-full border border-destructive/30 bg-destructive/5 p-4">
                      <WifiOff className="h-8 w-8 text-destructive" />
                    </div>
                    <p className="mt-4 text-sm font-medium">Connection failed</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Could not connect to the backend. Make sure the server is running.
                    </p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={reconnect}>
                      Try again
                    </Button>
                  </div>
                ) : null}

                {messages.map((msg, index) => (
                  <div
                    key={`${msg.timestamp}-${index}`}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' ? 'justify-end' : 'justify-start',
                      msg.role === 'system' ? 'justify-center' : '',
                    )}
                  >
                    {msg.role === 'system' ? (
                      <p className="max-w-md rounded-lg border border-border/60 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground">
                        {msg.content}
                      </p>
                    ) : (
                      <>
                        {msg.role === 'assistant' ? (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        ) : null}

                        <div
                          className={cn(
                            'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border/70 bg-background text-foreground',
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={cn(
                              'mt-1.5 text-[10px]',
                              msg.role === 'user'
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground',
                            )}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {msg.role === 'user' ? (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-border/70 bg-background/65 p-3 sm:p-4">
              <div className="mb-2 flex flex-wrap gap-2 lg:hidden">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => applyPrompt(prompt)}
                    className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {prompt.length > 46 ? `${prompt.slice(0, 46)}...` : prompt}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-border/70 bg-background p-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    connectionStatus === 'connected'
                      ? 'Ask anything about your workspace...'
                      : 'Connecting...'
                  }
                  disabled={connectionStatus !== 'connected'}
                  rows={1}
                  className="w-full resize-none border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                  style={{ minHeight: '44px', maxHeight: '180px' }}
                  onInput={(event) => {
                    const target = event.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = `${Math.min(target.scrollHeight, 180)}px`
                  }}
                />
                <div className="mt-1 flex items-center justify-between gap-2 px-2 pb-1">
                  <p className="text-[11px] text-muted-foreground">
                    Enter to send. Shift + Enter for newline.
                  </p>
                  <Button
                    size="sm"
                    className="h-9 rounded-xl px-4"
                    onClick={sendMessage}
                    disabled={!input.trim() || connectionStatus !== 'connected'}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Send
                  </Button>
                </div>
              </div>

              {mode ? (
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  Runtime mode: {mode}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
