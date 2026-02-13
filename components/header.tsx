"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? "bg-background/90 backdrop-blur-xl border-b border-border/40"
        : "bg-transparent"
        }`}
    >
      <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md overflow-hidden flex items-center justify-center">
            <img
              src="/logo.png"
              alt="ClawPilot Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="type-brand ml-1">ClawPilot</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link
            href="#simple-idea"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Idea
          </Link>
          <Link
            href="#use-cases"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Use cases
          </Link>
          <Link
            href="#channels"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Channels
          </Link>
          <Link
            href="#benefits"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Benefits
          </Link>
          <Link
            href="#control"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            Control
          </Link>
          <Link
            href="#how-it-works"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            href="#faq"
            className="type-nav text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </Link>
        </div>

        <Link
          href="#hero-waitlist-email"
          className="type-nav rounded-lg bg-foreground px-3 py-1.5 text-background"
        >
          Create account
        </Link>
      </nav>
    </header>
  )
}
