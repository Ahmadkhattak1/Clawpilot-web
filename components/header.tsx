"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import {
  buildAuthCallbackUrl,
  getRecoveredSupabaseSession,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"
import { Button } from "@/components/ui/button"

type AuthStatus = "loading" | "authenticated" | "anonymous"

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
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
      setIsGoogleLoading(false)
      window.location.assign("/signin")
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? "bg-background/90 backdrop-blur-xl border-b border-border/40"
        : "bg-transparent"
        }`}
    >
      <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 overflow-hidden rounded-md flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="ClawPilot mascot"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="type-brand">ClawPilot</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link
            href="#why-clawpilot"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Why ClawPilot
          </Link>
          <Link
            href="#how-it-works"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="/blog"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </Link>
        </div>

        {authStatus === "authenticated" ? (
          <Button asChild size="nav" variant="brand">
            <Link href="/dashboard/chat">Dashboard</Link>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onGoogleSignIn}
            disabled={isGoogleLoading}
            size="nav"
            variant="brand"
            className="gap-1.5"
          >
            {isGoogleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isGoogleLoading ? "Connecting..." : "Get Started"}
          </Button>
        )}
      </nav>
    </header>
  )
}
