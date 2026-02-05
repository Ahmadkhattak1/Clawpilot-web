"use client"

import React from "react"

import { useEffect, useState } from "react"
import { GradientAnimation } from "./gradient-animation"
import { AppleLogo, WindowsLogo, LinuxLogo, AppStoreLogo, GooglePlayLogo, ArrowRight, CircleNotch, ShieldCheck } from "@phosphor-icons/react"
import { subscribeEmail, updateSubscriber } from "@/lib/firebase"
import { trackEvent } from "@/lib/analytics"

export function Hero() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Gradient animation background */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${mounted ? "opacity-100" : "opacity-0"
          }`}
      >
        <GradientAnimation />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground/5 mb-10 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <div className="w-4 h-4 rounded-md flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="ClawPilot"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[13px] text-foreground/70 font-medium tracking-wide">Runs locally on your machine</span>
        </div>

        {/* Heading */}
        <h1
          className={`font-display text-[clamp(2.5rem,7vw,5rem)] font-bold tracking-tight leading-[1.1] text-balance mb-6 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <span className="text-foreground">Set Up OpenClaw</span>
          <br />
          <span className="text-foreground/40">in Under 60 Seconds</span>
        </h1>

        {/* Subheading */}
        <p
          className={`text-[17px] md:text-lg text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          Your AI assistant on WhatsApp, Telegram, Slack, Discord, and more.
        </p>

        <div
          className={`mb-12 transition-all duration-700 delay-250 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          {/* New Implementation */}
          <HeroForm />
        </div>

        {/* Download buttons */}
        <div
          className={`transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <button
              disabled
              className="group flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg bg-foreground text-background shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1)] cursor-not-allowed opacity-60"
            >
              <AppleLogo className="w-[18px] h-[18px]" weight="fill" />
              <span className="text-[14px] font-medium">macOS</span>
              <span className="text-[11px] text-background/60 bg-background/10 px-1.5 py-0.5 rounded">Soon</span>
            </button>

            <button
              disabled
              className="group flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg bg-foreground text-background shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1)] cursor-not-allowed opacity-60"
            >
              <WindowsLogo className="w-[18px] h-[18px]" weight="fill" />
              <span className="text-[14px] font-medium">Windows</span>
              <span className="text-[11px] text-background/60 bg-background/10 px-1.5 py-0.5 rounded">Soon</span>
            </button>

            <button
              disabled
              className="group flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg bg-foreground text-background shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1)] cursor-not-allowed opacity-60"
            >
              <LinuxLogo className="w-[18px] h-[18px]" weight="fill" />
              <span className="text-[14px] font-medium">Linux</span>
              <span className="text-[11px] text-background/60 bg-background/10 px-1.5 py-0.5 rounded">Soon</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              disabled
              className="group flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg border border-border bg-background shadow-sm cursor-not-allowed opacity-50"
            >
              <AppStoreLogo className="w-[18px] h-[18px] text-foreground/70" weight="fill" />
              <span className="text-[14px] font-medium text-foreground/70">iPhone</span>
              <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
            </button>

            <button
              disabled
              className="group flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg border border-border bg-background shadow-sm cursor-not-allowed opacity-50"
            >
              <GooglePlayLogo className="w-[18px] h-[18px] text-foreground/70" weight="fill" />
              <span className="text-[14px] font-medium text-foreground/70">Android</span>
              <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
            </button>
          </div>
        </div>


      </div>
    </section>
  )
}

function HeroForm() {
  const [step, setStep] = useState<"email" | "questions" | "done">("email")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [subscriberId, setSubscriberId] = useState("")
  const [isDuplicate, setIsDuplicate] = useState(false)

  // Question state
  const [hosting, setHosting] = useState("")
  const [device, setDevice] = useState("")
  const [cloudPrice, setCloudPrice] = useState("")

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email && !loading) {
      setLoading(true)
      const result = await subscribeEmail(email)
      setLoading(false)
      if (result.success && result.id) {
        trackEvent("generate_lead", { method: "email", location: "hero" })
        setSubscriberId(result.id)
        setIsDuplicate(!!result.isDuplicate)
        setStep("questions")
      }
    }
  }

  const handleQuestionsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    // Even if skipped explanation, we just update nothing or update what we have.
    // Spec says: "Even if user doesnt answer these, keep his email" -> email already saved.
    // "if he answers these, then add it..."

    if (subscriberId) {
      setLoading(true)
      await updateSubscriber(subscriberId, {
        hostingPreference: hosting,
        devicePreference: device,
        cloudPrice: hosting === 'Cloud' ? cloudPrice : null
      })
      setLoading(false)
    }
    setStep("done")
  }

  if (step === "done") {
    return (
      <div className="px-5 py-3 rounded-lg bg-foreground/5 border border-foreground/10 max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="text-[14px] text-foreground font-medium">
          {isDuplicate ? "Preferences updated! We'll keep you posted." : "Thanks! We'll notify you at launch."}
        </p>
      </div>
    )
  }

  if (step === "questions") {
    return (
      <form onSubmit={handleQuestionsSubmit} className="max-w-md mx-auto bg-background border border-border rounded-xl p-6 shadow-lg text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
        {isDuplicate && (
          <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[13px] font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" weight="fill" />
            You're already on the list! Would you like to update your preferences?
          </div>
        )}

        <h3 className="text-[16px] font-semibold text-foreground mb-6">Quick personalization</h3>

        <div className="space-y-6">
          <div>
            <label className="text-[14px] text-foreground/80 font-medium block mb-3">Which platform do you use most?</label>
            <div className="flex flex-wrap gap-2">
              {['Mac', 'Windows', 'Linux', 'iPhone', 'Android'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDevice(opt)}
                  className={`py-2 px-4 rounded-lg text-[13px] font-medium border transition-all duration-200 ${device === opt
                    ? 'bg-foreground text-background border-foreground shadow-md scale-[1.02]'
                    : 'bg-background hover:bg-muted text-foreground/70 border-border hover:border-foreground/30'
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[14px] text-foreground/80 font-medium block mb-3">Prefer self-hosting or cloud?</label>
            <div className="flex gap-2">
              {['Self-hosted', 'Cloud'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setHosting(opt)}
                  className={`flex-1 py-2 px-4 rounded-lg text-[13px] font-medium border transition-all duration-200 ${hosting === opt
                    ? 'bg-foreground text-background border-foreground shadow-md scale-[1.02]'
                    : 'bg-background hover:bg-muted text-foreground/70 border-border hover:border-foreground/30'
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {hosting === 'Cloud' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[14px] text-foreground/80 font-medium block mb-3">
                How much would you pay for a hosted version?
                <span className="ml-2 text-[12px] text-muted-foreground font-normal">(per month)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  type="number"
                  value={cloudPrice}
                  onChange={(e) => setCloudPrice(e.target.value)}
                  placeholder="10"
                  className="w-full pl-7 pr-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-all"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8 pt-2">
          <button
            type="button"
            onClick={() => handleQuestionsSubmit()}
            className="flex-1 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] py-2.5 rounded-lg bg-foreground text-background text-[13px] font-medium flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity"
          >
            {loading ? <CircleNotch className="w-4 h-4 animate-spin" /> : (isDuplicate ? "Update Preferences" : "Complete Setup")}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-sm mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="flex-1 px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2.5 rounded-lg bg-foreground text-background text-[14px] font-medium flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-70"
      >
        {loading ? (
          <CircleNotch className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            Notify me
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  )
}
