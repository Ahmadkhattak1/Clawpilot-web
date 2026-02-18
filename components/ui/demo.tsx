"use client"

import Image from "next/image"
import { useState } from "react"
import { Loader2 } from "lucide-react"

import { trackEvent } from "@/lib/analytics"
import { subscribeEmail } from "@/lib/supabase"

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden px-4 pb-14 pt-10 sm:px-6 md:pb-20 md:pt-12">
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-5 sm:px-8 md:px-12 md:py-7">
        <h1 className="mx-auto max-w-5xl text-balance text-center text-[44px] font-semibold leading-[0.95] tracking-tight sm:text-[56px] md:text-[74px]">
          Openclaw, without the setup headache.
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
          className="pointer-events-none relative left-1/2 z-0 -mt-12 mb-0 h-20 w-screen -translate-x-1/2 overflow-hidden sm:-mt-14 sm:h-24 md:-mt-16 md:h-28"
        >
          <svg
            viewBox="0 0 1440 260"
            preserveAspectRatio="none"
            className="h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 260 C300 118 1140 118 1440 260 L1440 260 L0 260 Z" fill="white" />
            <path
              d="M0 260 C300 118 1140 118 1440 260"
              fill="none"
              stroke="rgba(15,23,42,0.06)"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <p className="type-body mx-auto mt-0 max-w-2xl px-2 text-center sm:mt-1">
          No Mac Minis, TUI management, We host it and keep it running so you can just use it.
        </p>

        <div className="mt-5">
          <WaitlistForm />
        </div>
      </div>
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
      className="mx-auto flex max-w-md flex-col gap-2.5 sm:flex-row"
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
        className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
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
