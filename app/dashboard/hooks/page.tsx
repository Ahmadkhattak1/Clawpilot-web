'use client'

import type { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Rocket, ShieldCheck, TerminalSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SetupStepper } from '@/components/ui/setup-stepper'
import {
  MODEL_PROVIDER_SETUP_STORAGE_KEY,
  type ProviderSetupRecord,
  type ProviderSetupStorage,
} from '@/lib/provider-auth-config'
import {
  MODEL_PROVIDER_MODEL_STORAGE_KEY,
  MODEL_PROVIDER_STORAGE_KEY,
  getProviderModelOption,
  isModelSupportedByProvider,
} from '@/lib/model-providers'
import { isOnboardingComplete, markOnboardingComplete } from '@/lib/onboarding-state'
import { completeRuntimeOpenAICodexOAuth, startRuntimeOpenAICodexOAuth } from '@/lib/runtime-controls'
import { SKILLS_CONFIG_STORAGE_KEY, SKILLS_STORAGE_KEY, type SkillConfigStorage } from '@/lib/skill-options'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

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

function getStoredSkillIds(): string[] {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(SKILLS_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => typeof item === 'string')
  } catch {
    return []
  }
}

function getStoredSkillConfig(): SkillConfigStorage {
  if (typeof window === 'undefined') return {}

  const raw = window.localStorage.getItem(SKILLS_CONFIG_STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as SkillConfigStorage
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

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  return fallback
}

const DEPLOY_STAGE_LABELS = [
  'bootstrap runtime',
  'install dependencies',
  'configure gateway',
  'hydrate skills',
  'final health check',
] as const

interface TerminalLine {
  id: string
  text: string
  tone: 'idle' | 'ok' | 'active'
}

function DeployTerminal({
  lines,
  running,
}: {
  lines: TerminalLine[]
  running: boolean
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-lg shadow-primary/10">
      <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">deploy.log</p>
      </div>
      <div className="max-h-64 overflow-auto px-4 py-3 font-mono text-[11px] leading-6">
        {lines.map((line) => (
          <p
            key={line.id}
            className={
              line.tone === 'ok'
                ? 'text-emerald-700'
                : line.tone === 'active'
                  ? 'text-amber-700'
                  : 'text-muted-foreground'
            }
          >
            {line.text}
          </p>
        ))}
        {running ? (
          <motion.span
            className="mt-1 inline-block h-4 w-2 bg-foreground"
            animate={{ opacity: [1, 0.1, 1] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : null}
      </div>
    </section>
  )
}

interface ConfettiPiece {
  id: number
  left: number
  drift: number
  rotate: number
  delay: number
  duration: number
  size: number
  color: string
}

function buildConfettiPieces() {
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--foreground))',
    'hsl(var(--muted-foreground))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
  ]
  const pieces: ConfettiPiece[] = []

  for (let i = 0; i < 54; i += 1) {
    pieces.push({
      id: i,
      left: Math.random() * 100,
      drift: (Math.random() - 0.5) * 260,
      rotate: (Math.random() - 0.5) * 760,
      delay: Math.random() * 0.22,
      duration: 1.2 + Math.random() * 1.1,
      size: 5 + Math.random() * 8,
      color: colors[i % colors.length] ?? colors[0],
    })
  }

  return pieces
}

function MagicConfetti({ show }: { show: boolean }) {
  const reduceMotion = useReducedMotion()
  const pieces = useMemo(buildConfettiPieces, [])

  if (reduceMotion) return null

  return (
    <AnimatePresence>
      {show ? (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {pieces.map((piece) => (
            <motion.span
              key={piece.id}
              className="absolute top-0 rounded-[2px]"
              style={{
                left: `${piece.left}%`,
                width: `${piece.size}px`,
                height: `${Math.max(4, piece.size * 0.45)}px`,
                backgroundColor: piece.color,
              }}
              initial={{ y: -18, x: 0, opacity: 0, rotate: 0 }}
              animate={{
                y: [0, 460],
                x: [0, piece.drift],
                opacity: [0, 1, 1, 0],
                rotate: [0, piece.rotate],
              }}
              exit={{ opacity: 0 }}
              transition={{
                delay: piece.delay,
                duration: piece.duration,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      ) : null}
    </AnimatePresence>
  )
}

export default function HooksPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const [selectedModelProviderId, setSelectedModelProviderId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [providerSetup, setProviderSetup] = useState<ProviderSetupRecord | null>(null)
  const [skillIds, setSkillIds] = useState<string[]>([])
  const [skillConfigs, setSkillConfigs] = useState<Record<string, Record<string, string>>>({})
  const [deployStageIndex, setDeployStageIndex] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [hasDeployStarted, setHasDeployStarted] = useState(false)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [oauthSessionId, setOauthSessionId] = useState('')
  const [oauthAuthUrl, setOauthAuthUrl] = useState('')
  const [oauthExpiresAt, setOauthExpiresAt] = useState<string | null>(null)
  const [oauthCallback, setOauthCallback] = useState('')
  const [oauthSubmitting, setOauthSubmitting] = useState(false)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSessionAndOnboardingState() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          router.replace('/signin')
          return
        }

        const providerId = window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)
        const modelId = window.localStorage.getItem(MODEL_PROVIDER_MODEL_STORAGE_KEY)
        const providerSetupStore = getStoredProviderSetup()
        const selectedSetup = providerId ? providerSetupStore[providerId] ?? null : null

        const complete = await isOnboardingComplete(session, {
          backfillFromProvisionedTenant: !isOpenAIOAuthSetupPending(providerId, selectedSetup),
        })
        if (complete) {
          router.replace('/chat')
          return
        }

        const derivedTenantId = deriveTenantIdFromUserId(session.user.id)
        const skillConfigStore = getStoredSkillConfig()

        if (!cancelled) {
          setActiveSession(session)
          setTenantId(derivedTenantId)
          setSelectedModelProviderId(providerId)
          setSelectedModelId(isModelSupportedByProvider(providerId, modelId) ? modelId : null)
          setProviderSetup(selectedSetup)
          setSkillIds(getStoredSkillIds())
          setSkillConfigs(
            Object.fromEntries(
              Object.entries(skillConfigStore).map(([skillId, config]) => [skillId, config?.values ?? {}]),
            ),
          )
          setCheckingSession(false)
        }

        // Clean up legacy install profile from localStorage
        window.localStorage.removeItem('clawpilot:openclaw-install-profile')
      } catch {
        router.replace('/signin')
      }
    }

    void loadSessionAndOnboardingState()

    return () => {
      cancelled = true
    }
  }, [router])

  const selectedModelLabel = useMemo(() => {
    if (!selectedModelProviderId || !selectedModelId) return null
    return getProviderModelOption(selectedModelProviderId, selectedModelId)?.label ?? selectedModelId
  }, [selectedModelId, selectedModelProviderId])

  const onboardingChecks = useMemo(() => {
    return [
      {
        label: 'Provider',
        complete: Boolean(selectedModelProviderId),
      },
      {
        label: 'Model',
        complete: Boolean(selectedModelId),
      },
      {
        label: 'Auth',
        complete: Boolean(providerSetup),
      },
    ]
  }, [providerSetup, selectedModelId, selectedModelProviderId])

  const allChecksComplete = onboardingChecks.every((check) => check.complete)
  const requiresPostInstallOpenAIOAuth = isOpenAIOAuthSetupPending(selectedModelProviderId, providerSetup)
  const waitingForPostInstallOpenAIOAuth =
    requiresPostInstallOpenAIOAuth &&
    hasDeployStarted &&
    !submitting &&
    !showConfetti &&
    deployStageIndex >= DEPLOY_STAGE_LABELS.length

  useEffect(() => {
    if (submitting || showConfetti || waitingForPostInstallOpenAIOAuth) return
    setDeployStageIndex(0)
  }, [showConfetti, submitting, waitingForPostInstallOpenAIOAuth])

  useEffect(() => {
    if (!submitting) return

    const timer = setInterval(() => {
      setDeployStageIndex((previous) => Math.min(previous + 1, DEPLOY_STAGE_LABELS.length))
    }, 720)

    return () => clearInterval(timer)
  }, [submitting])

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  function validateBeforeSubmit() {
    if (!selectedModelProviderId || !selectedModelId || !providerSetup) {
      return 'Complete setup.'
    }

    if (!isModelSupportedByProvider(selectedModelProviderId, selectedModelId)) {
      return 'Unsupported model.'
    }

    if (!tenantId) {
      return 'Session error.'
    }

    return null
  }

  function syncProviderSetupOAuthConnected() {
    if (typeof window === 'undefined' || selectedModelProviderId !== 'openai') {
      return
    }

    const setupStore = getStoredProviderSetup()
    const current = setupStore.openai
    if (!current || current.method !== 'oauth') {
      return
    }

    const nextSetup: ProviderSetupStorage = {
      ...setupStore,
      openai: {
        ...current,
        oauthConnected: true,
        updatedAt: new Date().toISOString(),
      },
    }

    window.localStorage.setItem(MODEL_PROVIDER_SETUP_STORAGE_KEY, JSON.stringify(nextSetup))
    setProviderSetup(nextSetup.openai ?? null)
  }

  async function finalizeSetupAndRedirect(nextStatus: string) {
    setShowConfetti(true)
    setError('')
    setStatus(nextStatus)

    if (activeSession) {
      try {
        await markOnboardingComplete(activeSession)
      } catch {
        // Non-blocking for successful deploys.
      }
    }

    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current)
    }

    redirectTimeoutRef.current = setTimeout(() => {
      router.push('/chat')
    }, 1200)
  }

  async function startOpenAIOAuthSession(options?: { auto?: boolean }) {
    if (!tenantId) {
      setError('Session error.')
      return
    }

    setOauthSubmitting(true)
    setError('')

    try {
      const oauthStart = await startRuntimeOpenAICodexOAuth(tenantId, {
        modelId: selectedModelId ?? undefined,
      })
      setOauthSessionId(oauthStart.sessionId)
      setOauthAuthUrl(oauthStart.authUrl)
      setOauthExpiresAt(oauthStart.expiresAt)
      setStatus(
        options?.auto
          ? 'Deployment complete. Open the OAuth URL, sign in, then paste the localhost callback URL below.'
          : 'OAuth URL ready. Open it, sign in, then paste the localhost callback URL below.',
      )
    } catch (oauthError) {
      setError(readErrorMessage(oauthError, 'Unable to start OpenAI OAuth.'))
      if (options?.auto) {
        setStatus('Deployment complete. Generate an OAuth URL to finish setup.')
      }
    } finally {
      setOauthSubmitting(false)
    }
  }

  async function completeOpenAIOAuthSession() {
    if (!tenantId) {
      setError('Session error.')
      return
    }

    const callback = oauthCallback.trim()
    if (!oauthSessionId) {
      setError('Generate OAuth URL first.')
      return
    }
    if (!callback) {
      setError('Paste callback URL.')
      return
    }

    setOauthSubmitting(true)
    setError('')
    setStatus('Finalizing OpenAI OAuth...')

    try {
      const oauthResult = await completeRuntimeOpenAICodexOAuth(tenantId, {
        sessionId: oauthSessionId,
        callback,
        modelId: selectedModelId ?? undefined,
      })

      if (!oauthResult.oauthConnected) {
        throw new Error('OpenAI OAuth did not complete.')
      }

      syncProviderSetupOAuthConnected()
      setOauthCallback('')
      await finalizeSetupAndRedirect('OpenAI OAuth connected. Opening chat...')
    } catch (oauthError) {
      setError(readErrorMessage(oauthError, 'Unable to complete OpenAI OAuth.'))
      setStatus('')
    } finally {
      setOauthSubmitting(false)
    }
  }

  async function completeSetup() {
    const validationError = validateBeforeSubmit()
    if (validationError) {
      setError(validationError)
      setStatus('')
      return
    }

    setSubmitting(true)
    setHasDeployStarted(true)
    setError('')
    setStatus('Deploy in progress...')
    setShowConfetti(false)
    setOauthSessionId('')
    setOauthAuthUrl('')
    setOauthExpiresAt(null)
    setOauthCallback('')

    try {
      const response = await fetch('/api/onboarding/install', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          onboarding: {
            modelProviderId: selectedModelProviderId,
            modelId: selectedModelId,
            modelSetup: {
              ...providerSetup,
              apiKey: providerSetup?.apiKey,
            },
            skillIds,
            skillConfigs,
          },
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        message?: string
      }

      if (!response.ok) {
        setError(payload.message ?? payload.error ?? 'Deploy failed.')
        setStatus('')
        setDeployStageIndex(0)
        return
      }

      setDeployStageIndex(DEPLOY_STAGE_LABELS.length)
      if (requiresPostInstallOpenAIOAuth) {
        setStatus('Deployment complete. Preparing OpenAI OAuth...')
        await startOpenAIOAuthSession({ auto: true })
        return
      }

      await finalizeSetupAndRedirect('Deployment complete. Opening chat...')
    } catch {
      setError('Network error.')
      setStatus('')
      setDeployStageIndex(0)
    } finally {
      setSubmitting(false)
    }
  }

  const terminalLines = useMemo(() => {
    const checkLines: TerminalLine[] = onboardingChecks.map((check) => ({
      id: `check-${check.label}`,
      text: `[preflight] ${check.label.toLowerCase()} ${check.complete ? 'ok' : 'missing'}`,
      tone: check.complete ? 'ok' : 'idle',
    }))

    const deployLines: TerminalLine[] = DEPLOY_STAGE_LABELS.map((label, index) => {
      const isDone = showConfetti || waitingForPostInstallOpenAIOAuth || (submitting && index < deployStageIndex)
      const isActive = submitting && !showConfetti && index === deployStageIndex
      return {
        id: `deploy-${label}`,
        text: `[deploy] ${label}${isDone ? ' complete' : isActive ? ' running' : ''}`,
        tone: isDone ? 'ok' : isActive ? 'active' : 'idle',
      }
    })

    if (waitingForPostInstallOpenAIOAuth) {
      deployLines.push({
        id: 'deploy-oauth-wait',
        text: '[deploy] runtime reachable, waiting for OpenAI OAuth callback',
        tone: 'active',
      })
    } else if (showConfetti) {
      deployLines.push({
        id: 'deploy-success',
        text: '[deploy] runtime reachable, chat service online',
        tone: 'ok',
      })
    }

    if (error) {
      deployLines.push({
        id: 'deploy-error',
        text: `[deploy] error: ${error}`,
        tone: 'active',
      })
    }

    return [...checkLines, ...deployLines]
  }, [deployStageIndex, error, onboardingChecks, showConfetti, submitting, waitingForPostInstallOpenAIOAuth])

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
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background"
      />
      <MagicConfetti show={showConfetti} />

      <Card className="relative z-10 mx-auto flex min-h-[620px] w-full max-w-5xl flex-col border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-3 px-6 pt-7 md:px-10 md:pt-9">
          <Button variant="link" className="h-auto w-fit p-0 text-xs text-muted-foreground" asChild>
            <Link href="/skills/setup">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>Deploy</CardDescription>
          <SetupStepper currentStep="deployment" className="pt-1" />
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-6 pb-7 md:px-10 md:pb-10">
          <div
            className={cn(
              'grid flex-1 gap-6',
              hasDeployStarted ? 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]' : undefined,
            )}
          >
            <div className="space-y-6">
              <section className="rounded-xl border border-border/70 bg-card p-4">
                <p className="text-sm font-semibold">Checks</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {onboardingChecks.map((check) => (
                    <li key={check.label} className="flex items-center gap-2">
                      {check.complete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
                      )}
                      <span>{check.label}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-border/70 bg-card p-4">
                <p className="text-sm font-semibold">Summary</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>Provider: <span className="font-medium text-foreground">{selectedModelProviderId ?? '-'}</span></p>
                  <p>Model: <span className="font-medium text-foreground">{selectedModelLabel ?? '-'}</span></p>
                  <p>Skills: <span className="font-medium text-foreground">{skillIds.length || '-'}</span></p>
                </div>
              </section>
            </div>

            {hasDeployStarted ? (
              <div className="space-y-4">
                <section className="rounded-xl border border-border/70 bg-card/80 p-4">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    <TerminalSquare className="h-4 w-4 text-muted-foreground" />
                    Deployment Terminal
                  </p>
                  <div className="mt-2">
                    <DeployTerminal lines={terminalLines} running={submitting} />
                  </div>
                </section>

                {waitingForPostInstallOpenAIOAuth ? (
                  <section className="rounded-xl border border-border/70 bg-card/80 p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      OpenAI OAuth
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Open the OAuth URL in a new tab, complete sign-in, then paste the full localhost callback URL.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void startOpenAIOAuthSession()}
                        disabled={submitting || oauthSubmitting}
                      >
                        {oauthSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating
                          </>
                        ) : oauthSessionId ? (
                          'Regenerate URL'
                        ) : (
                          'Generate URL'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => window.open(oauthAuthUrl, '_blank', 'noopener,noreferrer')}
                        disabled={!oauthAuthUrl || submitting || oauthSubmitting}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open URL
                      </Button>
                    </div>

                    {oauthExpiresAt ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Expires: {new Date(oauthExpiresAt).toLocaleString()}
                      </p>
                    ) : null}

                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-medium text-foreground">Callback URL</p>
                      <Input
                        value={oauthCallback}
                        onChange={(event) => setOauthCallback(event.target.value)}
                        placeholder="http://localhost:1455/auth/callback?code=...&state=..."
                        autoComplete="off"
                      />
                    </div>

                    <Button
                      type="button"
                      className="mt-3"
                      onClick={() => void completeOpenAIOAuthSession()}
                      disabled={!oauthSessionId || !oauthCallback.trim() || submitting || oauthSubmitting}
                    >
                      {oauthSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Completing
                        </>
                      ) : (
                        'Complete OAuth'
                      )}
                    </Button>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="max-w-2xl flex-1 space-y-1">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
                {waitingForPostInstallOpenAIOAuth ? (
                  <p className="text-xs text-muted-foreground">Finish OAuth to complete onboarding.</p>
                ) : !allChecksComplete ? (
                  <p className="text-xs text-muted-foreground">Complete checks.</p>
                ) : null}
              </div>

              <Button
                type="button"
                onClick={completeSetup}
                disabled={submitting || oauthSubmitting || showConfetti || waitingForPostInstallOpenAIOAuth || !allChecksComplete}
                className="self-end sm:ml-auto sm:min-w-28"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying
                  </>
                ) : waitingForPostInstallOpenAIOAuth ? (
                  'Awaiting OAuth'
                ) : showConfetti ? (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Launched
                  </>
                ) : (
                  'Deploy'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
