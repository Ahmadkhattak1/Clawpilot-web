import Image from "next/image"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/40 px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.webp"
            alt="ClawPilot"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <span className="type-brand">ClawPilot</span>
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-muted-foreground">
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

        <p className="type-nav text-muted-foreground/60">
          Built on OpenClaw
        </p>
      </div>
    </footer>
  )
}
