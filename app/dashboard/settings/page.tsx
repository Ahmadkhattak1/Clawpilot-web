'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'

export default function DashboardSettingsPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  const openClawSettings = [
    {
      title: 'Models',
      description: 'Choose providers and switch models inside OpenClaw.',
      logos: [
        { src: '/ai-models-logos/openai-svgrepo-com.svg', alt: 'OpenAI' },
        { src: '/ai-models-logos/google.svg', alt: 'Google Gemini' },
        { src: '/ai-models-logos/Anthropic_Symbol_0.svg', alt: 'Anthropic Claude' },
      ],
    },
    {
      title: 'Channels',
      description: 'Connect WhatsApp, Telegram, and other channels inside OpenClaw.',
      logos: [
        { src: '/integrations/whatsapp.svg', alt: 'WhatsApp' },
        { src: '/integrations/telegram.svg', alt: 'Telegram' },
        { src: '/integrations/slack.svg', alt: 'Slack' },
      ],
    },
  ]

  useEffect(() => {
    let cancelled = false

    async function ensureSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          if (!cancelled) {
            router.replace(buildSignInPath('/dashboard/settings'))
          }
          return
        }

        if (!cancelled) {
          setCheckingSession(false)
        }
      } catch {
        if (!cancelled) {
          router.replace(buildSignInPath('/dashboard/settings'))
        }
      }
    }

    void ensureSession()

    return () => {
      cancelled = true
    }
  }, [router])

  if (checkingSession) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading settings...
        </p>
      </div>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-10 sm:px-6 md:px-10 md:py-14">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back()
                return
              }
              router.push('/dashboard/chat')
            }}
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        </div>

        <div className="border-b border-border">
          <nav className="flex gap-6">
            <span className="border-b-2 border-foreground pb-3 text-sm font-medium text-foreground">General</span>
            <Link
              href="/settings/subscription"
              className="pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Subscription
            </Link>
          </nav>
        </div>

        <section className="rounded-2xl border border-border/70 bg-card/40 p-6 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">OpenClaw settings</h2>
            <div className="overflow-hidden rounded-xl border border-border/70 bg-background/60">
              {openClawSettings.map(({ title, description, logos }, index) => (
                <div
                  key={title}
                  className={`flex items-start gap-4 px-4 py-4 sm:px-5 ${index === 0 ? '' : 'border-t border-border/60'}`}
                >
                  <div className="flex shrink-0 items-center -space-x-2 pt-0.5">
                    {logos.map((logo, logoIndex) => (
                      <div
                        key={`${title}-${logo.alt}`}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background p-2 shadow-sm ${
                          logoIndex === 0 ? '' : 'ring-2 ring-background'
                        }`}
                      >
                        <Image src={logo.src} alt={logo.alt} width={20} height={20} className="h-5 w-5 object-contain" />
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Managed in OpenClaw
                      </span>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              OpenClaw-specific settings are managed inside OpenClaw. Launch OpenClaw to make these changes there.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="sm:min-w-44">
              <Link href="/dashboard/chat">Launch OpenClaw</Link>
            </Button>
            <Button asChild variant="outline" className="sm:min-w-44">
              <Link href="/settings/subscription">Billing &amp; subscription</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
