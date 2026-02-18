'use client'

import { Check, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SetupStepper } from '@/components/ui/setup-stepper'
import {
  AVAILABLE_MODEL_PROVIDER_OPTIONS,
  MODEL_PROVIDER_MODEL_STORAGE_KEY,
  MODEL_PROVIDER_STORAGE_KEY,
  getProviderModelOptions,
  isModelSupportedByProvider,
  type ModelProviderId,
  type ModelProviderOption,
} from '@/lib/model-providers'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import {
  deriveTenantIdFromUserId,
  fetchTenantDaemonStatus,
  tenantHasProvisionedInstance,
} from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

const ENABLED_MODEL_PROVIDER_IDS = new Set(
  AVAILABLE_MODEL_PROVIDER_OPTIONS.map((provider) => provider.id),
)

function isEnabledModelProviderId(value: string | null): value is ModelProviderId {
  if (!value) return false
  return ENABLED_MODEL_PROVIDER_IDS.has(value)
}

function getProviderInitials(label: string) {
  return label
    .split(/[\s./-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('')
}

function ProviderLogo({
  provider,
  onError,
  hasImageError,
}: {
  provider: ModelProviderOption
  onError: (providerId: string) => void
  hasImageError: boolean
}) {
  if ((!provider.logoSrc || hasImageError) && provider.logoEmoji) {
    return <span className="text-2xl leading-none">{provider.logoEmoji}</span>
  }

  if (!provider.logoSrc || hasImageError) {
    return (
      <span className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
        {getProviderInitials(provider.label)}
      </span>
    )
  }

  return (
    // Keep logo rendering flexible for mixed SVG dimensions in the uploaded files.
    <Image
      src={provider.logoSrc}
      alt={`${provider.label} logo`}
      width={128}
      height={48}
      className="h-full w-full object-contain"
      onError={() => onError(provider.id)}
    />
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const selectedProvider = useMemo(
    () => AVAILABLE_MODEL_PROVIDER_OPTIONS.find((provider) => provider.id === selectedProviderId) ?? null,
    [selectedProviderId],
  )

  const selectedProviderModels = useMemo(
    () => getProviderModelOptions(selectedProviderId),
    [selectedProviderId],
  )

  function redirectToSignIn() {
    const currentPath = typeof window === 'undefined'
      ? '/dashboard'
      : `${window.location.pathname}${window.location.search}`
    router.replace(buildSignInPath(currentPath))
  }

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          redirectToSignIn()
          return
        }

        const tenantId = deriveTenantIdFromUserId(session.user.id)
        const daemonStatus = await fetchTenantDaemonStatus(tenantId)
        if (tenantHasProvisionedInstance(daemonStatus)) {
          router.replace('/dashboard/chat')
          return
        }

        const storedProviderId = window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)
        const storedModelId = window.localStorage.getItem(MODEL_PROVIDER_MODEL_STORAGE_KEY)

        if (!cancelled && isEnabledModelProviderId(storedProviderId)) {
          setSelectedProviderId(storedProviderId)
          if (isModelSupportedByProvider(storedProviderId, storedModelId)) {
            setSelectedModelId(storedModelId)
          } else {
            setSelectedModelId(getProviderModelOptions(storedProviderId)[0]?.id ?? null)
          }
        }
      } catch {
        redirectToSignIn()
        return
      }

      if (!cancelled) {
        setCheckingSession(false)
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [router])

  function onImageError(providerId: string) {
    setImageErrors((previous) => ({
      ...previous,
      [providerId]: true,
    }))
  }

  function onProviderSelect(providerId: ModelProviderId) {
    setSelectedProviderId(providerId)
    setSelectedModelId((previous) => {
      if (isModelSupportedByProvider(providerId, previous)) {
        return previous
      }
      return getProviderModelOptions(providerId)[0]?.id ?? null
    })
  }

  function onNext() {
    if (!selectedProviderId || !selectedModelId) return
    window.localStorage.setItem(MODEL_PROVIDER_STORAGE_KEY, selectedProviderId)
    window.localStorage.setItem(MODEL_PROVIDER_MODEL_STORAGE_KEY, selectedModelId)
    router.push('/dashboard/open-cloud')
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

      <Card className="relative z-10 mx-auto flex min-h-[620px] w-full max-w-5xl flex-col border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-3 px-6 pt-7 md:px-10 md:pt-9">
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>Model</CardDescription>
          <SetupStepper currentStep="model" className="pt-1" />
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-6 pb-7 md:px-10 md:pb-10">
          <div className="space-y-10">
            <div className="grid gap-4 sm:grid-cols-3">
              {AVAILABLE_MODEL_PROVIDER_OPTIONS.map((provider) => {
                const isSelected = selectedProviderId === provider.id
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => onProviderSelect(provider.id as ModelProviderId)}
                    className={cn(
                      'rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/70',
                    )}
                  >
                    <div className="flex h-14 items-center justify-center rounded-md bg-muted/40 p-2">
                      <ProviderLogo
                        provider={provider}
                        onError={onImageError}
                        hasImageError={Boolean(imageErrors[provider.id])}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground/95">{provider.label}</p>
                      {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                    </div>
                  </button>
                )
              })}
            </div>

            {selectedProvider ? (
              <section className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Model</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedProviderModels.map((model) => {
                    const isSelected = selectedModelId === model.id
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setSelectedModelId(model.id)}
                        className={cn(
                          'rounded-xl border bg-background/70 p-3 text-left transition-colors hover:border-primary/40',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border/70',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{model.label}</p>
                          {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                        </div>
                        {model.isRecommended ? (
                          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-primary">
                            Recommended
                          </p>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex justify-end">
              <Button onClick={onNext} disabled={!selectedProviderId || !selectedModelId} className="sm:min-w-32">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
