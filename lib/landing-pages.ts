import type { Metadata } from "next"

import { siteName, siteOgImage } from "@/lib/site"

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
    label: "Openclaw Hosting Guide",
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

const sharedHermesRelatedLinks: LandingPageLink[] = [
  {
    href: "/hermes-agent-hosting",
    label: "Hermes Agent Hosting",
    description: "Run Hermes Agent in the cloud without server setup.",
  },
  {
    href: "/managed-hermes-agent",
    label: "Managed Hermes Agent",
    description: "Compare managed Hermes operations against DIY ownership.",
  },
  {
    href: "/hermes-agent-vps-hosting",
    label: "Hermes Agent VPS Hosting",
    description: "Decide whether VPS control is worth the maintenance load.",
  },
]

export const aiAgentHostingLandingPage: LandingPageConfig = {
  slug: "ai-agent-hosting",
  path: "/ai-agent-hosting",
  metaTitle: "AI Agent Hosting | Openclaw and Hermes Agent Cloud Hosting",
  metaDescription:
    "Host Openclaw or Hermes Agent in isolated ClawPilot cloud runtimes. Deploy agents 24/7 without managing VPS, Docker, or updates.",
  headline: "AI agent hosting for Openclaw and Hermes Agent",
  subheadline:
    "Choose your runtime, bring your model keys, and run agents in isolated cloud environments instead of your personal device.",
  searchIntentLabel: "Runtime Intent: AI agent hosting",
  primaryKeyword: "AI agent hosting",
  keywords: [
    "AI agent hosting",
    "managed AI agent hosting",
    "Openclaw hosting",
    "Hermes Agent hosting",
    "cloud agent runtime",
  ],
  heroPoints: [
    "Host Openclaw or Hermes Agent from the same ClawPilot account.",
    "Create multiple agents and workflows inside either runtime.",
    "Keep always-on agents away from your laptop and personal files.",
  ],
  valueProps: [
    {
      title: "Runtime choice",
      description: "Use Openclaw for channel-driven automation or Hermes Agent for memory-rich autonomous workflows.",
    },
    {
      title: "Cloud isolation",
      description: "Run agent files, tools, and sessions in a separate managed environment.",
    },
    {
      title: "Less server work",
      description: "Skip VPS setup, Docker upkeep, SSL, restarts, and routine update handling.",
    },
  ],
  fitChecklist: [
    "You want Openclaw or Hermes Agent online 24/7.",
    "You need more than one hosted agent or workflow.",
    "You care about isolation from personal devices.",
    "You want runtime control without infrastructure chores.",
  ],
  channelNotes: [
    "Openclaw is a strong fit for messaging-first workflows across WhatsApp, Telegram, Slack, Discord, and email.",
    "Hermes Agent is a strong fit for persistent memory, tool use, skills, and longer-running autonomous work.",
    "ClawPilot keeps the runtime decision flexible so you do not have to choose a single agent framework forever.",
  ],
  comparisonRows: [
    {
      category: "Runtime support",
      managed: "Openclaw and Hermes Agent from one hosting layer.",
      selfHosted: "Separate install, maintenance, and recovery paths per runtime.",
    },
    {
      category: "Agent scale",
      managed: "Create multiple agents and workflows without repeating server setup.",
      selfHosted: "Each new runtime can add setup, secrets, monitoring, and update work.",
    },
    {
      category: "Device exposure",
      managed: "Agents run away from your personal laptop and local files.",
      selfHosted: "Local installs can share a boundary with personal apps and credentials.",
    },
    {
      category: "Best fit",
      managed: "Teams and builders who want fast, reliable hosted agents.",
      selfHosted: "Infrastructure-heavy teams that need full host ownership.",
    },
  ],
  faq: [
    {
      question: "Can ClawPilot host both Openclaw and Hermes Agent?",
      answer:
        "Yes. ClawPilot supports hosted Openclaw and Hermes Agent runtimes, so you can choose the agent framework that fits the job.",
    },
    {
      question: "Can I deploy more than one agent?",
      answer:
        "Yes. You can create multiple agents and workflows inside supported runtimes instead of rebuilding hosting for every experiment.",
    },
    {
      question: "Why not run agents on my main laptop?",
      answer:
        "Always-on agents can touch files, tools, browser sessions, and credentials. A separate cloud runtime gives them a cleaner boundary.",
    },
    {
      question: "Is this still useful if I already know Docker?",
      answer:
        "Yes. Managed hosting is about reducing ongoing maintenance, not only avoiding the first install.",
    },
  ],
  relatedLinks: [
    {
      href: "/openclaw-hosting",
      label: "Openclaw Hosting",
      description: "Explore hosted Openclaw for always-on channel workflows.",
    },
    ...sharedHermesRelatedLinks,
  ],
}

