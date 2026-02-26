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

type AuthStatus = "loading" | "authenticated" | "anonymous"

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

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        {/* Mascot */}
        <div className="relative mb-10">
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-[2] rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.03),transparent_70%)]"
          />
          <Image
            src="/logo.svg"
            alt="ClawPilot mascot"
            width={120}
            height={120}
            priority
            className="relative h-[100px] w-[100px] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:h-[120px] sm:w-[120px]"
          />
        </div>

        {/* Headline */}
        <h1 className="text-[36px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[48px] md:text-[56px]">
          Your own OpenClaw.
          <br />
          <span className="text-muted-foreground">Running in minutes.</span>
        </h1>

        {/* Subheadline */}
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          ClawPilot gives you a private OpenClaw instance in the cloud.
          No servers. No Docker. No terminal. Just sign up and go.
        </p>

        {/* CTA */}
        <div className="mt-9 flex flex-col items-center gap-3">
          {authStatus === "authenticated" ? (
            <Link
              href="/dashboard/chat"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-7 text-[15px] font-medium text-background shadow-sm transition-all hover:shadow-md hover:opacity-90"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={isGoogleLoading || authStatus === "loading"}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-7 text-[15px] font-medium text-background shadow-sm transition-all hover:shadow-md hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {authStatus === "loading"
                ? "Loading..."
                : "Get Started Free"}
              {!isGoogleLoading && authStatus !== "loading" ? (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </button>
          )}
          {authError ? (
            <p className="text-center text-sm text-destructive">{authError}</p>
          ) : null}
          <p className="text-xs text-muted-foreground/60">
            For less than a candy bar a day &middot; Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}
