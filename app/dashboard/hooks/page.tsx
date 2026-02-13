'use client'

import Link from 'next/link'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HOOK_DEFAULT_IDS, HOOK_OPTIONS, HOOKS_STORAGE_KEY } from '@/lib/hooks-options'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { cn } from '@/lib/utils'

export default function HooksPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          router.replace('/signin')
          return
        }

        window.localStorage.setItem(HOOKS_STORAGE_KEY, JSON.stringify(HOOK_DEFAULT_IDS))
      } catch {
        router.replace('/signin')
        return
      }

      if (!cancelled) {
        setCheckingSession(false)
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [router])

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
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-8 sm:px-6 md:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background"
      />

      <Card className="relative z-10 mx-auto w-full max-w-6xl border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-2">
          <Button variant="link" className="h-auto w-fit p-0 text-xs text-muted-foreground" asChild>
            <Link href="/dashboard/skills/setup">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>Enable Hooks</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {HOOK_OPTIONS.map((hook) => (
              <div
                key={hook.id}
                className={cn(
                  'rounded-xl border border-primary bg-primary/5 p-3 text-left ring-1 ring-primary/30',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{hook.label}</p>
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{hook.summary}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            boot-md, command-logger, and session-memory are enabled automatically and will be installed.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
