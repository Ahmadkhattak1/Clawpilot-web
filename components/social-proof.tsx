import Image from "next/image"

import {
  ClawContainer,
  ClawSection,
  ClawStat,
} from "@/components/ui/clawpilot"

export function SocialProof() {
  return (
    <ClawSection spacing="compact">
      <ClawContainer size="md" className="flex flex-col items-center gap-5 text-center">
        <p className="type-eyebrow">Powered by</p>
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="OpenClaw"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            OpenClaw
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <ClawStat label="GitHub stars" value="191K+" />
          <div className="hidden h-3.5 w-px bg-border/60 sm:block" />
          <ClawStat label="contributors" value="900+" />
          <div className="hidden h-3.5 w-px bg-border/60 sm:block" />
          <ClawStat label="integrations" value="50+" />
        </div>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          OpenClaw is one of the fastest-growing open-source AI projects in the world.
          ClawPilot lets you run it without touching a terminal.
        </p>
      </ClawContainer>
    </ClawSection>
  )
}
