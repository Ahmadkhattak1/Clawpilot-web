'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  buildAuthCallbackUrl,
  getRecoveredSupabaseSession,
  getSafeNextPath,
  getSupabaseAuthClient,
} from '@/lib/supabase-auth'

export function SignInPage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState('')
  const signInStartedRef = useRef(false)

  const nextPath = useMemo(() => {
    if (typeof window === 'undefined') return '/dashboard/chat'
    const params = new URLSearchParams(window.location.search)
    return getSafeNextPath(params.get('next'))
  }, [])

  const startGoogleSignIn = useCallback(async () => {
    if (signInStartedRef.current) return

    signInStartedRef.current = true
    setError('')
    setIsRedirecting(true)

    try {
      const supabase = getSupabaseAuthClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildAuthCallbackUrl(nextPath),
        },
      })

      if (oauthError) {
        throw oauthError
      }
    } catch {
      signInStartedRef.current = false
      setIsRedirecting(false)
      setError('Google sign-in is temporarily unavailable. Please try again.')
    }
  }, [nextPath])

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabaseAuthClient()

    async function boot() {
      try {
        const session = await getRecoveredSupabaseSession({ timeoutMs: 0 })
        if (cancelled) return
        if (session) {
          router.replace(nextPath)
          return
        }
      } catch {
        // Continue to direct Google auth if session recovery check fails.
      }

      if (!cancelled) {
        void startGoogleSignIn()
      }
    }

    void boot()

    const { data: authStateData } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session) return
      router.replace(nextPath)
    })

    return () => {
      cancelled = true
      authStateData.subscription.unsubscribe()
    }
  }, [nextPath, router, startGoogleSignIn])

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
          <CardTitle className="type-h4">Continue with Google</CardTitle>
          <CardDescription>
            We are sending you to Google sign-in now.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isRedirecting ? 'Opening Google sign-in...' : 'Preparing sign-in...'}
          </p>
          {error ? (
            <>
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" onClick={() => void startGoogleSignIn()} disabled={isRedirecting} className="w-full">
                {isRedirecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Try Google sign-in again'
                )}
              </Button>
              <Button variant="link" className="h-auto w-full p-0 text-xs text-muted-foreground" asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
