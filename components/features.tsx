import { Cloud, Clock, Zap } from "lucide-react"

import {
  ClawContainer,
  ClawIconFrame,
  ClawSection,
  ClawSectionIntro,
  ClawSurface,
} from "@/components/ui/clawpilot"

const features = [
  {
    icon: Cloud,
    title: "Your own private instance",
    description:
      "A dedicated OpenClaw server, fully isolated. Your data, your keys, your rules. Nothing shared.",
  },
  {
    icon: Clock,
    title: "Always on",
    description:
      "Runs 24/7 in the cloud. No laptop to keep open, no Raspberry Pi to babysit. It just works.",
  },
  {
    icon: Zap,
    title: "Minutes, not days",
    description:
      "Skip the VPS, Docker, Node.js, and config files. Sign up, and your OpenClaw is live.",
  },
]

export function Features() {
  return (
    <ClawSection id="why-clawpilot">
      <ClawContainer size="lg">
        <ClawSectionIntro
          description="All the power of OpenClaw. None of the server work."
          title="Why ClawPilot"
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <ClawSurface key={feature.title} className="h-full">
              <ClawIconFrame>
                <feature.icon className="h-5 w-5 text-foreground/70" />
              </ClawIconFrame>
              <h3 className="type-h4 mt-4">{feature.title}</h3>
              <p className="type-body-sm mt-2">{feature.description}</p>
            </ClawSurface>
          ))}
        </div>
      </ClawContainer>
    </ClawSection>
  )
}
