import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/40 py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="ClawPilot Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-display text-[14px] font-semibold ml-1">ClawPilot</span>
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
