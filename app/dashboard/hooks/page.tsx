'use client'

import type { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Loader2, Rocket, TerminalSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SetupStepper } from '@/components/ui/setup-stepper'
import { buildTenantAuthHeaders } from '@/lib/backend-auth'
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
import { getBackendUrl } from '@/lib/runtime-controls'
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
const PAYWALL_MONTHLY_PRICE_USD = 25
const PAYWALL_YEARLY_PRICE_USD = 240

type UpgradePlan = 'monthly' | 'yearly'
const USD_NO_CENTS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatUsd(value: number): string {
  return USD_NO_CENTS.format(value)
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}


function toIsoTimestampMs(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed
}

const DEPLOY_STARTED_STORAGE_KEY = 'clawpilot:deploy-started-at'

function readPersistedDeployStartedAt(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DEPLOY_STARTED_STORAGE_KEY)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  } catch {
    return null
  }
}

function writePersistedDeployStartedAt(ts: number | null) {
  if (typeof window === 'undefined') return
  try {
    if (ts === null) {
      window.localStorage.removeItem(DEPLOY_STARTED_STORAGE_KEY)
    } else {
      window.localStorage.setItem(DEPLOY_STARTED_STORAGE_KEY, String(ts))
    }
  } catch {
    // Ignore storage write failures.
  }
}

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
  const [hasDeployStarted, setHasDeployStarted] = useState(() => readPersistedDeployStartedAt() !== null)
  const [deployStartedAt, setDeployStartedAt] = useState<number | null>(() => readPersistedDeployStartedAt())
  const [deployElapsedSeconds, setDeployElapsedSeconds] = useState(() => {
    const persisted = readPersistedDeployStartedAt()
    return persisted ? Math.floor((Date.now() - persisted) / 1000) : 0
  })
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [upgradeCheckoutLoading, setUpgradeCheckoutLoading] = useState(false)
  const [postCheckoutSuccess, setPostCheckoutSuccess] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<UpgradePlan>('monthly')
  const [checkoutSessionId, setCheckoutSessionId] = useState('')
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function resetDeployProgress() {
    setHasDeployStarted(false)
    setDeployStartedAt(null)
    setDeployElapsedSeconds(0)
    setDeployStageIndex(0)
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
  useEffect(() => {
    if (submitting || showConfetti) return
    setDeployStageIndex(0)
  }, [showConfetti, submitting])

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

  useEffect(() => {
    if (!deployStartedAt) return
    setDeployElapsedSeconds(0)
    const timer = setInterval(() => {
      setDeployElapsedSeconds(Math.floor((Date.now() - deployStartedAt) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [deployStartedAt])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const checkoutState = new URLSearchParams(window.location.search).get('checkout')
    const successSessionId = new URLSearchParams(window.location.search).get('session_id') ?? ''
    if (checkoutState === 'success') {
      setPostCheckoutSuccess(true)
      setCheckoutSessionId(successSessionId.trim())
      setUpgradeRequired(false)
      setUpgradeModalOpen(false)
      setStatus('Finalizing payment...')
      setError('')
    } else if (checkoutState === 'cancel') {
      setPostCheckoutSuccess(false)
      setCheckoutSessionId('')
      setUpgradeRequired(true)
      setUpgradeModalOpen(true)
      setStatus('')
      setError('Checkout canceled. Upgrade to deploy.')
    }
  }, [])

  useEffect(() => {
    if (!postCheckoutSuccess || !tenantId || !checkoutSessionId) {
      return
    }

    let cancelled = false
    void (async () => {
      setStatus('Finalizing payment...')
      const upgraded = await confirmStripeCheckoutSession(checkoutSessionId)
      if (cancelled) {
        return
      }

      if (upgraded) {
        setUpgradeRequired(false)
        setUpgradeModalOpen(false)
        setPostCheckoutSuccess(false)
        setStatus('Payment received. You can deploy now.')
        setError('')

        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.delete('checkout')
          url.searchParams.delete('session_id')
          window.history.replaceState({}, '', url.toString())
        }
        return
      }

      setUpgradeRequired(true)
      setUpgradeModalOpen(true)
      setStatus('')
      setError('Payment is processing. Try again in a few seconds.')
    })()

    return () => {
      cancelled = true
    }
  }, [checkoutSessionId, postCheckoutSuccess, tenantId])

  async function ensureDeploymentAllowedBySubscription(): Promise<boolean> {
    if (!tenantId) {
      return false
    }

    const backendUrl = getBackendUrl()
    const attempts = postCheckoutSuccess ? 6 : 1

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const headers = await buildTenantAuthHeaders(tenantId)
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

        const isPaidPlan = payload?.isPaidPlan === true
        if (isPaidPlan) {
          setUpgradeRequired(false)
          setPostCheckoutSuccess(false)
          return true
        }

        const isTerminated = response.status === 403 && readString(payload?.error) === 'TENANT_TERMINATED'
        if (!isTerminated && (!response.ok || !payload)) {
          // Do not hard-block deploy if entitlement probe fails unexpectedly.
          return true
        }

        const trialEndsAtMs = toIsoTimestampMs(
          readRecord(payload?.paywall)?.trialEndsAt ?? payload?.trialEndsAt ?? null,
        )
        const state = readString(payload?.state)
        const nowMs = Date.now()
        const trialExpired = state === 'TERMINATED' || isTerminated || (trialEndsAtMs !== null && trialEndsAtMs <= nowMs)

        if (!trialExpired) {
          setUpgradeRequired(false)
          return true
        }

        if (attempt + 1 < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 + attempt * 500))
          continue
        }

        setUpgradeRequired(true)
        setError('Your trial ended. Upgrade to deploy.')
        return false
      } catch {
        // If this check fails, let the server-side deploy endpoint enforce the final guard.
        return true
      }
    }

    return true
  }

  async function startUpgradeCheckout(plan: UpgradePlan = selectedUpgradePlan) {
    if (!tenantId) {
      setError('Session error.')
      return
    }

    const backendUrl = getBackendUrl()
    const successUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/hooks?checkout=success&session_id={CHECKOUT_SESSION_ID}`
        : undefined
    const cancelUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/hooks?checkout=cancel`
        : undefined

    setUpgradeCheckoutLoading(true)
    setError('')
    setStatus('')

    try {
      const headers = await buildTenantAuthHeaders(tenantId, {
        'content-type': 'application/json',
      })

      const response = await fetch(`${backendUrl}/api/v1/billing/stripe/checkout/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan,
          applyDiscount: false,
          successUrl,
          cancelUrl,
          customerEmail: activeSession?.user.email ?? undefined,
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
        const message = readString(payload?.message) ?? 'Could not start checkout.'
        throw new Error(message)
      }

      const checkoutUrl = readString(payload?.url)
      if (!checkoutUrl) {
        throw new Error('Checkout session was created without a redirect URL.')
      }

      window.location.assign(checkoutUrl)
    } catch (checkoutError) {
      setError(readErrorMessage(checkoutError, 'Could not start checkout.'))
      setUpgradeCheckoutLoading(false)
    }
  }

  async function confirmStripeCheckoutSession(sessionId: string): Promise<boolean> {
    if (!tenantId || !sessionId) {
      return false
    }

    const backendUrl = getBackendUrl()
    try {
      const headers = await buildTenantAuthHeaders(tenantId, {
        'content-type': 'application/json',
      })

      const response = await fetch(`${backendUrl}/api/v1/billing/stripe/checkout/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
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
        return false
      }

      return payload?.upgraded === true
    } catch {
      return false
    }
  }

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

  async function finalizeSetupAndRedirect(nextStatus: string) {
    setShowConfetti(true)
    setError('')
    setStatus(nextStatus)
    writePersistedDeployStartedAt(null)

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

  async function completeSetup() {
    const validationError = validateBeforeSubmit()
    if (validationError) {
      setError(validationError)
      setStatus('')
      return
    }

    setStatus('Checking subscription...')
    const deploymentAllowed = await ensureDeploymentAllowedBySubscription()
    if (!deploymentAllowed) {
      setStatus('')
      return
    }

    setSubmitting(true)
    setHasDeployStarted(true)
    const now = Date.now()
    setDeployStartedAt(now)
    writePersistedDeployStartedAt(now)
    setError('')
    setStatus('Deploy in progress...')
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
            skillIds,
            skillConfigs,
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
          setUpgradeRequired(true)
          setError(payload.message ?? payload.backend?.message ?? 'Your trial ended. Upgrade to deploy.')
          setStatus('')
          return
        }

        resetDeployProgress()
        setError(payload.message ?? payload.error ?? 'Deploy failed.')
        setStatus('')
        return
      }

      setUpgradeRequired(false)
      setDeployStageIndex(DEPLOY_STAGE_LABELS.length)
      await finalizeSetupAndRedirect('Deployment started. Opening chat...')
    } catch {
      resetDeployProgress()
      setError('Network error.')
      setStatus('')
    } finally {
      setSubmitting(false)
    }
  }

  // On reload, simulate terminal progress based on elapsed time instead of showing everything instantly complete
  const simulatedStageIndex = useMemo(() => {
    if (submitting) return deployStageIndex
    if (!hasDeployStarted) return 0
    // ~15s per stage when not actively submitting (reload scenario)
    return Math.min(Math.floor(deployElapsedSeconds / 15), DEPLOY_STAGE_LABELS.length)
  }, [deployElapsedSeconds, deployStageIndex, hasDeployStarted, submitting])

  const terminalLines = useMemo(() => {
    const checkLines: TerminalLine[] = onboardingChecks.map((check) => ({
      id: `check-${check.label}`,
      text: `[preflight] ${check.label.toLowerCase()} ${check.complete ? 'ok' : 'missing'}`,
      tone: check.complete ? 'ok' : 'idle',
    }))

    const allStagesDone = showConfetti
    const deployLines: TerminalLine[] = DEPLOY_STAGE_LABELS.map((label, index) => {
      const isDone =
        allStagesDone ||
        (submitting && index < deployStageIndex) ||
        (!submitting && hasDeployStarted && index < simulatedStageIndex)
      const isActive =
        !allStagesDone &&
        ((submitting && !showConfetti && index === deployStageIndex) ||
         (!submitting && hasDeployStarted && index === simulatedStageIndex && simulatedStageIndex < DEPLOY_STAGE_LABELS.length))
      return {
        id: `deploy-${label}`,
        text: `[deploy] ${label}${isDone ? ' complete' : isActive ? ' running' : ''}`,
        tone: isDone ? 'ok' : isActive ? 'active' : 'idle',
      }
    })

    if (showConfetti) {
      deployLines.push({
        id: 'deploy-success',
        text: '[deploy] provisioning accepted, finishing setup',
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
  }, [
    deployStageIndex,
    error,
    hasDeployStarted,
    onboardingChecks,
    showConfetti,
    simulatedStageIndex,
    submitting,
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
            </div>

            {hasDeployStarted ? (
              <div className="space-y-4">
                <section className="rounded-xl border border-border/70 bg-card/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold">
                      <TerminalSquare className="h-4 w-4 text-muted-foreground" />
                      Deployment Terminal
                    </p>
                    {deployStartedAt ? (
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {Math.floor(deployElapsedSeconds / 60)}:{String(deployElapsedSeconds % 60).padStart(2, '0')}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <DeployTerminal lines={terminalLines} running={submitting} />
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
                {upgradeRequired ? (
                  <p className="text-xs text-muted-foreground">Trial ended. Upgrade to deploy a managed instance.</p>
                ) : !allChecksComplete ? (
                  <p className="text-xs text-muted-foreground">Complete checks.</p>
                ) : null}
              </div>

              <Button
                type="button"
                onClick={upgradeRequired ? () => setUpgradeModalOpen(true) : completeSetup}
                disabled={
                  submitting ||
                  hasDeployStarted ||
                  showConfetti ||
                  !allChecksComplete ||
                  upgradeCheckoutLoading
                }
                className="self-end sm:ml-auto sm:min-w-28"
              >
                {upgradeCheckoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting
                  </>
                ) : submitting || hasDeployStarted ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying
                  </>
                ) : upgradeRequired ? (
                  'Upgrade to deploy'
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

      {upgradeModalOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(false)}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border/80 bg-card p-5 shadow-2xl shadow-black/10 sm:p-6">
            <p className="text-xl font-semibold text-foreground">Upgrade to keep your OpenClaw running</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              OpenClaw is free. You pay for managed hosting and secure infrastructure.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedUpgradePlan('monthly')}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-colors sm:p-5',
                  selectedUpgradePlan === 'monthly'
                    ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border/70 bg-background/60 hover:border-border',
                )}
                aria-pressed={selectedUpgradePlan === 'monthly'}
              >
                <p
                  className={cn(
                    'text-xs font-medium uppercase tracking-wide',
                    selectedUpgradePlan === 'monthly' ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  Monthly
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatUsd(PAYWALL_MONTHLY_PRICE_USD)}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">/mo</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedUpgradePlan('yearly')}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-colors sm:p-5',
                  selectedUpgradePlan === 'yearly'
                    ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border/70 bg-background/60 hover:border-border',
                )}
                aria-pressed={selectedUpgradePlan === 'yearly'}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'text-xs font-medium uppercase tracking-wide',
                      selectedUpgradePlan === 'yearly' ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
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
              Choose monthly or yearly. No discounts are applied in this flow.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button
                onClick={() => {
                  void startUpgradeCheckout(selectedUpgradePlan)
                }}
                disabled={upgradeCheckoutLoading}
              >
                {upgradeCheckoutLoading
                  ? 'Redirecting...'
                  : `Upgrade (${selectedUpgradePlan === 'yearly' ? 'Yearly' : 'Monthly'})`}
              </Button>
              <Button variant="outline" onClick={() => setUpgradeModalOpen(false)} disabled={upgradeCheckoutLoading}>
                Not now
              </Button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}
