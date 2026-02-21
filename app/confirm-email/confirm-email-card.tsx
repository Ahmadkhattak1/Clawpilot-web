'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Mail } from 'lucide-react'
import { useState } from 'react'
import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildAuthCallbackUrl, getSafeNextPath, getSupabaseAuthClient } from '@/lib/supabase-auth'

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
  return 'Something went wrong. Please try again.'
}

interface ConfirmEmailCardProps {
  initialEmail?: string
  initialNextPath?: string
}

const VERIFY_OTP_TYPES: readonly EmailOtpType[] = ['email', 'signup']

async function verifyEmailOtp(
  supabase: SupabaseClient,
  email: string,
  token: string,
) {
  let lastError: unknown = null

  for (const type of VERIFY_OTP_TYPES) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      email,
      token,
    })
    if (!error) return
    lastError = error
  }

  throw lastError ?? new Error('Invalid OTP. Please request a new code and try again.')
}

export function ConfirmEmailCard({ initialEmail, initialNextPath }: ConfirmEmailCardProps) {
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail ?? '')
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const nextPath = getSafeNextPath(initialNextPath)

  async function onVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (verifying || sending) return

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Please enter a valid email.')
      return
    }
    if (!otp.trim()) {
      setError('Please enter the OTP code from your email.')
      return
    }

    setError('')
    setStatus('')
    setVerifying(true)

    try {
      const supabase = getSupabaseAuthClient()
      await verifyEmailOtp(supabase, normalizedEmail, otp.trim())
      router.replace(
        `/set-password?email=${encodeURIComponent(normalizedEmail)}&next=${encodeURIComponent(nextPath)}`,
      )
    } catch (verifyError) {
      setError(getErrorMessage(verifyError))
    } finally {
      setVerifying(false)
    }
  }

  async function onResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending || verifying) return

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Please enter a valid email.')
      return
    }

    setError('')
    setStatus('')
    setSending(true)

    try {
      const supabase = getSupabaseAuthClient()
      const signupNextPath = `/set-password?email=${encodeURIComponent(normalizedEmail)}&next=${encodeURIComponent(nextPath)}`
      const signupCallback = buildAuthCallbackUrl(signupNextPath)
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: signupCallback,
        },
      })

      if (resendError) throw resendError
      setStatus('OTP sent. Check your inbox and spam folder.')
    } catch (resendError) {
      setError(getErrorMessage(resendError))
    } finally {
      setSending(false)
    }
  }

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
          <CardTitle className="type-h4">Confirm your email</CardTitle>
          <CardDescription>
            Enter the OTP code we sent to your email, then continue to set your password.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={onVerify}>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-email-address">Email address</Label>
              <Input
                id="confirm-email-address"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-email-otp">OTP code</Label>
              <Input
                id="confirm-email-otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="Enter your code"
                autoComplete="one-time-code"
                required
              />
            </div>

            <Button type="submit" disabled={verifying || sending} className="w-full">
              {verifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Verify OTP
            </Button>
          </form>

          <form onSubmit={onResend}>
            <Button type="submit" variant="outline" disabled={sending || verifying} className="w-full">
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Resend OTP
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            If you do not see it, check spam/promotions and wait up to a minute for delivery.
          </p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>

        <CardFooter className="pt-0">
          <Button variant="link" className="h-auto p-0 text-sm" asChild>
            <Link href={`/signup?next=${encodeURIComponent(nextPath)}`}>Back to sign up</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
