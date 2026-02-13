'use client'

import { Check, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MODEL_PROVIDER_OPTIONS,
  MODEL_PROVIDER_STORAGE_KEY,
  type ModelProviderOption,
} from '@/lib/model-providers'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { cn } from '@/lib/utils'

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
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const selectedProvider = useMemo(
    () => MODEL_PROVIDER_OPTIONS.find((provider) => provider.id === selectedProviderId) ?? null,
    [selectedProviderId],
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

        const storedProviderId = window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)
        const providerExists = MODEL_PROVIDER_OPTIONS.some((provider) => provider.id === storedProviderId)
        if (!cancelled && providerExists && storedProviderId) {
          setSelectedProviderId(storedProviderId)
        }
      } catch {
        router.replace('/signin')
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

  function onNext() {
    if (!selectedProviderId) return
    window.localStorage.setItem(MODEL_PROVIDER_STORAGE_KEY, selectedProviderId)
    router.push('/dashboard/open-cloud')
  }

  if (checkingSession) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your dashboard...
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-8 sm:px-6 md:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background"
      />

      <Card className="relative z-10 mx-auto w-full max-w-6xl border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-2">
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>Model Provider</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {MODEL_PROVIDER_OPTIONS.map((provider) => {
              const isSelected = selectedProviderId === provider.id
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => setSelectedProviderId(provider.id)}
                  className={cn(
                    'rounded-xl border bg-card p-3 text-left transition-colors',
                    'hover:border-primary/40',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/70',
                  )}
                >
                  <div className="flex h-12 items-center justify-center rounded-md bg-muted/40 p-2">
                    <ProviderLogo
                      provider={provider}
                      onError={onImageError}
                      hasImageError={Boolean(imageErrors[provider.id])}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-foreground/95">{provider.label}</p>
                    {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedProvider ? `Selected: ${selectedProvider.label}` : 'Select one provider to continue.'}
            </p>
            <Button onClick={onNext} disabled={!selectedProvider} className="sm:min-w-32">
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
