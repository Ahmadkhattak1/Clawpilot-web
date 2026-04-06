import Image from "next/image"
import { PlugZap, Star, Users } from "lucide-react"

import {
  ClawContainer,
  ClawIconFrame,
  ClawSection,
} from "@/components/ui/clawpilot"

const socialProofStats = [
  { label: "GitHub stars", value: "191K+", icon: Star },
  { label: "contributors", value: "900+", icon: Users },
  { label: "integrations", value: "50+", icon: PlugZap },
]

export function SocialProof() {
  return (
    <ClawSection spacing="compact">
      <ClawContainer size="md" className="flex flex-col items-center gap-5 text-center">
        <p className="type-eyebrow">Powered by</p>
        <div className="flex items-center gap-3">
          <Image
            src="/pfp.png"
            alt="OpenClaw"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            OpenClaw
          </span>
        </div>
        <div className="flex flex-wrap items-stretch justify-center gap-3">
          {socialProofStats.map((stat) => {
            const Icon = stat.icon

            return (
              <div
                key={stat.label}
                className="flex min-w-[190px] items-center gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-left shadow-sm shadow-black/5"
              >
                <ClawIconFrame className="h-11 w-11 shrink-0 rounded-2xl bg-background/90">
                  <Icon aria-hidden="true" className="h-5 w-5 text-foreground/70" />
                </ClawIconFrame>
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {stat.value}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          OpenClaw is one of the fastest-growing open-source AI projects in the world.
          ClawPilot lets you run it without touching a terminal.
        </p>
      </ClawContainer>
    </ClawSection>
  )
}
