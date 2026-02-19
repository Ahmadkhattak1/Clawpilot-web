"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { CheckCircle2, Loader2 } from "lucide-react"
import { buildAuthCallbackUrl, getSupabaseAuthClient } from "@/lib/supabase-auth"

const controlPoints = [
  "Approve sensitive connections once.",
  "Require confirmation for risky actions.",
  "Review what happened in one timeline.",
]

export function CTA() {
  const [visible, setVisible] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const sectionRef = useRef<HTMLElement>(null)

  const onGoogleSignIn = async () => {
    if (isGoogleLoading) return

    setAuthError("")
    setIsGoogleLoading(true)
    try {
      const supabase = getSupabaseAuthClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl("/dashboard"),
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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
          }
        })
      },
      { threshold: 0.25 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="control" ref={sectionRef} className="relative px-6 py-16 md:py-20">
      <div
        className={`max-w-3xl mx-auto rounded-2xl border border-border/50 bg-secondary/40 p-8 md:p-10 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
      >
        <h2 className="type-h2 mb-4">
          Powerful agent. You stay in control.
        </h2>
        <p className="type-body mb-6">
          Fast automation with clear guardrails.
        </p>

        <ul className="space-y-3">
          {controlPoints.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/80 md:text-base">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-foreground/70" />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={isGoogleLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image src="/google.svg" alt="" aria-hidden width={16} height={16} className="h-4 w-4" />
            )}
            Sign in with Google
          </button>
          <a
            href="https://openclaw.ai/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            See integrations
          </a>
        </div>
        {authError ? (
          <p className="mt-3 text-sm text-destructive">{authError}</p>
        ) : null}
      </div>
    </section>
  )
}
