import type { Metadata } from "next"

import { siteName } from "@/lib/site"

export type LandingPageLink = {
  href: string
  label: string
  description: string
}

export type LandingValueProp = {
  title: string
  description: string
}

export type LandingComparisonRow = {
  category: string
  managed: string
  selfHosted: string
}

export type LandingFaqItem = {
  question: string
  answer: string
}

export type LandingPageConfig = {
  slug: string
  path: string
  metaTitle: string
  metaDescription: string
  headline: string
  subheadline: string
  searchIntentLabel: string
  primaryKeyword: string
  keywords: string[]
  heroPoints: string[]
  valueProps: LandingValueProp[]
  fitChecklist: string[]
  channelNotes: string[]
  comparisonRows: LandingComparisonRow[]
  faq: LandingFaqItem[]
  relatedLinks: LandingPageLink[]
}

const sharedRelatedLinks: LandingPageLink[] = [
  {
    href: "/blog/what-is-openclaw-hosting-2026",
    label: "OpenClaw Hosting Guide",
    description: "Understand deployment models, hidden costs, and team-fit signals.",
  },
  {
    href: "/blog/managed-openclaw-vs-self-hosted-openclaw",
    label: "Managed vs Self-Hosted",
    description: "Compare cost, risk, and operations ownership side by side.",
  },
  {
    href: "/blog/openclaw-vps-vs-managed-hosting",
    label: "VPS vs Managed",
    description: "Use a practical framework to decide when VPS is worth the overhead.",
  },
]

export const openclawHostingLandingPage: LandingPageConfig = {
  slug: "openclaw-hosting",
  path: "/openclaw-hosting",
  metaTitle: "OpenClaw Hosting | Private Managed OpenClaw in the Cloud",
  metaDescription:
    "Run OpenClaw in the cloud with a private, always-on managed environment. Skip server setup and focus on outcomes.",
  headline: "OpenClaw hosting built for reliable day-to-day operations",
  subheadline:
    "ClawPilot gives your team a private OpenClaw environment that stays online, gets updated safely, and removes infrastructure maintenance from your weekly workload.",
  searchIntentLabel: "Deployment Intent: openclaw hosting",
  primaryKeyword: "openclaw hosting",
  keywords: [
    "openclaw hosting",
    "hosted openclaw",
    "openclaw cloud hosting",
    "private openclaw instance",
    "openclaw managed hosting",
  ],
  heroPoints: [
    "Private OpenClaw instance with isolated runtime ownership.",
    "Managed uptime, patching, and deployment maintenance.",
    "Launch in minutes without Docker, VPS, or terminal setup.",
  ],
  valueProps: [
    {
      title: "Operational consistency",
      description:
        "Avoid local machine interruptions and ad-hoc restarts by running OpenClaw in a stable cloud environment.",
    },
    {
      title: "Faster team adoption",
      description:
        "Give support, sales, and operations teams a predictable setup path that does not depend on infrastructure specialists.",
    },
    {
      title: "Lower hidden labor cost",
      description:
        "Reduce time spent on patching, dependency drift, and one-off recovery work after runtime incidents.",
    },
  ],
  fitChecklist: [
    "You need OpenClaw available beyond one developer laptop.",
    "You want to avoid owning server patching and runtime updates.",
    "You need faster rollout across non-infrastructure teams.",
    "You prefer a workflow-first setup over full-stack DevOps ownership.",
  ],
  channelNotes: [
    "OpenClaw workflows can be configured for business channels including WhatsApp, Telegram, Discord, Slack, and email flows.",
    "Use the same hosted runtime to support multiple workflows instead of maintaining channel-specific scripts.",
    "Keep operational ownership clear while your team focuses on prompt, policy, and workflow quality.",
  ],
  comparisonRows: [
    {
      category: "Time to first reliable use",
      managed: "Low setup friction with immediate hosted runtime.",
      selfHosted: "Requires server provisioning, install, and hardening.",
    },
    {
      category: "Ongoing maintenance",
      managed: "Mostly externalized to managed hosting operations.",
      selfHosted: "Internal team owns upgrades, patching, and monitoring.",
    },
    {
      category: "Incident response load",
      managed: "Shared with provider support and managed infrastructure.",
      selfHosted: "Fully internal ownership, including after-hours issues.",
    },
    {
      category: "Best fit",
      managed: "Teams optimizing for speed, reliability, and focus.",
      selfHosted: "Teams with mature internal platform engineering.",
    },
  ],
  faq: [
    {
      question: "Is OpenClaw hosting different from installing OpenClaw once?",
      answer:
        "Yes. Hosting includes uptime, updates, monitoring, and ongoing runtime ownership. Installation alone does not solve long-term reliability.",
    },
    {
      question: "Can we still keep our own keys and workflow controls?",
      answer:
        "Yes. You still control workflow logic, integrations, and access configuration while infrastructure operations stay managed.",
    },
    {
      question: "When does self-hosting make more sense?",
      answer:
        "Self-hosting is usually better when your team already runs production infrastructure with established on-call and patch-management processes.",
    },
    {
      question: "How quickly can a team start?",
      answer:
        "Most teams can start in minutes because they skip server provisioning, runtime hardening, and manual deployment steps.",
    },
  ],
  relatedLinks: [
    {
      href: "/managed-openclaw",
      label: "Managed OpenClaw",
      description: "Compare managed vs self-hosted tradeoffs in detail.",
    },
    {
      href: "/openclaw-vps-hosting",
      label: "OpenClaw VPS Hosting",
      description: "See when VPS setup helps and when it becomes overhead.",
    },
    ...sharedRelatedLinks,
  ],
}

