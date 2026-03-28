'use client'

import type { Session } from '@supabase/supabase-js'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, Rocket, TerminalSquare } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SetupStepper } from '@/components/ui/setup-stepper'
import { readPersistedDeployStartedAt, writePersistedDeployStartedAt } from '@/lib/deploy-progress'
import {
  MODEL_PROVIDER_SETUP_STORAGE_KEY,
  type ProviderSetupRecord,
  type ProviderSetupStorage,
} from '@/lib/provider-auth-config'
import {
  MODEL_PROVIDER_MODEL_STORAGE_KEY,
  MODEL_PROVIDER_STORAGE_KEY,
  isModelSupportedByProvider,
} from '@/lib/model-providers'
import { isOnboardingComplete, markOnboardingComplete, markOnboardingIncomplete } from '@/lib/onboarding-state'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import {
  deriveTenantIdFromUserId,
  fetchTenantDaemonStatus,
  fetchTenantDaemonStatusSnapshot,
  tenantNeedsRedeploy,
  tenantHasProvisionedInstance,
  tenantHasReadyGateway,
  type TenantDaemonStatus,
} from '@/lib/tenant-instance'
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

const DEPLOY_STATUS_POLL_INTERVAL_MS = 5_000

const LENNY_MESSAGES: { atSecond: number; text: string }[] = [
  { atSecond: 0, text: "Hi. I'm Lenny. I'll watch this while your workspace gets ready." },
  { atSecond: 10, text: 'We are reserving your hosted workspace and getting everything in place.' },
  { atSecond: 30, text: 'OpenClaw is being installed and started for you.' },
  { atSecond: 60, text: 'This part can stay quiet for a bit while services finish starting.' },
  { atSecond: 90, text: 'We are still checking that everything is ready before we send you in.' },
  { atSecond: 150, text: 'Still working. This usually means the setup is finishing, not that it was lost.' },
  { atSecond: 240, text: 'Almost there. We are waiting for OpenClaw to finish coming online.' },
]

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

interface TerminalLine {
  id: string
  text: string
  tone: 'idle' | 'ok' | 'active'
}

type RuntimeSetupState = NonNullable<TenantDaemonStatus['instance']>

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
      <div className="max-h-72 overflow-auto px-4 py-3 font-mono text-[11px] leading-6">
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

function getVisibleLennyMessages(elapsedSeconds: number): string[] {
  return LENNY_MESSAGES.filter((message) => message.atSecond <= elapsedSeconds).map((message) => message.text)
}

function resolveDeploymentStatusText(status: TenantDaemonStatus | null): string {
  const daemonState = status?.daemon?.status?.trim().toUpperCase() ?? null
  if (!status) {
    return 'Getting your workspace ready...'
  }

  if (tenantHasReadyGateway(status)) {
    return 'OpenClaw is ready.'
  }

  if (daemonState === 'TERMINATED') {
    return ''
  }

  if (tenantHasProvisionedInstance(status)) {
    return 'Your hosted workspace is ready. OpenClaw is still starting.'
  }

  if (daemonState === 'RUNNING') {
    return 'Reserving your hosted workspace...'
  }

  if (daemonState === 'STOPPED') {
    return 'Your hosted workspace is waiting to start.'
  }

  return 'Getting your workspace ready...'
}

function HooksPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const forceRestartOnboarding = searchParams.get('restart') === '1'
  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [selectedModelProviderId, setSelectedModelProviderId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [providerSetup, setProviderSetup] = useState<ProviderSetupRecord | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [hasDeployStarted, setHasDeployStarted] = useState(() => readPersistedDeployStartedAt() !== null)
  const [deployStartedAt, setDeployStartedAt] = useState<number | null>(() => readPersistedDeployStartedAt())
  const [deployElapsedSeconds, setDeployElapsedSeconds] = useState(() => {
    const startedAt = readPersistedDeployStartedAt()
    return startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0
  })
  const [runtimeSetupState, setRuntimeSetupState] = useState<RuntimeSetupState | null>(null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const terminatedPollStreakRef = useRef(0)

  function resetDeployProgress() {
    setHasDeployStarted(false)
    setDeployStartedAt(null)
    setDeployElapsedSeconds(0)
    setRuntimeSetupState(null)
    terminatedPollStreakRef.current = 0
    writePersistedDeployStartedAt(null)
  }

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
        const derivedTenantId = deriveTenantIdFromUserId(session.user.id)

        let onboardingComplete = false
        if (forceRestartOnboarding) {
          try {
            await markOnboardingIncomplete(session)
          } catch {
            // Continue through the restart flow even if the profile flag reset fails.
          }
        } else {
          onboardingComplete = await isOnboardingComplete(session, {
            backfillFromProvisionedTenant: true,
          })
        }

        const daemonSnapshot = await fetchTenantDaemonStatusSnapshot(derivedTenantId)
        const daemonStatus = daemonSnapshot?.kind === 'ok' ? daemonSnapshot.status : null
        const daemonState = daemonStatus?.daemon?.status?.trim().toUpperCase() ?? null
        const hasProvisionedInstance = tenantHasProvisionedInstance(daemonStatus)
        let deploymentStillStarting = false
        if (
          (hasDeployStarted || hasProvisionedInstance || daemonState === 'RUNNING' || daemonState === 'STOPPED') &&
          daemonState !== 'TERMINATED'
        ) {
          deploymentStillStarting = !tenantHasReadyGateway(daemonStatus)
        }
        if (daemonSnapshot && tenantNeedsRedeploy(daemonSnapshot)) {
          deploymentStillStarting = false
          onboardingComplete = false
          try {
            await markOnboardingIncomplete(session)
          } catch {
            // Keep routing aligned with runtime truth even if profile cleanup lags.
          }
        }
        if (deploymentStillStarting) {
          onboardingComplete = false
        }

        const subscription = await fetchSubscriptionSnapshot(derivedTenantId)
        if (!hasManagedHostingPlan(subscription)) {
          router.replace(
            buildBillingRequiredPath(
              deploymentStillStarting ? '/dashboard/deploy' : onboardingComplete ? '/dashboard/chat' : '/dashboard/model',
            ),
          )
          return
        }
        if (onboardingComplete) {
          router.replace('/dashboard/chat')
          return
        }

        if (!cancelled) {
          if (deploymentStillStarting && !hasDeployStarted) {
            const startedAt = Date.now()
            writePersistedDeployStartedAt(startedAt)
            setHasDeployStarted(true)
            setDeployStartedAt(startedAt)
            setDeployElapsedSeconds(0)
          }
          setActiveSession(session)
          setTenantId(derivedTenantId)
          setSelectedModelProviderId(providerId)
          setSelectedModelId(isModelSupportedByProvider(providerId, modelId) ? modelId : null)
          setProviderSetup(selectedSetup)
          setRuntimeSetupState(daemonStatus?.instance ?? null)
          setStatus(deploymentStillStarting ? resolveDeploymentStatusText(daemonStatus) : '')
          setCheckingSession(false)
        }

        window.localStorage.removeItem('clawpilot:openclaw-install-profile')
        window.localStorage.removeItem('clawpilot:skills')
        window.localStorage.removeItem('clawpilot:skills-skipped')
        window.localStorage.removeItem('clawpilot:skills-config')
      } catch {
        router.replace('/signin')
      }
    }

    void loadSessionAndOnboardingState()

    return () => {
      cancelled = true
    }
  }, [forceRestartOnboarding, hasDeployStarted, router])

  const onboardingChecks = useMemo(
    () => [
      { label: 'Provider', complete: Boolean(selectedModelProviderId) },
      { label: 'Model', complete: Boolean(selectedModelId) },
      { label: 'Auth', complete: Boolean(providerSetup) },
    ],
    [providerSetup, selectedModelId, selectedModelProviderId],
  )

  const allChecksComplete = onboardingChecks.every((check) => check.complete)

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!deployStartedAt) {
      return
    }

    setDeployElapsedSeconds(Math.max(0, Math.floor((Date.now() - deployStartedAt) / 1000)))
    const timer = setInterval(() => {
      setDeployElapsedSeconds(Math.max(0, Math.floor((Date.now() - deployStartedAt) / 1000)))
    }, 1000)

    return () => clearInterval(timer)
  }, [deployStartedAt])

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

  const finalizeSetupAndRedirect = useCallback(
    async (nextStatus: string) => {
      setShowConfetti(true)
      setHasDeployStarted(false)
      setError('')
      setStatus(nextStatus)
      writePersistedDeployStartedAt(null)

      if (activeSession) {
        try {
          await markOnboardingComplete(activeSession)
        } catch {
          // Keep the successful deploy path moving even if profile persistence lags.
        }
      }

      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }

      redirectTimeoutRef.current = setTimeout(() => {
        router.push('/dashboard/chat')
      }, 900)
    },
    [activeSession, router],
  )

  useEffect(() => {
    if (!hasDeployStarted || !tenantId || !activeSession || checkingSession || showConfetti) {
      return
    }

    let cancelled = false
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    const scheduleNextPoll = () => {
      timeoutHandle = setTimeout(() => {
        void pollDeploymentReadiness()
      }, DEPLOY_STATUS_POLL_INTERVAL_MS)
    }

    const pollDeploymentReadiness = async () => {
      const daemonSnapshot = await fetchTenantDaemonStatusSnapshot(tenantId)
      if (cancelled) {
        return
      }

      if (tenantNeedsRedeploy(daemonSnapshot)) {
        resetDeployProgress()
        try {
          await markOnboardingIncomplete(activeSession)
        } catch {
          // Ignore delayed profile cleanup and keep the UI moving.
        }
        setError('We could not find your hosted workspace. Please deploy again.')
        setStatus('')
        return
      }

      const daemonStatus = daemonSnapshot.kind === 'ok' ? daemonSnapshot.status : null
      setRuntimeSetupState(daemonStatus?.instance ?? null)

      if (tenantHasReadyGateway(daemonStatus)) {
        terminatedPollStreakRef.current = 0
        await finalizeSetupAndRedirect('Deployment complete. Opening chat...')
        return
      }

      const daemonState = daemonStatus?.daemon?.status?.trim().toUpperCase() ?? null
      if (daemonState === 'TERMINATED') {
        terminatedPollStreakRef.current += 1
        const deployAgeMs = deployStartedAt ? Date.now() - deployStartedAt : 0
        const hasReservedWorkspace = tenantHasProvisionedInstance(daemonStatus)
        if (terminatedPollStreakRef.current < 3 && (!hasReservedWorkspace || deployAgeMs < 15_000)) {
          setError('')
          setStatus('Still getting your workspace ready...')
          scheduleNextPoll()
          return
        }
        resetDeployProgress()
        setError("We couldn't finish getting your workspace ready. Please try deploying again.")
        setStatus('')
        return
      }

      terminatedPollStreakRef.current = 0
      setError('')
      setStatus(resolveDeploymentStatusText(daemonStatus))
      scheduleNextPoll()
    }

    void pollDeploymentReadiness()

    return () => {
      cancelled = true
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
    }
  }, [activeSession, checkingSession, finalizeSetupAndRedirect, hasDeployStarted, showConfetti, tenantId])

  async function completeSetup() {
    const validationError = validateBeforeSubmit()
    if (validationError) {
      setError(validationError)
      setStatus('')
      return
    }

    const startedAt = Date.now()
    setSubmitting(true)
    setHasDeployStarted(true)
    setDeployStartedAt(startedAt)
    setDeployElapsedSeconds(0)
    setRuntimeSetupState(null)
    terminatedPollStreakRef.current = 0
    writePersistedDeployStartedAt(startedAt)
    setError('')
    setStatus('Getting your workspace ready...')
    setShowConfetti(false)

    try {
      const session = await getRecoveredSupabaseSession({ timeoutMs: 2_500 })
      const accessToken = session?.access_token?.trim() ?? ''
      if (!accessToken) {
        resetDeployProgress()
        setError('Session expired. Please sign in again.')
        setStatus('')
        return
      }

      const response = await fetch('/api/onboarding/install', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
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
          },
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        message?: string
        backend?: {
          error?: string
          message?: string
        }
      }

      if (!response.ok) {
        const backendError = payload.backend?.error ?? null
        const isUpgradeRequired =
          response.status === 403 &&
          (payload.error === 'UPGRADE_REQUIRED' || payload.error === 'TENANT_TERMINATED' || backendError === 'TENANT_TERMINATED')

        if (isUpgradeRequired) {
          resetDeployProgress()
          router.replace(buildBillingRequiredPath('/dashboard/model'))
          return
        }

        resetDeployProgress()
        setError(payload.message ?? payload.error ?? 'Deploy failed.')
        setStatus('')
        return
      }

      setStatus('Deploy request accepted. We are preparing your hosted workspace.')
    } catch {
      resetDeployProgress()
      setError('Network error.')
      setStatus('')
    } finally {
      setSubmitting(false)
    }
  }

  const terminalLines = useMemo(() => {
    const lines: TerminalLine[] = onboardingChecks.map((check) => ({
      id: `check-${check.label}`,
      text: check.complete ? `${check.label} is ready.` : `${check.label} still needs attention.`,
      tone: check.complete ? 'ok' : 'idle',
    }))

    if (hasDeployStarted) {
      const hasWorkspace = Boolean(runtimeSetupState?.instanceId?.trim() || runtimeSetupState?.instanceState?.trim())
      const ready = runtimeSetupState?.setupComplete === true || runtimeSetupState?.gatewayProbe?.ready === true
      const hasRecentCheck = Boolean(runtimeSetupState?.gatewayProbe?.checkedAt)

      lines.push({
        id: 'deploy-workspace',
        text: hasWorkspace ? 'Your hosted workspace has been reserved.' : 'Reserving your hosted workspace.',
        tone: hasWorkspace ? 'ok' : 'active',
      })
      lines.push({
        id: 'deploy-openclaw',
        text: ready
          ? 'OpenClaw is ready to open.'
          : hasRecentCheck
            ? 'OpenClaw is starting and we are checking the connection.'
            : 'Installing and starting OpenClaw.',
        tone: ready ? 'ok' : 'active',
      })
    }

    if (error) {
      lines.push({
        id: 'deploy-error',
        text: error,
        tone: 'active',
      })
    }

    return lines
  }, [error, hasDeployStarted, onboardingChecks, runtimeSetupState])

  const currentLennyMessage = useMemo(() => {
    if (!hasDeployStarted) {
      return null
    }

    if (runtimeSetupState?.instanceId && !tenantHasReadyGateway({ instance: runtimeSetupState })) {
      return 'Good news: your hosted workspace is ready. OpenClaw is still finishing up.'
    }

    const visibleMessages = getVisibleLennyMessages(deployElapsedSeconds)
    return visibleMessages.at(-1) ?? "I'm watching the deploy logs."
  }, [deployElapsedSeconds, hasDeployStarted, runtimeSetupState])

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
            <Link href="/dashboard/openclaw">
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

              {hasDeployStarted && currentLennyMessage ? (
                <section className="rounded-xl border border-border/70 bg-card/80 p-4">
                  <div className="flex gap-2.5">
                    <Image
                      src="/pfp.webp"
                      alt="Lenny the lobster"
                      width={32}
                      height={32}
                      className="mt-0.5 h-8 w-8 shrink-0 rounded-full"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground/70">Lenny</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{currentLennyMessage}</p>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>

            {hasDeployStarted ? (
              <div className="space-y-4">
                <section className="rounded-xl border border-border/70 bg-card/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold">
                      <TerminalSquare className="h-4 w-4 text-muted-foreground" />
                      Progress
                    </p>
                    {deployStartedAt ? (
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {Math.floor(deployElapsedSeconds / 60)}:{String(deployElapsedSeconds % 60).padStart(2, '0')}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <DeployTerminal lines={terminalLines} running={submitting || !tenantHasReadyGateway({ instance: runtimeSetupState ?? undefined })} />
                  </div>
                </section>

              </div>
            ) : null}
          </div>

          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="max-w-2xl flex-1 space-y-1">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
                {!allChecksComplete ? <p className="text-xs text-muted-foreground">Complete checks.</p> : null}
              </div>

              <Button
                type="button"
                onClick={completeSetup}
                disabled={submitting || hasDeployStarted || showConfetti || !allChecksComplete}
                className="self-end sm:ml-auto sm:min-w-28"
              >
                {submitting || hasDeployStarted ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying
                  </>
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

export default function HooksPage() {
  return (
    <Suspense fallback={null}>
      <HooksPageClient />
    </Suspense>
  )
}
