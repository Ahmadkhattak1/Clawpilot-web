'use client'

import { ChevronRight, Clock3, Loader2, LockKeyhole, Plus, Server } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import {
  DashboardHeader,
  resolveDashboardProfile,
  type DashboardProfile,
} from '@/components/dashboard/dashboard-header'
import { Button } from '@/components/ui/button'
import { isTenantDeploymentStillStartingFromSnapshot } from '@/lib/deploy-progress'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import {
  getRuntimeAgentPath,
  getRuntimeProduct,
  inferRuntimeKindFromGatewayPort,
  readStoredRuntimeKind,
  type RuntimeKind,
} from '@/lib/runtime-products'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { buildSignInPath, getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'
import {
  deriveTenantIdFromUserId,
  fetchTenantDaemonStatusSnapshot,
  resolveTenantMachineLabel,
  tenantHasProvisionedInstance,
  tenantHasReadyGateway,
  type TenantDaemonStatus,
} from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

type InstanceFilter = 'all' | RuntimeKind

interface ManagedInstance {
  id: string
  name: string
  description: string
  runtimeKind: RuntimeKind
  statusLabel: string
  statusTone: 'running' | 'deploying' | 'paused'
  machineLabel: string
  updatedLabel: string
  href: string
}

const DEFAULT_PROFILE: DashboardProfile = {
  name: 'Account',
  email: '',
  initial: 'A',
  imageUrl: null,
}

function resolveInstanceStatus(status: TenantDaemonStatus | null): Pick<ManagedInstance, 'statusLabel' | 'statusTone'> {
  const daemonState = status?.daemon?.status?.trim().toUpperCase() ?? null
  if (tenantHasReadyGateway(status)) {
    return { statusLabel: 'Running', statusTone: 'running' }
  }
  if (daemonState === 'STOPPED' || daemonState === 'TERMINATED') {
    return { statusLabel: 'Paused', statusTone: 'paused' }
  }
  return { statusLabel: 'Deploying', statusTone: 'deploying' }
}

function resolveMachineLabel(status: TenantDaemonStatus | null): string {
  return resolveTenantMachineLabel(status)
}

function resolveTimestamp(status: TenantDaemonStatus | null): string | null {
  return (
    status?.daemon?.updatedAt?.trim()
    || status?.daemon?.createdAt?.trim()
    || status?.instance?.gatewayProbe?.checkedAt?.trim()
    || null
  )
}

function formatRelativeTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'Unknown'

  const elapsedMs = Date.now() - Date.parse(timestamp)
  if (!Number.isFinite(elapsedMs)) return 'Unknown'
  if (elapsedMs < 0) return 'Scheduled'

  const minutes = Math.floor(elapsedMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const parsed = new Date(timestamp)
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function buildManagedInstance(tenantId: string, runtimeKind: RuntimeKind, status: TenantDaemonStatus): ManagedInstance {
  const product = getRuntimeProduct(runtimeKind)
  const resolvedStatus = resolveInstanceStatus(status)
  return {
    id: tenantId,
    name: product.name,
    description: runtimeKind === 'hermes' ? 'managed Hermes Agent' : 'managed Openclaw workspace',
    runtimeKind,
    machineLabel: resolveMachineLabel(status),
    updatedLabel: formatRelativeTimestamp(resolveTimestamp(status)),
    href: getRuntimeAgentPath(runtimeKind),
    ...resolvedStatus,
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [instances, setInstances] = useState<ManagedInstance[]>([])
  const [filter, setFilter] = useState<InstanceFilter>('all')
  const [profile, setProfile] = useState<DashboardProfile>(DEFAULT_PROFILE)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          router.replace(buildSignInPath('/dashboard'))
          return
        }

        const tenantId = deriveTenantIdFromUserId(session.user.id)
        const [daemonSnapshot, subscription] = await Promise.all([
          fetchTenantDaemonStatusSnapshot(tenantId),
          fetchSubscriptionSnapshot(tenantId),
        ])
        const deploymentStillStarting = isTenantDeploymentStillStartingFromSnapshot(daemonSnapshot)
        const onboardingComplete = await isOnboardingComplete(session, {
          backfillFromProvisionedTenant: true,
          daemonSnapshot,
        })
        if (cancelled) return

        if (!hasManagedHostingPlan(subscription)) {
          const runtimeKind = daemonSnapshot.kind === 'ok'
            ? inferRuntimeKindFromGatewayPort(daemonSnapshot.status.instance?.gatewayProbe?.gatewayPort)
            : readStoredRuntimeKind()
          router.replace(buildBillingRequiredPath(deploymentStillStarting ? getRuntimeAgentPath(runtimeKind) : '/dashboard/runtime'))
          return
        }

        const status = daemonSnapshot.kind === 'ok' ? daemonSnapshot.status : null
        const hasInstance = tenantHasProvisionedInstance(status)

        if (!onboardingComplete && !deploymentStillStarting && !hasInstance) {
          router.replace('/dashboard/runtime')
          return
        }

        setProfile(resolveDashboardProfile({
          email: session.user.email,
          userMetadata: (session.user.user_metadata ?? {}) as Record<string, unknown>,
        }))

        const runtimeKind = (
          inferRuntimeKindFromGatewayPort(status?.instance?.gatewayProbe?.gatewayPort)
          ?? readStoredRuntimeKind()
        )

        if (status && runtimeKind) {
          setInstances([buildManagedInstance(tenantId, runtimeKind, status)])
        } else {
          setInstances([])
        }
        setLoading(false)
      } catch {
        if (!cancelled) {
          router.replace(buildSignInPath('/dashboard'))
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [router])

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

  const visibleInstances = useMemo(
    () => instances.filter((instance) => filter === 'all' || instance.runtimeKind === filter),
    [filter, instances],
  )

  const hasAnyInstance = instances.length > 0
  const selectedRuntimeLabel = filter === 'all' ? 'all instances' : getRuntimeProduct(filter).name

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
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-45"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/95 via-background/88 to-background"
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <DashboardHeader
          profile={profile}
          isSigningOut={isSigningOut}
          onSignOut={() => void handleSignOut()}
          actions={(
            <Button type="button" disabled className="h-9 gap-2 rounded-full px-3 opacity-45" aria-label="New instance">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New instance</span>
            </Button>
          )}
        />

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-8 sm:px-8 md:py-12">
          <section className="pb-8 md:pb-10">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Instances</h1>
              <p className="text-base leading-7 text-muted-foreground">
                Deploy and manage hosted Openclaw and Hermes Agent instances on ClawPilot-managed machines.
              </p>
            </div>
          </section>

          <div className="mb-8 inline-flex w-full max-w-md rounded-xl border border-border/70 bg-card p-1">
            {[
              ['all', 'All'],
              ['openclaw', 'Openclaw'],
              ['hermes', 'Hermes Agent'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value as InstanceFilter)}
                className={cn(
                  'h-10 flex-1 rounded-lg text-sm font-medium transition-colors',
                  filter === value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm shadow-primary/5">
            <div className="hidden grid-cols-[minmax(280px,1.4fr)_160px_160px_minmax(180px,0.8fr)_140px_52px] gap-4 border-b border-border/70 px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
              <span>Instance</span>
              <span>Type</span>
              <span>Status</span>
              <span>Machine / hosting</span>
              <span>Last updated</span>
              <span />
            </div>

            {visibleInstances.length > 0 ? (
              <div className="divide-y divide-border/70">
                {visibleInstances.map((instance) => {
                  const product = getRuntimeProduct(instance.runtimeKind)
                  return (
                    <button
                      key={instance.id}
                      type="button"
                      onClick={() => router.push(instance.href)}
                      className="grid w-full gap-4 px-5 py-5 text-left transition-colors hover:bg-muted/35 lg:grid-cols-[minmax(280px,1.4fr)_160px_160px_minmax(180px,0.8fr)_140px_52px] lg:items-center lg:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-border/70 bg-background">
                          <Image
                            src={product.logoSrc}
                            alt={product.logoAlt}
                            width={80}
                            height={80}
                            className="h-full w-full object-contain p-2"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-base font-semibold tracking-tight text-foreground">
                            {instance.name}
                          </span>
                          <span className="mt-1 block truncate text-sm text-muted-foreground">
                            {instance.description}
                          </span>
                        </span>
                      </div>
                      <span className="w-fit rounded-full border border-border/70 bg-background px-3 py-1 text-sm font-medium text-foreground">
                        {product.name}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 text-sm font-medium',
                          instance.statusTone === 'running'
                            ? 'text-emerald-600'
                            : instance.statusTone === 'deploying'
                              ? 'text-amber-600'
                              : 'text-muted-foreground',
                        )}
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-current" />
                        {instance.statusLabel}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Server className="h-4 w-4" />
                        {instance.machineLabel}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock3 className="h-4 w-4" />
                        {instance.updatedLabel}
                      </span>
                      <span className="hidden justify-self-end text-muted-foreground lg:inline-flex">
                        <ChevronRight className="h-5 w-5" />
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
                <div className="max-w-sm space-y-3">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-border/70 bg-background text-muted-foreground">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <p className="text-base font-semibold tracking-tight text-foreground">No {selectedRuntimeLabel} to show</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {hasAnyInstance
                      ? 'Only one hosted instance is supported in this build. Additional runtime choices are visible but disabled for deployment.'
                      : 'Start with one managed machine. Additional instances are disabled until the multi-instance backend is ready.'}
                  </p>
                  <Button
                    type="button"
                    disabled={hasAnyInstance}
                    onClick={() => {
                      if (!hasAnyInstance) router.push('/dashboard/runtime')
                    }}
                    className={cn(hasAnyInstance ? 'opacity-45' : undefined)}
                  >
                    Choose first instance
                  </Button>
                </div>
              </div>
            )}

            <footer className="flex flex-col gap-2 border-t border-border/70 px-6 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                {visibleInstances.length} {visibleInstances.length === 1 ? 'instance' : 'instances'}
              </span>
              <span>Showing {selectedRuntimeLabel}</span>
            </footer>
          </section>
        </main>
      </div>
    </div>
  )
}
