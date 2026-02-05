"use client"

import React from "react"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { subscribeEmail, updateSubscriber } from "@/lib/firebase"
import { trackEvent } from "@/lib/analytics"

export function CTA() {
  const [visible, setVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
          }
        })
      },
      { threshold: 0.3 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-6"
    >
      <div
        className={`max-w-xl mx-auto text-center transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
      >
        {/* Heading */}
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance mb-4">
          Get early access
        </h2>

        <p className="text-[15px] text-muted-foreground max-w-sm mx-auto mb-8">
          Be first to try ClawPilot and get OpenClaw running in your chat apps.
        </p>

        {/* Email form */}
        <CTAForm />
        <p className="mt-3 text-[12px] text-muted-foreground">
          Early access includes an OpenClaw setup checklist and best practices guide.
        </p>

        <p className="mt-6 text-[13px] text-muted-foreground">
          OpenClaw is MIT licensed. <a href="https://github.com/openclaw/openclaw" target="_blank" rel="noopener noreferrer" className="text-foreground/70 underline underline-offset-2">View on GitHub</a>
        </p>
      </div>
    </section>
  )
}

function CTAForm() {
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
        trackEvent("generate_lead", { method: "email", location: "cta" })
        setSubscriberId(result.id)
        setStep("questions")
      }
    }
  }

  const handleQuestionsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

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
