'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  buildAuthCallbackUrl,
  getRecoveredSupabaseSession,
  getSupabaseAuthClient,
} from '@/lib/supabase-auth'

type AuthMode = 'signin' | 'signup'
type AuthMethod = 'email' | 'google' | 'github'

const LAST_USED_AUTH_METHOD_KEY = 'clawpilot:last-auth-method'

interface AuthCardProps {
  mode: AuthMode
}

function getStoredMethod(): AuthMethod | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(LAST_USED_AUTH_METHOD_KEY)
  if (value === 'email' || value === 'google' || value === 'github') {
    return value
  }
  return null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    const lowerMessage = error.message.toLowerCase()
    if (
      lowerMessage.includes('for security purposes') &&
      lowerMessage.includes('you can only request this')
    ) {
      return 'Too many attempts. Please wait a moment and try again.'
    }
    return error.message
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    const message = (error as { message: string }).message
    const lowerMessage = message.toLowerCase()
    if (
      lowerMessage.includes('for security purposes') &&
      lowerMessage.includes('you can only request this')
    ) {
      return 'Too many attempts. Please wait a moment and try again.'
    }
    return message
  }
  return 'Something went wrong. Please try again.'
}

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [loadingMethod, setLoadingMethod] = useState<AuthMethod | null>(null)
  const [lastUsedMethod, setLastUsedMethod] = useState<AuthMethod | null>(null)

  const isSignUp = mode === 'signup'
  const title = isSignUp ? 'Create your account' : 'Sign in to ClawPilot'
  const description = isSignUp
    ? 'Enter your email to get an OTP code, then set your password.'
    : 'Welcome back. Pick a sign-in method to continue.'
  const emailButtonText = isSignUp ? 'Send OTP' : 'Sign in with email'
  const switchHref = isSignUp ? '/signin' : '/signup'
  const switchText = isSignUp
    ? 'Already have an account? Sign in'
    : "Don't have an account? Sign up"

  const oauthRedirectTo = useMemo(() => buildAuthCallbackUrl('/dashboard'), [])

  useEffect(() => {
    setLastUsedMethod(getStoredMethod())
  }, [])

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabaseAuthClient()

    async function redirectIfAuthenticated() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!cancelled && session) {
          router.replace('/dashboard')
        }
      } catch {
        // Keep users on auth page if session lookup fails.
      }
    }

    void redirectIfAuthenticated()

    const { data: authStateData } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) {
        router.replace('/dashboard')
      }
    })

    return () => {
      cancelled = true
      authStateData.subscription.unsubscribe()
    }
  }, [router])

  function rememberMethod(method: AuthMethod) {
    setLastUsedMethod(method)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_USED_AUTH_METHOD_KEY, method)
    }
  }

  async function onEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loadingMethod) return

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Please enter a valid email.')
      return
    }

    setError('')
    setStatus('')
    setLoadingMethod('email')

    try {
      const supabase = getSupabaseAuthClient()
      if (isSignUp) {
        const signupCallback = buildAuthCallbackUrl(`/set-password?email=${encodeURIComponent(normalizedEmail)}`)
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: signupCallback,
          },
        })
        if (otpError) throw otpError

        rememberMethod('email')
        router.replace(`/confirm-email?email=${encodeURIComponent(normalizedEmail)}`)
        return
      } else {
        if (!password) {
          throw new Error('Please enter your password.')
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (signInError) throw signInError

        rememberMethod('email')
        router.replace('/dashboard')
      }

    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setLoadingMethod(null)
    }
  }

  async function onOAuth(provider: 'google' | 'github') {
    if (loadingMethod) return

    setError('')
    setStatus('')
    setLoadingMethod(provider)
    rememberMethod(provider)

    try {
      const supabase = getSupabaseAuthClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: oauthRedirectTo,
        },
      })

      if (oauthError) throw oauthError
    } catch (oauthError) {
      setError(getErrorMessage(oauthError))
      setLoadingMethod(null)
    }
  }

  function renderLastUsedBadge(method: AuthMethod) {
    if (mode !== 'signin' || lastUsedMethod !== method) return null
    return (
      <Badge
        variant="secondary"
        className="ml-2 border border-border bg-secondary px-2 py-0 text-[10px] uppercase tracking-wide"
      >
        Last used
      </Badge>
    )
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
          {mode === 'signin' ? (
            <Button variant="link" className="h-auto w-fit p-0 text-xs text-muted-foreground" asChild>
              <Link href="/">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Back to home
              </Link>
            </Button>
          ) : null}
          <CardTitle className="type-h4">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOAuth('google')}
              disabled={loadingMethod !== null}
              className="justify-start"
            >
              {loadingMethod === 'google' ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Image src="/google.svg" alt="" aria-hidden width={16} height={16} className="mr-1 h-4 w-4" />
              )}
              Google
              {renderLastUsedBadge('google')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOAuth('github')}
              disabled={loadingMethod !== null}
              className="justify-start"
            >
              {loadingMethod === 'github' ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Image src="/github.svg" alt="" aria-hidden width={16} height={16} className="mr-1 h-4 w-4" />
              )}
              GitHub
              {renderLastUsedBadge('github')}
            </Button>
          </div>

          <p className="flex items-center gap-x-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            or continue with email
          </p>

          <form className="space-y-3" onSubmit={onEmailSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor={`${mode}-email`}>Email address</Label>
              <Input
                id={`${mode}-email`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>
            {isSignUp ? null : (
              <div className="space-y-1.5">
                <Label htmlFor={`${mode}-password`}>Password</Label>
                <Input
                  id={`${mode}-password`}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>
            )}

            <Button type="submit" disabled={loadingMethod !== null} className="w-full">
              {loadingMethod === 'email' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {emailButtonText}
              {renderLastUsedBadge('email')}
            </Button>
          </form>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>

        <CardFooter className="pt-0">
          <Button variant="link" className="h-auto p-0 text-sm" asChild>
            <Link href={switchHref}>{switchText}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
