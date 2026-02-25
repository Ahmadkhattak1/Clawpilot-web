'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { isOnboardingComplete } from '@/lib/onboarding-state'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function routeUser() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          if (!cancelled) {
            router.replace(buildSignInPath('/dashboard/model'))
          }
          return
        }

        const complete = await isOnboardingComplete(session, { backfillFromProvisionedTenant: true })
        if (cancelled) return

        const tenantId = deriveTenantIdFromUserId(session.user.id)
        const snapshot = await fetchSubscriptionSnapshot(tenantId)
        if (cancelled) return

        if (!hasManagedHostingPlan(snapshot)) {
          router.replace(buildBillingRequiredPath(complete ? '/dashboard/chat' : '/dashboard/model'))
          return
        }

        router.replace(complete ? '/dashboard/chat' : '/dashboard/model')
      } catch {
        if (!cancelled) {
          router.replace(buildSignInPath('/dashboard/model'))
        }
      }
    }

    void routeUser()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </p>
    </div>
  )
}
