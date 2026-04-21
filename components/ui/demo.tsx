"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"

import {
  buildAuthCallbackUrl,
  getRecoveredSupabaseSession,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"
import { Button } from "@/components/ui/button"

type AuthStatus = "loading" | "authenticated" | "anonymous"

const channelIcons = [
  { src: "/integrations/whatsapp.svg", alt: "WhatsApp" },
  { src: "/integrations/telegram.svg", alt: "Telegram" },
  { src: "/integrations/discord.svg", alt: "Discord" },
  { src: "/integrations/imessage.svg", alt: "iMessage" },
]

export function Hero() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabaseAuthClient()

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!cancelled) {
          setAuthStatus(session ? "authenticated" : "anonymous")
        }
      } catch {
        if (!cancelled) {
          setAuthStatus("anonymous")
        }
      }
    }

    void loadSession()

    const { data: authStateData } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setAuthStatus(session ? "authenticated" : "anonymous")
      }
    })

    return () => {
      cancelled = true
      authStateData.subscription.unsubscribe()
    }
  }, [])

  const onGoogleSignIn = async () => {
    if (isGoogleLoading || authStatus === "authenticated") return

    setAuthError("")
    setIsGoogleLoading(true)
    try {
      const supabase = getSupabaseAuthClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl("/dashboard/chat"),
        },
      })

      if (error) {
        throw error
      }
    } catch {
      setAuthError("Google sign-in is temporarily unavailable. Please try again.")
      setIsGoogleLoading(false)
    }
  }

  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-24"
    >
      {/* Subtle ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(179,33,40,0.04),transparent_70%)]"
      />

      <div className="relative z-10 mx-auto flex max-w-4xl -translate-y-8 flex-col items-center text-center sm:-translate-y-10 md:-translate-y-12">
        {/* Mascot */}
        <div className="relative mb-7 sm:mb-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-[2] rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.03),transparent_70%)]"
          />
          <Image
            src="/logo.webp"
            alt="ClawPilot mascot"
            width={120}
            height={120}
            priority
            className="relative h-[100px] w-[100px] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:h-[120px] sm:w-[120px]"
          />
        </div>

        {/* Headline */}
        <h1 className="max-w-5xl text-[36px] font-semibold leading-[1.04] tracking-tight text-foreground sm:text-[48px] md:text-[58px]">
          Your own OpenClaw,
          <br />
          <span className="text-muted-foreground">without managing the hosting.</span>
        </h1>

        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          Install OpenClaw in one click while ClawPilot handles the setup behind the scenes and keeps it private to you.
        </p>

        {/* CTA */}
        <div className="mt-7 flex flex-col items-center gap-2.5">
          {authStatus === "authenticated" ? (
            <Button asChild className="group" size="hero" variant="brand">
              <Link href="/dashboard/chat">
                Go to Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onGoogleSignIn}
              disabled={isGoogleLoading || authStatus === "loading"}
              className="group"
              size="hero"
              variant="brand"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {authStatus === "loading"
                ? "Loading..."
                : "Start free"}
              {!isGoogleLoading && authStatus !== "loading" ? (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </Button>
          )}
          {authError ? (
            <p className="text-center text-sm text-destructive">{authError}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Includes a 3-day trial before billing begins
          </p>
          <p className="text-xs text-muted-foreground">
            For less than a candy bar 🍫 a day &middot; Cancel anytime
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          {channelIcons.map((channel) => (
            <Image
              key={channel.alt}
              src={channel.src}
              alt={channel.alt}
              width={22}
              height={22}
              className="h-[22px] w-[22px] object-contain opacity-80"
            />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Instantly connect WhatsApp, Telegram, Discord, iMessage, and more.
        </p>
      </div>
    </section>
  )
}
