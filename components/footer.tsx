import Image from "next/image"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/40 py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-10 w-10 overflow-hidden rounded-md flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="ClawPilot mascot"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="type-brand ml-1">ClawPilot</span>
        </Link>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground">
          <Link
            href="#home"
            className="type-nav transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="#agents"
            className="type-nav transition-colors hover:text-foreground"
          >
            Agents
          </Link>
          <Link
            href="#why-clawpilot"
            className="type-nav transition-colors hover:text-foreground"
          >
            Why Clawpilot
          </Link>
          <Link
            href="#how-it-works"
            className="type-nav transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="/terms"
            className="type-nav transition-colors hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="type-nav transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/disclaimer"
            className="type-nav transition-colors hover:text-foreground"
          >
            Disclaimer
          </Link>
        </div>

        {/* Copyright */}
        <div className="flex items-center gap-2">
          <p className="type-nav text-muted-foreground">
            Made with OpenClaw
          </p>
          <Image
            src="/logo.svg"
            alt="OpenClaw mascot"
            width={40}
            height={40}
            className="-translate-y-1 h-10 w-10 object-contain"
          />
        </div>
      </div>
    </footer>
  )
}
