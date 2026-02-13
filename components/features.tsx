"use client"

import { useEffect, useRef, useState } from "react"
import { ClockCounterClockwise, HardDrives, Pulse } from "@phosphor-icons/react"

const features = [
  {
    icon: HardDrives,
    title: "No infrastructure decisions",
    description:
      "You do not need to pick instance types, manage deployments, or worry about scaling.",
  },
  {
    icon: ClockCounterClockwise,
    title: "No maintenance",
    description:
      "We handle the setup and keep things up to date.",
  },
  {
    icon: Pulse,
    title: "No uptime anxiety",
    description:
      "Your assistant stays available without you keeping a machine running at home.",
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
      id="benefits"
      ref={sectionRef}
      className="relative px-6 py-20 md:py-24"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="type-h2 mb-4">
            What ClawPilot takes off your plate
          </h2>
          <p className="type-body mx-auto max-w-md">
            OpenClaw is powerful. ClawPilot removes the hosting and reliability overhead.
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
                <h3 className="type-h4 mb-2">{feature.title}</h3>
                <p className="type-body-sm">
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
