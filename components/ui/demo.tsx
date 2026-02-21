"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Check,
  Loader2,
  X,
} from "lucide-react"


import {
  buildAuthCallbackUrl,
  getRecoveredSupabaseSession,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"

const rotatingWords = ["a Mac mini", "a Terminal", "Manual Setup"]

type AuthStatus = "loading" | "authenticated" | "anonymous"

export function Hero() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [wordIndex, setWordIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % rotatingWords.length)
        setIsVisible(true)
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

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
        <h1 className="mx-auto max-w-5xl text-balance text-center text-[42px] font-semibold leading-[0.95] tracking-tight sm:text-[56px] md:text-[72px]">
          Run OpenClaw without{" "}
          <span
            className={`inline-block transition-all duration-300 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          >
            {rotatingWords[wordIndex]}
          </span>
          .
        </h1>
        <p className="type-body mx-auto mt-5 max-w-2xl px-2 text-center sm:mt-6">
          Easy OpenClaw setup. No hardware to buy. No local machine to keep awake.
          <br className="hidden sm:block" />
          ClawPilot hosts and runs your OpenClaw instance for you in minutes.
        </p>

        <div className="mx-auto mt-10 w-full max-w-4xl">
          <div className="relative grid gap-5 md:grid-cols-2 md:gap-8">
            {/* ── Left: DIY / Mac mini (crossed out) ── */}
            <div className="relative overflow-hidden rounded-[24px] border border-rose-200/60 bg-rose-50/50 p-5 shadow-[0_16px_40px_rgba(244,63,94,0.07)] backdrop-blur-lg">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-500">
                DIY Setup
              </p>
              <div className="relative mt-3 flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-rose-200/60 bg-gradient-to-b from-white to-rose-50/40 sm:h-52">
                <Image
                  src="/mac-mini.png"
                  alt="Mac mini hardware"
                  width={1280}
                  height={720}
                  priority
                  className="h-full w-full max-w-[320px] object-contain opacity-90 saturate-[0.55]"
                />
                {/* Diagonal strikethrough */}
                <div
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-[3px] w-[92%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-full bg-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.55)]"
                />
                {/* "Not needed" badge */}
                <span className="absolute right-3 top-3 rounded-full border border-rose-300/70 bg-rose-100/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700">
                  Not needed
                </span>
              </div>
              {/* Minimal caption — three pain points */}
              <div className="mt-3.5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/80 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  <X className="h-3 w-3" strokeWidth={3} /> Hardware
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/80 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  <X className="h-3 w-3" strokeWidth={3} /> Terminal
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/80 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  <X className="h-3 w-3" strokeWidth={3} /> Manual updates
                </span>
              </div>
            </div>

            {/* ── Right: ClawPilot way ── */}
            <div className="relative overflow-hidden rounded-[24px] border border-emerald-200/60 bg-emerald-50/45 p-5 shadow-[0_16px_40px_rgba(16,185,129,0.09)] backdrop-blur-lg">
              {/* Glow */}
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/[0.08] blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-emerald-500/[0.06] blur-3xl" />

              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600">
                ClawPilot
              </p>

              <div className="relative mt-3 flex flex-col gap-3">
                {/* Benefit 1 */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200/70 bg-white/90 px-4 py-4 shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-4.5 w-4.5" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold leading-tight text-foreground">We host for you</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">Always-on cloud</p>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200/70 bg-white/90 px-4 py-4 shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-4.5 w-4.5" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold leading-tight text-foreground">Friendly dashboard</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">Point, click, done</p>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200/70 bg-white/90 px-4 py-4 shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-4.5 w-4.5" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold leading-tight text-foreground">We manage everything</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">Install, updates, uptime</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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

        {authStatus !== "authenticated" ? (
          /* Social proof — inline avatars + text */
          <div className="mt-4 flex items-center justify-center gap-2.5">
            <div className="flex -space-x-1.5">
              {[
                { initials: "AK", bg: "bg-violet-500" },
                { initials: "SR", bg: "bg-sky-500" },
                { initials: "MJ", bg: "bg-amber-500" },
                { initials: "LD", bg: "bg-rose-500" },
                { initials: "TP", bg: "bg-emerald-500" },
              ].map((u) => (
                <span
                  key={u.initials}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${u.bg} text-[9px] font-bold text-white ring-[1.5px] ring-background`}
                >
                  {u.initials}
                </span>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground sm:text-[13px]">
              Join thousands who use OpenClaw to automate their tasks.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
