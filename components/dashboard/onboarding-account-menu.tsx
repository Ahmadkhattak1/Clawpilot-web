'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  DashboardAccountMenu,
  resolveDashboardProfile,
  type DashboardProfile,
} from '@/components/dashboard/dashboard-header'
import { getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'

const DEFAULT_PROFILE: DashboardProfile = {
  name: 'Account',
  email: '',
  initial: 'A',
  imageUrl: null,
}

export function OnboardingAccountMenu() {
  const router = useRouter()
  const [profile, setProfile] = useState<DashboardProfile>(DEFAULT_PROFILE)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      const session = await getRecoveredSupabaseSession({ timeoutMs: 2500 })
      if (!session || cancelled) return

      setProfile(resolveDashboardProfile({
        email: session.user.email,
        userMetadata: session.user.user_metadata as Record<string, unknown> | null,
      }))
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSignOut() {
    if (isSigningOut) return

    try {
      setIsSigningOut(true)
      const supabase = getSupabaseAuthClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Failed to sign out', error)
      }
    } catch (error) {
      console.error('Failed to sign out', error)
    } finally {
      router.replace('/')
    }
  }

  return (
    <DashboardAccountMenu
      profile={profile}
      isSigningOut={isSigningOut}
      onSignOut={() => void handleSignOut()}
      triggerClassName="bg-card"
    />
  )
}
