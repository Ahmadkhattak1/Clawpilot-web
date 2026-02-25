"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import {
  buildAuthCallbackUrl,
  getRecoveredSupabaseSession,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"

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
          <div className="h-11 w-11 overflow-hidden rounded-md flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="ClawPilot mascot"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="type-brand ml-1">ClawPilot</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link
            href="#home"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="#problem"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Problem
          </Link>
          <Link
            href="#agents"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Agents
          </Link>
          <Link
            href="#why-clawpilot"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Why Clawpilot
          </Link>
          <Link
            href="#how-it-works"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
        </div>

        {authStatus === "authenticated" ? (
          <Link
            href="/dashboard/chat"
            className="type-nav rounded-lg bg-foreground px-3 py-1.5 text-background"
          >
            Dashboard
          </Link>
        ) : (
          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={isGoogleLoading}
            className="type-nav inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-background disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGoogleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isGoogleLoading ? "Connecting..." : "Sign in"}
          </button>
        )}
      </nav>
    </header>
  )
}
