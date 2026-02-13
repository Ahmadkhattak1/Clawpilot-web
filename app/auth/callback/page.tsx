'use client'

import type { EmailOtpType } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'

const SUPABASE_EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

function isEmailOtpType(value: string | null): value is EmailOtpType {
  if (!value) return false
  return SUPABASE_EMAIL_OTP_TYPES.includes(value as EmailOtpType)
}

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

function getDefaultNextPathForOtpType(type: string | null) {
  if (type === 'signup' || type === 'email' || type === 'magiclink' || type === 'recovery') {
    return '/set-password'
  }
  return '/dashboard'
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return 'Something went wrong while completing authentication.'
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function completeAuth() {
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const otpType = searchParams.get('type')
      const providerError = searchParams.get('error_description') ?? searchParams.get('error')
      const requestedNextPath = searchParams.get('next')
      const nextPath = requestedNextPath
        ? getSafeNextPath(requestedNextPath)
        : getDefaultNextPathForOtpType(otpType)

      if (providerError) {
        if (!cancelled) setError(providerError)
        return
      }

      try {
        const supabase = getSupabaseAuthClient()

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        } else if (tokenHash && isEmailOtpType(otpType)) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: otpType,
            token_hash: tokenHash,
          })
          if (verifyError) throw verifyError
        } else {
          if (!requestedNextPath) {
            throw new Error('Missing auth callback parameters. Please try signing in again.')
          }
        }

        const session = await getRecoveredSupabaseSession()
        if (!session) {
          throw new Error('Session could not be restored. Please sign in again.')
        }

        if (!cancelled) router.replace(nextPath)
      } catch (authError) {
        if (!cancelled) setError(getErrorMessage(authError))
      }
    }

    void completeAuth()

    return () => {
      cancelled = true
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
          <CardTitle className="type-h4">
            {error ? 'Authentication failed' : 'Completing sign-in'}
          </CardTitle>
          <CardDescription>
            {error
              ? 'The sign-in link may be invalid or expired.'
              : 'Please wait while we finish authentication.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <>
              <p className="text-sm text-destructive">{error}</p>
              <Button asChild className="w-full">
                <Link href="/signin">Back to sign in</Link>
              </Button>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
