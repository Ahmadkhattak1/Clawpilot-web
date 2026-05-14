"use client"

import Link from "next/link"
import { X } from "lucide-react"
import { useState } from "react"

export function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] border-b border-border/50 bg-background/95 px-4 py-2 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 pr-8 text-center text-sm text-foreground">
        <span>Hermes agent deployment is now supported!</span>
        <Link
          href="#get-started"
          className="font-medium underline underline-offset-4 transition-colors hover:text-foreground/75"
        >
          Try it
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
