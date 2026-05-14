'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  Mail,
  MessageSquare,
  Newspaper,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react'

import { RuntimeModelsDialog } from '@/components/models/runtime-models-dialog'
import { ConsoleLaunchButton } from '@/components/console-launch-button'
import {
  DashboardHeader,
  resolveDashboardProfile,
  type DashboardProfile,
} from '@/components/dashboard/dashboard-header'
import { AgentReadinessPanel } from '@/components/dashboard/agent-readiness-panel'
import { OpenclawUiLaunchButton } from '@/components/openclaw-ui-launch-button'
import { WorkspaceMarkdownManagerDialog } from '@/components/workspace/workspace-markdown-manager-dialog'
import { Button } from '@/components/ui/button'
import { isTenantDeploymentStillStartingFromSnapshot } from '@/lib/deploy-progress'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import {
  completeRuntimeOpenAICodexOAuth,
  listRuntimeModels,
  startRuntimeOpenAICodexOAuth,
  type RuntimeModelsData,
} from '@/lib/runtime-controls'
import { getRuntimeProduct, inferRuntimeKindFromGatewayPort } from '@/lib/runtime-products'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { buildSignInPath, getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'
import {
  deriveTenantIdFromUserId,
  fetchTenantDaemonStatusSnapshot,
  resolveTenantMachineLabel,
  tenantHasReadyGateway,
  type TenantDaemonStatus,
} from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

type OpenclawResourceArticle = {
  title: string
  description: string
  url: string
}

const OPENCLAW_RESOURCE_ARTICLES: OpenclawResourceArticle[] = [
  {
    title: 'Full Tutorial: Use Openclaw to Build a Business That Runs Itself | Nat Eliason',
    description:
      'How Nat set up his Openclaw bot to run its $4,000/week business, including memory, multi-threaded chats, and security practices.',
    url: 'https://creatoreconomy.so/p/use-openclaw-to-build-a-business-that-runs-itself-nat-eliason',
  },
  {
    title: 'Openclaw use cases: 25 ways to automate work and life',
    description:
      'A practical list covering everyday admin, developer workflows, and long-running jobs that Openclaw can handle for you.',
    url: 'https://www.hostinger.com/tutorials/openclaw-use-cases',
  },
  {
    title: 'Openclaw Use Cases: 35+ Real Ways People Are Running Their Lives (and Businesses) With It',
    description: 'A verified playbook covering everything from morning briefings to multi-agent business councils.',
    url: 'https://sidsaladi.substack.com/p/openclaw-use-cases-35-real-ways-people',
  },
  {
    title: 'How Openclaw Changed My Workflow',
    description:
      'A firsthand account of using Openclaw in Telegram with real tools to help ship work end-to-end.',
    url: 'https://safeti.medium.com/how-openclaw-changed-my-workflow-e27b4a03e432',
  },
  {
    title: '11 Insane Use Cases of Openclaw AI',
    description: 'What happens when you give an AI agent access to your entire digital life.',
    url: 'https://medium.com/the-ai-studio/11-insane-use-cases-of-openclaw-ai-a341e997a57f',
  },
]

const CONTACT_EMAIL = 'support@clawpilot.app'
const DEFAULT_PROFILE: DashboardProfile = {
  name: 'Account',
  email: '',
  initial: 'A',
  imageUrl: null,
}

function getArticleDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return url
  }
}

function buildArticleFaviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(getArticleDomain(url))}&sz=64`
}

function resolveMachineLabel(status: TenantDaemonStatus | null): string {
  return resolveTenantMachineLabel(status)
}

function resolveGatewayLabel(status: TenantDaemonStatus | null): string {
  const port = status?.instance?.gatewayProbe?.gatewayPort ?? 18789
  const reachableVia = status?.instance?.gatewayProbe?.reachableVia
  return reachableVia ? `${reachableVia} :${port}` : `gateway :${port}`
}

function normalizeOpenAIModelIdForRuntime(modelId: string): string {
  const normalized = modelId.trim()
  if (!normalized.startsWith('openai/')) return normalized
  return `openai-codex/${normalized.slice('openai/'.length)}`
}

function normalizeStoredOpenAIModelId(modelId: string | null | undefined): string | null {
  if (!modelId) return null

  const normalized = modelId.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.startsWith('openai-codex/')) {
    return `openai/${normalized.slice('openai-codex/'.length)}`
  }
  return normalized
}

function isRuntimeOpenAIOAuthPending(config: RuntimeModelsData['storedModelConfig']): boolean {
  if (!config || config.modelAuthMethod !== 'oauth') return false

  const providerId = config.modelProviderId?.trim().toLowerCase() ?? ''
  const modelId = normalizeStoredOpenAIModelId(config.modelId) ?? ''
  const isOpenAI = providerId === 'openai' || providerId === 'openai-codex' || modelId.startsWith('openai/')
  return isOpenAI && config.modelOauthConnected !== true
}

function formatOAuthExpiryCountdown(expiresAt: string, nowMs: number): string {
  const expiresAtMs = Date.parse(expiresAt)
  if (!Number.isFinite(expiresAtMs)) return 'Unknown'
  const remainingMs = expiresAtMs - nowMs
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const remainingMinutes = Math.floor(remainingSeconds / 60)
  const secondsPart = remainingSeconds % 60
  if (remainingMs <= 0) return 'Expired'
  return `${remainingMinutes}m ${secondsPart}s`
}

export default function ChatPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [profile, setProfile] = useState<DashboardProfile>(DEFAULT_PROFILE)
  const [runtimeStatus, setRuntimeStatus] = useState<TenantDaemonStatus | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [launchError, setLaunchError] = useState('')
  const [fileManagerOpen, setFileManagerOpen] = useState(false)
  const [modelsDialogOpen, setModelsDialogOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactCopied, setContactCopied] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [oauthRequired, setOauthRequired] = useState(false)
  const [oauthModalOpen, setOauthModalOpen] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [oauthError, setOauthError] = useState('')
  const [oauthStatus, setOauthStatus] = useState('')
  const [oauthSessionId, setOauthSessionId] = useState('')
  const [oauthAuthUrl, setOauthAuthUrl] = useState('')
  const [oauthExpiresAt, setOauthExpiresAt] = useState<string | null>(null)
  const [oauthCallback, setOauthCallback] = useState('')
  const [oauthNowMs, setOauthNowMs] = useState(() => Date.now())
  const [runtimeStoredModelConfig, setRuntimeStoredModelConfig] = useState<RuntimeModelsData['storedModelConfig']>(null)

  const routerRef = useRef(router)
  routerRef.current = router

  const oauthUrlExpired = oauthExpiresAt ? Date.parse(oauthExpiresAt) <= oauthNowMs : false
  const oauthCountdownLabel = useMemo(
    () => (oauthExpiresAt ? formatOAuthExpiryCountdown(oauthExpiresAt, oauthNowMs) : null),
    [oauthExpiresAt, oauthNowMs],
  )
  const selectedRuntimeOpenAIModelId = useMemo(() => (
    normalizeStoredOpenAIModelId(runtimeStoredModelConfig?.modelId) ?? 'openai/gpt-5.4'
  ), [runtimeStoredModelConfig])

  const redirectToSignIn = useCallback(() => {
    const currentPath =
      typeof window === 'undefined'
        ? '/chat'
        : `${window.location.pathname}${window.location.search}`
    routerRef.current.replace(buildSignInPath(currentPath))
  }, [])

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return

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
      router.replace('/')
    }
  }, [isSigningOut, router])

  const handleCopyContactEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setContactCopied(true)
    } catch {
      setContactCopied(false)
    }
  }, [])

  const handleStartOpenAIOAuth = useCallback(async (
    options: {
      openWindow?: boolean
      preopenedWindow?: Window | null
    } = {},
  ) => {
    if (!tenantId) return
    const { openWindow = false, preopenedWindow = null } = options
    setOauthBusy(true)
    setOauthError('')
    setOauthStatus('')
    try {
      const runtimeModelId = normalizeOpenAIModelIdForRuntime(selectedRuntimeOpenAIModelId)
      const oauthStart = await startRuntimeOpenAICodexOAuth(tenantId, {
        modelId: runtimeModelId || undefined,
      })

      setOauthSessionId(oauthStart.sessionId)
      setOauthAuthUrl(oauthStart.authUrl)
      setOauthExpiresAt(oauthStart.expiresAt)
      setOauthNowMs(Date.now())
      setOauthStatus('OAuth window is ready. Sign in, then paste the localhost callback URL.')

      if (openWindow) {
        let openedWindow = preopenedWindow
        if (openedWindow && !openedWindow.closed) {
          openedWindow.location.href = oauthStart.authUrl
          openedWindow.focus()
        } else {
          openedWindow = window.open(oauthStart.authUrl, '_blank', 'noopener,noreferrer')
        }
        if (!openedWindow) {
          setOauthError('Popup blocked. Allow popups, then try again.')
        }
      }
    } catch (error) {
      if (preopenedWindow && !preopenedWindow.closed) {
        preopenedWindow.close()
      }
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Failed to start OpenAI OAuth.'
      if (/gateway_starting|bootstrapping|gateway_unavailable|not running/i.test(message)) {
        setOauthStatus('Openclaw is still starting. Retry in a few seconds.')
      } else if (/route\s+post:|not found/i.test(message)) {
        setOauthError('We could not start the OpenAI sign-in flow. Refresh and try again.')
      } else {
        setOauthError(message)
      }
    } finally {
      setOauthBusy(false)
    }
  }, [selectedRuntimeOpenAIModelId, tenantId])

  const handleOpenOauthWindow = useCallback(() => {
    setOauthModalOpen(true)
    setOauthError('')
    if (oauthAuthUrl && !oauthUrlExpired) {
      const openedWindow = window.open(oauthAuthUrl, '_blank', 'noopener,noreferrer')
      if (!openedWindow) {
        setOauthError('Popup blocked. Allow popups, then try again.')
      }
      return
    }
    const preopenedWindow = window.open('', '_blank')
    if (!preopenedWindow) {
      setOauthError('Popup blocked. Allow popups, then try again.')
      return
    }
    preopenedWindow.document.write('<title>OpenAI OAuth</title><p style="font-family: sans-serif; padding: 24px;">Preparing OpenAI sign-in...</p>')
    void handleStartOpenAIOAuth({ openWindow: true, preopenedWindow })
  }, [handleStartOpenAIOAuth, oauthAuthUrl, oauthUrlExpired])

  const handleCompleteOpenAIOAuth = useCallback(async () => {
    if (!tenantId) return
    const callback = oauthCallback.trim()
    if (!oauthSessionId) {
      setOauthError('Generate the OAuth URL first.')
      return
    }
    if (!callback) {
      setOauthError('Paste the callback URL.')
      return
    }

    setOauthBusy(true)
    setOauthError('')
    setOauthStatus('Completing OpenAI OAuth...')
    try {
      const runtimeModelId = normalizeOpenAIModelIdForRuntime(selectedRuntimeOpenAIModelId)
      const result = await completeRuntimeOpenAICodexOAuth(tenantId, {
        sessionId: oauthSessionId,
        callback,
        modelId: runtimeModelId || undefined,
      })
      if (!result.oauthConnected) {
        throw new Error('OAuth did not complete.')
      }

      setRuntimeStoredModelConfig({
        modelProviderId: result.providerId,
        modelId: result.modelId,
        modelAuthMethod: 'oauth',
        modelOauthConnected: true,
      })
      setOauthRequired(false)
      setOauthModalOpen(false)
      setOauthStatus('OpenAI OAuth is connected. You can launch Openclaw now.')
      setOauthCallback('')
      setOauthSessionId('')
      setOauthAuthUrl('')
      setOauthExpiresAt(null)
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Failed to complete OpenAI OAuth.'
      setOauthError(message)
      setOauthStatus('')
    } finally {
      setOauthBusy(false)
    }
  }, [oauthCallback, oauthSessionId, selectedRuntimeOpenAIModelId, tenantId])

  useEffect(() => {
    if (!oauthModalOpen || !oauthExpiresAt) {
      return
    }

    setOauthNowMs(Date.now())
    const timer = setInterval(() => setOauthNowMs(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [oauthExpiresAt, oauthModalOpen])

  useEffect(() => {
    if (!contactCopied) {
      return
    }

    const timer = window.setTimeout(() => setContactCopied(false), 1_500)
    return () => window.clearTimeout(timer)
  }, [contactCopied])

  // Bootstrap: verify session, hydrate profile, check billing
  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession({ timeoutMs: 2_500 })
        if (!session) {
          redirectToSignIn()
          return
        }

        const tid = deriveTenantIdFromUserId(session.user.id)
        const [subscription, daemonSnapshot] = await Promise.all([
          fetchSubscriptionSnapshot(tid),
          fetchTenantDaemonStatusSnapshot(tid),
        ])
        const deploymentStillStarting = isTenantDeploymentStillStartingFromSnapshot(daemonSnapshot)
        const daemonStatus = daemonSnapshot.kind === 'ok' ? daemonSnapshot.status : null
        const runtimeKind = inferRuntimeKindFromGatewayPort(daemonStatus?.instance?.gatewayProbe?.gatewayPort)

        if (!hasManagedHostingPlan(subscription)) {
          router.replace(
            buildBillingRequiredPath(deploymentStillStarting ? '/dashboard/chat' : '/dashboard/runtime'),
          )
          return
        }

        if (runtimeKind === 'hermes') {
          router.replace('/dashboard/hermes')
          return
        }

        const onboardingComplete = deploymentStillStarting
          ? true
          : await isOnboardingComplete(session, { backfillFromProvisionedTenant: true })
        if (!deploymentStillStarting && !onboardingComplete) {
          router.replace('/dashboard/runtime?restart=1')
          return
        }

        let storedModelConfig: RuntimeModelsData['storedModelConfig'] = null
        let oauthPending = false

        if (!deploymentStillStarting) {
          try {
            const runtimeModels = await listRuntimeModels(tid, {
              includeModels: false,
              syncRuntime: true,
            })
            storedModelConfig = runtimeModels.storedModelConfig
            oauthPending = isRuntimeOpenAIOAuthPending(storedModelConfig)
          } catch {
            storedModelConfig = null
            oauthPending = false
          }
        }

        if (!cancelled) {
          setTenantId(tid)
          setProfile(resolveDashboardProfile({
            email: session.user.email,
            userMetadata: (session.user.user_metadata ?? {}) as Record<string, unknown>,
          }))
          setRuntimeStatus(daemonStatus)
          setRuntimeStoredModelConfig(storedModelConfig)
          setOauthRequired(oauthPending)
          setOauthModalOpen(oauthPending)
          setOauthError('')
          setOauthStatus(
            oauthPending ? 'OpenAI OAuth is required before you can launch Openclaw.' : '',
          )
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
  }, [])

  useEffect(() => {
    if (!tenantId || tenantHasReadyGateway(runtimeStatus)) {
      return
    }

    let cancelled = false
    const pollStatus = async () => {
      const snapshot = await fetchTenantDaemonStatusSnapshot(tenantId, { cache: 'no-store' })
      if (cancelled) return
      const nextStatus = snapshot.kind === 'ok' ? snapshot.status : null
      const runtimeKind = inferRuntimeKindFromGatewayPort(nextStatus?.instance?.gatewayProbe?.gatewayPort)
      if (runtimeKind === 'hermes') {
        router.replace('/dashboard/hermes')
        return
      }
      if (nextStatus) {
        setRuntimeStatus(nextStatus)
        if (tenantHasReadyGateway(nextStatus)) {
          try {
            const runtimeModels = await listRuntimeModels(tenantId, {
              includeModels: false,
              syncRuntime: true,
            })
            const storedModelConfig = runtimeModels.storedModelConfig
            const oauthPending = isRuntimeOpenAIOAuthPending(storedModelConfig)
            setRuntimeStoredModelConfig(storedModelConfig)
            setOauthRequired(oauthPending)
            setOauthModalOpen(oauthPending)
            setOauthStatus(oauthPending ? 'OpenAI OAuth is required before you can launch Openclaw.' : '')
          } catch {
            // The runtime is reachable enough for the readiness probe; model sync can be retried from Models.
          }
        }
      }
    }

    const timer = window.setInterval(() => {
      void pollStatus()
    }, 2_500)
    void pollStatus()

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [router, runtimeStatus, tenantId])

  if (checkingSession) {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
        </div>
      </div>
    )
  }

  const runtimeReady = tenantHasReadyGateway(runtimeStatus)
  const product = getRuntimeProduct('openclaw')

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-background">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[40%] left-1/2 h-[80%] w-[140%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.03),transparent_70%)]"
      />

      <div className="relative z-10 flex min-h-[100svh] flex-col">
        <DashboardHeader
          profile={profile}
          isSigningOut={isSigningOut}
          onSignOut={() => void handleSignOut()}
          actions={(
            <>
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={contactOpen}
                aria-controls="dashboard-contact-modal"
                className="hidden h-9 items-center gap-2 rounded-full px-3 text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground sm:inline-flex"
              >
                <Mail className="h-4 w-4" />
                <span>Contact us</span>
              </button>
            </>
          )}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 md:py-10">
          <nav className="mb-10 flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link href="/dashboard" className="inline-flex items-center gap-2 transition-colors hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
              Instances
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>

          <section className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start">
            <div className="mx-auto grid aspect-square w-full max-w-[168px] place-items-center rounded-full border border-border/70 bg-card shadow-[0_18px_44px_rgba(0,0,0,0.08)]">
              <Image
                src="/pfp.png"
                alt="Openclaw"
                width={190}
                height={190}
                className="h-[58%] w-[58%] object-contain"
                priority
              />
            </div>

            <div className="min-w-0 pt-1">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">{product.name}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Managed deployment on your ClawPilot machine.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium',
                    runtimeReady
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-amber-500/10 text-amber-700',
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                  {runtimeReady ? 'Running' : 'Starting'}
                </span>
                <span className="inline-flex h-10 items-center rounded-xl bg-primary/10 px-4 text-sm font-medium text-primary">
                  Openclaw
                </span>
              </div>

              <dl className="mt-8 grid gap-5 sm:grid-cols-3">
                <div className="flex items-center gap-3 border-border/70 sm:border-r">
                  <Server className="h-7 w-7 text-muted-foreground" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Provider</dt>
                    <dd className="mt-1 font-medium text-foreground">DigitalOcean</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-border/70 sm:border-r">
                  <ShieldCheck className="h-7 w-7 text-muted-foreground" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Machine</dt>
                    <dd className="mt-1 font-medium text-foreground">{resolveMachineLabel(runtimeStatus)}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe2 className="h-7 w-7 text-muted-foreground" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Endpoint</dt>
                    <dd className="mt-1 font-medium text-foreground">{resolveGatewayLabel(runtimeStatus)}</dd>
                  </div>
                </div>
              </dl>

              <div className="mt-9 grid gap-3 sm:grid-cols-4">
                {oauthRequired ? (
                  <Button
                    type="button"
                    onClick={handleOpenOauthWindow}
                    disabled={oauthBusy || !tenantId.trim()}
                    className="h-12 rounded-xl gap-2 text-sm font-semibold"
                  >
                    {oauthBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Connect OAuth
                  </Button>
                ) : (
                  <OpenclawUiLaunchButton
                    tenantId={tenantId}
                    onUnauthorized={redirectToSignIn}
                    onLaunchStart={() => setLaunchError('')}
                    onError={setLaunchError}
                    label="Launch agent"
                    variant="default"
                    size="default"
                    className="h-12 rounded-xl gap-2 text-sm font-semibold"
                    disabled={!runtimeReady}
                  />
                )}

                <ConsoleLaunchButton
                  tenantId={tenantId}
                  onUnauthorized={redirectToSignIn}
                  onLaunchStart={() => setLaunchError('')}
                  onError={setLaunchError}
                  label="Console"
                  variant="outline"
                  size="default"
                  className="h-12 rounded-xl gap-2 text-sm font-semibold"
                  disabled={!runtimeReady}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="h-12 rounded-xl gap-2 text-sm font-semibold"
                  onClick={() => {
                    setLaunchError('')
                    setFileManagerOpen(true)
                  }}
                  disabled={!runtimeReady}
                >
                  <FileText className="h-4 w-4" />
                  Files
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="h-12 rounded-xl gap-2 text-sm font-semibold"
                  onClick={() => {
                    setLaunchError('')
                    setModelsDialogOpen(true)
                  }}
                  disabled={!runtimeReady}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Models
                </Button>
              </div>
            </div>
          </section>

          <AgentReadinessPanel
            runtimeKind="openclaw"
            status={runtimeStatus}
            ready={runtimeReady}
            error={launchError}
          />

          <section className="mx-auto mt-8 w-full max-w-6xl">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Openclaw settings</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Runtime-specific configuration lives with this agent.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold tracking-tight text-foreground">Models config</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Choose provider, model, API key, or OpenAI OAuth from ClawPilot.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 h-10 rounded-xl"
                      onClick={() => {
                        setLaunchError('')
                        setModelsDialogOpen(true)
                      }}
                      disabled={!tenantId.trim()}
                    >
                      Configure models
                    </Button>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold tracking-tight text-foreground">Channels</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Connect WhatsApp, Telegram, Slack, and other channels inside Openclaw.
                    </p>
                    <OpenclawUiLaunchButton
                      tenantId={tenantId}
                      onUnauthorized={redirectToSignIn}
                      onLaunchStart={() => setLaunchError('')}
                      onError={setLaunchError}
                      label={oauthRequired ? 'Connect OAuth first' : 'Open channel settings'}
                      variant="outline"
                      size="default"
                      className="mt-4 h-10 rounded-xl"
                      disabled={!runtimeReady || oauthRequired}
                    />
                  </div>
                </div>
              </article>
            </div>
          </section>

          <footer className="mt-14 border-t border-border/70 pt-6 text-center">
            <button
              type="button"
              onClick={() => setResourcesOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={resourcesOpen}
              aria-controls="openclaw-resources-panel"
              aria-label="See what people are doing with Openclaw"
              className={cn(
                'inline-flex h-10 items-center gap-3 rounded-full px-3 text-sm font-medium tracking-tight text-muted-foreground transition-colors hover:text-foreground md:px-4',
                resourcesOpen ? 'bg-muted text-foreground shadow-sm' : 'hover:bg-muted/70',
              )}
            >
              <Newspaper className="h-4 w-4" />
              <span>See what people are doing with Openclaw</span>
              <ExternalLink className="h-4 w-4" />
            </button>
          </footer>
        </main>
      </div>

      <WorkspaceMarkdownManagerDialog
        tenantId={tenantId}
        open={fileManagerOpen}
        onOpenChange={setFileManagerOpen}
        onUnauthorized={redirectToSignIn}
      />

      <RuntimeModelsDialog
        tenantId={tenantId}
        open={modelsDialogOpen}
        onOpenChange={setModelsDialogOpen}
        onUnauthorized={redirectToSignIn}
        onConfigured={(config) => {
          const oauthPending = isRuntimeOpenAIOAuthPending(config)
          setRuntimeStoredModelConfig(config)
          setOauthRequired(oauthPending)
          setOauthModalOpen(oauthPending)
          setOauthError('')
          setOauthStatus(oauthPending ? 'OpenAI OAuth is required before you can launch Openclaw.' : '')
          setLaunchError('')
        }}
      />

      <Dialog.Root
        open={contactOpen}
        onOpenChange={(open) => {
          setContactOpen(open)
          if (!open) {
            setContactCopied(false)
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/35" />
          <Dialog.Content
            id="dashboard-contact-modal"
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/70 bg-background p-5 shadow-[0_18px_44px_rgba(0,0,0,0.12)] outline-none sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="text-lg font-semibold tracking-tight text-foreground">
                Contact us
              </Dialog.Title>

              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg border-border/70 shadow-sm"
                  aria-label="Close contact modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-3 shadow-sm shadow-black/5">
              <button
                type="button"
                onClick={() => void handleCopyContactEmail()}
                className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                {CONTACT_EMAIL}
              </button>

              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg border-border/70 px-3 shadow-sm"
                onClick={() => void handleCopyContactEmail()}
              >
                <Copy className="h-4 w-4" />
                <span>{contactCopied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={resourcesOpen} onOpenChange={setResourcesOpen}>
        <AnimatePresence>
          {resourcesOpen ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-[60] bg-black/35"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 1 }}
                  transition={{ duration: 0 }}
                />
              </Dialog.Overlay>

              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.aside
                  id="openclaw-resources-panel"
                  className="fixed inset-y-0 right-0 z-[70] flex h-[100dvh] w-full max-w-none flex-col bg-background outline-none md:w-[480px] md:border-l md:border-border/70 md:shadow-[0_18px_44px_rgba(0,0,0,0.12)]"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4 md:px-6 md:py-5">
                    <Dialog.Close asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg border-border/70 shadow-sm"
                        aria-label="Close Openclaw resources"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </Dialog.Close>

                    <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                      See what people are doing with Openclaw
                    </Dialog.Title>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
                    <motion.div
                      className="space-y-3"
                      initial={{ y: 24 }}
                      animate={{ y: 0 }}
                      exit={{ y: 24 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {OPENCLAW_RESOURCE_ARTICLES.map((article, index) => {
                        const domain = getArticleDomain(article.url)

                        return (
                          <motion.article
                            key={article.url}
                            className="flex gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm shadow-black/5"
                            initial={{ y: 18 }}
                            animate={{ y: 0 }}
                            exit={{ y: 18 }}
                            transition={{
                              duration: 0.22,
                              delay: index * 0.04,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          >
                            <img
                              src={buildArticleFaviconUrl(article.url)}
                              alt=""
                              aria-hidden="true"
                              className="mt-0.5 h-8 w-8 shrink-0 rounded-md border border-border/60 bg-background object-contain p-1"
                            />

                            <div className="min-w-0 flex-1">
                              <Link
                                href={article.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary"
                              >
                                {article.title}
                              </Link>

                              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                                {article.description}
                              </p>

                              <Link
                                href={article.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                              >
                                {domain}
                              </Link>
                            </div>
                          </motion.article>
                        )
                      })}
                    </motion.div>
                  </div>
                </motion.aside>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>

      {oauthModalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border/80 bg-card p-5 shadow-2xl shadow-black/10 sm:p-6">
            <button
              type="button"
              onClick={() => setOauthModalOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close OAuth dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-xl font-semibold text-foreground">Connect OpenAI OAuth</p>
            <p className="mt-2 text-sm font-medium text-foreground">Follow these steps:</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Click <span className="font-medium text-foreground">Open OAuth Window</span>.</li>
              <li>Sign in to your OpenAI account and finish the authorization flow.</li>
              <li>
                When approval finishes, your browser will show a local callback URL like{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[12px] text-foreground">
                  http://localhost:1455/callback...
                </code>
                .
              </li>
              <li>Copy that full URL and paste it into the Callback URL field below.</li>
            </ol>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={handleOpenOauthWindow}
                disabled={oauthBusy}
                className="bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white dark:hover:bg-black/90"
              >
                {oauthBusy
                  ? 'Preparing OAuth...'
                  : !oauthAuthUrl
                    ? 'Open OAuth Window'
                    : oauthUrlExpired
                      ? 'Refresh OAuth Window'
                      : 'Open OAuth Window'}
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleStartOpenAIOAuth()}
                disabled={oauthBusy}
              >
                Regenerate URL
              </Button>
            </div>

            {oauthCountdownLabel ? (
              <p className="mt-2 text-xs text-muted-foreground">
                OAuth URL expires in {oauthCountdownLabel}.
              </p>
            ) : null}

            <div className="mt-4">
              <label className="text-sm font-medium text-foreground" htmlFor="oauth-callback">
                Callback URL
              </label>
              <textarea
                id="oauth-callback"
                value={oauthCallback}
                onChange={(event) => setOauthCallback(event.target.value)}
                rows={3}
                placeholder="http://localhost:1455/callback?..."
                className="mt-2 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {oauthStatus ? <p className="mt-3 text-xs text-muted-foreground">{oauthStatus}</p> : null}
            {oauthError ? <p className="mt-1 text-xs text-destructive">{oauthError}</p> : null}

            <div className="mt-5">
              <Button onClick={() => void handleCompleteOpenAIOAuth()} disabled={oauthBusy || !oauthSessionId || !oauthCallback.trim()}>
                {oauthBusy ? 'Completing...' : 'Complete OAuth'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