export const openclawHostingLandingPage: LandingPageConfig = {
  slug: "openclaw-hosting",
  path: "/openclaw-hosting",
  metaTitle: "Openclaw Hosting | Private Managed Openclaw in the Cloud",
  metaDescription:
    "Run Openclaw in the cloud with a private, always-on managed environment. Skip server setup and focus on outcomes.",
  headline: "Openclaw hosting built for reliable day-to-day operations",
  subheadline:
    "ClawPilot gives your team a private Openclaw environment that stays online, gets updated safely, and removes infrastructure maintenance from your weekly workload.",
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
    "Private Openclaw instance with isolated runtime ownership.",
    "Managed uptime, patching, and deployment maintenance.",
    "Launch in minutes without Docker, VPS, or terminal setup.",
  ],
  valueProps: [
    {
      title: "Operational consistency",
      description:
        "Avoid local machine interruptions and ad-hoc restarts by running Openclaw in a stable cloud environment.",
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
    "You need Openclaw available beyond one developer laptop.",
    "You want to avoid owning server patching and runtime updates.",
    "You need faster rollout across non-infrastructure teams.",
    "You prefer a workflow-first setup over full-stack DevOps ownership.",
  ],
  channelNotes: [
    "Openclaw workflows can be configured for business channels including WhatsApp, Telegram, Discord, Slack, and email flows.",
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
      question: "Is Openclaw hosting different from installing Openclaw once?",
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
      label: "Managed Openclaw",
      description: "Compare managed vs self-hosted tradeoffs in detail.",
    },
    {
      href: "/openclaw-vps-hosting",
      label: "Openclaw VPS Hosting",
      description: "See when VPS setup helps and when it becomes overhead.",
    },
    ...sharedRelatedLinks,
  ],
}

export const managedOpenclawLandingPage: LandingPageConfig = {
  slug: "managed-openclaw",
  path: "/managed-openclaw",
  metaTitle: "Managed Openclaw | Faster Launch With Lower Ops Burden",
  metaDescription:
    "Managed Openclaw for teams that want predictable runtime operations without owning infrastructure maintenance and incident loops.",
  headline: "Managed Openclaw for teams that want workflow velocity",
  subheadline:
    "Move from setup experiments to production usage with a managed Openclaw deployment model that reduces operational drag and keeps your team focused on outcomes.",
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
    "You need reliable Openclaw usage without building an on-call rotation.",
    "You want deployment speed without long setup projects.",
    "You need channel continuity but not deep infrastructure customization.",
  ],
  channelNotes: [
    "Managed Openclaw is usually strongest when your value depends on channel response quality, not infrastructure craftsmanship.",
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
      question: "Is managed Openclaw only for non-technical teams?",
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
      label: "Openclaw Hosting",
      description: "See core hosting requirements and evaluation criteria.",
    },
    {
      href: "/openclaw-vps-hosting",
      label: "Openclaw VPS Hosting",
      description: "Compare managed deployment against VPS ownership.",
    },
    ...sharedRelatedLinks,
  ],
}

export const openclawVpsHostingLandingPage: LandingPageConfig = {
  slug: "openclaw-vps-hosting",
  path: "/openclaw-vps-hosting",
  metaTitle: "Openclaw VPS Hosting vs Managed Hosting | Decision Framework",
  metaDescription:
    "Compare Openclaw VPS hosting with managed hosting across setup effort, maintenance burden, and incident recovery risk.",
  headline: "Openclaw VPS hosting vs managed hosting: choose with clear tradeoffs",
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
        "Map who owns outages, patch failures, and channel disconnects before your team depends on Openclaw daily.",
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
      question: "Is Openclaw VPS hosting always cheaper?",
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
      label: "Openclaw Hosting",
      description: "Learn the baseline requirements for production hosting.",
    },
    {
      href: "/managed-openclaw",
      label: "Managed Openclaw",
      description: "See why managed deployment often wins for speed-focused teams.",
    },
    ...sharedRelatedLinks,
  ],
}

