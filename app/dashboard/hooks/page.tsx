'use client'

import type { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Loader2, Rocket } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SetupStepper } from '@/components/ui/setup-stepper'
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
import { SKILLS_CONFIG_STORAGE_KEY, SKILLS_STORAGE_KEY, type SkillConfigStorage } from '@/lib/skill-options'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

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
  const [skillIds, setSkillIds] = useState<string[]>([])
  const [skillConfigs, setSkillConfigs] = useState<Record<string, Record<string, string>>>({})
  const [showConfetti, setShowConfetti] = useState(false)
  const [hasDeployStarted, setHasDeployStarted] = useState(() => readPersistedDeployStartedAt() !== null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function resetDeployProgress() {
    setHasDeployStarted(false)
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

        let onboardingComplete = false
        if (forceRestartOnboarding) {
          try {
            await markOnboardingIncomplete(session)
          } catch (error) {
            console.warn('Failed to mark onboarding incomplete during restart flow', error)
          }
        } else {
          onboardingComplete = await isOnboardingComplete(session, {
            backfillFromProvisionedTenant: true,
          })
        }

        const derivedTenantId = deriveTenantIdFromUserId(session.user.id)
        const subscription = await fetchSubscriptionSnapshot(derivedTenantId)
        if (!hasManagedHostingPlan(subscription)) {
          router.replace(buildBillingRequiredPath(onboardingComplete ? '/dashboard/chat' : '/dashboard/model'))
          return
        }
        if (onboardingComplete) {
          router.replace('/dashboard/chat')
          return
        }

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
  }, [forceRestartOnboarding, router])

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

    router.push('/dashboard/chat')
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
    const now = Date.now()
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
          router.replace(buildBillingRequiredPath('/dashboard/model'))
          return
        }

        resetDeployProgress()
        setError(payload.message ?? payload.error ?? 'Deploy failed.')
        setStatus('')
        return
      }

      await finalizeSetupAndRedirect('Deployment started. Opening chat...')
    } catch {
      resetDeployProgress()
      setError('Network error.')
      setStatus('')
    } finally {
      setSubmitting(false)
    }
  }

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
          <div className="flex-1 space-y-6">
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

          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="max-w-2xl flex-1 space-y-1">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
                {!allChecksComplete ? (
                  <p className="text-xs text-muted-foreground">Complete checks.</p>
                ) : null}
              </div>

              <Button
                type="button"
                onClick={completeSetup}
                disabled={
                  submitting ||
                  hasDeployStarted ||
                  showConfetti ||
                  !allChecksComplete
                }
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
