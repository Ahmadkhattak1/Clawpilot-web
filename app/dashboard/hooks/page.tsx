'use client'

import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Loader2, Rocket, TerminalSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

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
  getProviderModelOption,
  isModelSupportedByProvider,
} from '@/lib/model-providers'
import { SKILLS_CONFIG_STORAGE_KEY, SKILLS_STORAGE_KEY, type SkillConfigStorage } from '@/lib/skill-options'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
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

function deriveTenantIdFromUserId(userId: string) {
  const normalized = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `tenant_${normalized}`.slice(0, 64)
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

        const derivedTenantId = deriveTenantIdFromUserId(session.user.id)

        const providerId = window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)
        const modelId = window.localStorage.getItem(MODEL_PROVIDER_MODEL_STORAGE_KEY)

        const providerSetupStore = getStoredProviderSetup()
        const skillConfigStore = getStoredSkillConfig()

        if (!cancelled) {
          setTenantId(derivedTenantId)
          setSelectedModelProviderId(providerId)
          setSelectedModelId(isModelSupportedByProvider(providerId, modelId) ? modelId : null)
          setProviderSetup(providerId ? providerSetupStore[providerId] ?? null : null)
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
      setShowConfetti(true)
      setStatus('Deployment complete. Opening chat...')

      redirectTimeoutRef.current = setTimeout(() => {
        router.push('/dashboard/chat')
      }, 1200)
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
      const isDone = showConfetti || (submitting && index < deployStageIndex)
      const isActive = submitting && !showConfetti && index === deployStageIndex
      return {
        id: `deploy-${label}`,
        text: `[deploy] ${label}${isDone ? ' complete' : isActive ? ' running' : ''}`,
        tone: isDone ? 'ok' : isActive ? 'active' : 'idle',
      }
    })

    if (showConfetti) {
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
  }, [deployStageIndex, error, onboardingChecks, showConfetti, submitting])

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
            <Link href="/dashboard/skills/setup">
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
                disabled={submitting || showConfetti || !allChecksComplete}
                className="self-end sm:ml-auto sm:min-w-28"
              >
                {submitting ? (
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
