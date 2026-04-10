import Link from "next/link"
import Image from "next/image"
import { ArrowRight, PlugZap, Star, Users } from "lucide-react"

import {
  ClawContainer,
  ClawIconFrame,
  ClawSection,
} from "@/components/ui/clawpilot"

const socialProofStats = [
  { label: "GitHub stars", value: "354K+", icon: Star },
  { label: "contributors", value: "900+", icon: Users },
  { label: "integrations", value: "50+", icon: PlugZap },
]

export function ProductShowcase() {
  return (
    <ClawSection spacing="compact" className="overflow-hidden pt-2 md:pt-6">
      <ClawContainer size="xl" className="flex flex-col items-center">
        <div className="mb-8 flex flex-col items-center gap-5 text-center md:mb-10">
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
        </div>

        <div className="relative mx-auto w-full max-w-[1120px] pb-5 sm:pb-6 md:pb-8">
          <div className="relative z-10 rounded-[26px] bg-gradient-to-b from-[#7a7a7a] via-[#404040] to-[#1b1b1b] p-[3px] shadow-[0_40px_90px_-38px_rgba(0,0,0,0.5)] md:rounded-[32px]">
            <div className="rounded-[23px] bg-gradient-to-b from-[#2a2a2a] to-[#111111] p-[5px] md:rounded-[29px] md:p-[6px]">
              <div className="relative overflow-hidden rounded-[20px] bg-black md:rounded-[24px]">
                <div className="absolute left-1/2 top-2 z-20 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/20 md:top-2.5" />

                <div className="relative aspect-[3/2] w-full">
                  <Image
                    src="/site-images/screenshot_1.png"
                    alt="ClawPilot launch interface"
                    fill
                    sizes="(min-width: 1280px) 1120px, 92vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-full h-4 w-[118%] -translate-x-1/2 -translate-y-[110%] rounded-b-[999px] bg-gradient-to-b from-[#ededed] via-[#d7d7d7] to-[#afafaf] shadow-[0_18px_30px_-22px_rgba(0,0,0,0.5)] sm:h-5 md:h-6 md:w-[120%]" />
        </div>

        <div className="mt-8 flex flex-wrap items-stretch justify-center gap-3">
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

        <p className="mt-5 max-w-lg text-center text-sm leading-relaxed text-muted-foreground">
          OpenClaw is one of the fastest-growing open-source AI projects in the world.
          ClawPilot lets you run it without touching a terminal.
        </p>

        <Link
          href="#get-started"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-foreground/75"
        >
          Launch your own
          <ArrowRight className="h-4 w-4" />
        </Link>
      </ClawContainer>
    </ClawSection>
  )
}
