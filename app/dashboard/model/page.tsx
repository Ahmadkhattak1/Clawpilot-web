'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Check, Copy, Loader2, Mail, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { isTenantDeploymentStillStarting } from '@/lib/deploy-progress'
import { isOnboardingComplete, markOnboardingIncomplete } from '@/lib/onboarding-state'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { buildSignInPath, getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

const ENABLED_MODEL_PROVIDER_IDS = new Set(
  AVAILABLE_MODEL_PROVIDER_OPTIONS.map((provider) => provider.id),
)
const CONTACT_EMAIL = 'support@clawpilot.app'

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

function buildProfileInitial(value: string): string {
  const normalized = value.trim()
  if (!normalized) return 'A'

  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const initials = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
    if (initials.trim()) {
      return initials
    }
  }

  return normalized[0]?.toUpperCase() ?? 'A'
}

function buildPfpWebUrl(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return null
  }
  return `https://pfp.web/${encodeURIComponent(normalized)}`
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

function ModelStepPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const forceRestartOnboarding = searchParams.get('restart') === '1'
  const [checkingSession, setCheckingSession] = useState(true)
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [profileName, setProfileName] = useState('Account')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileInitial, setProfileInitial] = useState('A')
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactCopied, setContactCopied] = useState(false)

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
      ? '/dashboard/model'
      : `${window.location.pathname}${window.location.search}`
    router.replace(buildSignInPath(currentPath))
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return
    }

    try {
      setIsSigningOut(true)
      const supabase = getSupabaseAuthClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Failed to sign out', error)
      }
    } catch (error) {
      console.error('Failed to sign out', error)
    } finally {
      router.replace('/')
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

        const userMetadata = (session.user.user_metadata ?? {}) as Record<string, unknown>
        const fullName = typeof userMetadata.full_name === 'string' ? userMetadata.full_name.trim() : ''
        const fallbackName = typeof userMetadata.name === 'string' ? userMetadata.name.trim() : ''
        const email = session.user.email?.trim() ?? ''
        const displayName = fullName || fallbackName || email || 'Account'
        const pfpWebAvatar = buildPfpWebUrl(email)
        const metadataAvatar =
          typeof userMetadata.avatar_url === 'string' && userMetadata.avatar_url.trim()
            ? userMetadata.avatar_url.trim()
            : typeof userMetadata.picture === 'string' && userMetadata.picture.trim()
              ? userMetadata.picture.trim()
              : null

        const storedProviderId = window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)
        const storedModelId = window.localStorage.getItem(MODEL_PROVIDER_MODEL_STORAGE_KEY)

        if (!cancelled) {
          setProfileName(displayName)
          setProfileEmail(email)
          setProfileInitial(buildProfileInitial(displayName || email))
          setProfileImageUrl(pfpWebAvatar ?? metadataAvatar)

          if (isEnabledModelProviderId(storedProviderId)) {
            setSelectedProviderId(storedProviderId)
            if (isModelSupportedByProvider(storedProviderId, storedModelId)) {
              setSelectedModelId(storedModelId)
            } else {
              setSelectedModelId(getProviderModelOptions(storedProviderId)[0]?.id ?? null)
            }
          }
          setCheckingSession(false)
        }
      } catch {
        redirectToSignIn()
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [forceRestartOnboarding, router])

  useEffect(() => {
    if (!contactCopied) {
      return
    }

    const timer = window.setTimeout(() => setContactCopied(false), 1_500)
    return () => window.clearTimeout(timer)
  }, [contactCopied])

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
    router.push(forceRestartOnboarding ? '/dashboard/openclaw?restart=1' : '/dashboard/openclaw')
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

      <div className="fixed right-4 top-4 z-20 flex items-center gap-2.5 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={() => setContactOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={contactOpen}
          aria-controls="model-contact-modal"
          className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <Mail className="h-4 w-4" />
          <span>Contact us</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Open account menu"
            >
              <Avatar className="h-9 w-9">
                {profileImageUrl ? <AvatarImage src={profileImageUrl} alt={profileName} /> : null}
                <AvatarFallback className="bg-foreground text-xs font-semibold text-background">
                  {profileInitial}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="py-2">
              <p className="truncate text-xs font-medium text-foreground">{profileName}</p>
              {profileEmail ? <p className="truncate text-[11px] text-muted-foreground">{profileEmail}</p> : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                void handleSignOut()
              }}
              disabled={isSigningOut}
              className="text-destructive focus:text-destructive"
            >
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="relative z-10 mx-auto flex min-h-[620px] w-full max-w-5xl flex-col border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-3 px-6 pt-7 md:px-10 md:pt-9">
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>Model</CardDescription>
          <SetupStepper currentStep="model" className="pt-1" />
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-6 pb-7 md:px-10 md:pb-10">
          <div className="space-y-6">

            <section className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Choose provider</p>
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
            </section>

            {selectedProvider ? (
              <section className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4">
                <p className="text-sm font-semibold text-foreground">Choose model</p>

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
            id="model-contact-modal"
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

export default function ModelStepPage() {
  return (
    <Suspense fallback={null}>
      <ModelStepPageClient />
    </Suspense>
  )
}
