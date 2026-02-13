"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"

import { renderCanvas } from "@/components/ui/canvas"
import { trackEvent } from "@/lib/analytics"
import { subscribeEmail } from "@/lib/supabase"

export function Hero() {
  useEffect(() => {
    const cleanup = renderCanvas()
    return cleanup
  }, [])

  return (
    <section id="home" className="relative min-h-[70vh] overflow-hidden md:min-h-[78vh]">
      <div className="relative z-10 mt-20 flex flex-col items-center justify-center px-4 text-center md:mt-20">
        <div className="mb-10 mt-4 md:mt-6">
          <div className="px-2">
            <div className="relative mx-auto h-full max-w-7xl border border-border p-6 [mask-image:radial-gradient(800rem_96rem_at_center,white,transparent)] md:px-12 md:py-20">
              <Plus
                strokeWidth={3}
                className="absolute -left-5 -top-5 h-10 w-10 text-border"
              />
              <Plus
                strokeWidth={3}
                className="absolute -bottom-5 -left-5 h-10 w-10 text-border"
              />
              <Plus
                strokeWidth={3}
                className="absolute -right-5 -top-5 h-10 w-10 text-border"
              />
              <Plus
                strokeWidth={3}
                className="absolute -bottom-5 -right-5 h-10 w-10 text-border"
              />

              <h1 className="type-h1 flex select-none flex-col px-3 py-2 text-center lg:flex-row">
                Openclaw, without the setup headache.
              </h1>
            </div>
          </div>

          <p className="type-body mx-auto mb-8 mt-8 max-w-3xl px-6 sm:px-6 md:px-20">
            No Mac Minis, TUI management, We host it and keep it running so you
            can just use it.
          </p>

          <WaitlistForm />
        </div>
      </div>

      <canvas
        id="canvas"
        className="pointer-events-none absolute inset-0 mx-auto bg-background"
      />
    </section>
  )
}

function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [error, setError] = useState("")

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email || loading) return

    setLoading(true)
    setError("")

    const result = await subscribeEmail(email.trim())

    if (!result.success) {
      setLoading(false)
      setError(
        result.code === "PGRST205"
          ? "Waitlist is being configured. Please try again shortly."
          : result.code === "42501"
            ? "Waitlist permissions are not configured yet. Please contact support."
          : "Something went wrong. Please try again.",
      )
      return
    }

    setIsDuplicate(Boolean(result.isDuplicate))
    setSubmitted(true)
    setLoading(false)
    trackEvent("generate_lead", { method: "email", location: "hero" })
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-sm rounded-lg border border-border bg-background/80 px-5 py-3 text-sm">
        {isDuplicate
          ? "You're already on the waitlist. We kept your spot."
          : "You're on the waitlist. We'll reach out soon."}
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex max-w-sm flex-col gap-2.5 sm:flex-row"
    >
      <label htmlFor="hero-waitlist-email" className="sr-only">
        Email
      </label>
      <input
        id="hero-waitlist-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your email"
        required
        className="h-11 flex-1 rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join waitlist"}
      </button>
      {error ? (
        <p className="w-full text-center text-xs text-destructive sm:text-left">
          {error}
        </p>
      ) : null}
    </form>
  )
}