export const managedOpenclawLandingPage: LandingPageConfig = {
  slug: "managed-openclaw",
  path: "/managed-openclaw",
  metaTitle: "Managed OpenClaw | Faster Launch With Lower Ops Burden",
  metaDescription:
    "Managed OpenClaw for teams that want predictable runtime operations without owning infrastructure maintenance and incident loops.",
  headline: "Managed OpenClaw for teams that want workflow velocity",
  subheadline:
    "Move from setup experiments to production usage with a managed OpenClaw deployment model that reduces operational drag and keeps your team focused on outcomes.",
  searchIntentLabel: "Commercial Intent: managed openclaw",
  primaryKeyword: "managed openclaw",
  keywords: [
    "managed openclaw",
    "openclaw managed service",
    "openclaw cloud managed",
    "openclaw hosted service",
    "self hosted openclaw alternative",
  ],
  heroPoints: [
    "Shift runtime operations out of your core delivery team.",
    "Keep configuration, channels, and workflow control in your hands.",
    "Use a deployment model designed for business continuity, not demos.",
  ],
  valueProps: [
    {
      title: "Less operational churn",
      description:
        "Reduce interruptions from patch cycles, runtime drift, and dependency conflicts that slow product teams.",
    },
    {
      title: "Clear ownership model",
      description:
        "Separate infrastructure reliability from workflow strategy so teams can execute without ambiguous responsibility boundaries.",
    },
    {
      title: "Faster iteration cycles",
      description:
        "Spend more weekly capacity on prompts, policies, and channel improvements instead of infrastructure upkeep.",
    },
  ],
  fitChecklist: [
    "Your team is product, growth, support, or operations led.",
    "You need reliable OpenClaw usage without building an on-call rotation.",
    "You want deployment speed without long setup projects.",
    "You need channel continuity but not deep infrastructure customization.",
  ],
  channelNotes: [
    "Managed OpenClaw is usually strongest when your value depends on channel response quality, not infrastructure craftsmanship.",
    "Teams can focus on message quality, routing logic, and approval policies rather than host reliability tasks.",
    "A managed baseline makes it easier to standardize operations across customer support and lead-gen workflows.",
  ],
  comparisonRows: [
    {
      category: "Setup effort",
      managed: "Lower setup burden with managed runtime provisioning.",
      selfHosted: "Higher effort with infrastructure and environment setup.",
    },
    {
      category: "Weekly operations load",
      managed: "Lower internal maintenance commitment.",
      selfHosted: "Higher internal effort for monitoring and maintenance.",
    },
    {
      category: "Failure recovery path",
      managed: "Provider-supported incident handling model.",
      selfHosted: "Internal runbooks and recovery execution required.",
    },
    {
      category: "Typical team fit",
      managed: "Teams optimizing for speed and predictable operations.",
      selfHosted: "Teams prioritizing deep infrastructure ownership.",
    },
  ],
  faq: [
    {
      question: "Is managed OpenClaw only for non-technical teams?",
      answer:
        "No. Technical teams also choose managed deployment when they want to avoid routine infrastructure overhead and stay focused on business workflows.",
    },
    {
      question: "Can we migrate to self-hosted later?",
      answer:
        "Yes. Many teams start managed, gather usage data, then decide whether deeper infrastructure control is worth the added maintenance burden.",
    },
    {
      question: "What should we compare between managed providers?",
      answer:
        "Compare setup experience, incident response quality, runtime isolation, update policy, and support responsiveness.",
    },
    {
      question: "Does managed deployment limit channel strategy?",
      answer:
        "No. Teams still define channels, prompts, and guardrails. Managed hosting mainly changes who handles runtime operations.",
    },
  ],
  relatedLinks: [
    {
      href: "/openclaw-hosting",
      label: "OpenClaw Hosting",
      description: "See core hosting requirements and evaluation criteria.",
    },
    {
      href: "/openclaw-vps-hosting",
      label: "OpenClaw VPS Hosting",
      description: "Compare managed deployment against VPS ownership.",
    },
    ...sharedRelatedLinks,
  ],
}

