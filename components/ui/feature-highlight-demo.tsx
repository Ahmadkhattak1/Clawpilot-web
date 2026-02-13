"use client"

import {
  CheckCircle2,
  Nfc,
  WalletCards,
} from "lucide-react"
import { FeatureHighlight } from "@/components/ui/feature-highlight"

const InlineIcon = ({ src, alt }: { src: string; alt: string }) => (
  <img
    src={src}
    alt={alt}
    className="mx-1 inline-block h-6 w-6 rounded-sm object-cover align-middle"
  />
)

export default function FeatureHighlightDemo() {
  const features = [
    <>
      Drop a request in
      <InlineIcon
        src="https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=64&q=80"
        alt="Chat window"
      />
      chat.
    </>,
    <>
      ClawPilot breaks it into
      <InlineIcon
        src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=64&q=80"
        alt="Task plan"
      />
      clear steps.
    </>,
    <>
      It works across your
      <InlineIcon
        src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=64&q=80"
        alt="Connected tools"
      />
      connected tools.
    </>,
    <>
      You approve anything
      <InlineIcon
        src="https://images.unsplash.com/photo-1633265486064-086b219458ec?auto=format&fit=crop&w=64&q=80"
        alt="Secure approval"
      />
      sensitive.
    </>,
    <>
      It ships updates,
      <InlineIcon
        src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=64&q=80"
        alt="Delivery updates"
      />
      summaries, and follow-ups.
    </>,
    <>
      Reuse it for support
      <InlineIcon
        src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=64&q=80"
        alt="Support workflows"
      />
      ops and internal tasks.
    </>,
  ]

  const footer = (
    <p className="pt-2 text-xl text-muted-foreground md:text-2xl">
      Keep control with
      <WalletCards className="mx-1 inline-block h-6 w-6 align-middle" />
      permissions and
      <Nfc className="mx-1 inline-block h-6 w-6 align-middle" />
      approvals.
    </p>
  )

  return (
    <div className="flex h-full w-full items-center justify-center rounded-2xl border border-border/50 bg-background/70 p-4 shadow-sm backdrop-blur-sm md:p-8">
      <FeatureHighlight
        icon={
          <CheckCircle2 className="h-10 w-10 rounded-full bg-blue-500 p-1 text-white" />
        }
        title="Simple idea. Real work done."
        features={features}
        footer={footer}
      />
    </div>
  )
}
