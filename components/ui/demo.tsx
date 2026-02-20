"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  buildAuthCallbackUrl,
  getRecoveredSupabaseSession,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"

const proofChips = [
  "Built on OpenClaw",
  "210k+ GitHub stars",
  "100k+ community members",
  "50+ integrations",
]

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
          redirectTo: buildAuthCallbackUrl("/chat"),
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
      className="relative flex min-h-screen items-center overflow-hidden px-4 pb-10 pt-20 sm:px-6 sm:pb-12 sm:pt-24 md:pb-16 md:pt-24"
    >
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-5 sm:px-8 md:px-12 md:py-7">
        <h1 className="mx-auto max-w-5xl text-balance text-center text-[44px] font-semibold leading-[0.95] tracking-tight sm:text-[56px] md:text-[74px]">
          OpenClaw power, without the setup headache.
        </h1>

        <div className="relative mx-auto mt-6 w-full max-w-[280px] sm:mt-7 sm:max-w-[350px] md:mt-8 md:max-w-[430px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[-22%] -bottom-10 -top-12 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(249,188,116,0.50)_0%,rgba(249,188,116,0.22)_38%,rgba(249,188,116,0.06)_58%,transparent_76%)] blur-3xl"
          />
          <Image
            src="/hero-hatch.svg"
            alt="OpenClaw mascot hatching from an egg"
            width={4563}
            height={3676}
            priority
            className="relative z-10 -my-6 h-auto w-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.16)] sm:-my-8 md:-my-10"
          />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none relative left-1/2 -z-10 -mt-[5.5rem] mb-0 h-20 w-screen -translate-x-1/2 overflow-hidden sm:-mt-24 sm:h-24 md:-mt-[6.5rem] md:h-28"
        >
          <svg
            viewBox="0 0 1440 260"
            preserveAspectRatio="none"
            className="h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 260 C260 38 1180 38 1440 260 L1440 260 L0 260 Z" fill="white" />
            <path
              d="M0 260 C260 38 1180 38 1440 260"
              fill="none"
              stroke="rgba(15,23,42,0.1)"
              strokeWidth="2"
            />
          </svg>
        </div>

        <p className="type-body mx-auto mt-0 max-w-2xl px-2 text-center sm:mt-1">
          No Mac Minis. No terminal babysitting.
          <br className="hidden sm:block" />
          We host and run it so you can delegate work immediately.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          {authStatus === "authenticated" ? (
            <Link
              href="/chat"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={isGoogleLoading || authStatus === "loading"}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Image
                  src="/google.svg"
                  alt=""
                  aria-hidden
                  width={16}
                  height={16}
                  className="h-4 w-4"
                />
              )}
              {authStatus === "loading" ? "Checking account..." : "Sign in with Google"}
            </button>
          )}
          {authError ? (
            <p className="text-center text-sm text-destructive">{authError}</p>
          ) : null}
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2 sm:mt-7">
          {proofChips.map((chip) => (
            <Badge
              key={chip}
              variant="outline"
              className="rounded-full border-border/60 bg-background/75 px-3 py-1 text-[11px] font-medium text-foreground/85 sm:text-xs"
            >
              {chip}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  )
}