export const openclawVpsHostingLandingPage: LandingPageConfig = {
  slug: "openclaw-vps-hosting",
  path: "/openclaw-vps-hosting",
  metaTitle: "OpenClaw VPS Hosting vs Managed Hosting | Decision Framework",
  metaDescription:
    "Compare OpenClaw VPS hosting with managed hosting across setup effort, maintenance burden, and incident recovery risk.",
  headline: "OpenClaw VPS hosting vs managed hosting: choose with clear tradeoffs",
  subheadline:
    "VPS can work for teams with strong operations maturity. For most teams, managed hosting reduces maintenance loops and speeds up business execution.",
  searchIntentLabel: "Comparison Intent: openclaw vps hosting",
  primaryKeyword: "openclaw vps hosting",
  keywords: [
    "openclaw vps hosting",
    "openclaw vps setup",
    "openclaw server setup",
    "managed openclaw vs vps",
    "host openclaw on vps",
  ],
  heroPoints: [
    "Understand the full VPS ownership scope before committing.",
    "Compare direct server cost against total maintenance labor.",
    "Use a practical framework to avoid premature architecture decisions.",
  ],
  valueProps: [
    {
      title: "Realistic cost modeling",
      description:
        "Account for maintenance hours, incident interruptions, and update overhead instead of server spend alone.",
    },
    {
      title: "Risk-aware planning",
      description:
        "Map who owns outages, patch failures, and channel disconnects before your team depends on OpenClaw daily.",
    },
    {
      title: "Faster decision quality",
      description:
        "Use a side-by-side view of reliability and labor tradeoffs to choose a deployment path that fits your team today.",
    },
  ],
  fitChecklist: [
    "Choose VPS if you already run production workloads with clear on-call ownership.",
    "Choose managed if your bottleneck is launch speed and workflow consistency.",
    "Avoid VPS if no one owns patching, rollback, and runtime monitoring.",
    "Re-evaluate architecture after 30-60 days of real production usage data.",
  ],
  channelNotes: [
    "Channel integrations increase operational complexity when runtime reliability is unstable.",
    "VPS setup can support advanced control, but only with disciplined monitoring and incident response.",
    "Managed hosting lowers operational variance for teams running multi-channel workflows.",
  ],
  comparisonRows: [
    {
      category: "Initial setup",
      managed: "Provisioned quickly with provider-managed runtime.",
      selfHosted: "Manual server setup, hardening, and dependency install.",
    },
    {
      category: "Maintenance burden",
      managed: "Lower internal maintenance overhead.",
      selfHosted: "Higher ongoing workload for updates and runtime health.",
    },
    {
      category: "Control level",
      managed: "Moderate infrastructure control, high workflow control.",
      selfHosted: "Maximum infrastructure control, maximum maintenance ownership.",
    },
    {
      category: "Execution speed",
      managed: "Faster for non-infrastructure teams.",
      selfHosted: "Slower if platform operations are not already mature.",
    },
  ],
  faq: [
    {
      question: "Is OpenClaw VPS hosting always cheaper?",
      answer:
        "Direct server spend may look lower, but total ownership often rises once you include setup, maintenance, and incident response labor.",
    },
    {
      question: "What breaks most often in VPS setups?",
      answer:
        "Teams usually struggle with patch cycles, dependency drift, monitoring gaps, and delayed recovery during runtime incidents.",
    },
    {
      question: "Should we start with managed and migrate later?",
      answer:
        "That is a common rollout pattern. Starting managed helps teams validate workflow value before investing in deeper infrastructure ownership.",
    },
    {
      question: "Who is VPS best for?",
      answer:
        "VPS is best for teams with strong platform engineering capabilities and clear operational ownership for uptime and security.",
    },
  ],
  relatedLinks: [
    {
      href: "/openclaw-hosting",
      label: "OpenClaw Hosting",
      description: "Learn the baseline requirements for production hosting.",
    },
    {
      href: "/managed-openclaw",
      label: "Managed OpenClaw",
      description: "See why managed deployment often wins for speed-focused teams.",
    },
    ...sharedRelatedLinks,
  ],
}

