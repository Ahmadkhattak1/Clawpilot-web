"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
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
    <section id="final-cta" className="relative px-6 py-16 md:py-20">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border/60 bg-secondary/35 p-8 text-center md:p-10">
        <h2 className="type-h2 text-balance">
          Stop buying servers you have to figure out. Get agents that work.
        </h2>

        <div className="mt-8 flex justify-center">
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
              {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {authStatus === "loading" ? "Checking account..." : "Deploy Your First Agent →"}
            </button>
          )}
        </div>

        {authError ? <p className="mt-3 text-sm text-destructive">{authError}</p> : null}
      </div>
    </section>
  )
}