export const openclawWhatsappAutomationLandingPage: LandingPageConfig = {
  slug: "openclaw-whatsapp-automation",
  path: "/openclaw-whatsapp-automation",
  metaTitle: "Openclaw WhatsApp Automation | Hosted Multi-Channel Operations",
  metaDescription:
    "Run Openclaw WhatsApp automation in a managed cloud environment and keep channel workflows reliable without self-hosting overhead.",
  headline: "Openclaw WhatsApp automation without self-hosting complexity",
  subheadline:
    "Use ClawPilot to run Openclaw workflows for WhatsApp and related channels with a managed runtime that prioritizes uptime, stability, and faster execution cycles.",
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
    "Openclaw documentation highlights support for channels such as WhatsApp, Telegram, Discord, and Slack.",
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
      label: "Openclaw Hosting",
      description: "Review base hosting requirements for production workflows.",
    },
    {
      href: "/managed-openclaw",
      label: "Managed Openclaw",
      description: "Explore operations-focused tradeoffs for managed deployment.",
    },
    ...sharedRelatedLinks,
  ],
}

export const hermesAgentHostingLandingPage: LandingPageConfig = {
  slug: "hermes-agent-hosting",
  path: "/hermes-agent-hosting",
  metaTitle: "Hermes Agent Hosting | Managed Cloud Runtime for Hermes Agent",
  metaDescription:
    "Run Hermes Agent in a managed cloud runtime with isolation, uptime, and no VPS maintenance. Deploy faster with ClawPilot.",
  headline: "Hermes Agent hosting without VPS maintenance",
  subheadline:
    "Run Hermes Agent in an isolated ClawPilot cloud runtime, keep it online, and focus on the workflows instead of the server.",
  searchIntentLabel: "Deployment Intent: Hermes Agent hosting",
  primaryKeyword: "Hermes Agent hosting",
  keywords: [
    "Hermes Agent hosting",
    "hosted Hermes Agent",
    "Hermes Agent cloud hosting",
    "deploy Hermes Agent",
    "managed Hermes Agent",
  ],
  heroPoints: [
    "Hosted Hermes Agent runtime for always-on work.",
    "No Docker, VPS hardening, SSL, or manual restart loops.",
    "Create multiple Hermes agents and workflows as your use cases grow.",
  ],
  valueProps: [
    {
      title: "Always-on runtime",
      description: "Keep Hermes Agent available for recurring work without depending on a personal device.",
    },
    {
      title: "Isolated workspace",
      description: "Separate agent files, tools, and sessions from your laptop and daily browser context.",
    },
    {
      title: "Lower setup drag",
      description: "Move past install work and spend more time on memory, skills, tools, and workflow quality.",
    },
  ],
  fitChecklist: [
    "You want Hermes Agent online beyond a local terminal session.",
    "You are evaluating memory, skills, and tool workflows.",
    "You want hosted deployment without owning a VPS.",
    "You need room to create more than one agent or workflow.",
  ],
  channelNotes: [
    "Hermes Agent is commonly searched with setup, VPS, memory, skills, tools, and cloud hosting intent.",
    "A hosted runtime is strongest when the agent needs persistence, scheduled work, and cleaner operational boundaries.",
    "Use ClawPilot when you want Hermes Agent running in the cloud without turning deployment into a server project.",
  ],
  comparisonRows: [
    {
      category: "First deploy",
      managed: "Hosted runtime path with less manual server setup.",
      selfHosted: "Provision VPS, install dependencies, configure access, and monitor health.",
    },
    {
      category: "Persistence",
      managed: "Designed for always-on Hermes workflows.",
      selfHosted: "Depends on your process manager, host health, and recovery setup.",
    },
    {
      category: "Security boundary",
      managed: "Runs away from your personal device and local credential surface.",
      selfHosted: "Local installs can share risk with daily apps and files.",
    },
    {
      category: "Best fit",
      managed: "Builders who want Hermes Agent running quickly and reliably.",
      selfHosted: "Operators who want direct host control and accept maintenance.",
    },
  ],
  faq: [
    {
      question: "What is Hermes Agent hosting?",
      answer:
        "Hermes Agent hosting means running the Hermes Agent runtime in the cloud so it can stay online without your laptop or a self-managed VPS.",
    },
    {
      question: "Can I run multiple Hermes agents?",
      answer:
        "Yes. ClawPilot is built for creating multiple hosted agents and workflows as your use cases grow.",
    },
    {
      question: "Does managed hosting replace Hermes Agent?",
      answer:
        "No. ClawPilot hosts the runtime so you can use Hermes Agent without managing the underlying server work.",
    },
    {
      question: "Who should self-host instead?",
      answer:
        "Self-hosting fits teams that already manage production servers and want direct infrastructure ownership.",
    },
  ],
  relatedLinks: [
    {
      href: "/ai-agent-hosting",
      label: "AI Agent Hosting",
      description: "Compare Openclaw and Hermes Agent hosting from one place.",
    },
    ...sharedHermesRelatedLinks.filter((link) => link.href !== "/hermes-agent-hosting"),
  ],
}

