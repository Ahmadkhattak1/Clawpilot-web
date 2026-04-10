"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"
import {
  buildAuthCallbackUrl,
  getRecoveredSupabaseSession,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"
import { Button } from "@/components/ui/button"
import { ClawContainer, ClawSection, ClawSectionIntro } from "@/components/ui/clawpilot"

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
    <ClawSection id="get-started">
      <ClawContainer size="sm">
        <ClawSectionIntro
          description="Your private instance is a few clicks away. Cancel anytime."
          title="Ready to try OpenClaw?"
        />

        <div className="mt-8 flex flex-col items-center gap-3">
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
              {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {authStatus === "loading" ? "Loading..." : "Get Started"}
              {!isGoogleLoading && authStatus !== "loading" ? (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </Button>
          )}
          {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
        </div>
      </ClawContainer>
    </ClawSection>
  )
}
