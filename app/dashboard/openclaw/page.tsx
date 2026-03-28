'use client'

import Link from 'next/link'
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SetupStepper } from '@/components/ui/setup-stepper'
import {
  AVAILABLE_MODEL_PROVIDER_OPTIONS,
  MODEL_PROVIDER_MODEL_STORAGE_KEY,
  MODEL_PROVIDER_STORAGE_KEY,
  getProviderModelOption,
  isModelSupportedByProvider,
  type ModelProviderId,
} from '@/lib/model-providers'
import {
  MODEL_PROVIDER_AUTH_CONFIG,
  MODEL_PROVIDER_SETUP_STORAGE_KEY,
  type ProviderSetupMethod,
  type ProviderSetupStorage,
} from '@/lib/provider-auth-config'
import { isTenantDeploymentStillStarting } from '@/lib/deploy-progress'
import { isOnboardingComplete, markOnboardingIncomplete } from '@/lib/onboarding-state'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

const ENABLED_MODEL_PROVIDER_IDS = new Set(
  AVAILABLE_MODEL_PROVIDER_OPTIONS.map((provider) => provider.id),
)

function isEnabledModelProviderId(value: string | null): value is ModelProviderId {
  if (!value) return false
  return ENABLED_MODEL_PROVIDER_IDS.has(value)
}

