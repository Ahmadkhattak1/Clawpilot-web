'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, FileText, Loader2, ShieldCheck, X } from 'lucide-react'

import { OpenClawUiLaunchButton } from '@/components/openclaw-ui-launch-button'
import { WorkspaceMarkdownManagerDialog } from '@/components/workspace/workspace-markdown-manager-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isTenantDeploymentStillStarting } from '@/lib/deploy-progress'
import {
  MODEL_PROVIDER_MODEL_STORAGE_KEY,
  MODEL_PROVIDER_STORAGE_KEY,
} from '@/lib/model-providers'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import {
  MODEL_PROVIDER_SETUP_STORAGE_KEY,
  type ProviderSetupRecord,
  type ProviderSetupStorage,
} from '@/lib/provider-auth-config'
import {
  completeRuntimeOpenAICodexOAuth,
  listRuntimeModels,
  startRuntimeOpenAICodexOAuth,
} from '@/lib/runtime-controls'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { buildSignInPath, getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

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

function getStoredProviderSetup(): ProviderSetupStorage {
  if (typeof window === 'undefined') return {}

  const raw = window.localStorage.getItem(MODEL_PROVIDER_SETUP_STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as ProviderSetupStorage
  } catch {
    return {}
  }
}

function isOpenAIOAuthSetupPending(
  providerId: string | null | undefined,
  providerSetup: ProviderSetupRecord | null | undefined,
): boolean {
  return providerId === 'openai' && providerSetup?.method === 'oauth' && !providerSetup.oauthConnected
}

function normalizeOpenAIModelIdForRuntime(modelId: string): string {
  const normalized = modelId.trim()
  if (!normalized.startsWith('openai/')) return normalized
  return `openai-codex/${normalized.slice('openai/'.length)}`
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
  const [profileName, setProfileName] = useState('Account')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileInitial, setProfileInitial] = useState('A')
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [launchError, setLaunchError] = useState('')
  const [fileManagerOpen, setFileManagerOpen] = useState(false)
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

  const routerRef = useRef(router)
  routerRef.current = router

  const oauthUrlExpired = oauthExpiresAt ? Date.parse(oauthExpiresAt) <= oauthNowMs : false
  const oauthCountdownLabel = useMemo(
    () => (oauthExpiresAt ? formatOAuthExpiryCountdown(oauthExpiresAt, oauthNowMs) : null),
    [oauthExpiresAt, oauthNowMs],
  )

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

  const persistOpenAIOAuthConnected = useCallback(() => {
    if (typeof window === 'undefined') return
    const providerId = window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)
    if (providerId !== 'openai') return

    const setupStore = getStoredProviderSetup()
    const currentSetup = setupStore[providerId] ?? {}
    setupStore[providerId] = {
      ...currentSetup,
      method: 'oauth',
      oauthConnected: true,
      updatedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(MODEL_PROVIDER_SETUP_STORAGE_KEY, JSON.stringify(setupStore))
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
      const selectedModelId =
        typeof window === 'undefined'
          ? ''
          : window.localStorage.getItem(MODEL_PROVIDER_MODEL_STORAGE_KEY) ?? ''
      const runtimeModelId = normalizeOpenAIModelIdForRuntime(selectedModelId)
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
        setOauthStatus('OpenClaw is still starting. Retry in a few seconds.')
      } else if (/route\s+post:|not found/i.test(message)) {
        setOauthError('We could not start the OpenAI sign-in flow. Refresh and try again.')
      } else {
        setOauthError(message)
      }
    } finally {
      setOauthBusy(false)
    }
  }, [tenantId])

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
      const selectedModelId =
        typeof window === 'undefined'
          ? ''
          : window.localStorage.getItem(MODEL_PROVIDER_MODEL_STORAGE_KEY) ?? ''
      const runtimeModelId = normalizeOpenAIModelIdForRuntime(selectedModelId)
      const result = await completeRuntimeOpenAICodexOAuth(tenantId, {
        sessionId: oauthSessionId,
        callback,
        modelId: runtimeModelId || undefined,
      })
      if (!result.oauthConnected) {
        throw new Error('OAuth did not complete.')
      }

      persistOpenAIOAuthConnected()
      setOauthRequired(false)
      setOauthModalOpen(false)
      setOauthStatus('OpenAI OAuth is connected. You can launch OpenClaw now.')
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
  }, [oauthCallback, oauthSessionId, persistOpenAIOAuthConnected, tenantId])

  useEffect(() => {
    if (!oauthModalOpen || !oauthExpiresAt) {
      return
    }

    setOauthNowMs(Date.now())
    const timer = setInterval(() => setOauthNowMs(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [oauthExpiresAt, oauthModalOpen])

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
        const [subscription, deploymentStillStarting] = await Promise.all([
          fetchSubscriptionSnapshot(tid),
          isTenantDeploymentStillStarting(tid),
        ])

        if (!hasManagedHostingPlan(subscription)) {
          router.replace(
            buildBillingRequiredPath(deploymentStillStarting ? '/dashboard/deploy' : '/dashboard/model'),
          )
          return
        }

        if (deploymentStillStarting) {
          router.replace('/dashboard/deploy')
          return
        }

        const onboardingComplete = await isOnboardingComplete(session, { backfillFromProvisionedTenant: true })
        if (!onboardingComplete) {
          router.replace('/dashboard/model?restart=1')
          return
        }

        const providerId =
          typeof window === 'undefined' ? null : window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)
        const providerSetupStore = getStoredProviderSetup()
        const selectedProviderSetup = providerId ? providerSetupStore[providerId] ?? null : null
        let oauthPending = isOpenAIOAuthSetupPending(providerId, selectedProviderSetup)

        try {
          const runtimeModels = await listRuntimeModels(tid, { includeModels: false })
          const storedModelConfig = runtimeModels.storedModelConfig
          if (storedModelConfig?.modelProviderId === 'openai' && storedModelConfig.modelAuthMethod === 'oauth') {
            oauthPending = storedModelConfig.modelOauthConnected !== true
          }
        } catch {
          // Fall back to local onboarding storage when runtime model sync is unavailable.
        }

        const userMetadata = (session.user.user_metadata ?? {}) as Record<string, unknown>
        const fullName =
          typeof userMetadata.full_name === 'string' ? userMetadata.full_name.trim() : ''
        const fallbackName =
          typeof userMetadata.name === 'string' ? userMetadata.name.trim() : ''
        const email = session.user.email?.trim() ?? ''
        const displayName = fullName || fallbackName || email || 'Account'
        const pfpWebAvatar = buildPfpWebUrl(email)
        const metadataAvatar =
          typeof userMetadata.avatar_url === 'string' && userMetadata.avatar_url.trim()
            ? userMetadata.avatar_url.trim()
            : typeof userMetadata.picture === 'string' && userMetadata.picture.trim()
              ? userMetadata.picture.trim()
              : null

        if (!cancelled) {
          setTenantId(tid)
          setProfileName(displayName)
          setProfileEmail(email)
          setProfileInitial(buildProfileInitial(displayName || email))
          setProfileImageUrl(pfpWebAvatar ?? metadataAvatar)
          setOauthRequired(oauthPending)
          setOauthModalOpen(oauthPending)
          setOauthError('')
          setOauthStatus(
            oauthPending ? 'OpenAI OAuth is required before you can launch OpenClaw.' : '',
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

  if (checkingSession) {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-background">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[40%] left-1/2 h-[80%] w-[140%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.03),transparent_70%)]"
      />

      <div className="relative z-10 flex min-h-[100svh] flex-col">
        {/* Header */}
        <header className="px-5 py-4 sm:px-8 sm:py-5">
          <div className="mx-auto flex max-w-screen-lg items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.svg"
                alt="ClawPilot"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <span className="type-brand text-foreground">ClawPilot</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Open account menu"
                >
                  <Avatar className="h-8 w-8 border border-border/60">
                    {profileImageUrl ? (
                      <AvatarImage src={profileImageUrl} alt={profileName} />
                    ) : null}
                    <AvatarFallback className="bg-foreground text-[11px] font-semibold text-background">
                      {profileInitial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="py-2">
                  <p className="truncate text-xs font-medium text-foreground">{profileName}</p>
                  {profileEmail ? (
                    <p className="truncate text-[11px] text-muted-foreground">{profileEmail}</p>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/subscription">Subscription</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
        </header>

        {/* Main Content */}
        <main className="flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-4 sm:px-8">
          <div className="w-full max-w-[390px] rounded-[34px] border border-border/70 bg-card/70 p-5 shadow-[0_18px_44px_rgba(0,0,0,0.10)] backdrop-blur-sm sm:p-6">
            <div aria-hidden="true" className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-muted-foreground/25" />

            <div className="flex flex-col items-center text-center">
              {/* Logo with glow */}
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 scale-150 rounded-full bg-[radial-gradient(circle,rgba(179,33,40,0.06),transparent_70%)]"
                />
                <div className="relative rounded-[18px] border border-border/40 bg-gradient-to-b from-card to-background p-3.5 shadow-sm">
                  <Image
                    src="/logo.svg"
                    alt="OpenClaw"
                    width={56}
                    height={56}
                    className="h-14 w-14 object-contain"
                  />
                </div>
              </div>

              <h1 className="mt-6 text-[30px] font-semibold tracking-tight text-foreground sm:text-[32px]">
                OpenClaw Gateway
              </h1>

              {/* Error */}
              {launchError ? (
                <div className="mt-4 w-full rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-left text-[12.5px] leading-relaxed text-destructive">
                  {launchError}
                </div>
              ) : null}

              {oauthRequired ? (
                <div className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 text-left">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    Connect OpenAI before launch
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    Finish the OAuth step first. You will sign in to OpenAI, then paste the localhost callback URL here.
                  </p>
                </div>
              ) : null}

              {/* Launch button */}
              {oauthRequired ? (
                <Button
                  type="button"
                  onClick={handleOpenOauthWindow}
                  disabled={oauthBusy || !tenantId.trim()}
                  className="mt-4 h-10 w-full rounded-xl gap-2 text-[13.5px] font-semibold shadow-sm transition-all hover:shadow-md"
                >
                  {oauthBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  Connect OpenAI OAuth
                </Button>
              ) : (
                <OpenClawUiLaunchButton
                  tenantId={tenantId}
                  onUnauthorized={redirectToSignIn}
                  onLaunchStart={() => setLaunchError('')}
                  onError={setLaunchError}
                  label="Launch OpenClaw"
                  variant="default"
                  size="default"
                  className="mt-4 h-10 w-full rounded-xl gap-2 text-[13.5px] font-semibold shadow-sm transition-all hover:shadow-md"
                />
              )}

              <Button
                type="button"
                variant="outline"
                size="default"
                className="mt-2.5 h-10 w-full rounded-xl gap-2 text-[13.5px] font-medium"
                onClick={() => {
                  setLaunchError('')
                  setFileManagerOpen(true)
                }}
              >
                <FileText className="h-4 w-4" />
                Manage Files
              </Button>
            </div>
          </div>
        </main>

        {/* Footer hint */}
        <footer className="pb-6 text-center">
          <p className="text-[11px] text-muted-foreground/50">
            Opens in a new tab
          </p>
        </footer>
      </div>

      <WorkspaceMarkdownManagerDialog
        tenantId={tenantId}
        open={fileManagerOpen}
        onOpenChange={setFileManagerOpen}
        onUnauthorized={redirectToSignIn}
      />

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
                When approval finishes, your browser will show a URL that starts with{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[12px] text-foreground">
                  http://127.0.0.1:1455/callback...
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
                placeholder="http://127.0.0.1:1455/callback?..."
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
