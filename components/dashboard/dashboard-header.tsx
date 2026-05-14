'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface DashboardProfile {
  name: string
  email: string
  initial: string
  imageUrl: string | null
}

export function buildProfileInitial(value: string): string {
  const normalized = value.trim()
  if (!normalized) return 'A'

  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const initials = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
    if (initials.trim()) return initials
  }

  return normalized[0]?.toUpperCase() ?? 'A'
}

export function buildPfpWebUrl(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  return `https://pfp.web/${encodeURIComponent(normalized)}`
}

export function resolveDashboardProfile(input: {
  email?: string | null
  userMetadata?: Record<string, unknown> | null
}): DashboardProfile {
  const userMetadata = input.userMetadata ?? {}
  const fullName = typeof userMetadata.full_name === 'string' ? userMetadata.full_name.trim() : ''
  const fallbackName = typeof userMetadata.name === 'string' ? userMetadata.name.trim() : ''
  const email = input.email?.trim() ?? ''
  const name = fullName || fallbackName || email || 'Account'
  const metadataAvatar =
    typeof userMetadata.avatar_url === 'string' && userMetadata.avatar_url.trim()
      ? userMetadata.avatar_url.trim()
      : typeof userMetadata.picture === 'string' && userMetadata.picture.trim()
        ? userMetadata.picture.trim()
        : null

  return {
    name,
    email,
    initial: buildProfileInitial(name || email),
    imageUrl: buildPfpWebUrl(email) ?? metadataAvatar,
  }
}

export function DashboardHeader({
  profile,
  actions,
  isSigningOut,
  onSignOut,
  className,
}: {
  profile: DashboardProfile
  actions?: ReactNode
  isSigningOut: boolean
  onSignOut: () => void
  className?: string
}) {
  return (
    <header className={cn('border-b border-border/70 bg-background/90 backdrop-blur-sm', className)}>
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo.webp"
            alt="ClawPilot"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 object-contain"
            priority
          />
          <span className="type-brand truncate leading-none text-foreground">ClawPilot</span>
        </Link>

        <div className="flex items-center gap-2.5">
          {actions}

          <DashboardAccountMenu
            profile={profile}
            isSigningOut={isSigningOut}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </header>
  )
}

export function DashboardAccountMenu({
  profile,
  isSigningOut,
  onSignOut,
  triggerClassName,
}: {
  profile: DashboardProfile
  isSigningOut: boolean
  onSignOut: () => void
  triggerClassName?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            triggerClassName,
          )}
          aria-label="Open account menu"
        >
          <Avatar className="h-9 w-9 border border-border/60">
            {profile.imageUrl ? <AvatarImage src={profile.imageUrl} alt={profile.name} /> : null}
            <AvatarFallback className="bg-foreground text-[11px] font-semibold text-background">
              {profile.initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="py-2">
          <p className="truncate text-xs font-medium text-foreground">{profile.name}</p>
          {profile.email ? <p className="truncate text-[11px] text-muted-foreground">{profile.email}</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/subscription">Billing &amp; subscription</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            onSignOut()
          }}
          disabled={isSigningOut}
          className="text-destructive focus:text-destructive"
        >
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
