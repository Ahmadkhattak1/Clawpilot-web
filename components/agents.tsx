"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  CalendarClock,
  ClipboardList,
  Inbox,
  MessageCircleMore,
  SearchCheck,
  Send,
  Workflow,
} from "lucide-react"

const useCases = [
  {
    title: "Inbox support",
    icon: Inbox,
    className: "lg:col-span-7",
  },
  {
    title: "Calendar planning",
    icon: CalendarClock,
    className: "lg:col-span-5",
  },
  {
    title: "Ops checklists",
    icon: ClipboardList,
    className: "lg:col-span-4",
  },
  {
    title: "Outreach drafts",
    icon: Send,
    className: "lg:col-span-4",
  },
  {
    title: "Research summaries",
    icon: SearchCheck,
    className: "lg:col-span-4",
  },
  {
    title: "Chat delegation",
    icon: MessageCircleMore,
    className: "lg:col-span-6",
  },
  {
    title: "Routine workflows",
    icon: Workflow,
    className: "lg:col-span-6",
  },
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
      <div className="mx-auto max-w-6xl space-y-6">
        <div
          id="use-cases"
          className={`relative overflow-hidden rounded-[28px] border border-border/50 bg-secondary/35 p-6 transition-all duration-700 md:p-8 lg:p-10 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "120ms" }}
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-foreground/[0.04] blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(249,188,116,0.18)_0%,rgba(249,188,116,0)_75%)] blur-3xl" />

          <div className="relative">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="type-nav text-muted-foreground">Use cases</p>
                <h3 className="type-h3 mt-2">
                  What you can use it for
                </h3>
              </div>
              <Link
                href="https://clawhub.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                Skills
              </Link>
            </div>

            <div className="grid auto-rows-[minmax(88px,_auto)] gap-3 sm:grid-cols-2 lg:grid-cols-12">
              {useCases.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-2xl border border-border/55 bg-background/75 p-4 transition-colors hover:bg-background/90 md:p-5 ${item.className}`}
                >
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/60">
                    <item.icon className="h-4.5 w-4.5 text-foreground/85" />
                  </div>
                  <h4 className="text-base font-semibold leading-snug tracking-tight text-foreground md:text-lg">
                    {item.title}
                  </h4>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
