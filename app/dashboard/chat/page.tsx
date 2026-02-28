'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'

import { OpenClawUiLaunchButton } from '@/components/openclaw-ui-launch-button'
import { WorkspaceMarkdownManagerDialog } from '@/components/workspace/workspace-markdown-manager-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import { buildBillingRequiredPath, fetchSubscriptionSnapshot, hasManagedHostingPlan } from '@/lib/subscription-gating'
import { buildSignInPath, getRecoveredSupabaseSession, getSupabaseAuthClient } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

function buildProfileInitial(value: string): string {
  const normalized = value.trim()
  if (!normalized) return 'A'

  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const initials = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
    if (initials.trim()) {
      return initials
    }
  }

  return normalized[0]?.toUpperCase() ?? 'A'
}

function buildPfpWebUrl(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return null
  }
  return `https://pfp.web/${encodeURIComponent(normalized)}`
}

export default function ChatPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [profileName, setProfileName] = useState('Account')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileInitial, setProfileInitial] = useState('A')
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [launchError, setLaunchError] = useState('')
  const [fileManagerOpen, setFileManagerOpen] = useState(false)

  const routerRef = useRef(router)
  routerRef.current = router

  const redirectToSignIn = useCallback(() => {
    const currentPath =
      typeof window === 'undefined'
        ? '/chat'
        : `${window.location.pathname}${window.location.search}`
    routerRef.current.replace(buildSignInPath(currentPath))
  }, [])

  const handleSignOut = useCallback(async () => {
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
  }, [isSigningOut, router])

  // Bootstrap: verify session, hydrate profile, check billing
  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession({ timeoutMs: 2_500 })
        if (!session) {
          redirectToSignIn()
          return
        }

        const tid = deriveTenantIdFromUserId(session.user.id)
        const [onboardingComplete, subscription] = await Promise.all([
          isOnboardingComplete(session, { backfillFromProvisionedTenant: true }),
          fetchSubscriptionSnapshot(tid),
        ])

        if (!hasManagedHostingPlan(subscription)) {
          router.replace(
            buildBillingRequiredPath(onboardingComplete ? '/dashboard/chat' : '/dashboard/model'),
          )
          return
        }

        if (!onboardingComplete) {
          router.replace('/dashboard/model?restart=1')
          return
        }

        const userMetadata = (session.user.user_metadata ?? {}) as Record<string, unknown>
        const fullName =
          typeof userMetadata.full_name === 'string' ? userMetadata.full_name.trim() : ''
        const fallbackName =
          typeof userMetadata.name === 'string' ? userMetadata.name.trim() : ''
        const email = session.user.email?.trim() ?? ''
        const displayName = fullName || fallbackName || email || 'Account'
        const pfpWebAvatar = buildPfpWebUrl(email)
        const metadataAvatar =
          typeof userMetadata.avatar_url === 'string' && userMetadata.avatar_url.trim()
            ? userMetadata.avatar_url.trim()
            : typeof userMetadata.picture === 'string' && userMetadata.picture.trim()
              ? userMetadata.picture.trim()
              : null

        if (!cancelled) {
          setTenantId(tid)
          setProfileName(displayName)
          setProfileEmail(email)
          setProfileInitial(buildProfileInitial(displayName || email))
          setProfileImageUrl(pfpWebAvatar ?? metadataAvatar)
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
  }, [])

  if (checkingSession) {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-background">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[40%] left-1/2 h-[80%] w-[140%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.03),transparent_70%)]"
      />

      <div className="relative z-10 flex min-h-[100svh] flex-col">
        {/* Header */}
        <header className="px-5 py-4 sm:px-8 sm:py-5">
          <div className="mx-auto flex max-w-screen-lg items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.svg"
                alt="ClawPilot"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <span className="type-brand text-foreground">ClawPilot</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Open account menu"
                >
                  <Avatar className="h-8 w-8 border border-border/60">
                    {profileImageUrl ? (
                      <AvatarImage src={profileImageUrl} alt={profileName} />
                    ) : null}
                    <AvatarFallback className="bg-muted text-[11px] font-medium text-muted-foreground">
                      {profileInitial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="py-2">
                  <p className="truncate text-xs font-medium text-foreground">{profileName}</p>
                  {profileEmail ? (
                    <p className="truncate text-[11px] text-muted-foreground">{profileEmail}</p>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    void handleSignOut()
                  }}
                  disabled={isSigningOut}
                  className="text-destructive focus:text-destructive"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 flex-col items-center justify-center px-5 pb-24 sm:px-8">
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            {/* Logo with glow */}
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-0 scale-150 rounded-full bg-[radial-gradient(circle,rgba(179,33,40,0.06),transparent_70%)]"
              />
              <div className="relative rounded-[20px] border border-border/40 bg-gradient-to-b from-card to-background p-4 shadow-sm">
                <Image
                  src="/logo.svg"
                  alt="OpenClaw"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain"
                />
              </div>
            </div>

            {/* Copy */}
            <h1 className="mt-8 text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl">
              OpenClaw Gateway
            </h1>
            <p className="mt-2.5 max-w-xs text-[14px] leading-relaxed text-muted-foreground">
              Launch OpenClaw directly. We keep this page intentionally minimal,
              and add custom workflows here only when needed.
            </p>

            {/* Status pill */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card px-3.5 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">Instance running</span>
            </div>

            {/* Error */}
            {launchError ? (
              <div className="mt-5 w-full rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-left text-[13px] leading-relaxed text-destructive">
                {launchError}
              </div>
            ) : null}

            {/* Launch button */}
            <OpenClawUiLaunchButton
              tenantId={tenantId}
              onUnauthorized={redirectToSignIn}
              onLaunchStart={() => setLaunchError('')}
              onError={setLaunchError}
              label="Launch OpenClaw"
              variant="default"
              size="default"
              className="mt-6 h-11 w-full gap-2 text-[14px] font-medium shadow-sm transition-all hover:shadow-md"
            />

            <Button
              type="button"
              variant="outline"
              size="default"
              className="mt-3 h-11 w-full gap-2 text-[14px]"
              onClick={() => {
                setLaunchError('')
                setFileManagerOpen(true)
              }}
            >
              <FileText className="h-4 w-4" />
              Manage Files
            </Button>
          </div>
        </main>

        {/* Footer hint */}
        <footer className="pb-6 text-center">
          <p className="text-[11px] text-muted-foreground/50">
            Opens in a new tab
          </p>
        </footer>
      </div>

      <WorkspaceMarkdownManagerDialog
        tenantId={tenantId}
        open={fileManagerOpen}
        onOpenChange={setFileManagerOpen}
        onUnauthorized={redirectToSignIn}
      />
    </div>
  )
}
