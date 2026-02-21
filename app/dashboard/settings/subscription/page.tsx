'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw, ShieldCheck, TriangleAlert, XCircle } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import { buildTenantAuthHeaders } from '@/lib/backend-auth'
import { getBackendUrl } from '@/lib/runtime-controls'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

const PLAN_MONTHLY_PRICE_USD = 25
const PLAN_YEARLY_PRICE_USD = 240

type BillingPlan = 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY'
type CheckoutPlan = 'monthly' | 'yearly'
type CancelMode = 'scheduled' | 'immediate'

interface SubscriptionSnapshot {
  state?: string
  plan?: string
  billingStatus?: string
  isPaidPlan?: boolean
  currentPeriodEndAt?: string | null
  subscriptionEndsAt?: string | null
  cancelAtPeriodEnd?: boolean
  graceEndsAt?: string | null
  lastPaymentStatus?: string | null
  lastPaymentAt?: string | null
  lastPaymentAmountCents?: number | null
  lastPaymentCurrency?: string | null
  paywall?: {
    trialEndsAt?: string | null
  }
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

function parseJsonRecord(text: string): Record<string, unknown> | null {
  if (!text.trim()) return null
  try {
    const parsed = JSON.parse(text)
    return readRecord(parsed)
  } catch {
    return null
  }
}

function normalizeBillingPlan(value: unknown): BillingPlan | null {
  const normalized = readString(value)?.toUpperCase()
  if (!normalized) return null
  if (normalized === 'FREE' || normalized === 'PRO_MONTHLY' || normalized === 'PRO_YEARLY') {
    return normalized as BillingPlan
  }
  return null
}

function formatDateTime(value: unknown): string {
  const iso = readString(value)
  if (!iso) return '—'
  const timestamp = Date.parse(iso)
  if (!Number.isFinite(timestamp)) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatAmountCents(amountCents: unknown, currency: unknown): string {
  const amount = readNumber(amountCents)
  if (amount === null) return '—'
  const currencyCode = readString(currency)?.toUpperCase() ?? 'USD'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

function toDisplayPlan(plan: BillingPlan | null): string {
  if (plan === 'PRO_MONTHLY') return 'Pro Monthly'
  if (plan === 'PRO_YEARLY') return 'Pro Yearly'
  return 'Free'
}

function toDisplayStatus(snapshot: SubscriptionSnapshot | null): string {
  if (!snapshot) return 'Unknown'
  if (snapshot.isPaidPlan === true) return 'Active'
  const state = readString(snapshot.state)?.toUpperCase() ?? ''
  const billingStatus = readString(snapshot.billingStatus)?.toUpperCase() ?? ''
  if (state === 'TERMINATED') return 'Ended'
  if (snapshot.cancelAtPeriodEnd) return 'Cancel scheduled'
  if (state === 'GRACE') return 'Grace'
  if (billingStatus) return billingStatus.toLowerCase().replace(/_/g, ' ')
  if (state) return state.toLowerCase().replace(/_/g, ' ')
  return 'Free'
}

function statusBadgeClass(snapshot: SubscriptionSnapshot | null): string {
  if (!snapshot) return 'border-border text-foreground'
  if (snapshot.isPaidPlan === true) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
  }
  const state = readString(snapshot.state)?.toUpperCase() ?? ''
  if (state === 'TERMINATED') {
    return 'border-destructive/30 bg-destructive/10 text-destructive'
  }
  if (snapshot.cancelAtPeriodEnd || state === 'GRACE') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
  }
  return 'border-border text-foreground'
}

export default function SettingsSubscriptionPage() {
  const router = useRouter()
  const pathname = usePathname()

  const lastHandledCheckoutOutcomeRef = useRef('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const [loadingSnapshot, setLoadingSnapshot] = useState(false)
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null)
  const [snapshotError, setSnapshotError] = useState('')

  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan>('monthly')
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<CheckoutPlan | null>(null)
  const [finalizingCheckout, setFinalizingCheckout] = useState(false)

  const [statusMessage, setStatusMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelStep, setCancelStep] = useState<'convince' | 'confirm'>('convince')
  const [cancelLoadingMode, setCancelLoadingMode] = useState<CancelMode | null>(null)

  const redirectToSignIn = useCallback(() => {
    const currentPath = typeof window === 'undefined'
      ? '/dashboard/settings/subscription'
      : `${window.location.pathname}${window.location.search}`
    router.replace(buildSignInPath(currentPath))
  }, [router])

  const refreshSubscription = useCallback(async (targetTenantId?: string): Promise<SubscriptionSnapshot | null> => {
    const resolvedTenantId = (targetTenantId ?? tenantId).trim()
    if (!resolvedTenantId) {
      return null
    }

    const backendUrl = getBackendUrl()
    setLoadingSnapshot(true)
    setSnapshotError('')

    try {
      const headers = await buildTenantAuthHeaders(resolvedTenantId)
      const response = await fetch(`${backendUrl}/api/v1/subscription`, {
        method: 'GET',
        headers,
      })

      const payloadText = await response.text()
      const payload = parseJsonRecord(payloadText)

      if (response.status === 403 && readString(payload?.error) === 'TENANT_TERMINATED') {
        const terminated: SubscriptionSnapshot = {
          state: 'TERMINATED',
          plan: 'FREE',
          billingStatus: 'CANCELED',
          isPaidPlan: false,
        }
        setSnapshot(terminated)
        setSelectedPlan('monthly')
        return terminated
      }

      if (!response.ok || !payload) {
        const message = readString(payload?.message) ?? 'Could not load subscription details.'
        throw new Error(message)
      }

      const nextSnapshot = payload as SubscriptionSnapshot
      setSnapshot(nextSnapshot)

      const normalizedPlan = normalizeBillingPlan(nextSnapshot.plan)
      if (normalizedPlan === 'PRO_YEARLY') {
        setSelectedPlan('yearly')
      } else if (normalizedPlan === 'PRO_MONTHLY') {
        setSelectedPlan('monthly')
      }

      return nextSnapshot
    } catch (error) {
      setSnapshotError(error instanceof Error ? error.message : 'Could not load subscription details.')
      return null
    } finally {
      setLoadingSnapshot(false)
    }
  }, [tenantId])

  const confirmStripeCheckoutSession = useCallback(async (targetTenantId: string, sessionId: string): Promise<boolean> => {
    const normalizedTenantId = targetTenantId.trim()
    const normalizedSessionId = sessionId.trim()
    if (!normalizedTenantId || !normalizedSessionId) {
      return false
    }

    const backendUrl = getBackendUrl()
    try {
      const headers = await buildTenantAuthHeaders(normalizedTenantId, {
        'content-type': 'application/json',
      })
      const response = await fetch(`${backendUrl}/api/v1/billing/stripe/checkout/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: normalizedSessionId,
        }),
      })

      const payloadText = await response.text()
      const payload = parseJsonRecord(payloadText)
      return response.ok && payload?.upgraded === true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          redirectToSignIn()
          return
        }

        const complete = await isOnboardingComplete(session, { backfillFromProvisionedTenant: true })
        if (!complete) {
          router.replace('/dashboard')
          return
        }

        const resolvedTenantId = deriveTenantIdFromUserId(session.user.id)
        if (cancelled) return

        setTenantId(resolvedTenantId)
        setCustomerEmail(session.user.email ?? '')
        await refreshSubscription(resolvedTenantId)
        if (!cancelled) {
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
  }, [redirectToSignIn, refreshSubscription, router])

  useEffect(() => {
    if (checkingSession || !tenantId || typeof window === 'undefined') {
      return
    }

    const query = new URLSearchParams(window.location.search)
    const checkout = query.get('checkout')
    const checkoutSessionId = query.get('session_id')?.trim() ?? ''
    if (checkout !== 'success' && checkout !== 'cancel') {
      return
    }

    const checkoutOutcomeKey = `${checkout}:${checkoutSessionId || 'none'}`
    if (lastHandledCheckoutOutcomeRef.current === checkoutOutcomeKey) {
      return
    }
    lastHandledCheckoutOutcomeRef.current = checkoutOutcomeKey

    query.delete('checkout')
    query.delete('session_id')
    const nextQuery = query.toString()
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(nextHref, { scroll: false })

    if (checkout === 'cancel') {
      setStatusMessage('')
      setActionError('Checkout canceled.')
      void refreshSubscription(tenantId)
      return
    }

    setFinalizingCheckout(true)
    setActionError('')
    setStatusMessage('Finalizing your payment...')

    void (async () => {
      let confirmedUpgrade = false
      if (checkoutSessionId) {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          confirmedUpgrade = await confirmStripeCheckoutSession(tenantId, checkoutSessionId)
          if (confirmedUpgrade) {
            break
          }
          if (attempt + 1 < 5) {
            await new Promise((resolve) => setTimeout(resolve, 1000 + attempt * 500))
          }
        }
      }

      const refreshedSnapshot = await refreshSubscription(tenantId)
      const upgraded = confirmedUpgrade || refreshedSnapshot?.isPaidPlan === true
      if (upgraded) {
        setStatusMessage('Subscription active. Managed hosting is unlocked.')
        setActionError('')
      } else {
        setStatusMessage('')
        setActionError('Payment is processing. Refresh in a few seconds.')
      }
      setFinalizingCheckout(false)
    })()
  }, [checkingSession, confirmStripeCheckoutSession, pathname, refreshSubscription, router, tenantId])

  const startCheckout = useCallback(async (plan: CheckoutPlan) => {
    if (!tenantId) {
      setActionError('Missing tenant context. Refresh and try again.')
      return
    }

    const backendUrl = getBackendUrl()
    const successUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${pathname}?checkout=success&session_id={CHECKOUT_SESSION_ID}`
        : undefined
    const cancelUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${pathname}?checkout=cancel`
        : undefined

    setCheckoutLoadingPlan(plan)
    setStatusMessage('')
    setActionError('')

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
          customerEmail: customerEmail || undefined,
        }),
      })

      const payloadText = await response.text()
      const payload = parseJsonRecord(payloadText)
      if (!response.ok) {
        const message = readString(payload?.message) ?? 'Could not start checkout.'
        throw new Error(message)
      }

      const checkoutUrl = readString(payload?.url)
      if (!checkoutUrl) {
        throw new Error('Checkout session was created without a redirect URL.')
      }

      window.location.assign(checkoutUrl)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not start checkout.')
      setCheckoutLoadingPlan(null)
    }
  }, [customerEmail, pathname, tenantId])

  const submitCancellation = useCallback(async (mode: CancelMode) => {
    if (!tenantId) {
      setActionError('Missing tenant context. Refresh and try again.')
      return
    }

    const backendUrl = getBackendUrl()
    setCancelLoadingMode(mode)
    setStatusMessage('')
    setActionError('')

    try {
      const headers = await buildTenantAuthHeaders(tenantId, {
        'content-type': 'application/json',
      })
      const response = await fetch(`${backendUrl}/api/v1/subscription/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          immediate: mode === 'immediate',
        }),
      })

      const payloadText = await response.text()
      const payload = parseJsonRecord(payloadText)
      if (!response.ok) {
        const message = readString(payload?.message) ?? 'Could not update cancellation.'
        throw new Error(message)
      }

      setCancelDialogOpen(false)
      setCancelStep('convince')
      setStatusMessage(readString(payload?.message) ?? 'Subscription updated.')
      await refreshSubscription(tenantId)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update cancellation.')
    } finally {
      setCancelLoadingMode(null)
    }
  }, [refreshSubscription, tenantId])

  const normalizedPlan = normalizeBillingPlan(snapshot?.plan)
  const hasPaidPlan = snapshot?.isPaidPlan === true
  const statusLabel = toDisplayStatus(snapshot)
  const activePlanLabel = toDisplayPlan(normalizedPlan)
  const currentPlanSelection = normalizedPlan === 'PRO_YEARLY' ? 'yearly' : 'monthly'
  const isCurrentSelection = selectedPlan === currentPlanSelection
  const periodLabel = snapshot?.cancelAtPeriodEnd ? 'Ends' : hasPaidPlan ? 'Renews' : 'Trial ends'
  const periodValue = useMemo(() => {
    if (snapshot?.cancelAtPeriodEnd) {
      return formatDateTime(snapshot.subscriptionEndsAt ?? snapshot.currentPeriodEndAt)
    }
    if (hasPaidPlan) {
      return formatDateTime(snapshot?.currentPeriodEndAt)
    }
    return formatDateTime(snapshot?.paywall?.trialEndsAt)
  }, [hasPaidPlan, snapshot])
  const allowCancelFlow = normalizedPlan === 'PRO_MONTHLY' || normalizedPlan === 'PRO_YEARLY'
  const graceEndsAtMs = useMemo(() => {
    const raw = readString(snapshot?.graceEndsAt)
    if (!raw) return null
    const parsed = Date.parse(raw)
    return Number.isFinite(parsed) ? parsed : null
  }, [snapshot?.graceEndsAt])
  const scheduledDeletionAtMs = useMemo(() => {
    const raw = readString(snapshot?.subscriptionEndsAt ?? snapshot?.currentPeriodEndAt)
    if (!raw) return null
    const parsed = Date.parse(raw)
    return Number.isFinite(parsed) ? parsed : null
  }, [snapshot?.currentPeriodEndAt, snapshot?.subscriptionEndsAt])
  const deletionDaysRemaining = useMemo(() => {
    const now = Date.now()
    const activeMs =
      readString(snapshot?.state)?.toUpperCase() === 'GRACE'
        ? graceEndsAtMs
        : snapshot?.cancelAtPeriodEnd
          ? scheduledDeletionAtMs
          : null
    if (activeMs === null || activeMs <= now) return null
    return Math.max(1, Math.ceil((activeMs - now) / (24 * 60 * 60 * 1000)))
  }, [graceEndsAtMs, scheduledDeletionAtMs, snapshot?.cancelAtPeriodEnd, snapshot?.state])
  const deletionWarningText = useMemo(() => {
    if (deletionDaysRemaining === null) return null
    const state = readString(snapshot?.state)?.toUpperCase() ?? ''
    if (state === 'GRACE') {
      return `Payment grace active. You have ${deletionDaysRemaining} day${deletionDaysRemaining === 1 ? '' : 's'} to pay before this instance is deleted.`
    }
    if (snapshot?.cancelAtPeriodEnd) {
      return `Cancellation scheduled. This instance will be deleted in ${deletionDaysRemaining} day${deletionDaysRemaining === 1 ? '' : 's'}.`
    }
    return null
  }, [deletionDaysRemaining, snapshot?.cancelAtPeriodEnd, snapshot?.state])

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
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />

      <div className="relative z-10 mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to settings
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshSubscription()}
            disabled={loadingSnapshot}
          >
            {loadingSnapshot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Reload
          </Button>
        </div>

        <div>
          <h1 className="text-lg font-semibold tracking-tight">Billing & subscription</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            OpenClaw is open source. Your plan covers managed hosting, security, and product UI.
          </p>
        </div>

        {snapshotError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {snapshotError}
          </div>
        ) : null}

        {actionError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        ) : null}

        {deletionWarningText ? (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            {deletionWarningText}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            {statusMessage}
          </div>
        ) : null}

        <Card className="border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              Current plan
              <Badge variant="outline" className={cn('font-medium capitalize', statusBadgeClass(snapshot))}>
                {statusLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{activePlanLabel}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
              <span className="text-muted-foreground">{periodLabel}</span>
              <span className="font-medium">{periodValue}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
              <span className="text-muted-foreground">Last payment</span>
              <span className="font-medium">
                {snapshot?.lastPaymentStatus
                  ? `${formatAmountCents(snapshot.lastPaymentAmountCents, snapshot.lastPaymentCurrency)} · ${formatDateTime(snapshot.lastPaymentAt)}`
                  : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Change plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  selectedPlan === 'monthly'
                    ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/70 bg-card hover:border-primary/30 hover:bg-muted/30',
                )}
              >
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="mt-1 text-xl font-semibold">${PLAN_MONTHLY_PRICE_USD}/mo</p>
                <p className="mt-1 text-xs text-muted-foreground">Billed monthly</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlan('yearly')}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  selectedPlan === 'yearly'
                    ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/70 bg-card hover:border-primary/30 hover:bg-muted/30',
                )}
              >
                <p className="text-xs text-muted-foreground">Yearly</p>
                <p className="mt-1 text-xl font-semibold">${PLAN_YEARLY_PRICE_USD}/year</p>
                <p className="mt-1 text-xs text-muted-foreground">Billed yearly</p>
              </button>
            </div>

            <Button
              onClick={() => void startCheckout(selectedPlan)}
              disabled={checkoutLoadingPlan !== null || finalizingCheckout}
              className="w-full"
            >
              {checkoutLoadingPlan === selectedPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {hasPaidPlan
                ? isCurrentSelection
                  ? 'Checkout current plan'
                  : 'Switch plan in checkout'
                : 'Upgrade in checkout'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed border-border/70 bg-muted/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Cancellation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allowCancelFlow ? (
              <>
                <p className="text-sm text-muted-foreground">
                  We add one confirmation step to prevent accidental cancellations.
                </p>
                {snapshot?.cancelAtPeriodEnd ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    A cancellation is already scheduled. You can still change this now.
                  </p>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancelDialogOpen(true)
                    setCancelStep('convince')
                  }}
                >
                  Manage cancellation
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active paid plan to cancel.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(nextOpen) => {
          setCancelDialogOpen(nextOpen)
          if (!nextOpen) {
            setCancelStep('convince')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {cancelStep === 'convince' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Before you cancel
                </DialogTitle>
                <DialogDescription>
                  Managed hosting keeps your OpenClaw instance online, secured, and maintained for you.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                You can switch monthly/yearly anytime from this page.
              </div>

              <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
                <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                  Keep managed hosting
                </Button>
                <Button variant="destructive" onClick={() => setCancelStep('confirm')}>
                  Continue to cancel
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4" />
                  Choose cancellation type
                </DialogTitle>
                <DialogDescription>
                  One final step so this action is explicit.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => void submitCancellation('scheduled')}
                  disabled={cancelLoadingMode !== null}
                >
                  {cancelLoadingMode === 'scheduled' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Schedule cancellation
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="destructive"
                  onClick={() => void submitCancellation('immediate')}
                  disabled={cancelLoadingMode !== null}
                >
                  {cancelLoadingMode === 'immediate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Cancel now
                </Button>
              </div>

              <DialogFooter className="sm:justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setCancelStep('convince')}
                  disabled={cancelLoadingMode !== null}
                >
                  Back
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