export const managedHermesAgentLandingPage: LandingPageConfig = {
  slug: "managed-hermes-agent",
  path: "/managed-hermes-agent",
  metaTitle: "Managed Hermes Agent | Run Hermes Agent Without Server Ops",
  metaDescription:
    "Managed Hermes Agent hosting for builders who want persistence, isolation, and uptime without managing VPS infrastructure.",
  headline: "Managed Hermes Agent for persistent autonomous work",
  subheadline:
    "Use Hermes Agent with a managed runtime so your team can focus on tools, memory, and outcomes instead of operations.",
  searchIntentLabel: "Commercial Intent: managed Hermes Agent",
  primaryKeyword: "managed Hermes Agent",
  keywords: [
    "managed Hermes Agent",
    "Hermes Agent managed hosting",
    "Hermes Agent cloud runtime",
    "host Hermes Agent",
    "Hermes Agent deployment",
  ],
  heroPoints: [
    "Managed runtime operations for Hermes Agent.",
    "Persistent cloud environment for longer-running work.",
    "Multiple agents and workflows without repeated server projects.",
  ],
  valueProps: [
    {
      title: "Operational focus",
      description: "Spend less time on host upkeep and more time improving agent behavior.",
    },
    {
      title: "Cleaner rollout",
      description: "Give non-infrastructure teams a simpler way to evaluate Hermes Agent in real work.",
    },
    {
      title: "Practical isolation",
      description: "Keep autonomous work in a managed environment separate from personal machines.",
    },
  ],
  fitChecklist: [
    "You want Hermes Agent for recurring or long-running work.",
    "You prefer dashboard-driven runtime control over SSH.",
    "You need reliability before deep infrastructure customization.",
    "You want to expand from one agent to several workflows.",
  ],
  channelNotes: [
    "Managed Hermes Agent is useful when persistent memory and tool access need uptime, not just a successful install.",
    "The main tradeoff is simple: managed hosting reduces operations work while self-hosting maximizes host control.",
    "ClawPilot keeps Hermes Agent beside Openclaw so teams can pick the right runtime by workflow.",
  ],
  comparisonRows: [
    {
      category: "Setup model",
      managed: "Runtime provisioned and maintained through ClawPilot.",
      selfHosted: "Manual server, Docker, process, and update ownership.",
    },
    {
      category: "Team adoption",
      managed: "Easier for builders and operators who do not want server work.",
      selfHosted: "Best when infrastructure ownership is already a team strength.",
    },
    {
      category: "Ongoing work",
      managed: "Lower maintenance and recovery burden.",
      selfHosted: "You own patching, monitoring, backups, and incidents.",
    },
    {
      category: "Runtime choice",
      managed: "Hermes Agent and Openclaw are both available.",
      selfHosted: "Each runtime needs its own setup and maintenance plan.",
    },
  ],
  faq: [
    {
      question: "Why choose managed Hermes Agent hosting?",
      answer:
        "Choose managed hosting when uptime and speed matter more than owning every server detail.",
    },
    {
      question: "Is managed Hermes Agent only for beginners?",
      answer:
        "No. Technical users also choose it when server maintenance is not the highest-value work.",
    },
    {
      question: "Can I also use Openclaw on ClawPilot?",
      answer:
        "Yes. ClawPilot supports both Openclaw and Hermes Agent hosting.",
    },
    {
      question: "What should I compare before self-hosting?",
      answer:
        "Compare setup time, update work, monitoring, backups, recovery, and the security boundary around agent tools.",
    },
  ],
  relatedLinks: [
    {
      href: "/hermes-agent-hosting",
      label: "Hermes Agent Hosting",
      description: "Start with the core hosting overview.",
    },
    {
      href: "/ai-agent-hosting",
      label: "AI Agent Hosting",
      description: "See how Hermes Agent fits beside Openclaw.",
    },
    {
      href: "/hermes-agent-vps-hosting",
      label: "Hermes Agent VPS Hosting",
      description: "Compare managed deployment with VPS ownership.",
    },
  ],
}

