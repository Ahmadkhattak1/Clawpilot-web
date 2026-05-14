import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { RuntimeName } from "@/components/runtime-name"
import {
  ClawContainer,
  ClawSection,
  ClawSectionIntro,
  ClawSurface,
} from "@/components/ui/clawpilot"

const runtimeChoices = [
  {
    runtime: "openclaw" as const,
    bestFor: "Chat-channel automation, integrations, and personal assistant workflows.",
    details: "Start here when you want an agent connected to messages, tools, and everyday tasks.",
  },
  {
    runtime: "hermes" as const,
    bestFor: "Memory-heavy workflows, scheduled work, and terminal-backed automation.",
    details: "Start here when you want agents that keep context and improve across repeated work.",
  },
]

export function RuntimeChoice() {
  return (
    <ClawSection id="runtimes" spacing="compact">
      <ClawContainer size="lg">
        <ClawSectionIntro
          title="Choose your runtime"
          description="Host Openclaw or Hermes Agent on ClawPilot, then create as many agents and workflows as you need inside that runtime."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {runtimeChoices.map((choice) => (
            <ClawSurface key={choice.runtime} className="h-full">
              <h3 className="type-h3">
                <RuntimeName runtime={choice.runtime} />
              </h3>
              <p className="type-body-sm mt-3 font-medium text-foreground/85">
                {choice.bestFor}
              </p>
              <p className="type-body-sm mt-2">{choice.details}</p>
            </ClawSurface>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="#get-started"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-foreground/75"
          >
            Start with either runtime
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </ClawContainer>
    </ClawSection>
  )
}
