import Image from "next/image"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type RuntimeKind = "openclaw" | "hermes"

const runtimeConfig: Record<RuntimeKind, { label: string; logo: string }> = {
  openclaw: {
    label: "Openclaw",
    logo: "/pfp.png",
  },
  hermes: {
    label: "Hermes Agent",
    logo: "/hermesagentlogo.webp",
  },
}

export function RuntimeLogo({
  className,
  runtime,
}: {
  className?: string
  runtime: RuntimeKind
}) {
  const config = runtimeConfig[runtime]

  return (
    <span
      className={cn(
        "relative inline-flex h-[1em] w-[1em] shrink-0 items-center justify-center rounded-[0.24em] border border-black/10 bg-white p-[0.12em] align-middle shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src={config.logo}
        alt=""
        width={64}
        height={64}
        className="m-auto block h-full w-full object-contain object-center"
      />
    </span>
  )
}

export function RuntimeName({
  className,
  runtime,
}: {
  className?: string
  runtime: RuntimeKind
}) {
  const config = runtimeConfig[runtime]

  return (
    <span className={cn("inline-flex items-baseline gap-[0.22em] whitespace-nowrap", className)}>
      <span>{config.label}</span>
      <RuntimeLogo runtime={runtime} />
    </span>
  )
}

export function renderRuntimeText(text: string): ReactNode {
  const parts = text.split(/(Hermes Agent|Openclaw)/g)

  return parts.map((part, index) => {
    if (part === "Openclaw") {
      return <RuntimeName key={`${part}-${index}`} runtime="openclaw" />
    }

    if (part === "Hermes Agent") {
      return <RuntimeName key={`${part}-${index}`} runtime="hermes" />
    }

    return part
  })
}
