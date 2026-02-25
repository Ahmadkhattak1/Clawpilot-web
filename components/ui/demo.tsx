"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

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
      className="relative flex min-h-screen items-center overflow-hidden px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-24 md:pb-20 md:pt-24"
    >
      <div className="relative z-10 mx-auto max-w-5xl px-5 py-5 sm:px-8 md:px-10 md:py-7">
        <h1 className="mx-auto max-w-4xl text-balance text-center text-[40px] font-semibold leading-[0.95] tracking-tight sm:text-[56px] md:text-[68px]">
          Everyone Else Sells You a Server. We Sell You Employees.
        </h1>
        <p className="type-body mx-auto mt-6 max-w-3xl px-2 text-center sm:mt-7">
          OpenClaw agents that send outreach, reply to leads, handle WhatsApp support, and monitor
          competitors. Working on Day 1.
        </p>

        <div className="mx-auto mt-8 flex justify-center">
          <div className="relative h-[150px] w-[150px] sm:h-[180px] sm:w-[180px] md:h-[210px] md:w-[210px]">
            <Image
              src="/logo.svg"
              alt="Flying ClawPilot mascot"
              fill
              priority
              sizes="(max-width: 768px) 150px, 210px"
              className="object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.12)]"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          {authStatus === "authenticated" ? (
            <Link
              href="/dashboard/chat"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Deploy Your First Agent →
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
              ) : null}
              {authStatus === "loading" ? "Checking account..." : "Deploy Your First Agent →"}
            </button>
          )}
          {authError ? (
            <p className="text-center text-sm text-destructive">{authError}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
