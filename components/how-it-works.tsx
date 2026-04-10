import Link from "next/link"
import { ArrowRight } from "lucide-react"

import {
  ClawContainer,
  ClawSection,
  ClawSectionIntro,
  ClawSurface,
} from "@/components/ui/clawpilot"

const steps = [
  {
    number: "1",
    title: "Sign up",
    description: "Create your account with Google. Takes 10 seconds.",
  },
  {
    number: "2",
    title: "We deploy your OpenClaw",
    description: "A private instance is provisioned on dedicated cloud infrastructure.",
  },
  {
    number: "3",
    title: "Start using it",
    description:
      "Connect your chat apps, bring your API keys, and let your AI assistant get to work.",
  },
]

export function HowItWorks() {
  return (
    <ClawSection id="how-it-works">
      <ClawContainer size="md">
        <ClawSectionIntro title="How It Works" />

        <div className="mt-10 space-y-3">
          {steps.map((step) => (
            <ClawSurface
              key={step.number}
              className="flex items-start gap-4"
              padding="md"
              radius="lg"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {step.number}
              </span>
              <div className="min-w-0">
                <p className="type-h4">{step.title}</p>
                <p className="type-body-sm mt-1">{step.description}</p>
              </div>
            </ClawSurface>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          No Docker. No terminal. No DevOps experience needed.
        </p>

        <div className="mt-4 flex justify-center">
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
