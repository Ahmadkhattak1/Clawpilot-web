import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import {
  ClawContainer,
  ClawSection,
} from "@/components/ui/clawpilot"

export function IsolationSection() {
  return (
    <ClawSection spacing="compact">
      <ClawContainer size="xl">
        <div className="grid items-center gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="type-eyebrow">Isolated by default</p>
            <h2 className="type-h2 mt-4">Keep agents away from your personal devices.</h2>
            <p className="type-body mt-4 max-w-xl">
              ClawPilot runs your agent runtime in a managed cloud environment, separate from your laptop,
              local files, browser sessions, and personal credentials.
            </p>
            <Link
              href="#comparison"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-foreground/75"
            >
              Compare with self-hosting
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm shadow-black/5">
            <Image
              src="/site-images/isolated-environment.webp"
              alt="Agent runtimes isolated from personal files and devices"
              fill
              sizes="(min-width: 1024px) 520px, 92vw"
              className="object-cover"
            />
          </div>
        </div>
      </ClawContainer>
    </ClawSection>
  )
}
