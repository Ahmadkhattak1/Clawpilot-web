'use client'

import { CheckCircle2, Loader2, RefreshCcw, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SUBSCRIPTION_CONVERSION_SEND_TO } from '@/lib/google-ads'

type ConversionStatus = 'checking' | 'ready' | 'missing' | 'sent'

type GtagWindow = Window & typeof globalThis & {
  gtag?: (...args: unknown[]) => void
}

function getGtag() {
  return (window as GtagWindow).gtag
}

export default function SubscriptionClawpilotTestPageClient() {
  const [status, setStatus] = useState<ConversionStatus>('checking')
  const [lastSentAt, setLastSentAt] = useState<number | null>(null)

  const fireConversion = useCallback(() => {
    const gtag = getGtag()
    if (typeof gtag !== 'function') {
      setStatus('missing')
      return false
    }

    gtag('event', 'conversion', {
      send_to: SUBSCRIPTION_CONVERSION_SEND_TO,
      event_timeout: 3000,
    })

    setStatus('sent')
    setLastSentAt(Date.now())
    return true
  }, [])

  useEffect(() => {
    if (fireConversion()) {
      return
    }

    let attempts = 0
    const pollId = window.setInterval(() => {
      attempts += 1

      if (fireConversion()) {
        window.clearInterval(pollId)
        return
      }

      if (attempts >= 20) {
        setStatus('missing')
        window.clearInterval(pollId)
      }
    }, 250)

    return () => {
      window.clearInterval(pollId)
    }
  }, [fireConversion])

  useEffect(() => {
    if (status === 'checking' || status === 'sent') {
      return
    }

    const gtag = getGtag()
    if (typeof gtag === 'function') {
      setStatus('ready')
    }
  }, [status])

  const statusCopy = useMemo(() => {
    if (status === 'sent') {
      return {
        title: 'Conversion signal sent',
        description: 'Return to Tag Assistant now. Keep this page open for a few seconds before closing it.',
      }
    }

    if (status === 'missing') {
      return {
        title: 'Google tag not ready',
        description: 'Reload the page once, then try again. If this persists, the Google tag is not available in this session.',
      }
    }

    if (status === 'ready') {
      return {
        title: 'Google tag is ready',
        description: 'Send the Subscription-Clawpilot conversion event manually when Tag Assistant is connected.',
      }
    }

    return {
      title: 'Checking Google tag',
      description: 'Waiting for the Google tag to become available, then the conversion event will fire automatically.',
    }
  }, [status])

  const lastSentLabel = useMemo(() => {
    if (!lastSentAt) {
      return null
    }

    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(lastSentAt))
  }, [lastSentAt])

  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-background px-4 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(245,245,245,0.92)_35%,_rgba(235,235,235,0.88)_100%)]"
      />
      <Card className="relative z-10 w-full max-w-2xl border-border/70 shadow-lg shadow-black/5">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            {status === 'sent' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : status === 'missing' ? (
              <TriangleAlert className="h-5 w-5 text-amber-600" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            Subscription-Clawpilot conversion test
          </CardTitle>
          <CardDescription>{statusCopy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <p className="text-sm font-medium">{statusCopy.title}</p>
            {lastSentLabel ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Last sent at {lastSentLabel}.
              </p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            <p>Use this page only for Tag Assistant verification.</p>
            <p>1. Open Google Ads Troubleshoot and connect Tag Assistant to `https://clawpilot.app`.</p>
            <p>2. In the debug tab, navigate to `/subscription-clawpilot-test`.</p>
            <p>3. Wait until this page shows "Conversion signal sent".</p>
            <p>4. Go back to Tag Assistant and finish the verification flow.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => fireConversion()} className="sm:w-auto">
              <RefreshCcw className="h-4 w-4" />
              Send conversion again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="sm:w-auto">
              Reload page
            </Button>
          </div>

          <div className="rounded-lg border border-dashed border-border/70 p-4 text-xs text-muted-foreground">
            Conversion action target: {SUBSCRIPTION_CONVERSION_SEND_TO}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
