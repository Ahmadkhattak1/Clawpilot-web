'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const STRIPE_CHECKOUT_SESSION_ID_TOKEN = '{CHECKOUT_SESSION_ID}'
const STRIPE_LAST_CHECKOUT_SESSION_ID_STORAGE_KEY = 'clawpilot:last-stripe-checkout-session-id'
const SUBSCRIBE_CONVERSION_SEND_TO = 'AW-17277705517/gXTcCJ6j2ZgcEK26065A'
const SUBSCRIBE_CONVERSION_STORAGE_KEY_PREFIX = 'clawpilot:ads:subscribe-conversion:'
const CONTINUE_PATH = '/dashboard/model'

type TrackingState = 'tracking' | 'tracked' | 'pending'

function normalizeCheckoutSessionId(value: string | null): string {
  const decoded = decodeURIComponent((value ?? '').trim())
  if (!decoded) {
    return ''
  }

  if (
    decoded === STRIPE_CHECKOUT_SESSION_ID_TOKEN ||
    decoded.includes('CHECKOUT_SESSION_ID') ||
    decoded.startsWith('{') ||
    decoded.endsWith('}')
  ) {
    return ''
  }

  return decoded
}

function SubscriptionSuccessPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const querySessionId = useMemo(
    () => normalizeCheckoutSessionId(searchParams.get('session_id')),
    [searchParams],
  )
  const [trackingState, setTrackingState] = useState<TrackingState>('tracking')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    let cancelled = false
    let pollId: ReturnType<typeof setInterval> | null = null
    let redirectTimeout: ReturnType<typeof setTimeout> | null = null

    const storedSessionId = window.localStorage.getItem(STRIPE_LAST_CHECKOUT_SESSION_ID_STORAGE_KEY)?.trim() ?? ''
    const checkoutSessionId = querySessionId || storedSessionId
    const trackingKey = checkoutSessionId
      ? `${SUBSCRIBE_CONVERSION_STORAGE_KEY_PREFIX}${checkoutSessionId}`
      : ''
    const conversionPayload: Record<string, string | number> = checkoutSessionId
      ? {
          send_to: SUBSCRIBE_CONVERSION_SEND_TO,
          value: 1.0,
          currency: 'PKR',
          transaction_id: checkoutSessionId,
        }
      : {
          send_to: SUBSCRIBE_CONVERSION_SEND_TO,
          value: 1.0,
          currency: 'PKR',
        }

    const fireConversion = (): boolean => {
      if (typeof window.gtag !== 'function') {
        return false
      }
      if (window.localStorage.getItem(trackingKey) === '1') {
        setTrackingState('tracked')
        return true
      }

      window.gtag('event', 'conversion', conversionPayload)
      window.localStorage.setItem(trackingKey, '1')
      setTrackingState('tracked')
      return true
    }

    if (!checkoutSessionId) {
      setTrackingState('pending')
    } else if (!fireConversion()) {
      let attempts = 0
      pollId = setInterval(() => {
        if (cancelled) {
          return
        }
        attempts += 1
        const fired = fireConversion()
        if (fired || attempts >= 12) {
          if (!fired && !cancelled) {
            setTrackingState('pending')
          }
          if (pollId) {
            clearInterval(pollId)
            pollId = null
          }
        }
      }, 250)
    }

    window.localStorage.removeItem(STRIPE_LAST_CHECKOUT_SESSION_ID_STORAGE_KEY)

    redirectTimeout = setTimeout(() => {
      if (cancelled) {
        return
      }
      router.replace(CONTINUE_PATH)
    }, 2_000)

    return () => {
      cancelled = true
      if (pollId) {
        clearInterval(pollId)
      }
      if (redirectTimeout) {
        clearTimeout(redirectTimeout)
      }
    }
  }, [querySessionId, router])

  return (
    <div className="relative grid min-h-[100dvh] w-full place-items-center overflow-hidden bg-background px-4 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background"
      />
      <Card className="relative z-10 w-full max-w-md border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 type-h4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Subscription confirmed
          </CardTitle>
          <CardDescription>
            {trackingState === 'tracked'
              ? 'Your plan is active. Redirecting you to your workspace.'
              : 'Finalizing confirmation. You will be redirected shortly.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {trackingState === 'pending' ? 'Redirecting...' : 'Saving conversion...'}
          </p>
          <Button asChild className="w-full">
            <Link href={CONTINUE_PATH}>Continue now</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionSuccessPageClient />
    </Suspense>
  )
}
