"use client"

import React from "react"

import { useEffect, useState } from "react"
import { GradientAnimation } from "./gradient-animation"
import { Apple, Monitor, Smartphone, ArrowRight, Loader2 } from "lucide-react"
import { subscribeEmail, updateSubscriber } from "@/lib/firebase"

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
          Self-hosted AI that answers on WhatsApp, Telegram, Slack, Discord, iMessage and more. Own your data.
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
              <Apple className="w-[18px] h-[18px]" />
              <span className="text-[14px] font-medium">macOS</span>
              <span className="text-[11px] text-background/60 bg-background/10 px-1.5 py-0.5 rounded">Soon</span>
            </button>

            <button
              disabled
              className="group flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg bg-foreground text-background shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1)] cursor-not-allowed opacity-60"
            >
              <Monitor className="w-[18px] h-[18px]" />
              <span className="text-[14px] font-medium">Windows</span>
              <span className="text-[11px] text-background/60 bg-background/10 px-1.5 py-0.5 rounded">Soon</span>
            </button>

            <button
              disabled
              className="group flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg bg-foreground text-background shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1)] cursor-not-allowed opacity-60"
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                <path d="M12.504 0c-.155 0-.311.001-.465.003-.658.014-1.271.05-1.847.108-.591.062-1.155.162-1.692.303-.542.143-1.033.33-1.475.561-.44.229-.849.503-1.228.822-.379.319-.72.68-1.023 1.082-.302.4-.557.836-.763 1.303-.207.467-.363.959-.468 1.473-.105.514-.157 1.034-.158 1.555-.003.173-.004.343-.004.511v8.056c0 .168.001.338.004.511.001.521.053 1.041.158 1.555.105.514.261 1.006.468 1.473.206.467.461.903.763 1.303.303.402.644.763 1.023 1.082.379.319.788.593 1.228.822.442.231.933.418 1.475.561.537.141 1.101.241 1.692.303.576.058 1.189.094 1.847.108.154.002.31.003.465.003z" />
              </svg>
              <span className="text-[14px] font-medium">Linux</span>
              <span className="text-[11px] text-background/60 bg-background/10 px-1.5 py-0.5 rounded">Soon</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              disabled
              className="group flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg border border-border bg-background shadow-sm cursor-not-allowed opacity-50"
            >
              <Apple className="w-[18px] h-[18px] text-foreground/70" />
              <span className="text-[14px] font-medium text-foreground/70">iPhone</span>
              <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
            </button>

            <button
              disabled
              className="group flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg border border-border bg-background shadow-sm cursor-not-allowed opacity-50"
            >
              <Smartphone className="w-[18px] h-[18px] text-foreground/70" />
              <span className="text-[14px] font-medium text-foreground/70">Android</span>
              <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
            </button>
          </div>
        </div>

        <p
          className={`mt-10 text-[13px] text-muted-foreground transition-all duration-700 delay-400 ${mounted ? "opacity-100" : "opacity-0"
            }`}
        >
          Open source on <a href="https://github.com/openclaw/openclaw" target="_blank" rel="noopener noreferrer" className="text-foreground/70 underline underline-offset-2">GitHub</a>
        </p>
      </div>
    </section>
  )
}

function HeroForm() {
  const [step, setStep] = useState<"email" | "questions" | "done">("email")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [subscriberId, setSubscriberId] = useState("")

  // Question state
  const [hosting, setHosting] = useState("")
  const [device, setDevice] = useState("")

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email && !loading) {
      setLoading(true)
      const result = await subscribeEmail(email)
      setLoading(false)
      if (result.success && result.id) {
        setSubscriberId(result.id)
        setStep("questions")
      }
    }
  }

  const handleQuestionsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    // Even if skipped explanation, we just update nothing or update what we have.
    // Spec says: "Even if user doesnt answer these, keep his email" -> email already saved.
    // "if he answers these, then add it..."

    if (subscriberId && (hosting || device)) {
      setLoading(true)
      await updateSubscriber(subscriberId, {
        hostingPreference: hosting,
        devicePreference: device
      })
      setLoading(false)
    }
    setStep("done")
  }

  if (step === "done") {
    return (
      <div className="px-5 py-3 rounded-lg bg-foreground/5 border border-foreground/10 max-w-sm mx-auto">
        <p className="text-[14px] text-foreground font-medium">Thanks! We'll notify you at launch.</p>
      </div>
    )
  }

  if (step === "questions") {
    return (
      <form onSubmit={handleQuestionsSubmit} className="max-w-md mx-auto bg-background border border-border rounded-xl p-5 shadow-sm text-left animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-[15px] font-medium text-foreground mb-4">Quick personalization</h3>

        <div className="space-y-4">
          <div>
            <label className="text-[13px] text-muted-foreground block mb-2">Prefer local or cloud hosting?</label>
            <div className="flex gap-2">
              {['Local', 'Cloud'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setHosting(opt)}
                  className={`flex-1 py-1.5 px-3 rounded-md text-[13px] border transition-all ${hosting === opt
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] text-muted-foreground block mb-2">Device preference?</label>
            <div className="flex flex-wrap gap-2">
              {['Mac', 'Linux', 'Windows', 'iPhone', 'Android'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDevice(opt)}
                  className={`py-1.5 px-3 rounded-md text-[13px] border transition-all ${device === opt
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={() => handleQuestionsSubmit()}
            className="flex-1 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-foreground text-background text-[13px] font-medium flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit"}
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
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
