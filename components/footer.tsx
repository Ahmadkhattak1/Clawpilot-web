import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/40 py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-3.5 h-3.5 text-background"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-display text-[14px] font-semibold">ClawPilot</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6 text-[13px] text-muted-foreground">
          <Link
            href="https://openclaw.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Documentation
          </Link>
          <Link
            href="https://openclaw.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            OpenClaw
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-[13px] text-muted-foreground">
          Built with OpenClaw
        </p>
      </div>
    </footer>
  )
}