export const openclawWhatsappAutomationLandingPage: LandingPageConfig = {
  slug: "openclaw-whatsapp-automation",
  path: "/openclaw-whatsapp-automation",
  metaTitle: "OpenClaw WhatsApp Automation | Hosted Multi-Channel Operations",
  metaDescription:
    "Run OpenClaw WhatsApp automation in a managed cloud environment and keep channel workflows reliable without self-hosting overhead.",
  headline: "OpenClaw WhatsApp automation without self-hosting complexity",
  subheadline:
    "Use ClawPilot to run OpenClaw workflows for WhatsApp and related channels with a managed runtime that prioritizes uptime, stability, and faster execution cycles.",
  searchIntentLabel: "Use-Case Intent: openclaw whatsapp automation",
  primaryKeyword: "openclaw whatsapp automation",
  keywords: [
    "openclaw whatsapp automation",
    "openclaw whatsapp",
    "openclaw messaging automation",
    "hosted openclaw whatsapp",
    "openclaw telegram and whatsapp automation",
  ],
  heroPoints: [
    "Keep WhatsApp workflows running in a stable cloud runtime.",
    "Reduce channel interruptions caused by ad-hoc self-hosted setups.",
    "Expand from one channel to multi-channel workflows with less ops overhead.",
  ],
  valueProps: [
    {
      title: "Channel reliability",
      description:
        "A managed runtime helps maintain workflow continuity for message-based operations where responsiveness matters.",
    },
    {
      title: "Operational clarity",
      description:
        "Separate workflow strategy from infrastructure maintenance so channel teams can move faster with fewer blockers.",
    },
    {
      title: "Multi-channel readiness",
      description:
        "Start with WhatsApp and extend to Telegram, Discord, or Slack workflows without rebuilding hosting foundations.",
    },
  ],
  fitChecklist: [
    "You run customer support or outreach flows in messaging channels.",
    "You need better uptime than laptop-based or ad-hoc VPS setups.",
    "You want faster iteration on prompts, rules, and escalation logic.",
    "You prefer managed infrastructure with workflow-level control.",
  ],
  channelNotes: [
    "OpenClaw documentation highlights support for channels such as WhatsApp, Telegram, Discord, and Slack.",
    "A shared managed runtime makes it easier to standardize policy and operations across channels.",
    "Use approval rules and guardrails to keep outbound and support workflows aligned with team standards.",
  ],
  comparisonRows: [
    {
      category: "Channel uptime risk",
      managed: "Lower risk with managed runtime operations.",
      selfHosted: "Higher risk if monitoring and recovery are inconsistent.",
    },
    {
      category: "Workflow iteration speed",
      managed: "Faster prompt/policy iteration with less ops distraction.",
      selfHosted: "Slower when maintenance work interrupts workflow tuning.",
    },
    {
      category: "Scaling to more channels",
      managed: "Extend with lower incremental ops burden.",
      selfHosted: "Each channel adds operational and maintenance complexity.",
    },
    {
      category: "Best fit",
      managed: "Teams focused on response quality and execution speed.",
      selfHosted: "Teams prioritizing full host control with strong ops depth.",
    },
  ],
  faq: [
    {
      question: "Does this page only apply to WhatsApp workflows?",
      answer:
        "No. The same hosted model can support broader channel operations, including Telegram, Discord, and Slack workflows.",
    },
    {
      question: "Why is managed hosting important for messaging automation?",
      answer:
        "Messaging workflows depend on continuity. Managed hosting reduces downtime risk and maintenance interruptions that affect response consistency.",
    },
    {
      question: "Can we keep approval and policy controls?",
      answer:
        "Yes. You still define prompts, guardrails, and approval flows while the runtime infrastructure remains managed.",
    },
    {
      question: "When should we avoid this model?",
      answer:
        "If your organization requires deep host-level customization and has strong in-house platform operations, self-hosting may be a better fit.",
    },
  ],
  relatedLinks: [
    {
      href: "/openclaw-hosting",
      label: "OpenClaw Hosting",
      description: "Review base hosting requirements for production workflows.",
    },
    {
      href: "/managed-openclaw",
      label: "Managed OpenClaw",
      description: "Explore operations-focused tradeoffs for managed deployment.",
    },
    ...sharedRelatedLinks,
  ],
}

export const marketingLandingPages: LandingPageConfig[] = [
  openclawHostingLandingPage,
  managedOpenclawLandingPage,
  openclawVpsHostingLandingPage,
  openclawWhatsappAutomationLandingPage,
]

export function buildLandingMetadata(page: LandingPageConfig): Metadata {
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: {
      canonical: page.path,
    },
    keywords: page.keywords,
    openGraph: {
      title: `${siteName} | ${page.metaTitle}`,
      description: page.metaDescription,
      url: page.path,
      type: "website",
      images: ["/logo.svg"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} | ${page.metaTitle}`,
      description: page.metaDescription,
      images: ["/logo.svg"],
    },
  }
}