function getStoredSetup(): ProviderSetupStorage {
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

function OpenCloudStepPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const forceRestartOnboarding = searchParams.get('restart') === '1'
  const [checkingSession, setCheckingSession] = useState(true)
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<ProviderSetupMethod | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [savedSetup, setSavedSetup] = useState<ProviderSetupStorage>({})

  const selectedProvider = useMemo(
    () => AVAILABLE_MODEL_PROVIDER_OPTIONS.find((provider) => provider.id === selectedProviderId) ?? null,
    [selectedProviderId],
  )

  const providerConfig = useMemo(() => {
    if (!selectedProviderId) return null
    return MODEL_PROVIDER_AUTH_CONFIG[selectedProviderId]
  }, [selectedProviderId])

  const selectedModel = useMemo(
    () => getProviderModelOption(selectedProviderId, selectedModelId),
    [selectedModelId, selectedProviderId],
  )

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          router.replace('/signin')
          return
        }

        const tenantId = deriveTenantIdFromUserId(session.user.id)
        const deploymentStillStarting = await isTenantDeploymentStillStarting(tenantId)
        if (deploymentStillStarting) {
          router.replace('/dashboard/deploy')
          return
        }

        let onboardingComplete = false
        if (forceRestartOnboarding) {
          try {
            await markOnboardingIncomplete(session)
          } catch (error) {
            console.warn('Failed to mark onboarding incomplete during restart flow', error)
          }
        } else {
          onboardingComplete = await isOnboardingComplete(session, { backfillFromProvisionedTenant: true })
        }

        const subscription = await fetchSubscriptionSnapshot(tenantId)
        if (!hasManagedHostingPlan(subscription)) {
          router.replace(buildBillingRequiredPath(onboardingComplete ? '/dashboard/chat' : '/dashboard/model'))
          return
        }

        if (onboardingComplete) {
          router.replace('/dashboard/chat')
          return
        }

        const providerId = window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)
        const modelId = window.localStorage.getItem(MODEL_PROVIDER_MODEL_STORAGE_KEY)
        if (!isEnabledModelProviderId(providerId) || !isModelSupportedByProvider(providerId, modelId)) {
          router.replace('/dashboard/model')
          return
        }

        if (!cancelled) {
          setSelectedProviderId(providerId)
          setSelectedModelId(modelId)
          setSavedSetup(getStoredSetup())
          setCheckingSession(false)
        }
      } catch {
        router.replace('/signin')
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [forceRestartOnboarding, router])

  useEffect(() => {
    if (!providerConfig || !selectedProviderId) {
      setSelectedMethod(null)
      return
    }

    const savedMethod = savedSetup[selectedProviderId]?.method
    if (savedMethod && providerConfig.methods.includes(savedMethod)) {
      setSelectedMethod(savedMethod)
      return
    }

    setSelectedMethod(providerConfig.methods[0] ?? null)
  }, [providerConfig, savedSetup, selectedProviderId])

  function persistSetup(nextSetup: ProviderSetupStorage) {
    setSavedSetup(nextSetup)
    window.localStorage.setItem(MODEL_PROVIDER_SETUP_STORAGE_KEY, JSON.stringify(nextSetup))
  }

  function saveOAuthSelection(showStatusMessage = true): boolean {
    if (!selectedProviderId || !selectedProvider) return false

    const nextSetup: ProviderSetupStorage = {
      ...savedSetup,
      [selectedProviderId]: {
        method: 'oauth',
        oauthConnected: false,
        hasApiKey: false,
        updatedAt: new Date().toISOString(),
      },
    }

    persistSetup(nextSetup)
    setApiKey('')
    setError('')
    if (showStatusMessage) {
      setStatus('OAuth selected. You will connect it right after deployment.')
    }
    return true
  }

  function saveApiKeySelection(showStatusMessage = true): boolean {
    if (!selectedProviderId || !selectedProvider || !providerConfig) return false

    const existingSetup = savedSetup[selectedProviderId]
    const trimmedApiKey = apiKey.trim()
    const hasExistingApiKey =
      existingSetup?.method === 'api-key' && Boolean(existingSetup.apiKey || existingSetup.hasApiKey)

    if (!providerConfig.apiKeyOptional && !trimmedApiKey && !hasExistingApiKey) {
      setError('Required')
      setStatus('')
      return false
    }

    const nextApiKey = trimmedApiKey || existingSetup?.apiKey

    const nextSetup: ProviderSetupStorage = {
      ...savedSetup,
      [selectedProviderId]: {
        method: 'api-key',
        hasApiKey: Boolean(nextApiKey || hasExistingApiKey),
        apiKey: nextApiKey || undefined,
        oauthConnected: false,
        updatedAt: new Date().toISOString(),
      },
    }

    persistSetup(nextSetup)
    setApiKey('')
    setError('')
    if (showStatusMessage) {
      setStatus('Saved')
    }
    return true
  }

  function onNext() {
    const didSave =
      selectedMethod === 'oauth'
        ? saveOAuthSelection(false)
        : saveApiKeySelection(false)
    if (!didSave) return
    router.push(forceRestartOnboarding ? '/dashboard/deploy?restart=1' : '/dashboard/deploy')
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

  if (!selectedProvider || !providerConfig || !selectedMethod || !selectedModel) return null

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background"
      />

      <Card className="relative z-10 mx-auto flex min-h-[620px] w-full max-w-5xl flex-col border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-3 px-6 pt-7 md:px-10 md:pt-9">
          <Button variant="link" className="h-auto w-fit p-0 text-xs text-muted-foreground" asChild>
            <Link href="/dashboard/model">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>{selectedProvider.label} · {selectedModel.label}</CardDescription>
          <SetupStepper currentStep="model" />
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-6 pb-7 md:px-10 md:pb-10">
          <div className="max-w-2xl space-y-8">
            {providerConfig.methods.length > 1 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('oauth')
                    setError('')
                    setStatus('')
                  }}
                  className={cn(
                    'rounded-lg border bg-card p-3 text-left transition-colors',
                    selectedMethod === 'oauth'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/70 hover:border-primary/40',
                  )}
                >
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    OAuth
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('api-key')
                    setError('')
                    setStatus('')
                  }}
                  className={cn(
                    'rounded-lg border bg-card p-3 text-left transition-colors',
                    selectedMethod === 'api-key'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/70 hover:border-primary/40',
                  )}
                >
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-4 w-4" />
                    API key
                  </p>
                </button>
              </div>
            ) : null}

            {selectedMethod === 'oauth' ? (
              <div className="rounded-lg border border-border/70 bg-card p-4">
                {providerConfig.oauthHint ? (
                  <p className="text-sm text-muted-foreground">{providerConfig.oauthHint}</p>
                ) : null}
                <Button className="mt-3" onClick={() => saveOAuthSelection(true)}>
                  Use OAuth (connect after deployment)
                </Button>
              </div>
            ) : (
              <form
                className="space-y-3 rounded-lg border border-border/70 bg-card p-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  onNext()
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="provider-api-key">
                    {providerConfig.apiKeyLabel ?? `${selectedProvider.label} API key`}
                  </Label>
                  <Input
                    id="provider-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={providerConfig.apiKeyPlaceholder ?? 'Enter API key'}
                    autoComplete="off"
                  />
                </div>
              </form>
            )}
          </div>

          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
              </div>
              <Button onClick={onNext} className="sm:min-w-28">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function OpenCloudStepPage() {
  return (
    <Suspense fallback={null}>
      <OpenCloudStepPageClient />
    </Suspense>
  )
}
