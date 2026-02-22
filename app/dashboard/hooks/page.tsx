'use client'

import type { Session } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Rocket, ShieldCheck, TerminalSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { completeRuntimeOpenAICodexOAuth, getBackendUrl, startRuntimeOpenAICodexOAuth } from '@/lib/runtime-controls'
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

function isRuntimeGatewayStartingError(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return (
    normalized.includes('gateway_starting') ||
    normalized.includes('still bootstrapping') ||
    normalized.includes('runtime gateway is not reachable yet')
  )
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

function formatOAuthExpiryCountdown(expiresAt: string, nowMs: number): string {
  const expiresAtMs = Date.parse(expiresAt)
  if (!Number.isFinite(expiresAtMs)) {
    return 'Unknown'
  }

  const remainingMs = expiresAtMs - nowMs
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const remainingMinutes = Math.floor(remainingSeconds / 60)
  const secondsPart = remainingSeconds % 60
  if (remainingMs <= 0) {
    return 'Expired'
  }
  return `${remainingMinutes}m ${secondsPart}s`
}

const LENNY_MESSAGES: { atSecond: number; text: string }[] = [
  { atSecond: 0, text: 'Hi. I\u2019m Lenny. I\u2019m the lobster they assigned to keep you company while your OpenClaw instance boots up.' },
  { atSecond: 8, text: 'Right now a loud computer in a building that smells like warm electricity is doing a lot of important nerd stuff on your behalf.' },
  { atSecond: 18, text: 'Things are unpacking. Things are linking. Something just printed a log that looks confident but absolutely isn\u2019t.' },
  { atSecond: 30, text: 'I\u2019m here either way. They don\u2019t even give me a chair.' },
  { atSecond: 60, text: 'Small update: your instance exists now. If the internet had a census, you\u2019d be on it.' },
  { atSecond: 75, text: 'Networking\u2019s being sorted. Permissions are being negotiated. A background service just woke up and immediately pretended it knew what was going on.' },
  { atSecond: 95, text: 'This is the part where people start wondering if it\u2019s stuck. It\u2019s not stuck. It\u2019s thinking.' },
  { atSecond: 115, text: 'You ever watch someone type and then delete everything and type again? That\u2019s your deployment right now, but with more Linux.' },
  { atSecond: 150, text: 'This is the middle stretch. Not flashy. Not dramatic. But extremely important.' },
  { atSecond: 165, text: 'Your instance is basically learning how to behave in public. How to answer requests without freaking out. How to survive on the internet without developing trust issues.' },
  { atSecond: 185, text: 'Somewhere deep in the logs, something just printed a message so cryptic it looks like a password had a nervous breakdown.' },
  { atSecond: 210, text: 'Also: you\u2019re watching a lobster narrate infrastructure. If 2005 internet saw this, it would panic.' },
  { atSecond: 240, text: 'Now we\u2019re cooking. Services are talking to each other. Checks are passing.' },
  { atSecond: 255, text: 'Your instance is starting to look less like a pile of parts and more like a functioning thing.' },
  { atSecond: 275, text: 'This is usually when people lean toward the screen like they\u2019re trying to telepathically encourage it. You can try. I\u2019ll pretend it helped.' },
  { atSecond: 300, text: 'Somewhere a process just booted successfully and immediately acted like it always planned to. Classic.' },
  { atSecond: 330, text: 'Alright, final stretch. Your instance is basically backstage right now, doing that thing performers do where they bounce on their toes and whisper \u201Cokay, okay, okay.\u201D' },
  { atSecond: 350, text: 'The system\u2019s doing one last sweep to make sure it didn\u2019t forget something embarrassing. Kind of like patting your pockets before leaving the house.' },
  { atSecond: 375, text: 'It could step out any second. Or it might take another minute to get comfortable.' },
  { atSecond: 400, text: 'Stick around, switch tabs, grab a drink, question your life choices \u2014 whatever works. I\u2019ll let you know when the curtain moves.' },
]

function getVisibleLennyMessages(elapsedSeconds: number): string[] {
  return LENNY_MESSAGES.filter((m) => m.atSecond <= elapsedSeconds).map((m) => m.text)
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
  const [oauthSessionId, setOauthSessionId] = useState('')
  const [oauthAuthUrl, setOauthAuthUrl] = useState('')
  const [oauthExpiresAt, setOauthExpiresAt] = useState<string | null>(null)
  const [oauthCallback, setOauthCallback] = useState('')
  const [oauthSubmitting, setOauthSubmitting] = useState(false)
  const [oauthCountdownNowMs, setOauthCountdownNowMs] = useState(() => Date.now())
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [upgradeCheckoutLoading, setUpgradeCheckoutLoading] = useState(false)
  const [postCheckoutSuccess, setPostCheckoutSuccess] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<UpgradePlan>('monthly')
  const [checkoutSessionId, setCheckoutSessionId] = useState('')
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
  const oauthSessionReady = Boolean(oauthSessionId && oauthAuthUrl)
  const waitingForRuntimeBeforeOpenAIOAuth =
    requiresPostInstallOpenAIOAuth &&
    hasDeployStarted &&
    !submitting &&
    !showConfetti &&
    !oauthSessionReady
  const waitingForPostInstallOpenAIOAuth =
    requiresPostInstallOpenAIOAuth &&
    hasDeployStarted &&
    !submitting &&
    !showConfetti &&
    oauthSessionReady

  useEffect(() => {
    if (submitting || showConfetti || waitingForPostInstallOpenAIOAuth || waitingForRuntimeBeforeOpenAIOAuth) return
    setDeployStageIndex(0)
  }, [showConfetti, submitting, waitingForPostInstallOpenAIOAuth, waitingForRuntimeBeforeOpenAIOAuth])

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
    if (!oauthExpiresAt) return
    setOauthCountdownNowMs(Date.now())
    const timer = setInterval(() => {
      setOauthCountdownNowMs(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [oauthExpiresAt])

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

  async function startOpenAIOAuthSession(options?: { auto?: boolean }): Promise<boolean> {
    if (!tenantId) {
      setError('Session error.')
      return false
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
      return true
    } catch (oauthError) {
      const message = readErrorMessage(oauthError, 'Unable to start OpenAI OAuth.')
      if (isRuntimeGatewayStartingError(message)) {
        setOauthSessionId('')
        setOauthAuthUrl('')
        setOauthExpiresAt(null)
        setError('')
        setStatus('Deployment complete. Finalizing runtime startup before OAuth...')
        return false
      }

      setError(message)
      if (options?.auto) {
        setStatus('Deployment complete. Retry OAuth preparation in a moment.')
      }
      return false
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
    setOauthSessionId('')
    setOauthAuthUrl('')
    setOauthExpiresAt(null)
    setOauthCallback('')

    try {
      const session = await getRecoveredSupabaseSession({ timeoutMs: 2_500 })
      const accessToken = session?.access_token?.trim() ?? ''
      if (!accessToken) {
        setError('Session expired. Please sign in again.')
        setStatus('')
        setDeployStageIndex(0)
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
          setUpgradeRequired(true)
          setError(payload.message ?? payload.backend?.message ?? 'Your trial ended. Upgrade to deploy.')
          setStatus('')
          setDeployStageIndex(0)
          return
        }

        setError(payload.message ?? payload.error ?? 'Deploy failed.')
        setStatus('')
        setDeployStageIndex(0)
        return
      }

      setUpgradeRequired(false)
      setDeployStageIndex(DEPLOY_STAGE_LABELS.length)
      if (requiresPostInstallOpenAIOAuth) {
        setStatus('Deployment complete. Finalizing runtime startup before OAuth...')
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

  useEffect(() => {
    if (!waitingForRuntimeBeforeOpenAIOAuth || oauthSubmitting || oauthSessionReady) {
      return
    }

    const timer = setTimeout(() => {
      void startOpenAIOAuthSession({ auto: true })
    }, 4000)

    return () => clearTimeout(timer)
  }, [oauthSessionReady, oauthSubmitting, waitingForRuntimeBeforeOpenAIOAuth])

  const terminalLines = useMemo(() => {
    const checkLines: TerminalLine[] = onboardingChecks.map((check) => ({
      id: `check-${check.label}`,
      text: `[preflight] ${check.label.toLowerCase()} ${check.complete ? 'ok' : 'missing'}`,
      tone: check.complete ? 'ok' : 'idle',
    }))

    const deployLines: TerminalLine[] = DEPLOY_STAGE_LABELS.map((label, index) => {
      const isDone =
        showConfetti ||
        waitingForRuntimeBeforeOpenAIOAuth ||
        waitingForPostInstallOpenAIOAuth ||
        (submitting && index < deployStageIndex)
      const isActive = submitting && !showConfetti && index === deployStageIndex
      return {
        id: `deploy-${label}`,
        text: `[deploy] ${label}${isDone ? ' complete' : isActive ? ' running' : ''}`,
        tone: isDone ? 'ok' : isActive ? 'active' : 'idle',
      }
    })

    if (waitingForRuntimeBeforeOpenAIOAuth) {
      deployLines.push({
        id: 'deploy-oauth-preparing',
        text: '[deploy] runtime is still bootstrapping, OAuth step pending',
        tone: 'active',
      })
    } else if (waitingForPostInstallOpenAIOAuth) {
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
  }, [
    deployStageIndex,
    error,
    onboardingChecks,
    showConfetti,
    submitting,
    waitingForPostInstallOpenAIOAuth,
    waitingForRuntimeBeforeOpenAIOAuth,
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
            <Link href="/open-cloud">
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

              {hasDeployStarted ? (() => {
                const lennyOAuthNudge = waitingForPostInstallOpenAIOAuth
                  ? 'Hey \u2014 I need you for a second. OpenAI OAuth is ready and waiting for you on the right. Open the URL, sign in, paste the callback, and we\u2019re golden.'
                  : waitingForRuntimeBeforeOpenAIOAuth
                    ? 'Almost there. The runtime is still warming up so I can get your OAuth link ready. Hang tight.'
                    : null
                const visibleMessages = getVisibleLennyMessages(deployElapsedSeconds)
                const currentMessage = lennyOAuthNudge ?? (visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1] : null)
                if (!currentMessage) return null
                return (
                  <section className={cn(
                    'rounded-xl border bg-card/80 p-4 transition-colors',
                    lennyOAuthNudge ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/70',
                  )}>
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
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{currentMessage}</p>
                      </div>
                    </div>
                  </section>
                )
              })() : null}
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

                {waitingForRuntimeBeforeOpenAIOAuth ? (
                  <section className="rounded-xl border border-border/70 bg-card/80 p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      Preparing OpenAI OAuth...
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Runtime is still starting. OAuth options will appear once the gateway is ready...
                    </p>
                  </section>
                ) : null}

                {/* OAuth is handled in a modal overlay below */}
              </div>
            ) : null}
          </div>

          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="max-w-2xl flex-1 space-y-1">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
                {waitingForRuntimeBeforeOpenAIOAuth ? (
                  <p className="text-xs text-muted-foreground">Waiting for runtime readiness before OAuth.</p>
                ) : waitingForPostInstallOpenAIOAuth ? (
                  <p className="text-xs text-muted-foreground">Finish OAuth to complete onboarding.</p>
                ) : upgradeRequired ? (
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
                  oauthSubmitting ||
                  showConfetti ||
                  waitingForRuntimeBeforeOpenAIOAuth ||
                  waitingForPostInstallOpenAIOAuth ||
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
                ) : waitingForRuntimeBeforeOpenAIOAuth ? (
                  'Finalizing'
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

      {waitingForPostInstallOpenAIOAuth ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border/80 bg-card p-5 shadow-2xl shadow-black/10 sm:p-6">
            <p className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              OpenAI OAuth
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your instance is ready. Complete OAuth to finish setup.
            </p>

            {oauthAuthUrl ? (
              <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>Click <span className="font-medium text-foreground">Open URL</span> and sign in to your OpenAI account.</li>
                <li>Click <span className="font-medium text-foreground">Continue</span> to authorize.</li>
                <li>Copy the full browser URL that starts with <span className="font-mono text-foreground">http://localhost:1455/auth/callback</span>.</li>
                <li>Paste it below and click <span className="font-medium text-foreground">Complete OAuth</span>.</li>
              </ol>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
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
                Expires in: {formatOAuthExpiryCountdown(oauthExpiresAt, oauthCountdownNowMs)}
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
              className="mt-3 w-full"
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
          </div>
        </div>
      ) : null}
    </div>
  )
}
