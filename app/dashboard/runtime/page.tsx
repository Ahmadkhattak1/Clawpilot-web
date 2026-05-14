'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Cloud, Copy, Info, Loader2, LockKeyhole, Mail, Power, UsersRound, X, Zap, type LucideIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { OnboardingAccountMenu } from '@/components/dashboard/onboarding-account-menu'
import { Button } from '@/components/ui/button'
import { isTenantDeploymentStillStartingFromSnapshot } from '@/lib/deploy-progress'
import { isOnboardingComplete, markOnboardingIncomplete } from '@/lib/onboarding-state'
import {
  getRuntimeAgentPath,
  inferRuntimeKindFromGatewayPort,
  RUNTIME_PRODUCTS,
  type RuntimeKind,
  writeStoredRuntimeKind,
} from '@/lib/runtime-products'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import {
  deriveTenantIdFromUserId,
  fetchTenantDaemonStatusSnapshot,
  tenantHasProvisionedInstance,
} from '@/lib/tenant-instance'

const CONTACT_EMAIL = 'support@clawpilot.app'

function RuntimePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const forceRestartOnboarding = searchParams.get('restart') === '1'
  const [checkingSession, setCheckingSession] = useState(true)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactCopied, setContactCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setCheckingSession(false)

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession({ timeoutMs: 2500 })
        if (!session) {
          router.replace(buildSignInPath('/dashboard/runtime'))
          return
        }

        const tenantId = deriveTenantIdFromUserId(session.user.id)
        const daemonSnapshot = await fetchTenantDaemonStatusSnapshot(tenantId)
        const deploymentStillStarting = isTenantDeploymentStillStartingFromSnapshot(daemonSnapshot)
        if (deploymentStillStarting) {
          const daemonStatus = daemonSnapshot.kind === 'ok' ? daemonSnapshot.status : null
          router.replace(getRuntimeAgentPath(inferRuntimeKindFromGatewayPort(daemonStatus?.instance?.gatewayProbe?.gatewayPort)))
          return
        }
        const daemonStatus = daemonSnapshot.kind === 'ok' ? daemonSnapshot.status : null
        if (tenantHasProvisionedInstance(daemonStatus)) {
          router.replace('/dashboard')
          return
        }

        const completedPath = '/dashboard'
        const subscriptionPromise = fetchSubscriptionSnapshot(tenantId)
        let onboardingComplete = false
        if (forceRestartOnboarding) {
          try {
            await markOnboardingIncomplete(session)
          } catch {
            // Continue the restart flow even if profile cleanup lags.
          }
        } else {
          onboardingComplete = await isOnboardingComplete(session, {
            backfillFromProvisionedTenant: true,
            daemonSnapshot,
          })
        }

        const subscription = await subscriptionPromise
        if (!hasManagedHostingPlan(subscription)) {
          router.replace(buildBillingRequiredPath(onboardingComplete ? completedPath : '/dashboard/runtime'))
          return
        }

        if (onboardingComplete) {
          router.replace(completedPath)
          return
        }

        if (!cancelled) setCheckingSession(false)
      } catch {
        router.replace(buildSignInPath('/dashboard/runtime'))
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

  function startRuntime(selectedRuntimeKind: RuntimeKind) {
    writeStoredRuntimeKind(selectedRuntimeKind)
    router.push(forceRestartOnboarding ? '/dashboard/model?restart=1' : '/dashboard/model')
  }

  async function handleCopyContactEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setContactCopied(true)
    } catch {
      setContactCopied(false)
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
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background"
      />

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="ClawPilot" width={40} height={40} className="h-10 w-10 object-contain" />
            <span className="text-xl font-semibold tracking-tight text-foreground">ClawPilot</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={contactOpen}
              aria-controls="runtime-contact-modal"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Contact us</span>
            </button>
            <OnboardingAccountMenu />
          </div>
        </header>

        <section className="py-12 md:py-16">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Choose your first instance</h1>
            <p className="text-base leading-7 text-muted-foreground">
              Start with one managed machine. Additional instances will be available after the multi-instance backend is enabled.
            </p>
          </div>
        </section>

        <section className="mb-8 flex gap-4 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-primary/5 md:mb-10">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Info className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="font-semibold tracking-tight text-foreground">Start with one instance first.</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Each provisioned machine currently runs one agent runtime. The instances page already exposes the future structure,
              but creating additional machines is disabled for now.
            </p>
          </div>
        </section>

        <section className="grid gap-7 lg:grid-cols-2 xl:gap-8">
          {RUNTIME_PRODUCTS.map((product) => {
            const featureItems: Array<{ Icon: LucideIcon; label: string }> = product.id === 'hermes'
              ? [
                  { Icon: Cloud, label: 'Hosted' },
                  { Icon: Zap, label: 'Fast setup' },
                  { Icon: UsersRound, label: 'Agent-ready' },
                ]
              : [
                  { Icon: LockKeyhole, label: 'Private' },
                  { Icon: Power, label: 'Always on' },
                  { Icon: Zap, label: 'One-click setup' },
                ]

            return (
              <article
                key={product.id}
                className="flex min-h-[440px] flex-col rounded-2xl border border-border/70 bg-card p-7 text-center shadow-sm shadow-primary/5 md:p-8"
              >
                <div className="mx-auto grid h-36 w-36 place-items-center overflow-hidden rounded-full bg-primary/10">
                  <Image
                    src={product.logoSrc}
                    alt={product.logoAlt}
                    width={160}
                    height={160}
                    className={product.id === 'hermes' ? 'h-full w-full object-contain p-3' : 'h-full w-full object-contain p-5'}
                  />
                </div>
                <div className="mt-6 space-y-2">
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">{product.name}</h2>
                  <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">{product.description}</p>
                </div>
                <div className="mb-5 mt-10 grid gap-2 sm:grid-cols-3">
                  {featureItems.map(({ Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background px-2 text-xs font-medium text-muted-foreground"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      {label}
                    </span>
                  ))}
                </div>
                <Button type="button" onClick={() => startRuntime(product.id)} className="mt-auto h-12">
                  Create {product.name} instance
                </Button>
              </article>
            )
          })}
        </section>

        <p className="mt-7 rounded-2xl border border-border/70 bg-card/70 px-5 py-4 text-center text-sm leading-6 text-muted-foreground">
          You start with one instance. If you need another later, the app will enable a separate purchase and provisioning flow.
        </p>
      </main>

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
            id="runtime-contact-modal"
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

export default function RuntimePage() {
  return (
    <Suspense fallback={null}>
      <RuntimePageClient />
    </Suspense>
  )
}
