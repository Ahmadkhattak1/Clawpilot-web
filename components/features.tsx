"use client"

import { useEffect, useRef, useState } from "react"
import { HardDrives, ChatsCircle, ShieldCheck } from "@phosphor-icons/react"

const features = [
  {
    icon: HardDrives,
    title: "Self-hosted",
    description: "Run on your own devices. Your data never leaves your machine. Complete privacy and control.",
  },
  {
    icon: ChatsCircle,
    title: "Multi-channel",
    description: "WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Teams, and more. One assistant, everywhere.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    description: "DM pairing, allowlists, and sandboxed execution. Built for security from day one.",
  },
]

export function Features() {
  const [visibleItems, setVisibleItems] = useState<number[]>([])
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"))
            setVisibleItems((prev) => [...new Set([...prev, index])])
          }
        })
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    )

    const items = sectionRef.current?.querySelectorAll("[data-index]")
    items?.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-32 px-6"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Why OpenClaw?
          </h2>
          <p className="text-muted-foreground text-[15px] max-w-md mx-auto">
            A personal AI assistant that actually respects your privacy.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                data-index={index}
                className={`relative p-6 rounded-xl bg-secondary/50 border border-border/40 transition-all duration-700 ${visibleItems.includes(index)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
                  }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center mb-5">
                  <Icon className="w-[20px] h-[20px] text-background" weight="duotone" />
                </div>

                {/* Content */}
                <h3 className="font-display text-[15px] font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-[13px] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
