'use client'

import * as Dialog from '@radix-ui/react-dialog'
import type { Session } from '@supabase/supabase-js'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock3, Copy, Loader2, Mail, Rocket, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { OnboardingAccountMenu } from '@/components/dashboard/onboarding-account-menu'
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
  isProviderAvailableForRuntime,
  isModelSupportedByProvider,
  isModelSupportedByProviderSetupMethod,
} from '@/lib/model-providers'
import { isOnboardingComplete, markOnboardingComplete, markOnboardingIncomplete } from '@/lib/onboarding-state'
import {
  getRuntimeAgentPath,
  getRuntimeProduct,
  readStoredRuntimeKind,
  type RuntimeKind,
  type RuntimeProduct,
} from '@/lib/runtime-products'
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

const DEPLOY_STATUS_POLL_INTERVAL_MS = 2_500
const DEPLOY_TERMINATED_CONFIRMATION_WINDOW_MS = 15_000
const DEPLOY_TERMINATED_CONFIRMATION_POLLS = Math.ceil(
  DEPLOY_TERMINATED_CONFIRMATION_WINDOW_MS / DEPLOY_STATUS_POLL_INTERVAL_MS,
)
const CONTACT_EMAIL = 'support@clawpilot.app'
const RUNTIME_GATEWAY_PORTS: Record<RuntimeKind, number> = {
  openclaw: 18789,
  hermes: 9119,
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
    <div className="min-h-0 flex-1 overflow-auto font-mono text-[11px] leading-6">
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
  )
}

