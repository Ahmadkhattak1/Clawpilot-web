import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/40 py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center">
            <img
              src="/logo.png"
              alt="ClawPilot Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="type-brand ml-1">ClawPilot</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6 text-muted-foreground">
          <Link
            href="#faq"
            className="type-nav transition-colors hover:text-foreground"
          >
            FAQ
          </Link>
          <Link
            href="https://openclaw.io"
            target="_blank"
            rel="noopener noreferrer"
            className="type-nav transition-colors hover:text-foreground"
          >
            OpenClaw
          </Link>
          <Link
            href="https://clawhub.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="type-nav transition-colors hover:text-foreground"
          >
            Clawhub
          </Link>
        </div>

        {/* Copyright */}
        <p className="type-nav text-muted-foreground">
          Hosted with ClawPilot
        </p>
      </div>
    </footer>
  )
}
