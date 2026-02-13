"use client"

import { useEffect, useRef, useState } from "react"
import { Link2, MessageSquareText, UserRoundPlus } from "lucide-react"

const steps = [
  {
    icon: UserRoundPlus,
    number: "01",
    title: "Create your account",
    description: "Create your account.",
  },
  {
    icon: Link2,
    number: "02",
    title: "Connect your chat and tools",
    description: "Connect your chat and tools.",
  },
  {
    icon: MessageSquareText,
    number: "03",
    title: "Start delegating tasks",
    description: "Start delegating tasks.",
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
      className="relative px-6 py-20 md:py-24"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/30 to-transparent pointer-events-none" />

      <div className="relative max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <h2 className="type-h2 mb-4">
            How it works
          </h2>
          <p className="type-body">
            Three steps from account creation to delegation.
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
                      className={`type-h4 transition-colors duration-300 ${
                        activeStep === index ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p
                    className={`type-body-sm mt-0.5 transition-all duration-300 ${
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
