"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"
import {
  buildAuthCallbackUrl,
  getRecoveredSupabaseSession,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"

export function CTA() {
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "anonymous">("loading")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [authError, setAuthError] = useState("")

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

  return (
    <section className="relative px-6 py-16 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Ready to try OpenClaw?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your private instance is a few clicks away. No credit card required to start.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
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
              {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {authStatus === "loading" ? "Loading..." : "Get Started Free"}
              {!isGoogleLoading && authStatus !== "loading" ? (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </button>
          )}
          {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
        </div>
      </div>
    </section>
  )
}
