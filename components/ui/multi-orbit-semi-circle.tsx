"use client"

import React, { useEffect, useState } from "react"
import { MicrosoftTeamsLogo } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

type Integration = {
  name: string
  src?: string
  renderIcon?: () => React.ReactNode
}

const INTEGRATIONS: Integration[] = [
  { name: "WhatsApp", src: "/integrations/whatsapp.svg" },
  { name: "Telegram", src: "/integrations/telegram.svg" },
  { name: "Discord", src: "/integrations/discord.svg" },
  { name: "Slack", src: "/integrations/slack.svg" },
  { name: "Google Chat", src: "/integrations/googlechat.svg" },
  { name: "Signal", src: "/integrations/signal.svg" },
  { name: "iMessage", src: "/integrations/apple.svg" },
  {
    name: "Microsoft Teams",
    renderIcon: () => (
      <MicrosoftTeamsLogo className="h-[68%] w-[68%] text-[#5B5FC7]" weight="fill" />
    ),
  },
  { name: "LINE", src: "/integrations/line.svg" },
  { name: "Matrix", src: "/integrations/matrix.svg" },
  { name: "Mattermost", src: "/integrations/mattermost.svg" },
  { name: "Twitch", src: "/integrations/twitch.svg" },
  { name: "Zalo", src: "/integrations/zalo.svg" },
  { name: "WebChat", src: "/logo.png" },
]

type SemiCircleOrbitProps = {
  radius: number
  centerX: number
  centerY: number
  count: number
  iconSize: number
  offset: number
}

function SemiCircleOrbit({
  radius,
  centerX,
  centerY,
  count,
  iconSize,
  offset,
}: SemiCircleOrbitProps) {
  return (
    <>
      <div className="absolute inset-0 flex justify-center">
        <div
          className="
            w-[1000px] h-[1000px] rounded-full
            bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.2),transparent_70%)]
            dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_70%)]
            blur-3xl
            -mt-40
            pointer-events-none
          "
          style={{ zIndex: 0 }}
        />
      </div>

      {Array.from({ length: count }).map((_, index) => {
        const angle = (index / (count - 1)) * 180
        const x = radius * Math.cos((angle * Math.PI) / 180)
        const y = radius * Math.sin((angle * Math.PI) / 180)
        const integration = INTEGRATIONS[(index + offset) % INTEGRATIONS.length]
        const tooltipAbove = angle > 90

        return (
          <div
            key={`${integration.name}-${index}-${radius}`}
            className="absolute flex flex-col items-center group"
            style={{
              left: `${centerX + x - iconSize / 2}px`,
              top: `${centerY - y - iconSize / 2}px`,
              zIndex: 5,
            }}
          >
            <div
              className={cn(
                "flex items-center justify-center rounded-2xl border border-border/60 bg-background/95 shadow-sm",
                "transition-transform hover:scale-110"
              )}
              style={{ width: iconSize, height: iconSize, minWidth: iconSize, minHeight: iconSize }}
            >
              {integration.src ? (
                <img
                  src={integration.src}
                  alt={integration.name}
                  width={Math.round(iconSize * 0.66)}
                  height={Math.round(iconSize * 0.66)}
                  className="object-contain"
                />
              ) : (
                integration.renderIcon?.()
              )}
            </div>

            <div
              className={cn(
                "absolute hidden group-hover:block w-32 rounded-lg bg-black px-2 py-1.5 text-xs text-white shadow-lg text-center",
                tooltipAbove ? "bottom-[calc(100%+10px)]" : "top-[calc(100%+10px)]"
              )}
            >
              {integration.name}
              <div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-black",
                  tooltipAbove ? "top-full" : "bottom-full"
                )}
              />
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function MultiOrbitSemiCircle() {
  const [size, setSize] = useState({ width: 1280, height: 720 })

  useEffect(() => {
    const updateSize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight })

    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  const baseWidth = Math.min(Math.max(size.width * 0.82, 340), 820)
  const centerX = baseWidth / 2
  const centerY = baseWidth * 0.52

  const iconSize =
    size.width < 480
      ? Math.max(28, baseWidth * 0.11)
      : size.width < 768
        ? Math.max(34, baseWidth * 0.095)
        : Math.max(40, baseWidth * 0.085)

  return (
    <section id="channels" className="relative w-full overflow-hidden py-16 md:py-20">
      <div className="relative flex flex-col items-center text-center z-10 px-6">
        <h2 className="type-h2 my-4">
          OpenClaw Integrations
        </h2>
        <p className="type-body mb-12 max-w-2xl">
          Connect OpenClaw to channels and tools you already use: messaging apps, team chat,
          and web interfaces.
        </p>

        <div className="relative" style={{ width: baseWidth, height: baseWidth * 0.62 }}>
          <SemiCircleOrbit
            radius={baseWidth * 0.22}
            centerX={centerX}
            centerY={centerY}
            count={6}
            iconSize={iconSize}
            offset={0}
          />
          <SemiCircleOrbit
            radius={baseWidth * 0.36}
            centerX={centerX}
            centerY={centerY}
            count={8}
            iconSize={iconSize}
            offset={3}
          />
          <SemiCircleOrbit
            radius={baseWidth * 0.5}
            centerX={centerX}
            centerY={centerY}
            count={10}
            iconSize={iconSize}
            offset={6}
          />
        </div>
      </div>
    </section>
  )
}