function DeploymentProgressCue({
  runtimeProduct,
  elapsedSeconds,
  running,
}: {
  runtimeProduct: RuntimeProduct
  elapsedSeconds: number
  running: boolean
}) {
  const elapsedMinutes = Math.max(0, Math.floor(elapsedSeconds / 60))

  return (
    <div className="rounded-lg border border-border/70 bg-background/85 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            {running ? (
              <span className="absolute inset-0 rounded-full border border-foreground/40 animate-ping" />
            ) : null}
            <Clock3 className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Preparing your hosted {runtimeProduct.shortName}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              This usually takes about 10 minutes. You can come back later; we will email you when it is ready to use.
            </p>
          </div>
        </div>
        <div className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
          {elapsedMinutes < 1 ? 'Starting now' : `${elapsedMinutes} min elapsed`}
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full w-1/3 rounded-full bg-foreground"
          animate={{ x: ['-120%', '320%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}

function resolveDeploymentStatusText(status: TenantDaemonStatus | null, runtimeKind: RuntimeKind | null): string {
  const runtimeProduct = getRuntimeProduct(runtimeKind)
  const daemonState = status?.daemon?.status?.trim().toUpperCase() ?? null
  if (!status) {
    return `Getting your ${runtimeProduct.deploymentNoun} ready...`
  }

  if (tenantHasReadyGateway(status)) {
    return runtimeProduct.readyText
  }

  if (daemonState === 'TERMINATED') {
    return ''
  }

  if (tenantHasProvisionedInstance(status)) {
    return `Your hosted machine is ready. ${runtimeProduct.shortName} is still starting.`
  }

  if (daemonState === 'RUNNING') {
    return 'Reserving your hosted machine...'
  }

  if (daemonState === 'STOPPED') {
    return 'Your hosted machine is waiting to start.'
  }

  return `Getting your ${runtimeProduct.deploymentNoun} ready...`
}

function statusMatchesSelectedRuntime(status: TenantDaemonStatus | null, runtimeKind: RuntimeKind | null): boolean {
  if (!runtimeKind) return true
  const reportedPort = status?.instance?.gatewayProbe?.gatewayPort
  return reportedPort === undefined || reportedPort === RUNTIME_GATEWAY_PORTS[runtimeKind]
}

function getRuntimeMismatchMessage() {
  return 'This account already has a different hosted runtime. Use the instance on the dashboard; additional runtimes are disabled in this build.'
}

function isProviderSetupCompleteForDeploy(input: {
  runtimeKind: RuntimeKind | null
  providerId: string | null
  modelId: string | null
  providerSetup: ProviderSetupRecord | null
}): boolean {
  if (!input.runtimeKind || !input.providerId || !input.modelId || !input.providerSetup) {
    return false
  }

  if (!isProviderAvailableForRuntime(input.providerId, input.runtimeKind)) {
    return false
  }

  if (!isModelSupportedByProvider(input.providerId, input.modelId)) {
    return false
  }

  if (!isModelSupportedByProviderSetupMethod(input.providerId, input.modelId, input.providerSetup.method)) {
    return false
  }

  const isHermesNousOAuth =
    input.runtimeKind === 'hermes'
    && input.providerId === 'nous'
    && input.providerSetup.method === 'oauth'

  if (input.runtimeKind === 'hermes' && input.providerSetup.method !== 'api-key' && !isHermesNousOAuth) {
    return false
  }

  if (input.providerSetup.method === 'api-key') {
    return Boolean(input.providerSetup.apiKey?.trim())
  }

  return true
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
  const [contactOpen, setContactOpen] = useState(false)
  const [contactCopied, setContactCopied] = useState(false)
  const [runtimeKind, setRuntimeKind] = useState<RuntimeKind | null>(null)
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
    const providerId = window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)
    const modelId = window.localStorage.getItem(MODEL_PROVIDER_MODEL_STORAGE_KEY)
    const providerSetupStore = getStoredProviderSetup()
    const selectedSetup = providerId ? providerSetupStore[providerId] ?? null : null
    const storedRuntimeKind = readStoredRuntimeKind()

    if (!storedRuntimeKind) {
      router.replace(forceRestartOnboarding ? '/dashboard/runtime?restart=1' : '/dashboard/runtime')
      return () => {
        cancelled = true
      }
    }

    setSelectedModelProviderId(providerId)
    setSelectedModelId(isModelSupportedByProvider(providerId, modelId) ? modelId : null)
    setProviderSetup(selectedSetup)
    setRuntimeKind(storedRuntimeKind)
    setCheckingSession(false)

    async function loadSessionAndOnboardingState() {
      try {
        const session = await getRecoveredSupabaseSession({ timeoutMs: 2500 })
        if (!session) {
          router.replace('/signin')
          return
        }

        const derivedTenantId = deriveTenantIdFromUserId(session.user.id)

        const daemonSnapshot = await fetchTenantDaemonStatusSnapshot(derivedTenantId)
        const subscriptionPromise = fetchSubscriptionSnapshot(derivedTenantId)
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
            daemonSnapshot,
          })
        }

        const daemonStatus = daemonSnapshot?.kind === 'ok' ? daemonSnapshot.status : null
        const statusMatchesRuntime = statusMatchesSelectedRuntime(daemonStatus, storedRuntimeKind)
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
        if (!statusMatchesRuntime) {
          deploymentStillStarting = false
          onboardingComplete = false
        }
        if (deploymentStillStarting) {
          onboardingComplete = false
        }

        const subscription = await subscriptionPromise
        const completedPath = '/dashboard'
        if (!hasManagedHostingPlan(subscription)) {
          router.replace(
            buildBillingRequiredPath(
              deploymentStillStarting
                ? getRuntimeAgentPath(storedRuntimeKind)
                : onboardingComplete
                  ? completedPath
                  : '/dashboard/runtime',
            ),
          )
          return
        }
        if (onboardingComplete) {
          router.replace(completedPath)
          return
        }

        if (!cancelled) {
          if (!statusMatchesRuntime) {
            resetDeployProgress()
            setError(getRuntimeMismatchMessage())
          }
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
          setRuntimeKind(storedRuntimeKind)
          setRuntimeSetupState(daemonStatus?.instance ?? null)
          setStatus(deploymentStillStarting ? resolveDeploymentStatusText(daemonStatus, storedRuntimeKind) : '')
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
      {
        label: 'Provider',
        complete: Boolean(
          runtimeKind &&
          selectedModelProviderId &&
          isProviderAvailableForRuntime(selectedModelProviderId, runtimeKind),
        ),
      },
      {
        label: 'Model',
        complete: Boolean(
          selectedModelProviderId &&
          selectedModelId &&
          isModelSupportedByProvider(selectedModelProviderId, selectedModelId),
        ),
      },
      {
        label: 'Auth',
        complete: isProviderSetupCompleteForDeploy({
          runtimeKind,
          providerId: selectedModelProviderId,
          modelId: selectedModelId,
          providerSetup,
        }),
      },
    ],
    [providerSetup, runtimeKind, selectedModelId, selectedModelProviderId],
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
    if (!contactCopied) {
      return
    }

    const timer = window.setTimeout(() => setContactCopied(false), 1_500)
    return () => window.clearTimeout(timer)
  }, [contactCopied])

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
    if (!runtimeKind || !selectedModelProviderId || !selectedModelId || !providerSetup) {
      return 'Complete setup.'
    }

    if (!isProviderAvailableForRuntime(selectedModelProviderId, runtimeKind)) {
      return `${getRuntimeProduct(runtimeKind).name} does not support this provider yet.`
    }

    if (!isModelSupportedByProvider(selectedModelProviderId, selectedModelId)) {
      return 'Unsupported model.'
    }

    if (!isModelSupportedByProviderSetupMethod(selectedModelProviderId, selectedModelId, providerSetup.method)) {
      return 'This model does not support the selected auth method.'
    }

    const isHermesNousOAuth =
      runtimeKind === 'hermes'
      && selectedModelProviderId === 'nous'
      && providerSetup.method === 'oauth'

    if (runtimeKind === 'hermes' && providerSetup.method !== 'api-key' && !isHermesNousOAuth) {
      return 'Hermes Agent requires an API key for this deploy.'
    }

    if (providerSetup.method === 'api-key' && !providerSetup.apiKey?.trim()) {
      return 'Enter an API key before deploying.'
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
        router.push(getRuntimeAgentPath(runtimeKind))
      }, 900)
    },
    [activeSession, router, runtimeKind],
  )

  useEffect(() => {
    if (!hasDeployStarted || !tenantId || !activeSession || checkingSession || showConfetti || submitting) {
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
      const daemonSnapshot = await fetchTenantDaemonStatusSnapshot(tenantId, { cache: 'no-store' })
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
      if (!statusMatchesSelectedRuntime(daemonStatus, runtimeKind)) {
        resetDeployProgress()
        setError(getRuntimeMismatchMessage())
        setStatus('')
        return
      }

      if (tenantHasReadyGateway(daemonStatus)) {
        terminatedPollStreakRef.current = 0
        await finalizeSetupAndRedirect(`Deployment complete. Opening ${getRuntimeProduct(runtimeKind).shortName}...`)
        return
      }

      const daemonState = daemonStatus?.daemon?.status?.trim().toUpperCase() ?? null
      if (daemonState === 'TERMINATED') {
        terminatedPollStreakRef.current += 1
        const deployAgeMs = deployStartedAt ? Date.now() - deployStartedAt : 0
        const hasReservedWorkspace = tenantHasProvisionedInstance(daemonStatus)
        if (
          terminatedPollStreakRef.current < DEPLOY_TERMINATED_CONFIRMATION_POLLS &&
          (!hasReservedWorkspace || deployAgeMs < DEPLOY_TERMINATED_CONFIRMATION_WINDOW_MS)
        ) {
          setError('')
          setStatus(`Still getting your ${getRuntimeProduct(runtimeKind).deploymentNoun} ready...`)
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
      setStatus(resolveDeploymentStatusText(daemonStatus, runtimeKind))
      scheduleNextPoll()
    }

    void pollDeploymentReadiness()

    return () => {
      cancelled = true
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
    }
  }, [activeSession, checkingSession, finalizeSetupAndRedirect, hasDeployStarted, runtimeKind, showConfetti, submitting, tenantId])

  async function completeSetup() {
    const validationError = validateBeforeSubmit()
    if (validationError) {
      setError(validationError)
      setStatus('')
      return
    }
    if (!runtimeKind) {
      setError('Complete setup.')
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
    const selectedRuntimeKind = runtimeKind
    const runtimeProduct = getRuntimeProduct(selectedRuntimeKind)
    setStatus(`Getting your ${runtimeProduct.deploymentNoun} ready...`)
    setShowConfetti(false)

    try {
      const session = activeSession ?? await getRecoveredSupabaseSession({ timeoutMs: 2_500 })
      const accessToken = session?.access_token?.trim() ?? ''
      if (!session || !accessToken) {
        resetDeployProgress()
        setError('Session expired. Please sign in again.')
        setStatus('')
        return
      }
      const effectiveTenantId = tenantId || deriveTenantIdFromUserId(session.user.id)
      if (!effectiveTenantId) {
        resetDeployProgress()
        setError('Session error.')
        setStatus('')
        return
      }
      if (!tenantId) {
        setTenantId(effectiveTenantId)
      }

      const latestSnapshot = await fetchTenantDaemonStatusSnapshot(effectiveTenantId, { cache: 'no-store' })
      const latestStatus = latestSnapshot.kind === 'ok' ? latestSnapshot.status : null
      if (
        tenantHasProvisionedInstance(latestStatus) &&
        !statusMatchesSelectedRuntime(latestStatus, selectedRuntimeKind)
      ) {
        resetDeployProgress()
        setError(getRuntimeMismatchMessage())
        setStatus('')
        return
      }

      if (
        tenantHasProvisionedInstance(latestStatus) &&
        tenantHasReadyGateway(latestStatus) &&
        statusMatchesSelectedRuntime(latestStatus, selectedRuntimeKind)
      ) {
        await finalizeSetupAndRedirect(`Opening ${getRuntimeProduct(selectedRuntimeKind).shortName}...`)
        return
      }

      const response = await fetch('/api/onboarding/install', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tenantId: effectiveTenantId,
          onboarding: {
            runtimeKind: selectedRuntimeKind,
            modelProviderId: selectedModelProviderId,
            modelId: selectedModelId,
            modelSetup: {
              ...providerSetup,
              apiKey: providerSetup?.apiKey?.trim(),
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
          router.replace(buildBillingRequiredPath('/dashboard/runtime'))
          return
        }

        resetDeployProgress()
        setError(payload.message ?? payload.error ?? 'Deploy failed.')
        setStatus('')
        return
      }

      setStatus(`Deploy request accepted. We are preparing your hosted ${runtimeProduct.shortName}.`)
      router.push(getRuntimeAgentPath(selectedRuntimeKind))
    } catch {
      resetDeployProgress()
      setError('Network error.')
      setStatus('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyContactEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setContactCopied(true)
    } catch {
      setContactCopied(false)
    }
  }

  const terminalLines = useMemo(() => {
    const lines: TerminalLine[] = onboardingChecks.map((check) => ({
      id: `check-${check.label}`,
      text: check.complete ? `${check.label} is ready.` : `${check.label} still needs attention.`,
      tone: check.complete ? 'ok' : 'idle',
    }))

    if (hasDeployStarted) {
      const runtimeProduct = getRuntimeProduct(runtimeKind)
      const hasWorkspace = Boolean(runtimeSetupState?.instanceId?.trim() || runtimeSetupState?.instanceState?.trim())
      const ready = runtimeSetupState?.setupComplete === true || runtimeSetupState?.gatewayProbe?.ready === true
      const hasRecentCheck = Boolean(runtimeSetupState?.gatewayProbe?.checkedAt)

      lines.push({
        id: 'deploy-workspace',
        text: hasWorkspace ? 'Your hosted machine has been reserved.' : 'Reserving your hosted machine.',
        tone: hasWorkspace ? 'ok' : 'active',
      })
      lines.push({
        id: 'deploy-runtime',
        text: ready
          ? `${runtimeProduct.shortName} is ready.`
          : hasRecentCheck
            ? runtimeProduct.startingText
            : `Installing and starting ${runtimeProduct.name}.`,
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
  }, [error, hasDeployStarted, onboardingChecks, runtimeKind, runtimeSetupState])

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

  const runtimeProduct = getRuntimeProduct(runtimeKind)
  const runtimeReady = tenantHasReadyGateway({ instance: runtimeSetupState ?? undefined })

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

      <div className="fixed right-4 top-4 z-20 flex items-center gap-2.5 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={() => setContactOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={contactOpen}
          aria-controls="deploy-contact-modal"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <Mail className="h-4 w-4" />
          <span>Contact us</span>
        </button>
        <OnboardingAccountMenu />
      </div>

      <Card className="relative z-10 mx-auto flex min-h-[620px] w-full max-w-5xl flex-col border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-3 px-6 pt-7 md:px-10 md:pt-9">
          <Button variant="link" className="h-auto w-fit p-0 text-xs text-muted-foreground" asChild>
            <Link href="/dashboard/runtime-auth">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>Installing your {runtimeProduct.name}</CardDescription>
          <SetupStepper currentStep="deployment" className="pt-1" />
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-6 pb-7 md:px-10 md:pb-10">
          <div className="flex flex-1 flex-col gap-6">
            <section
              className={cn(
                'rounded-xl border border-border/70 bg-card/80 p-4',
                hasDeployStarted ? 'flex min-h-0 flex-1 flex-col' : undefined,
              )}
            >
              {deployStartedAt ? (
                <div className="flex items-center justify-end">
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {Math.floor(deployElapsedSeconds / 60)}:{String(deployElapsedSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
              ) : null}

              {hasDeployStarted ? (
                <div className={cn('min-h-0 flex-1 space-y-4', deployStartedAt ? 'mt-2' : undefined)}>
                  <DeploymentProgressCue
                    runtimeProduct={runtimeProduct}
                    elapsedSeconds={deployElapsedSeconds}
                    running={submitting || !runtimeReady}
                  />
                  {!runtimeReady ? (
                    <DeployTerminal
                      lines={terminalLines}
                      running={submitting}
                    />
                  ) : null}
                </div>
              ) : null}

              <ul
                className={cn(
                  'flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-foreground',
                  hasDeployStarted ? 'mt-4 border-t border-border/70 pt-4' : undefined,
                )}
              >
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
          </div>

          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="max-w-2xl flex-1 space-y-1">
                {error ? (
                  <>
                    <p className="text-sm text-destructive">{error}</p>
                    <p className="text-xs text-muted-foreground">
                      If you are running into problems, you can{' '}
                      <button
                        type="button"
                        onClick={() => setContactOpen(true)}
                        className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-primary"
                      >
                        contact us
                      </button>
                      .
                    </p>
                  </>
                ) : null}
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
            id="deploy-contact-modal"
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
