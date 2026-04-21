'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

type BillingPlan = 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY'
type CancelMode = 'immediate'
const STRIPE_CHECKOUT_SESSION_ID_TOKEN = '{CHECKOUT_SESSION_ID}'
const STRIPE_LAST_CHECKOUT_SESSION_ID_STORAGE_KEY = 'clawpilot:last-stripe-checkout-session-id'
const SUBSCRIPTION_SUCCESS_PATH = '/dashboard/settings/subscription/success'
const STRIPE_TRIAL_DAYS = 3

interface SubscriptionSnapshot {
  state?: string
  plan?: string
  billingStatus?: string
  isPaidPlan?: boolean
  providerSubscriptionId?: string | null
  currentPeriodStartAt?: string | null
  currentPeriodEndAt?: string | null
  trialStartedAt?: string | null
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

function buildSubscriptionSuccessPath(sessionId: string): string {
  const normalizedSessionId = sessionId.trim()
  if (!normalizedSessionId) {
    return SUBSCRIPTION_SUCCESS_PATH
  }

  const params = new URLSearchParams()
  params.set('session_id', normalizedSessionId)
  return `${SUBSCRIPTION_SUCCESS_PATH}?${params.toString()}`
}

function resolveManagedHostingEntitlement(snapshot: SubscriptionSnapshot | null): boolean {
  if (!snapshot) {
    return false
  }
  if (typeof snapshot.isPaidPlan === 'boolean') {
    return snapshot.isPaidPlan
  }

  const plan = normalizeBillingPlan(snapshot.plan)
  if (plan !== 'PRO_MONTHLY' && plan !== 'PRO_YEARLY') {
    return false
  }

  const state = readString(snapshot.state)?.toUpperCase() ?? ''
  if (state === 'TERMINATED' || state === 'SUSPENDED') {
    return false
  }

  const billingStatus = readString(snapshot.billingStatus)?.toUpperCase() ?? ''
  return billingStatus === 'ACTIVE' || billingStatus === 'TRIALING' || billingStatus === 'PAST_DUE'
}

function isTrialingSnapshot(snapshot: SubscriptionSnapshot | null): boolean {
  return (readString(snapshot?.billingStatus)?.toUpperCase() ?? '') === 'TRIALING'
}

function isEligibleForManagedTrial(snapshot: SubscriptionSnapshot | null): boolean {
  if (!snapshot) {
    return true
  }

  return !readString(snapshot.providerSubscriptionId)
    && !readString(snapshot.currentPeriodStartAt)
    && !readString(snapshot.trialStartedAt)
    && !readString(snapshot.lastPaymentAt)
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
  const state = readString(snapshot.state)?.toUpperCase() ?? ''
  const billingStatus = readString(snapshot.billingStatus)?.toUpperCase() ?? ''
  if (billingStatus === 'TRIALING') return 'Trialing'
  if (snapshot.isPaidPlan === true) return 'Active'
  if (state === 'TERMINATED') return 'Ended'
  if (snapshot.cancelAtPeriodEnd) return 'Cancel scheduled'
  if (state === 'GRACE') return 'Grace'
  if (billingStatus) return billingStatus.toLowerCase().replace(/_/g, ' ')
  if (state) return state.toLowerCase().replace(/_/g, ' ')
  return 'Free'
}

function statusBadgeClass(snapshot: SubscriptionSnapshot | null): string {
  if (!snapshot) return 'border-border text-foreground'
  if (isTrialingSnapshot(snapshot)) {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400'
  }
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

function SettingsSubscriptionPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [onboardingComplete, setOnboardingComplete] = useState(false)

  const [loadingSnapshot, setLoadingSnapshot] = useState(false)
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null)
  const [snapshotError, setSnapshotError] = useState('')

  const [portalRedirecting, setPortalRedirecting] = useState(false)

