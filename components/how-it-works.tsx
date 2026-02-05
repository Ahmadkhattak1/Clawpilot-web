"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Rocket, MessageCircle } from "lucide-react"

const steps = [
  {
    icon: Download,
    number: "01",
    title: "Install",
    description: "Install our app for macOS, Windows, or Linux.",
  },
  {
    icon: Rocket,
    number: "02",
    title: "Onboard",
    description: "Run the wizard to set up your AI model and API keys.",
  },
  {
    icon: MessageCircle,
    number: "03",
    title: "Connect",
    description: "Pair WhatsApp, Telegram, Slack, Discord via QR or token.",
  },
]

export function HowItWorks() {
  const [visibleItems, setVisibleItems] = useState<number[]>([])
  const [activeStep, setActiveStep] = useState(0)
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
      { threshold: 0.3 }
    )

    const items = sectionRef.current?.querySelectorAll("[data-index]")
    items?.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-32 px-6"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/30 to-transparent pointer-events-none" />

      <div className="relative max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Three steps. That's all.
          </h2>
          <p className="text-muted-foreground text-[15px]">
            From zero to deployed in under a minute.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={step.number}
                data-index={index}
                onClick={() => setActiveStep(index)}
                className={`relative flex items-center gap-5 p-5 rounded-xl cursor-pointer transition-all duration-500 ${
                  visibleItems.includes(index)
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-8"
                } ${
                  activeStep === index
                    ? "bg-secondary/50 border border-border/40"
                    : ""
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Step icon */}
                <div
                  className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    activeStep === index
                      ? "bg-foreground"
                      : "bg-muted"
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] transition-colors duration-300 ${
                    activeStep === index ? "text-background" : "text-muted-foreground"
                  }`} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[11px] font-mono transition-colors duration-300 ${
                      activeStep === index ? "text-foreground/50" : "text-muted-foreground"
                    }`}>
                      {step.number}
                    </span>
                    <h3
                      className={`font-display text-[15px] font-semibold transition-colors duration-300 ${
                        activeStep === index ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p
                    className={`mt-0.5 text-[13px] leading-relaxed transition-all duration-300 ${
                      activeStep === index
                        ? "text-muted-foreground opacity-100"
                        : "text-muted-foreground/50 opacity-0 h-0 md:opacity-70 md:h-auto"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-0.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-300 ease-linear"
            style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </section>
  )
}
