"use client"

import React from "react"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { subscribeEmail } from "@/lib/firebase"

export function CTA() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email && !loading) {
      setLoading(true)
      const result = await subscribeEmail(email)
      setLoading(false)
      if (result.success) {
        setSubmitted(true)
      }
    }
  }

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-6"
    >
      <div
        className={`max-w-xl mx-auto text-center transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Heading */}
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance mb-4">
          Stay in the loop
        </h2>

        <p className="text-[15px] text-muted-foreground max-w-sm mx-auto mb-8">
          Get updates on new features, releases, and community highlights.
        </p>

        {/* Email form */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-sm mx-auto">
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
        ) : (
          <div className="px-5 py-3 rounded-lg bg-foreground/5 border border-foreground/10 max-w-sm mx-auto">
            <p className="text-[14px] text-foreground font-medium">Thanks! We'll notify you at launch.</p>
          </div>
        )}

        <p className="mt-6 text-[13px] text-muted-foreground">
          MIT licensed. <a href="https://github.com/openclaw/openclaw" target="_blank" rel="noopener noreferrer" className="text-foreground/70 underline underline-offset-2">View on GitHub</a>
        </p>
      </div>
    </section>
  )
}
