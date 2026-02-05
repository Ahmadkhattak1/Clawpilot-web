"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, MousePointer, CheckCircle2 } from "lucide-react"

export function Agents() {
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
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="openclaw"
      ref={sectionRef}
      className="relative py-32 px-6"
    >
      <div className="max-w-2xl mx-auto">
        {/* Section header */}
        <div className={`text-center mb-10 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
            What OpenClaw can do
          </h2>
          <p className="text-muted-foreground text-[15px] max-w-lg mx-auto">
            OpenClaw is an open source personal AI that works inside your chat apps and takes action on your behalf.
          </p>
        </div>

        {/* Single agent card */}
        <div
          className={`relative p-6 md:p-8 rounded-xl bg-secondary/50 border border-border/40 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center mb-5">
            <Bot className="w-[18px] h-[18px] text-background" />
          </div>

          {/* Description */}
          <p className="text-foreground/80 text-[15px] leading-relaxed mb-6">
            OpenClaw handles conversations, answers questions, and automates tasks while replying from WhatsApp, Telegram, Slack, Discord, Signal, and iMessage.
          </p>
          <p className="text-muted-foreground text-[13px] leading-relaxed mb-6">
            Previously known as Clawdbot and Moltbot, now OpenClaw.
          </p>

          {/* Features */}
          <div className="space-y-2.5 mb-6">
            <div className="flex items-center gap-2.5 text-[13px]">
              <MousePointer className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground/60">OpenClaw gateway connects your chat apps in minutes</span>
            </div>
            <div className="flex items-center gap-2.5 text-[13px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground/60">Works with Claude, GPT, and local models</span>
            </div>
          </div>

          {/* SEO aliases */}
          <div className="pt-5 border-t border-border/40">
            <p className="text-[11px] text-muted-foreground">
              Also known as: <span className="text-foreground/40">openclaw</span> <span className="text-muted-foreground/30">|</span> <span className="text-foreground/40">clawdbot</span> <span className="text-muted-foreground/30">|</span> <span className="text-foreground/40">moltbot</span>
            </p>
          </div>
        </div>

        {/* Bottom note */}
        <p className={`mt-6 text-center text-[13px] text-muted-foreground transition-all duration-700 delay-500 ${visible ? "opacity-100" : "opacity-0"}`}>
          Open source on GitHub and built by the community.
        </p>
      </div>
    </section>
  )
}
