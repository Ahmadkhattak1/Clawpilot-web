"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

const useCases = [
  "Email support and follow-ups",
  "Calendar planning and reminders",
  "Routine tasks and personal workflows",
  "Do this for me requests inside your chat",
]

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
      id="overview"
      ref={sectionRef}
      className="relative px-6 py-20 md:py-24"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div
          id="use-cases"
          className={`rounded-2xl border border-border/50 bg-secondary/40 p-8 md:p-10 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "120ms" }}
        >
          <h3 className="type-h3 mb-4">
            What you can use it for
          </h3>
          <p className="type-body mb-4">
            Use OpenClaw as a day-to-day assistant that can help with things like:
          </p>
          <ul className="space-y-2 mb-6">
            {useCases.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm leading-relaxed text-foreground/80 md:text-base">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                {item}
              </li>
            ))}
          </ul>

          <p className="type-body-sm text-foreground/80">
            Run your business. Customer support. Cold emails. And many other things. Explore more skills on{" "}
            <Link href="https://clawhub.ai" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              Clawhub.ai
            </Link>
          </p>

          <p className="mt-6 text-xs italic text-muted-foreground">
            Capabilities depend on what you connect and what permissions you allow.
          </p>
        </div>

      </div>
    </section>
  )
}
