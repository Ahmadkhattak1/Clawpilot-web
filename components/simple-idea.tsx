"use client"

import Image from "next/image"
import { forwardRef, useRef, type ReactNode } from "react"
import { Inbox, ListTodo, UserRound } from "lucide-react"

import { AnimatedBeam } from "@/components/magicui/animated-beam"
import { cn } from "@/lib/utils"

const Node = forwardRef<
  HTMLDivElement,
  {
    className?: string
    title: string
    icon?: ReactNode
  }
>(({ className, title, icon }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative z-10 rounded-2xl border border-border/55 bg-background/90 px-3.5 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.05)]",
      className
    )}
  >
    <div className="flex items-center gap-3">
      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/60">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="text-sm font-semibold leading-snug tracking-tight md:text-base">{title}</p>
      </div>
    </div>
  </div>
))

Node.displayName = "Node"

/* shared beam styling */
const beamBase = {
  className: "hidden lg:block",
  pathWidth: 1.6,
  pathColor: "hsl(var(--foreground))",
  gradientStartColor: "#f9bc74",
  gradientStopColor: "#f97316",
} as const

export function SimpleIdea() {
  const containerRef = useRef<HTMLDivElement>(null)
  const youRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const openClawRef = useRef<HTMLDivElement>(null)

  // explicit ref per integration target
  const inboxRef = useRef<HTMLDivElement>(null)
  const whatsappRef = useRef<HTMLDivElement>(null)
  const telegramRef = useRef<HTMLDivElement>(null)
  const discordRef = useRef<HTMLDivElement>(null)
  const slackRef = useRef<HTMLDivElement>(null)
  const imessageRef = useRef<HTMLDivElement>(null)
  const routineRef = useRef<HTMLDivElement>(null)

  return (
    <section id="simple-idea" className="relative px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="type-nav text-muted-foreground">System flow</p>
          <h2 className="type-h2 mt-2">You -&gt; ClawPilot -&gt; OpenClaw</h2>
        </div>

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-[28px] border border-border/55 bg-gradient-to-b from-background to-secondary/35 p-6 md:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute -left-10 top-8 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(249,188,116,0.24)_0%,rgba(249,188,116,0)_75%)] blur-2xl" />
          <div className="pointer-events-none absolute -right-16 bottom-4 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(249,188,116,0.2)_0%,rgba(249,188,116,0)_75%)] blur-3xl" />

          <div className="relative grid gap-4 lg:grid-cols-[0.48fr_0.65fr_0.75fr_1.25fr] lg:items-center lg:gap-7">
            <Node
              ref={youRef}
              title="You"
              icon={<UserRound className="h-4.5 w-4.5 text-foreground/85" />}
              className="mx-auto w-full max-w-[170px]"
            />

            <Node
              ref={layerRef}
              title="ClawPilot"
              icon={
                <Image
                  src="/logo.webp"
                  alt="ClawPilot logo"
                  width={22}
                  height={22}
                  className="h-[22px] w-[22px] object-contain"
                />
              }
              className="mx-auto w-full max-w-[185px]"
            />

            <Node
              ref={openClawRef}
              title="OpenClaw"
              icon={
                <Image
                  src="/waving.svg"
                  alt="OpenClaw mascot"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
              }
              className="mx-auto w-full max-w-[190px] border-foreground/15 bg-background"
            />

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 lg:justify-items-start">
              <Node ref={inboxRef} title="Inbox" icon={<Inbox className="h-4.5 w-4.5 text-foreground/85" />} className="w-full lg:max-w-[340px]" />
              <Node ref={whatsappRef} title="WhatsApp" icon={<Image src="/integrations/whatsapp.svg" alt="WhatsApp" width={20} height={20} className="h-5 w-5 object-contain" />} className="w-full lg:max-w-[340px]" />
              <Node ref={telegramRef} title="Telegram" icon={<Image src="/integrations/telegram.svg" alt="Telegram" width={20} height={20} className="h-5 w-5 object-contain" />} className="w-full lg:max-w-[340px]" />
              <Node ref={discordRef} title="Discord" icon={<Image src="/integrations/discord.svg" alt="Discord" width={20} height={20} className="h-5 w-5 object-contain" />} className="w-full lg:max-w-[340px]" />
              <Node ref={slackRef} title="Slack" icon={<Image src="/integrations/Slack.svg" alt="Slack" width={20} height={20} className="h-5 w-5 object-contain" />} className="w-full lg:max-w-[340px]" />
              <Node ref={imessageRef} title="iMessage" icon={<Image src="/integrations/imessage.svg" alt="iMessage" width={20} height={20} className="h-5 w-5 object-contain" />} className="w-full lg:max-w-[340px]" />
              <Node ref={routineRef} title="Routine tasks" icon={<ListTodo className="h-4.5 w-4.5 text-foreground/85" />} className="w-full lg:max-w-[340px]" />
            </div>
          </div>

          {/* ── Beam: You → ClawPilot ── */}
          <AnimatedBeam
            {...beamBase}
            containerRef={containerRef}
            fromRef={youRef}
            toRef={layerRef}
            duration={3.8}
            curvature={0}
            fromAnchorX="right"
            toAnchorX="left"
            pathOpacity={0.18}
          />

          {/* ── Beam: ClawPilot → OpenClaw ── */}
          <AnimatedBeam
            {...beamBase}
            containerRef={containerRef}
            fromRef={layerRef}
            toRef={openClawRef}
            duration={3.75}
            curvature={0}
            fromAnchorX="right"
            toAnchorX="left"
            pathOpacity={0.16}
          />

          {/* ── Beams: OpenClaw → integrations (fanned evenly) ── */}
          <AnimatedBeam
            {...beamBase}
            containerRef={containerRef}
            fromRef={openClawRef}
            toRef={inboxRef}
            duration={3.4}
            delay={0}
            curvature={-36}
            fromAnchorX="right"
            toAnchorX="left"
            pathOpacity={0.14}
          />
          <AnimatedBeam
            {...beamBase}
            containerRef={containerRef}
            fromRef={openClawRef}
            toRef={whatsappRef}
            duration={3.4}
            delay={0.12}
            curvature={-24}
            fromAnchorX="right"
            toAnchorX="left"
            pathOpacity={0.14}
          />
          <AnimatedBeam
            {...beamBase}
            containerRef={containerRef}
            fromRef={openClawRef}
            toRef={telegramRef}
            duration={3.4}
            delay={0.24}
            curvature={-12}
            fromAnchorX="right"
            toAnchorX="left"
            pathOpacity={0.14}
          />
          <AnimatedBeam
            {...beamBase}
            containerRef={containerRef}
            fromRef={openClawRef}
            toRef={discordRef}
            duration={3.4}
            delay={0.36}
            curvature={0}
            fromAnchorX="right"
            toAnchorX="left"
            pathOpacity={0.14}
          />
          <AnimatedBeam
            {...beamBase}
            containerRef={containerRef}
            fromRef={openClawRef}
            toRef={slackRef}
            duration={3.4}
            delay={0.48}
            curvature={12}
            fromAnchorX="right"
            toAnchorX="left"
            pathOpacity={0.14}
          />
          <AnimatedBeam
            {...beamBase}
            containerRef={containerRef}
            fromRef={openClawRef}
            toRef={imessageRef}
            duration={3.4}
            delay={0.60}
            curvature={24}
            fromAnchorX="right"
            toAnchorX="left"
            pathOpacity={0.14}
          />
          <AnimatedBeam
            {...beamBase}
            containerRef={containerRef}
            fromRef={openClawRef}
            toRef={routineRef}
            duration={3.4}
            delay={0.72}
            curvature={36}
            fromAnchorX="right"
            toAnchorX="left"
            pathOpacity={0.14}
          />
        </div>
      </div>
    </section>
  )
}
