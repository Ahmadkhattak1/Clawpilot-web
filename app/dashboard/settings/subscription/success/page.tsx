'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SUBSCRIPTION_CONVERSION_SEND_TO } from '@/lib/google-ads'

const CONTINUE_PATH = '/dashboard/model'

export default function SubscriptionSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    let redirected = false
    let pollId: ReturnType<typeof setInterval> | null = null
    let conversionSent = false

    const finishRedirect = () => {
      if (redirected) {
        return
      }
      redirected = true
      if (pollId) {
        clearInterval(pollId)
        pollId = null
      }
      router.replace(CONTINUE_PATH)
    }

    const sendConversion = () => {
      if (conversionSent) {
        return true
      }

      const gtag = (window as typeof window & {
        gtag?: (...args: unknown[]) => void
      }).gtag

      if (typeof gtag !== 'function') {
        return false
      }

      conversionSent = true
      gtag('event', 'conversion', {
        send_to: SUBSCRIPTION_CONVERSION_SEND_TO,
        event_callback: finishRedirect,
        event_timeout: 3000,
      })
      return true
    }

    if (!sendConversion()) {
      let attempts = 0
      pollId = setInterval(() => {
        attempts += 1
        const sent = sendConversion()
        if (sent || attempts >= 20) {
          if (pollId) {
            clearInterval(pollId)
            pollId = null
          }
        }
      }, 250)
    }

    const redirectTimeout = setTimeout(() => {
      finishRedirect()
    }, 5_000)

    return () => {
      if (pollId) {
        clearInterval(pollId)
      }
      clearTimeout(redirectTimeout)
    }
  }, [router])

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
            Your plan is active. Saving Google Ads conversion and redirecting you to your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finalizing confirmation...
          </p>
          <Button asChild className="w-full">
            <Link href={CONTINUE_PATH}>Continue now</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
