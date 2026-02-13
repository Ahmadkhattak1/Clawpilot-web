'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'

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

interface SetPasswordCardProps {
  initialEmail?: string
}

export function SetPasswordCard({ initialEmail }: SetPasswordCardProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setError('')
    setStatus('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseAuthClient()
      const session = await getRecoveredSupabaseSession()
      if (!session) {
        throw new Error('Your verification session expired. Request a new OTP and try again.')
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) throw updateError

      setStatus('Password set successfully. Redirecting...')
      router.replace('/dashboard')
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setLoading(false)
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
          <CardTitle className="type-h4">Set your password</CardTitle>
          <CardDescription>
            {initialEmail ? `Verified ${initialEmail}.` : 'Your email is verified.'} Create a password to finish setup.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="set-password">Password</Label>
              <Input
                id="set-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-password-confirm">Confirm password</Label>
              <Input
                id="set-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save password
            </Button>
          </form>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>

        <CardFooter className="pt-0">
          <Button variant="link" className="h-auto p-0 text-sm" asChild>
            <Link href="/signup">Back to sign up</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