export const hermesAgentVpsHostingLandingPage: LandingPageConfig = {
  slug: "hermes-agent-vps-hosting",
  path: "/hermes-agent-vps-hosting",
  metaTitle: "Hermes Agent VPS Hosting vs Managed Hosting",
  metaDescription:
    "Compare Hermes Agent VPS hosting with managed cloud hosting across setup time, uptime, isolation, and maintenance.",
  headline: "Hermes Agent VPS hosting vs managed hosting",
  subheadline:
    "A VPS gives control. Managed hosting gives speed, uptime support, and less maintenance while Hermes Agent gets proven in real workflows.",
  searchIntentLabel: "Comparison Intent: Hermes Agent VPS hosting",
  primaryKeyword: "Hermes Agent VPS hosting",
  keywords: [
    "Hermes Agent VPS hosting",
    "Hermes Agent VPS",
    "self host Hermes Agent",
    "Hermes Agent server setup",
    "Hermes Agent managed hosting",
  ],
  heroPoints: [
    "Compare direct VPS control against operational ownership.",
    "Account for restarts, updates, monitoring, backups, and SSL.",
    "Start managed if workflow validation matters more than server tuning.",
  ],
  valueProps: [
    {
      title: "Clear tradeoffs",
      description: "See what you gain in control and what you inherit in maintenance.",
    },
    {
      title: "Faster validation",
      description: "Use managed hosting to prove the Hermes workflow before investing in platform work.",
    },
    {
      title: "Lower interruption risk",
      description: "Reduce the chance that server chores interrupt agent iteration.",
    },
  ],
  fitChecklist: [
    "Choose VPS if you already manage production Linux servers.",
    "Choose managed if you want Hermes Agent online quickly.",
    "Avoid DIY if no one owns monitoring and recovery.",
    "Revisit self-hosting after your workflow value is proven.",
  ],
  channelNotes: [
    "VPS searches often come from users who already understand Hermes Agent and are blocked by deployment details.",
    "The hidden work is not only install time; it is ongoing recovery, updates, secrets, and observability.",
    "Managed hosting is the lower-friction path when the business goal is agent output, not server administration.",
  ],
  comparisonRows: [
    {
      category: "Initial setup",
      managed: "Hosted runtime path with fewer moving parts.",
      selfHosted: "VPS provisioning, dependencies, process manager, SSL, and access control.",
    },
    {
      category: "Maintenance",
      managed: "Lower ongoing operations burden.",
      selfHosted: "You own upgrades, restarts, backups, and host security.",
    },
    {
      category: "Control",
      managed: "High workflow control with less host-level access.",
      selfHosted: "Full host control with full responsibility.",
    },
    {
      category: "Best first step",
      managed: "Validate Hermes Agent workflows quickly.",
      selfHosted: "Optimize after requirements are known.",
    },
  ],
  faq: [
    {
      question: "Is Hermes Agent VPS hosting cheaper?",
      answer:
        "The server bill may be lower, but total cost includes setup time, updates, monitoring, and incident recovery.",
    },
    {
      question: "When is VPS the right choice?",
      answer:
        "VPS is right when you need host-level control and already have the skills and time to maintain it.",
    },
    {
      question: "Can I start managed and move later?",
      answer:
        "Yes. Starting managed is a practical way to validate Hermes workflows before deciding how much infrastructure to own.",
    },
    {
      question: "Does ClawPilot only host Hermes Agent?",
      answer:
        "No. ClawPilot supports both Hermes Agent and Openclaw runtimes.",
    },
  ],
  relatedLinks: [
    {
      href: "/hermes-agent-hosting",
      label: "Hermes Agent Hosting",
      description: "Review the managed hosting path.",
    },
    {
      href: "/managed-hermes-agent",
      label: "Managed Hermes Agent",
      description: "See when managed operations make sense.",
    },
    {
      href: "/ai-agent-hosting",
      label: "AI Agent Hosting",
      description: "Compare runtime options across ClawPilot.",
    },
  ],
}

export const marketingLandingPages: LandingPageConfig[] = [
  aiAgentHostingLandingPage,
  openclawHostingLandingPage,
  managedOpenclawLandingPage,
  openclawVpsHostingLandingPage,
  openclawWhatsappAutomationLandingPage,
  hermesAgentHostingLandingPage,
  managedHermesAgentLandingPage,
  hermesAgentVpsHostingLandingPage,
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
      images: [siteOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} | ${page.metaTitle}`,
      description: page.metaDescription,
      images: [siteOgImage],
    },
  }
}
