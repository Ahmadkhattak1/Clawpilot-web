"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { ClockCounterClockwise, HardDrives, Pulse } from "@phosphor-icons/react"

const features = [
  {
    icon: HardDrives,
    title: "Skip infrastructure work",
    description:
      "No instance sizing, deployment scripts, or uptime dashboards.",
  },
  {
    icon: ClockCounterClockwise,
    title: "Run 24/7 reliably",
    description:
      "Your assistant stays live without machine babysitting.",
  },
  {
    icon: Pulse,
    title: "Launch in minutes",
    description:
      "Connect channels and start delegating tasks immediately.",
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
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div
            data-index={0}
            className={`transition-all duration-700 ${
              visibleItems.includes(0)
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <h2 className="type-h2 mb-4">
              Why teams switch to ClawPilot
            </h2>
            <p className="type-body max-w-xl">
              OpenClaw is powerful. We make it operational fast.
            </p>
          </div>

          <div
            data-index={1}
            className={`relative mx-auto w-full max-w-md transition-all duration-700 ${
              visibleItems.includes(1)
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "120ms" }}
          >
            <div className="pointer-events-none absolute inset-x-8 bottom-8 h-24 rounded-full bg-[radial-gradient(circle,rgba(249,188,116,0.35)_0%,rgba(249,188,116,0.0)_75%)] blur-2xl" />
            <Image
              src="/cloud-ride.svg"
              alt="Lobster mascot riding a cloud"
              width={1024}
              height={1024}
              className="relative z-10 mx-auto h-auto w-full max-w-[360px] object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.14)] lg:translate-x-4"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const cardIndex = index + 2
            return (
              <div
                key={feature.title}
                data-index={cardIndex}
                className={`relative rounded-xl border border-border/40 bg-secondary/50 p-6 transition-all duration-700 ${
                  visibleItems.includes(cardIndex)
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${cardIndex * 90}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center mb-5">
                  <Icon className="w-[20px] h-[20px] text-background" weight="duotone" />
                </div>

                <h3 className="type-h4 mb-2">{feature.title}</h3>
                <p className="type-body-sm">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
