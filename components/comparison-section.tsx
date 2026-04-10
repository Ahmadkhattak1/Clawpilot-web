import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Clock3,
  Download,
  Monitor,
  ShieldCheck,
  Sparkles,
  Wallet,
  Wrench,
} from "lucide-react"

import {
  ClawContainer,
  ClawIconFrame,
  ClawSection,
} from "@/components/ui/clawpilot"

const comparisonRows = [
  {
    icon: Download,
    label: "Setup",
    local: "Manual install and configuration.",
    clawpilot: "One-click OpenClaw install.",
  },
  {
    icon: Clock3,
    label: "Accessible anytime",
    local: "Your machine needs to stay online.",
    clawpilot: "Use it without keeping your machine online.",
  },
  {
    icon: Wrench,
    label: "Maintenance",
    local: "You handle setup and hosting.",
    clawpilot: "ClawPilot handles setup and hosting.",
  },
  {
    icon: ShieldCheck,
    label: "Privacy",
    local: "Private to your own machine.",
    clawpilot: "Private to you.",
  },
  {
    icon: Sparkles,
    label: "Ease of use",
    local: "Terminal, config, and manual setup.",
    clawpilot: "Clean interface. No terminal.",
  },
  {
    icon: Wallet,
    label: "Upfront cost",
    local: "High upfront cost.",
    clawpilot: "No upfront cost.",
  },
] as const

export function ComparisonSection() {
  return (
    <ClawSection id="why-clawpilot">
      <ClawContainer size="lg">
        <div className="text-center">
          <h2 className="type-h2">
            <span className="inline-flex flex-wrap items-center justify-center gap-3 text-center">
              <span className="inline-flex items-center gap-2">
                <Monitor aria-hidden="true" className="h-6 w-6 text-foreground/70" />
                <span>Local setup</span>
              </span>
              <span className="text-muted-foreground/70">vs</span>
              <span className="inline-flex items-center gap-2">
                <Image
                  src="/logo.webp"
                  alt=""
                  aria-hidden="true"
                  width={26}
                  height={26}
                  className="h-[26px] w-[26px] object-contain"
                />
                <span>ClawPilot</span>
              </span>
            </span>
          </h2>
        </div>

        <div className="mt-10 overflow-hidden rounded-[28px] border border-border/60 bg-card/50">
          <div className="hidden border-b border-border/50 md:grid md:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="px-5 py-4" />
            <div className="border-l border-border/50 bg-secondary/45 px-5 py-4 text-center">
              <div className="inline-flex items-center gap-2 text-foreground/70">
                <Monitor aria-hidden="true" className="h-4 w-4" />
                <span className="text-[11px] font-medium uppercase tracking-[0.24em]">
                  Local setup
                </span>
              </div>
            </div>
            <div className="border-l border-[rgba(179,33,40,0.12)] bg-[rgba(179,33,40,0.035)] px-5 py-4 text-center">
              <div className="inline-flex items-center gap-2 text-[#8d3a40]">
                <Image
                  src="/logo.webp"
                  alt=""
                  aria-hidden="true"
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] object-contain"
                />
                <span className="text-[11px] font-medium uppercase tracking-[0.24em]">
                  ClawPilot
                </span>
              </div>
            </div>
          </div>

          {comparisonRows.map((row, index) => {
            const Icon = row.icon
            const isTintedRow = index % 2 === 1

            return (
              <div
                key={row.label}
                className="grid md:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]"
              >
                <div
                  className={`flex items-center gap-3 px-4 py-4 md:px-5 ${isTintedRow ? "bg-card/72" : "bg-background/72"} ${index > 0 ? "border-t border-border/40" : ""}`}
                >
                  <ClawIconFrame className="h-11 w-11 shrink-0 rounded-2xl border-border/60 bg-background/92">
                    <Icon aria-hidden="true" className="h-5 w-5 text-foreground/70" />
                  </ClawIconFrame>
                  <span className="text-sm font-semibold tracking-tight text-foreground/90 sm:text-[15px]">
                    {row.label}
                  </span>
                </div>

                <div
                  className={`flex flex-col items-start justify-center border-border/50 px-4 py-4 md:border-l md:px-5 ${isTintedRow ? "bg-secondary/62" : "bg-secondary/48"} ${index > 0 ? "border-t border-border/40" : ""}`}
                >
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-[11px] font-medium tracking-tight text-muted-foreground md:hidden">
                    <Monitor aria-hidden="true" className="h-3.5 w-3.5" />
                    Local setup
                  </span>
                  <p className="text-sm font-medium leading-snug text-foreground/78 sm:text-[15px]">
                    {row.local}
                  </p>
                </div>

                <div
                  className={`flex flex-col items-start justify-center border-[rgba(179,33,40,0.12)] px-4 py-4 md:border-l md:px-5 ${isTintedRow ? "bg-[rgba(179,33,40,0.06)]" : "bg-[rgba(179,33,40,0.035)]"} ${index > 0 ? "border-t border-border/40 md:border-t-[rgba(179,33,40,0.12)]" : ""}`}
                >
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[rgba(179,33,40,0.11)] px-2.5 py-1 text-[11px] font-medium tracking-tight text-[#8d3a40] md:hidden">
                    <Image
                      src="/logo.webp"
                      alt=""
                      aria-hidden="true"
                      width={14}
                      height={14}
                      className="h-3.5 w-3.5 object-contain"
                    />
                    ClawPilot
                  </span>
                  <p className="text-sm font-medium leading-snug text-foreground sm:text-[15px]">
                    {row.clawpilot}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="#get-started"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-foreground/75"
          >
            Start with Google
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </ClawContainer>
    </ClawSection>
  )
}