  const [statusMessage, setStatusMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelStep, setCancelStep] = useState<'convince' | 'confirm'>('convince')
  const [cancelLoadingMode, setCancelLoadingMode] = useState<CancelMode | null>(null)
  const [redeployLoading, setRedeployLoading] = useState(false)
  const attemptedRequiredRedirectRef = useRef(false)

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
        return terminated
      }

      const tenantNotFound =
        (response.status === 404 && readString(payload?.error) === 'TENANT_NOT_FOUND') ||
        readString(payload?.message)?.toLowerCase().includes('unknown tenant') === true
      if (tenantNotFound) {
        const missing: SubscriptionSnapshot = {
          state: 'FREE',
          plan: 'FREE',
          billingStatus: 'FREE',
          isPaidPlan: false,
        }
        setSnapshot(missing)
        return missing
      }

      if (!response.ok || !payload) {
        const message = readString(payload?.message) ?? 'Could not load subscription details.'
        throw new Error(message)
      }

      const nextSnapshot = payload as SubscriptionSnapshot
      setSnapshot(nextSnapshot)

      return nextSnapshot
    } catch (error) {
      setSnapshotError(error instanceof Error ? error.message : 'Could not load subscription details.')
      return null
    } finally {
      setLoadingSnapshot(false)
    }
  }, [tenantId])

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
        const userMetadata = (session.user.user_metadata ?? {}) as Record<string, unknown>
        const fullName = typeof userMetadata.full_name === 'string' ? userMetadata.full_name.trim() : ''
        const fallbackName = typeof userMetadata.name === 'string' ? userMetadata.name.trim() : ''

        const resolvedTenantId = deriveTenantIdFromUserId(session.user.id)
        if (cancelled) return

        setTenantId(resolvedTenantId)
        setCustomerEmail(session.user.email ?? '')
        setCustomerName(fullName || fallbackName || '')
        setOnboardingComplete(complete)
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
  }, [redirectToSignIn, refreshSubscription])

  const startStripeBillingPortal = useCallback(async () => {
    if (!tenantId) {
      setActionError('Missing tenant context. Refresh and try again.')
      return
    }

    const backendUrl = getBackendUrl()
    const returnUrl =
      typeof window === 'undefined'
        ? undefined
        : `${window.location.origin}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

    setPortalRedirecting(true)
    setStatusMessage('Redirecting to Stripe...')
    setActionError('')

    try {
      const headers = await buildTenantAuthHeaders(tenantId, {
        'content-type': 'application/json',
      })
      const response = await fetch(`${backendUrl}/api/v1/billing/stripe/portal/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          returnUrl,
          customerEmail: customerEmail || undefined,
          customerName: customerName || undefined,
        }),
      })

      const payloadText = await response.text()
      const payload = parseJsonRecord(payloadText)
      if (!response.ok) {
        const message = readString(payload?.message) ?? 'Could not open Stripe billing.'
        throw new Error(message)
      }

      const portalUrl = readString(payload?.url)
      if (!portalUrl) {
        throw new Error('Stripe billing URL is missing.')
      }

      window.location.assign(portalUrl)
    } catch (error) {
      setStatusMessage('')
      setActionError(error instanceof Error ? error.message : 'Could not open Stripe billing.')
      setPortalRedirecting(false)
    }
  }, [customerEmail, customerName, pathname, searchParams, tenantId])

  const startStripeCheckout = useCallback(async () => {
    if (!tenantId) {
      setActionError('Missing tenant context. Refresh and try again.')
      return
    }

    const backendUrl = getBackendUrl()
    const successUrl =
      typeof window === 'undefined'
        ? undefined
        : (() => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('required', '1')
            params.set('stripe_return', '1')
            params.set('checkout', 'success')
            params.set('session_id', STRIPE_CHECKOUT_SESSION_ID_TOKEN)
            const builtUrl = `${window.location.origin}${pathname}?${params.toString()}`
            // Stripe only replaces the literal token, not the URL-encoded version.
            return builtUrl.replace(encodeURIComponent(STRIPE_CHECKOUT_SESSION_ID_TOKEN), STRIPE_CHECKOUT_SESSION_ID_TOKEN)
          })()
    const cancelUrl =
      typeof window === 'undefined'
        ? undefined
        : (() => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('required', '1')
            params.set('stripe_return', '1')
            params.set('checkout', 'cancel')
            params.delete('session_id')
            return `${window.location.origin}${pathname}?${params.toString()}`
          })()

    setPortalRedirecting(true)
    setStatusMessage(
      isEligibleForManagedTrial(snapshot)
        ? 'Redirecting to Stripe...'
        : 'Redirecting to Stripe checkout...',
    )
    setActionError('')

    try {
      const headers = await buildTenantAuthHeaders(tenantId, {
        'content-type': 'application/json',
      })
      const response = await fetch(`${backendUrl}/api/v1/billing/stripe/checkout/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan: 'monthly',
          applyDiscount: false,
          successUrl,
          cancelUrl,
          customerEmail: customerEmail || undefined,
          customerName: customerName || undefined,
        }),
      })

      const payloadText = await response.text()
      const payload = parseJsonRecord(payloadText)
      if (!response.ok) {
        const message = readString(payload?.message) ?? 'Could not open Stripe checkout.'
        throw new Error(message)
      }

      const checkoutUrl = readString(payload?.url)
      if (!checkoutUrl) {
        throw new Error('Stripe checkout URL is missing.')
      }
      const checkoutSessionId = readString(payload?.sessionId)
      if (typeof window !== 'undefined' && checkoutSessionId) {
        window.localStorage.setItem(STRIPE_LAST_CHECKOUT_SESSION_ID_STORAGE_KEY, checkoutSessionId)
      }

      window.location.assign(checkoutUrl)
    } catch (error) {
      setStatusMessage('')
      setActionError(error instanceof Error ? error.message : 'Could not open Stripe checkout.')
      setPortalRedirecting(false)
    }
  }, [customerEmail, customerName, pathname, searchParams, snapshot, tenantId])

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

  const submitCancellation = useCallback(async () => {
    if (!tenantId) {
      setActionError('Missing tenant context. Refresh and try again.')
      return
    }

    const backendUrl = getBackendUrl()
    setCancelLoadingMode('immediate')
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
          immediate: true,
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

  const redeployManagedInstance = useCallback(async () => {
    if (!tenantId) {
      setActionError('Missing tenant context. Refresh and try again.')
      return
    }

    const confirmed = window.confirm(
      'Re-deploy from scratch? This immediately deletes your current OpenClaw instance and provisions a fresh one.',
    )
    if (!confirmed) {
      return
    }

    const typed = window.prompt('Type REDEPLOY to confirm.')
    if (typed?.trim().toUpperCase() !== 'REDEPLOY') {
      return
    }

    const backendUrl = getBackendUrl()
    setRedeployLoading(true)
    setStatusMessage('')
    setActionError('')

    try {
      const headers = await buildTenantAuthHeaders(tenantId, {
        'content-type': 'application/json',
      })
      const response = await fetch(`${backendUrl}/api/v1/daemons/${encodeURIComponent(tenantId)}/redeploy`, {
        method: 'POST',
        headers,
        body: '{}',
      })

      const payloadText = await response.text()
      const payload = parseJsonRecord(payloadText)
      if (!response.ok) {
        const message = readString(payload?.message) ?? 'Could not re-deploy your instance.'
        throw new Error(message)
      }

      setStatusMessage('Re-deploy started. Your old instance was deleted and a fresh instance is now provisioning.')
      await refreshSubscription(tenantId)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not re-deploy your instance.')
    } finally {
      setRedeployLoading(false)
    }
  }, [refreshSubscription, tenantId])

  const normalizedPlan = normalizeBillingPlan(snapshot?.plan)
  const hasPaidPlan = resolveManagedHostingEntitlement(snapshot)
  const isTrialing = isTrialingSnapshot(snapshot)
  const eligibleForTrial = isEligibleForManagedTrial(snapshot)
  const requiredBilling = searchParams.get('required') === '1'
  const stripeReturn = searchParams.get('stripe_return') === '1'
  const checkoutStatus = searchParams.get('checkout')
  const checkoutSucceeded = checkoutStatus === 'success'
  const checkoutCanceled = checkoutStatus === 'cancel'
  const checkoutSessionId = (searchParams.get('session_id') ?? '').trim()
  const effectiveCheckoutSessionId = useMemo(() => {
    const decodedQuerySessionId = decodeURIComponent(checkoutSessionId)
    const isPlaceholder =
      !decodedQuerySessionId ||
      decodedQuerySessionId === STRIPE_CHECKOUT_SESSION_ID_TOKEN ||
      decodedQuerySessionId.includes('CHECKOUT_SESSION_ID') ||
      decodedQuerySessionId.startsWith('{') ||
      decodedQuerySessionId.endsWith('}')

    if (!isPlaceholder) {
      return decodedQuerySessionId
    }

    if (typeof window === 'undefined') {
      return ''
    }
    const storedSessionId = window.localStorage.getItem(STRIPE_LAST_CHECKOUT_SESSION_ID_STORAGE_KEY)?.trim() ?? ''
    return storedSessionId
  }, [checkoutSessionId])
  const billingNextPath = '/dashboard/model'
  const backHref = onboardingComplete ? '/dashboard/chat' : '/dashboard/model'
  const statusLabel = toDisplayStatus(snapshot)
  const activePlanLabel = toDisplayPlan(normalizedPlan)
  const periodLabel = snapshot?.cancelAtPeriodEnd ? 'Ends' : isTrialing ? 'Trial ends' : hasPaidPlan ? 'Renews' : 'Trial ends'
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

  useEffect(() => {
    if (checkingSession || !tenantId) {
      return
    }
    if (!requiredBilling || !stripeReturn || hasPaidPlan || portalRedirecting || checkoutCanceled) {
      return
    }

    let cancelled = false
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null
    async function waitForStripeSync() {
      setStatusMessage('Finalizing your billing...')
      setActionError('')

      if (checkoutSucceeded && effectiveCheckoutSessionId) {
        const confirmed = await confirmStripeCheckoutSession(tenantId, effectiveCheckoutSessionId)
        if (!cancelled && confirmed) {
          router.replace(buildSubscriptionSuccessPath(effectiveCheckoutSessionId))
          return
        }
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const latestSnapshot = await refreshSubscription(tenantId)
        if (cancelled) {
          return
        }

        const latestHasPaidPlan = resolveManagedHostingEntitlement(latestSnapshot ?? null)
        if (latestHasPaidPlan) {
          router.replace(buildSubscriptionSuccessPath(effectiveCheckoutSessionId))
          return
        }

        if (attempt < 4) {
          await new Promise<void>((resolve) => {
            pendingTimeout = setTimeout(resolve, 1_200)
          })
        }
      }

      if (!cancelled) {
        setStatusMessage('')
        setActionError('Payment sync is still pending. Click Reload, then Continue to Stripe only if needed.')
      }
    }

    void waitForStripeSync()

    return () => {
      cancelled = true
      if (pendingTimeout) {
        clearTimeout(pendingTimeout)
      }
    }
  }, [billingNextPath, checkingSession, checkoutCanceled, checkoutSucceeded, confirmStripeCheckoutSession, effectiveCheckoutSessionId, hasPaidPlan, portalRedirecting, refreshSubscription, requiredBilling, router, stripeReturn, tenantId])

  useEffect(() => {
    if (!requiredBilling || !checkoutCanceled) {
      return
    }
    setStatusMessage('')
    setActionError('Checkout was canceled.')
  }, [checkoutCanceled, requiredBilling])

  useEffect(() => {
    if (checkingSession || !tenantId) {
      return
    }
    if (!requiredBilling || hasPaidPlan || portalRedirecting || stripeReturn) {
      return
    }
    if (attemptedRequiredRedirectRef.current) {
      return
    }

    attemptedRequiredRedirectRef.current = true
    void startStripeCheckout()
  }, [checkingSession, hasPaidPlan, portalRedirecting, requiredBilling, startStripeCheckout, stripeReturn, tenantId])

  useEffect(() => {
    if (checkingSession || !tenantId) {
      return
    }
    if (!requiredBilling || !hasPaidPlan) {
      return
    }
    const destinationPath =
      stripeReturn && checkoutSucceeded
        ? buildSubscriptionSuccessPath(effectiveCheckoutSessionId)
        : billingNextPath

    router.replace(destinationPath)
  }, [billingNextPath, checkingSession, checkoutSucceeded, effectiveCheckoutSessionId, hasPaidPlan, requiredBilling, router, stripeReturn, tenantId])

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

  if (requiredBilling && !hasPaidPlan) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-border/70 bg-card p-6 text-center">
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {stripeReturn
              ? 'Finalizing billing...'
              : eligibleForTrial
                ? 'Redirecting to Stripe...'
                : 'Redirecting to Stripe checkout...'}
          </p>
          {statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null}
          {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
          <Button onClick={() => void startStripeCheckout()} disabled={portalRedirecting} className="w-full">
            {portalRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {eligibleForTrial ? 'Start free in Stripe' : 'Continue to Stripe'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />

      <div className="relative z-10 mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {onboardingComplete ? 'Back to settings' : 'Back to onboarding'}
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
            <CardTitle className="text-base">Stripe billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {hasPaidPlan
                ? 'We send you directly to Stripe to manage billing and cancellation.'
                : eligibleForTrial
                  ? `We send you directly to Stripe to start your ${STRIPE_TRIAL_DAYS}-day trial. Card required. You are charged automatically when the trial ends unless you cancel first.`
                  : 'We send you directly to Stripe checkout. Your card is charged immediately unless Stripe shows a different promotion.'}
            </p>

            <Button
              onClick={() => void (hasPaidPlan ? startStripeBillingPortal() : startStripeCheckout())}
              disabled={portalRedirecting}
              className="w-full"
            >
              {portalRedirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {hasPaidPlan
                ? 'Manage in Stripe'
                : eligibleForTrial
                  ? 'Start free in Stripe'
                  : 'Continue to Stripe checkout'}
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
                  Cancel subscription
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active paid plan to cancel.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Instance Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Re-deploy removes the current managed instance and rebuilds it from scratch using your saved runtime
              configuration.
            </p>
            {hasPaidPlan ? (
              <Button
                variant="destructive"
                onClick={() => void redeployManagedInstance()}
                disabled={
                  redeployLoading ||
                  loadingSnapshot ||
                  portalRedirecting ||
                  cancelLoadingMode !== null
                }
              >
                {redeployLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Re-deploy from scratch
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Active paid plan required to re-deploy from scratch.
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
                  Confirm cancellation
                </DialogTitle>
                <DialogDescription>
                  Canceling will immediately end billing access and delete the managed instance.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Button
                  className="w-full justify-start"
                  variant="destructive"
                  onClick={() => void submitCancellation()}
                  disabled={cancelLoadingMode !== null}
                >
                  {cancelLoadingMode === 'immediate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TriangleAlert className="h-4 w-4" />}
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

export default function SettingsSubscriptionPage() {
  return (
    <Suspense fallback={null}>
      <SettingsSubscriptionPageClient />
    </Suspense>
  )
}
