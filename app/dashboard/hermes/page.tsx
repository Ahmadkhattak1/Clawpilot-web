'use client'

import {
  ChevronLeft,
  ExternalLink,
  Globe2,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
  Settings2,
  TerminalSquare,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ConsoleLaunchButton } from '@/components/console-launch-button'
import {
  DashboardHeader,
  resolveDashboardProfile,
  type DashboardProfile,
} from '@/components/dashboard/dashboard-header'
import { AgentReadinessPanel } from '@/components/dashboard/agent-readiness-panel'
import { RuntimeModelsDialog } from '@/components/models/runtime-models-dialog'
import { Button } from '@/components/ui/button'
import { isTenantDeploymentStillStartingFromSnapshot } from '@/lib/deploy-progress'
import { getRuntimeProduct, inferRuntimeKindFromGatewayPort } from '@/lib/runtime-products'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { buildSignInPath, getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'
import {
  deriveTenantIdFromUserId,
  fetchTenantDaemonStatusSnapshot,
  resolveTenantMachineLabel,
  tenantHasProvisionedInstance,
  tenantHasReadyGateway,
  type TenantDaemonStatus,
  type TenantDaemonStatusSnapshot,
} from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

const DEFAULT_PROFILE: DashboardProfile = {
  name: 'Account',
  email: '',
  initial: 'A',
  imageUrl: null,
}

function resolveDashboardUrl(status: TenantDaemonStatus | null): string | null {
  const publicIp = status?.instance?.publicIp?.trim()
  const port = status?.instance?.gatewayProbe?.gatewayPort ?? 9119
  if (!publicIp) return null
  return `http://${publicIp}:${port}`
}

function resolveMachineLabel(status: TenantDaemonStatus | null): string {
  return resolveTenantMachineLabel(status)
}

function resolveGatewayLabel(status: TenantDaemonStatus | null): string {
  const port = status?.instance?.gatewayProbe?.gatewayPort ?? 9119
  const reachableVia = status?.instance?.gatewayProbe?.reachableVia
  return reachableVia ? `${reachableVia} :${port}` : `dashboard :${port}`
}

export default function HermesDashboardPage() {
  const router = useRouter()
  const product = getRuntimeProduct('hermes')
  const [tenantId, setTenantId] = useState('')
  const [status, setStatus] = useState<TenantDaemonStatus | null>(null)
  const [profile, setProfile] = useState<DashboardProfile>(DEFAULT_PROFILE)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [launchError, setLaunchError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [modelsDialogOpen, setModelsDialogOpen] = useState(false)

  function readStatusFromSnapshot(snapshot: TenantDaemonStatusSnapshot): TenantDaemonStatus | null {
    return snapshot.kind === 'ok' ? snapshot.status : null
  }

  async function fetchHermesStatus(nextTenantId: string, options: { cache?: 'default' | 'no-store' } = {}) {
    const snapshot = await fetchTenantDaemonStatusSnapshot(nextTenantId, options)
    const nextStatus = readStatusFromSnapshot(snapshot)
    const runtimeKind = inferRuntimeKindFromGatewayPort(nextStatus?.instance?.gatewayProbe?.gatewayPort)
    if (runtimeKind === 'openclaw') {
      router.replace('/dashboard/chat')
      return { redirected: true, status: null, snapshot }
    }

    return { redirected: false, status: nextStatus, snapshot }
  }

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          router.replace(buildSignInPath('/dashboard/hermes'))
          return
        }

        const nextTenantId = deriveTenantIdFromUserId(session.user.id)
        const [subscription, statusResult] = await Promise.all([
          fetchSubscriptionSnapshot(nextTenantId),
          fetchHermesStatus(nextTenantId),
        ])
        if (statusResult.redirected) {
          return
        }

        if (!hasManagedHostingPlan(subscription)) {
          router.replace(buildBillingRequiredPath('/dashboard/runtime'))
          return
        }

        const deploymentStillStarting = isTenantDeploymentStillStartingFromSnapshot(statusResult.snapshot)
        if (!deploymentStillStarting && !tenantHasProvisionedInstance(statusResult.status)) {
          router.replace('/dashboard')
          return
        }

        if (!cancelled) {
          setTenantId(nextTenantId)
          setStatus(statusResult.status)
          setProfile(resolveDashboardProfile({
            email: session.user.email,
            userMetadata: (session.user.user_metadata ?? {}) as Record<string, unknown>,
          }))
          setLoading(false)
        }
      } catch {
        router.replace(buildSignInPath('/dashboard/hermes'))
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [router])

  async function refresh() {
    if (!tenantId || refreshing) return
    setRefreshing(true)
    setLaunchError('')
    try {
      const statusResult = await fetchHermesStatus(tenantId, { cache: 'no-store' })
      if (!statusResult.redirected) {
        setStatus(statusResult.status)
      }
    } catch {
      setLaunchError('Could not refresh status. Try again in a few seconds.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!tenantId || tenantHasReadyGateway(status)) {
      return
    }

    let cancelled = false
    const pollStatus = async () => {
      const statusResult = await fetchHermesStatus(tenantId, { cache: 'no-store' })
      if (cancelled || statusResult.redirected) return
      setStatus(statusResult.status)
    }

    const timer = window.setInterval(() => {
      void pollStatus()
    }, 2_500)
    void pollStatus()

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [status, tenantId])

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      const supabase = getSupabaseAuthClient()
      await supabase.auth.signOut()
    } finally {
      router.replace('/')
    }
  }

  const ready = tenantHasReadyGateway(status)
  const hasProvisionedMachine = tenantHasProvisionedInstance(status)
  const dashboardUrl = resolveDashboardUrl(status)

  function launchDashboard() {
    setLaunchError('')
    if (!dashboardUrl) return
    const openedWindow = window.open(dashboardUrl, '_blank', 'noopener,noreferrer')
    if (!openedWindow) {
      setLaunchError('Popup blocked. Allow popups to open Hermes Agent in a new tab.')
    }
  }

  if (loading) {
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
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.035),transparent_42%)]"
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <DashboardHeader
          profile={profile}
          isSigningOut={isSigningOut}
          onSignOut={() => void handleSignOut()}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 md:py-10">
          <nav className="mb-10 flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link href="/dashboard" className="inline-flex items-center gap-2 transition-colors hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
              Instances
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>

          <section className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start">
            <div className="mx-auto grid aspect-square w-full max-w-[168px] place-items-center rounded-full border border-border/70 bg-card shadow-[0_18px_44px_rgba(0,0,0,0.08)]">
              <Image
                src={product.logoSrc}
                alt={product.logoAlt}
                width={180}
                height={180}
                className="h-[58%] w-[58%] object-contain"
                priority
              />
            </div>

            <div className="min-w-0 pt-1">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">{product.name}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Managed Hermes Agent deployment on your ClawPilot machine.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium',
                    ready
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-amber-500/10 text-amber-700',
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                  {ready ? 'Running' : 'Starting'}
                </span>
                <span className="inline-flex h-10 items-center rounded-xl bg-primary/10 px-4 text-sm font-medium text-primary">
                  Hermes Agent
                </span>
              </div>

              <dl className="mt-8 grid gap-5 sm:grid-cols-3">
                <div className="flex items-center gap-3 border-border/70 sm:border-r">
                  <Server className="h-7 w-7 text-muted-foreground" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Provider</dt>
                    <dd className="mt-1 font-medium text-foreground">DigitalOcean</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-border/70 sm:border-r">
                  <TerminalSquare className="h-7 w-7 text-muted-foreground" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Machine</dt>
                    <dd className="mt-1 font-medium text-foreground">{resolveMachineLabel(status)}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe2 className="h-7 w-7 text-muted-foreground" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Endpoint</dt>
                    <dd className="mt-1 font-medium text-foreground">{resolveGatewayLabel(status)}</dd>
                  </div>
                </div>
              </dl>

              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                <Button
                  type="button"
                  disabled={!dashboardUrl || !ready}
                  className="h-12 rounded-xl gap-2 text-sm font-semibold"
                  onClick={launchDashboard}
                >
                  <ExternalLink className="h-4 w-4" />
                  Launch agent
                </Button>
                <ConsoleLaunchButton
                  tenantId={tenantId}
                  onUnauthorized={() => router.replace(buildSignInPath('/dashboard/hermes'))}
                  onLaunchStart={() => setLaunchError('')}
                  onError={setLaunchError}
                  label="Console"
                  variant="outline"
                  size="default"
                  className="h-12 rounded-xl gap-2 text-sm font-semibold"
                  disabled={!ready}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl gap-2 text-sm font-semibold"
                  onClick={() => void refresh()}
                  disabled={refreshing}
                  title="Refresh status"
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {refreshing ? 'Refreshing...' : 'Refresh status'}
                </Button>
              </div>
            </div>
          </section>

          <AgentReadinessPanel
            runtimeKind="hermes"
            status={status}
            ready={ready}
            error={launchError || (!dashboardUrl ? 'Dashboard URL is not available yet.' : '')}
          />

          <section className="mx-auto mt-8 w-full max-w-6xl">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Hermes management</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Runtime-specific controls live with this agent.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Settings2 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">Dashboard</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Open the Hermes dashboard hosted on your machine.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 h-10 rounded-xl"
                  disabled={!dashboardUrl || !ready}
                  onClick={launchDashboard}
                >
                  Open dashboard
                </Button>
              </article>

              <article className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">Nous OAuth</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Connect or refresh Nous Portal OAuth for this Hermes runtime, even while the dashboard is starting.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 h-10 rounded-xl"
                  disabled={!hasProvisionedMachine || !tenantId.trim()}
                  onClick={() => setModelsDialogOpen(true)}
                >
                  Configure OAuth
                </Button>
              </article>

              <article className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">Status</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Re-check machine readiness, endpoint reachability, and runtime state.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 h-10 rounded-xl"
                  onClick={() => void refresh()}
                  disabled={refreshing}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh status'}
                </Button>
              </article>
            </div>
          </section>
        </main>
      </div>
      <RuntimeModelsDialog
        tenantId={tenantId}
        runtimeKind="hermes"
        open={modelsDialogOpen}
        onOpenChange={setModelsDialogOpen}
        onUnauthorized={() => router.replace(buildSignInPath('/dashboard/hermes'))}
      />
    </div>
  )
}
