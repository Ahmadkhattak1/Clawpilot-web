"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2 } from "lucide-react"

const controlPoints = [
  "You approve what it can connect to",
  "You can require confirmation for sensitive actions",
  "You can review what happened when",
]

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
      { threshold: 0.25 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="control" ref={sectionRef} className="relative px-6 py-16 md:py-20">
      <div
        className={`max-w-3xl mx-auto rounded-2xl border border-border/50 bg-secondary/40 p-8 md:p-10 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
      >
        <h2 className="type-h2 mb-4">
          You stay in control
        </h2>
        <p className="type-body mb-6">
          This is an assistant that can take actions, so control matters:
        </p>

        <ul className="space-y-3">
          {controlPoints.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/80 md:text-base">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-foreground/70" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
