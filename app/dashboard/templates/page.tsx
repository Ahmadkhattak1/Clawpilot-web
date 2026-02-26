'use client'

import Link from 'next/link'
import { ArrowLeft, Loader2, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'

export default function WorkflowTemplatesPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  function redirectToSignIn() {
    const currentPath = typeof window === 'undefined'
      ? '/dashboard/templates'
      : `${window.location.pathname}${window.location.search}`
    router.replace(buildSignInPath(currentPath))
  }

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
        if (!complete) {
          router.replace('/dashboard')
          return
        }

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

  const workflows = [
    {
      name: 'Outreach Agent',
      description: 'Draft and review personalized outreach from the chat workspace.',
      href: '/dashboard/chat',
      ctaLabel: 'Open chat workspace',
    },
    {
      name: 'Competitor Monitoring Support Agent',
      description: 'Run competitor monitoring from chat while dedicated templates are being expanded.',
      href: '/dashboard/chat',
      ctaLabel: 'Open chat workspace',
    },
  ] as const

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/chat">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to chat
          </Link>
        </Button>

        <div>
          <h1 className="text-lg font-semibold tracking-tight">Agents and Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the workflow you need and run it directly.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Card key={workflow.name} className="border-border/70">
              <CardHeader>
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                  <Target className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <CardTitle className="text-base">{workflow.name}</CardTitle>
                <CardDescription>{workflow.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" asChild>
                  <Link href={workflow.href}>{workflow.ctaLabel}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
