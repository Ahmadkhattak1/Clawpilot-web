'use client'

import Link from 'next/link'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SetupStepper } from '@/components/ui/setup-stepper'
import {
  AVAILABLE_CHANNEL_OPTIONS,
  CHANNEL_STORAGE_KEY,
  type ChannelOption,
} from '@/lib/channel-options'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { cn } from '@/lib/utils'

function getChannelInitials(label: string) {
  return label
    .split(/[\s().-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('')
}

function ChannelLogo({
  channel,
  onError,
  hasImageError,
}: {
  channel: ChannelOption
  onError: (channelId: string) => void
  hasImageError: boolean
}) {
  if ((!channel.logoSrc || hasImageError) && channel.logoEmoji) {
    return <span className="text-xl leading-none">{channel.logoEmoji}</span>
  }

  if (!channel.logoSrc || hasImageError) {
    return (
      <span className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
        {getChannelInitials(channel.label)}
      </span>
    )
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center">
      <Image
        src={channel.logoSrc}
        alt={`${channel.label} logo`}
        width={40}
        height={40}
        className="h-10 w-10 object-contain"
        style={{ transform: `scale(${channel.logoScale ?? 1})` }}
        onError={() => onError(channel.id)}
      />
    </div>
  )
}

export default function ChannelsPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          router.replace('/signin')
          return
        }

        const storedChannelId = window.localStorage.getItem(CHANNEL_STORAGE_KEY)
        const channelExists = AVAILABLE_CHANNEL_OPTIONS.some((channel) => channel.id === storedChannelId)
        if (!cancelled && channelExists && storedChannelId) {
          setSelectedChannelId(storedChannelId)
        }
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

  function onImageError(channelId: string) {
    setImageErrors((previous) => ({
      ...previous,
      [channelId]: true,
    }))
  }

  function onNext() {
    if (!selectedChannelId) return
    window.localStorage.setItem(CHANNEL_STORAGE_KEY, selectedChannelId)
    router.push('/dashboard/channels/setup')
  }

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
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background"
      />

      <Card className="relative z-10 mx-auto flex min-h-[620px] w-full max-w-5xl flex-col border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-3 px-6 pt-7 md:px-10 md:pt-9">
          <Button variant="link" className="h-auto w-fit p-0 text-xs text-muted-foreground" asChild>
            <Link href="/dashboard/open-cloud">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>Channel</CardDescription>
          <SetupStepper currentStep="channel" className="pt-1" />
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-6 pb-7 md:px-10 md:pb-10">
          <div className="grid gap-4 sm:grid-cols-2">
            {AVAILABLE_CHANNEL_OPTIONS.map((channel) => {
              const isSelected = selectedChannelId === channel.id
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={cn(
                    'rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/70',
                  )}
                >
                  <div className="flex h-14 items-center justify-center rounded-md bg-muted/40 p-2">
                    <ChannelLogo
                      channel={channel}
                      onError={onImageError}
                      hasImageError={Boolean(imageErrors[channel.id])}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground/95 line-clamp-2">{channel.label}</p>
                    {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex justify-end">
              <Button onClick={onNext} disabled={!selectedChannelId} className="sm:min-w-28">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
