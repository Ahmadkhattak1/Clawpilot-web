import Link from "next/link"

import {
  ClawContainer,
  ClawSection,
  ClawSectionIntro,
  clawSurfaceClassName,
} from "@/components/ui/clawpilot"
import { marketingLandingPages } from "@/lib/landing-pages"

const landingHubCardCopy: Record<
  string,
  {
    title: string
    description: string
    cta: string
  }
> = {
  "ai-agent-hosting": {
    title: "Host Openclaw or Hermes Agent",
    description:
      "Choose a runtime, create multiple agents, and keep them running away from your personal device.",
    cta: "Compare runtimes",
  },
  "openclaw-hosting": {
    title: "Launch Openclaw Fast Without Managing Servers",
    description:
      "Get a private cloud setup that stays online and stable, so your team can focus on live workflows instead of infrastructure.",
    cta: "See hosting options",
  },
  "managed-openclaw": {
    title: "Scale Operations With Managed Openclaw",
    description:
      "Choose a managed runtime when you want predictable uptime, fewer incidents, and less weekly maintenance overhead.",
    cta: "Compare managed benefits",
  },
  "openclaw-vps-hosting": {
    title: "VPS or Managed: Pick the Lower-Risk Path",
    description:
      "Use a side-by-side framework to decide if your team should own server operations or move faster with managed hosting.",
    cta: "View the decision guide",
  },
  "openclaw-whatsapp-automation": {
    title: "Run WhatsApp Automation Reliably in the Cloud",
    description:
      "Keep customer conversations running with a hosted setup built for consistent multi-channel workflow delivery.",
    cta: "Explore WhatsApp deployment",
  },
  "hermes-agent-hosting": {
    title: "Run Hermes Agent Without VPS Work",
    description:
      "Use a hosted Hermes Agent runtime for persistent workflows, memory, tools, and always-on execution.",
    cta: "Explore Hermes hosting",
  },
  "managed-hermes-agent": {
    title: "Use Managed Hermes Agent",
    description:
      "Keep the runtime online and isolated while your team focuses on skills, tools, and workflow quality.",
    cta: "See managed benefits",
  },
  "hermes-agent-vps-hosting": {
    title: "Hermes VPS or Managed Hosting",
    description:
      "Compare server ownership with a managed path before turning Hermes Agent into an ops project.",
    cta: "View the comparison",
  },
}

export function LandingPagesHub() {
  return (
    <ClawSection>
      <ClawContainer size="xl">
        <ClawSectionIntro
          description="Compare deployment options in minutes and move forward with the best mix of speed, reliability, and control."
          title="Choose the Right Agent Runtime Setup"
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {marketingLandingPages.map((page) => {
            const cardCopy = landingHubCardCopy[page.slug]

            return (
              <Link
                key={page.path}
                href={page.path}
                className={clawSurfaceClassName({
                  interactive: true,
                  padding: "lg",
                  radius: "xl",
                  tone: "frosted",
                })}
              >
                <p className="text-[15px] font-semibold text-foreground">
                  {cardCopy?.title ?? page.headline}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {cardCopy?.description ?? page.metaDescription}
                </p>
                <p className="mt-4 text-sm font-medium text-foreground">
                  {cardCopy?.cta ?? "Read the guide"}{" "}
                  <span aria-hidden className="text-foreground/70">
                    &rarr;
                  </span>
                </p>
              </Link>
            )
          })}
        </div>
      </ClawContainer>
    </ClawSection>
  )
}
