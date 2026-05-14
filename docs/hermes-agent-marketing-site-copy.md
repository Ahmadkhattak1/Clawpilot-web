# ClawPilot Marketing Update: Openclaw + Hermes Agent

## Status

- Date: 2026-05-14
- Scope: Homepage copy, section layout, conversion structure, supporting landing pages, and asset ideas
- Product change: ClawPilot now hosts both Openclaw and Hermes Agent
- Recommended positioning: Hosted open-source agent runtimes, with Openclaw and Hermes Agent available from one managed ClawPilot dashboard

## Executive Summary

The current site sells one thing clearly: "your own Openclaw without hosting work." That message should evolve, not be replaced. The stronger version is:

> Run Openclaw or Hermes Agent without managing a server.

The buyer should understand three things above the fold:

1. ClawPilot hosts open-source AI agents for them.
2. They can choose Openclaw or Hermes Agent.
3. They get a private, always-on agent machine without VPS, Docker, terminal setup, updates, or uptime work.

The conversion opportunity is to move from commodity "hosting" to "managed agent workspace." Competitors that only say "one-click hosting" are easy to copy. ClawPilot should lead with a practical choice: Openclaw for channel-connected automation, Hermes Agent for memory and self-improving workflows, both managed from the same account.

## Research Notes

Exact conversion rates for competitor homepages are proprietary and were not publicly verifiable. I used category leaders and high-intent infrastructure pages as proxies because they expose proven conversion patterns: clear outcome headlines, concrete proof, interactive product visuals, side-by-side choice architecture, and low-friction CTAs.

### Direct Competitors and Adjacent Competitors

| Site | What they sell | Strong conversion pattern | Gap ClawPilot can exploit |
| --- | --- | --- | --- |
| CTRL BIN | Hosted Openclaw or Hermes in the cloud | Very clear "pick agent, configure brain, tell it to do things" sequence; BYOK and Telegram above the fold | Narrow channel story; less polished trust/security detail |
| ClawSimple | Managed Openclaw + Hermes Agent with services connected | Positions around "ready first" and first real workflow, not just installation | Telegram-first; ClawPilot can feel broader and more productized |
| AgentNest | Openclaw + Hermes managed hosting | Strong quantified proof row: uptime, users, instances, backups | Generic claims need verification; ClawPilot can use restrained, credible proof |
| Openclaw Launch | Adds Hermes to an existing Openclaw hosting dashboard | Good "why both, not either" framing | Blog-led announcement; ClawPilot can make this core homepage positioning |
| Hostinger / managed Openclaw coverage | One-click Openclaw for beginners | Focuses on removing setup, API keys, security, updates, and hosting | Large host, but less specialized around agent workflows |

Sources:

- CTRL BIN: https://www.ctrlbin.com/
- ClawSimple: https://clawsimple.com/en
- AgentNest: https://www.20sww.com/
- Openclaw Launch Hermes announcement: https://openclawlaunch.com/blog/hermes-agent-now-on-openclaw-launch
- TechRadar / Hostinger Openclaw coverage: https://www.techradar.com/pro/website-hosting/the-biggest-ai-opportunity-is-not-replacing-people-how-openclaw-is-empowering-the-next-wave-of-successful-smbs

### High-Performing Page Patterns to Borrow

| Site | Pattern worth using | Why it matters |
| --- | --- | --- |
| Vercel Agents | Explains the agent loop: prompt, reason, plan, act, output | Makes agent infrastructure feel understandable instead of abstract |
| Cloudflare Agents | Simple promise: agents that remember, reason, and act; immediate free/docs CTAs | Strong category language with specific primitives |
| E2B | Use-case tabs, developer proof, case studies, and code/product visual | Converts technical visitors by proving the runtime is real |
| Modal | "No Kubernetes, Docker, or AWS account" style objection removal | Makes infrastructure avoidance concrete |
| Replit Agent | Plain-language outcome: describe what you want, agent handles the work | Makes agents feel accessible to non-infra users |
| Railway | Clear deploy primitives: services, cron jobs, functions, variables, health checks | Turns cloud hosting into understandable operational pieces |

Sources:

- Vercel Agents: https://vercel.com/agents
- Cloudflare Agents: https://www.cloudflare.com/products/agents/
- E2B: https://e2b.dev/
- Modal docs: https://frontend.modal.com/docs/guide
- Replit Agent docs: https://docs.replit.com/core-concepts/agent
- Railway build and deploy docs: https://docs.railway.com/build-deploy
- Unbounce SaaS benchmark reference: https://unbounce.com/conversion-benchmark-report/saas-conversion-rate/

## Current Site Audit

Current flow:

1. Hero: "Your own Openclaw, without managing the hosting."
2. Product showcase: powered by Openclaw.
3. Use-case carousel: what people are doing with Openclaw.
4. Why ClawPilot: private instance, always on, minutes not days.
5. How it works: sign up, deploy Openclaw, start using it.
6. Local setup vs ClawPilot.
7. FAQ and CTA.

Main issues after Hermes support:

- The homepage reads as Openclaw-only.
- Hermes Agent is not introduced as a first-class runtime.
- "Hosting" is still the dominant value prop, which competitors can copy.
- The current page does not help visitors choose between Openclaw and Hermes.
- The comparison table only compares local setup vs ClawPilot, not "generic hosting vs managed agent runtime."
- FAQ does not handle the new question: "Which agent should I choose?"
- The proof section uses Openclaw ecosystem stats but does not show ClawPilot-specific product proof.

## Recommended Homepage Flow

Keep the design restrained and product-first. Do not make a loud AI landing page. Use existing ClawPilot primitives: neutral surfaces, compact cards, clear screenshots, and one primary CTA.

### 1. Hero

Goal: Say the new category in one scan.

Layout:

- Centered hero, existing mascot/logo treatment.
- Add a compact eyebrow: "Managed Openclaw + Hermes Agent hosting"
- H1 with two-line structure.
- One primary CTA and one secondary anchor.
- Below CTA, show runtime chips: Openclaw, Hermes Agent, private machine, BYOK, always-on.
- Replace decorative bottom channel row with "works through browser and supported chat channels" icons.

Copy:

**Eyebrow**

Managed Openclaw + Hermes Agent hosting

**H1**

Run Openclaw or Hermes Agent without managing a server.

**Subhead**

ClawPilot gives you a private, always-on agent machine in the cloud. Choose Openclaw for channel-connected automation, Hermes Agent for memory and self-improving workflows, then bring your model key and launch without VPS, Docker, or terminal setup.

**Primary CTA**

Start 3-day trial

**Secondary CTA**

Compare agents

**Trust microcopy**

Private runtime. Bring your own keys. Cancel anytime.

### 2. Runtime Choice

Goal: Help the visitor self-select instead of forcing them to understand both projects.

Layout:

- Two side-by-side cards on desktop, stacked on mobile.
- No heavy illustration. Use existing Openclaw logo and `public/hermesagentlogo.webp`.
- Each card has "Best for" bullets and a CTA.

Copy:

**Section title**

Choose the agent that fits the job.

**Description**

Openclaw and Hermes Agent are both powerful open-source runtimes. ClawPilot handles the machine, setup, updates, and launch flow so you can focus on what the agent should do.

**Openclaw card**

Title: Openclaw

Best for: chat-channel automation, personal assistant workflows, integrations, and skill-based routines.

Bullets:

- Connect messaging channels and web tools.
- Run an always-on assistant from a browser or chat app.
- Use the Openclaw ecosystem without maintaining the server.

CTA: Host Openclaw

**Hermes Agent card**

Title: Hermes Agent

Best for: memory-heavy workflows, scheduled work, terminal tasks, and agents that improve from repeated use.

Bullets:

- Persistent context and skill learning.
- Built-in scheduled automations and tool workflows.
- Nous Portal and BYOK model setup paths.

CTA: Host Hermes

**Small bridge copy**

Not sure yet? Start with one runtime and switch direction as your workflow becomes clearer.

### 3. Product Visual

Goal: Show that ClawPilot is a real product, not a thin hosting shell.

Layout:

- Replace the single Openclaw screenshot frame with a dashboard screenshot showing two runtime cards.
- A subtle segmented control above the image: Dashboard, Model setup, Channels, Launch.
- Keep one screenshot large. Do not create a busy grid.

Copy:

**Section title**

One dashboard for your hosted agents.

**Description**

Deploy, launch, configure models, and check runtime readiness from ClawPilot. Your agent runs on managed cloud infrastructure while you keep control of keys, channels, and connected tools.

Screenshot callouts:

- Runtime choice: Openclaw or Hermes Agent.
- Model setup: API key or supported OAuth route.
- Launch: secure hosted dashboard.
- Status: machine readiness and restart controls.

### 4. Why ClawPilot

Goal: Turn hosting features into objections removed.

Layout:

- Six compact feature cards, 3 x 2 desktop.
- Use lucide icons, no large decorative art.

Copy:

1. **Private agent machine**
   Your runtime is provisioned for your account, with isolated storage and configuration.

2. **Openclaw and Hermes ready**
   Pick the runtime that fits your workflow. We handle install, baseline configuration, and launch access.

3. **Always-on hosting**
   Keep your agent available without leaving a laptop, mini PC, or home server online.

4. **Bring your model keys**
   Use your preferred providers where supported. Keep control of model spend and credentials.

5. **Managed maintenance**
   Skip Docker, dependency updates, reverse proxies, SSL, restarts, and server health checks.

6. **Built for real workflows**
   Connect channels, run scheduled tasks, and give your agent a stable place to keep working.

### 5. "What Can I Do With It?"

Goal: Move from runtime to use case.

Layout:

- Four workflow cards.
- Each card shows "Use this runtime" chip.
- Keep copy concrete.

Copy:

**Section title**

Start with a workflow, not a blank server.

Cards:

1. **Personal operations assistant**
   Use Openclaw to handle recurring chat-based tasks, reminders, lookups, and lightweight workflows from the channels you already use.

2. **Research and reading agent**
   Use Hermes Agent to remember context, collect findings, summarize pages, and build reusable skills as your research repeats.

3. **Business inbox helper**
   Use Openclaw or Hermes to triage incoming messages, draft replies, and route follow-ups with your approval rules.

4. **Scheduled automations**
   Use Hermes Agent for cron-style jobs, recurring reports, daily briefings, and terminal-backed routines.

### 6. How It Works

Goal: Keep setup simple and credible.

Copy:

**Section title**

From signup to hosted agent in minutes.

1. **Choose a runtime**
   Pick Openclaw or Hermes Agent during setup.

2. **Connect the brain**
   Add a supported model provider, API key, or OAuth connection.

3. **Launch your agent**
   ClawPilot provisions the machine, installs the runtime, and gives you a secure launch path.

4. **Connect workflows**
   Add channels, tools, schedules, and prompts as your use case becomes real.

Bottom microcopy:

No VPS. No Docker. No reverse proxy. No terminal setup.

### 7. Comparison Table

Goal: Differentiate against local setup and generic hosting.

Layout:

- Three columns: Self-hosted, Generic VPS, ClawPilot.
- Use fewer rows than current table. Keep the text short.

Rows:

| Category | Self-hosted | Generic VPS | ClawPilot |
| --- | --- | --- | --- |
| Setup | You install and configure everything | You still configure the server | Runtime setup is handled for you |
| Agent choice | Depends on your install | Depends on your install | Openclaw or Hermes from onboarding |
| Uptime | Your hardware must stay online | You monitor and restart it | Managed machine and launch flow |
| Security | Your responsibility | Your responsibility | Managed baseline and isolated runtime |
| Updates | Manual | Manual | Maintenance handled by ClawPilot |
| Best for | Tinkerers and full-control users | Technical users who want root access | People who want the agent running first |

CTA below:

Start with managed hosting

### 8. Proof Section

Goal: Keep proof honest. Do not invent ClawPilot customer numbers.

Layout options:

- If ClawPilot has real metrics: use them.
- If not, use product proof and ecosystem proof separately.

Recommended proof blocks:

1. **Product proof**
   - Runtime deployed from dashboard.
   - Model settings managed from ClawPilot.
   - Secure launch route.
   - Openclaw and Hermes Agent support.

2. **Ecosystem proof**
   - Hermes official site claims GitHub stars, messaging platforms, tools, and terminal backends. Verify exact numbers before shipping.
   - Current site already references Openclaw ecosystem size. Verify exact numbers before shipping.

3. **Credibility proof**
   - Link to docs or release note explaining Hermes hosting.
   - Add changelog entry: "Hermes Agent hosting is now available."
   - Add a short founder note or product note if no testimonials exist yet.

Copy:

**Section title**

Open-source agents are powerful. ClawPilot makes them easier to keep running.

**Description**

Openclaw and Hermes Agent move quickly. ClawPilot gives you a managed place to try them, compare them, and keep the one that fits your workflow online.

### 9. FAQ

Goal: Handle the new objections.

Questions and answers:

**What is ClawPilot?**

ClawPilot is managed hosting for open-source AI agent runtimes. We provision a private cloud machine for your account, install Openclaw or Hermes Agent, and give you a dashboard for launch, model setup, and runtime management.

**What is the difference between Openclaw and Hermes Agent?**

Openclaw is a strong default for chat-channel automation, personal assistant workflows, and integration-heavy use cases. Hermes Agent is a strong default for memory-heavy workflows, scheduled jobs, terminal tasks, and agents that should improve from repeated use.

**Can I host both agents?**

The marketing site should say this only if the product supports it today. If one machine currently runs one runtime, use: "Each managed machine currently runs one runtime. You can choose Openclaw or Hermes Agent during deployment."

**Do I need to install anything?**

No. ClawPilot handles the hosted runtime setup. You create an account, choose a runtime, connect a supported model provider, and launch from your dashboard.

**Do I bring my own model key?**

Yes, where supported. ClawPilot is designed around user-controlled model setup, including API-key paths and supported OAuth routes.

**Is this the same as self-hosting?**

No. You still get a private runtime, but ClawPilot manages the server work: provisioning, setup, launch access, updates, and basic operational maintenance.

**Can I self-host later?**

Openclaw and Hermes Agent are open-source projects. ClawPilot is the managed path for people who want the agent running without maintaining infrastructure.

## Updated Page Copy by Current Component

### `components/ui/demo.tsx` Hero

Replace:

> Your own Openclaw, without managing the hosting.

With:

> Run Openclaw or Hermes Agent, without managing the server.

Replace subhead with:

> Choose an open-source agent runtime, connect your model provider, and launch a private always-on workspace in minutes. ClawPilot handles the VPS, Docker, updates, and uptime work.

Replace trial microcopy with:

> Includes a 3-day trial before billing begins.

Remove the party emoji to keep the tone consistent and avoid encoding issues.

### `components/product-showcase.tsx`

Replace "Powered by Openclaw" with:

> Hosted runtimes

Below it, show two labels:

- Openclaw
- Hermes Agent

Replace paragraph:

> Openclaw is one of the fastest-growing open-source AI projects in the world. ClawPilot lets you run it without touching a terminal.

With:

> Openclaw and Hermes Agent give you powerful open-source agent runtimes. ClawPilot gives them a private cloud machine, model setup, and a managed launch path.

Replace CTA:

> Launch your own

With:

> Choose your runtime

### `components/features.tsx`

Replace section title:

> Why ClawPilot

With:

> Agent hosting without the server work.

Replace description:

> All the power of Openclaw. None of the server work.

With:

> Run Openclaw or Hermes Agent on managed infrastructure built for always-on agent workflows.

Replace the three features with six if layout allows:

- Private agent machine
- Openclaw or Hermes Agent
- Always on
- Bring your model keys
- Managed maintenance
- Ready for real workflows

### `components/how-it-works.tsx`

Replace steps:

1. **Choose your agent**
   Pick Openclaw or Hermes Agent during setup.

2. **Connect your model**
   Add your supported provider, API key, or OAuth connection.

3. **We deploy the runtime**
   ClawPilot provisions the machine and prepares your hosted dashboard.

4. **Launch and connect workflows**
   Open your agent, add channels or tools, and start with a real task.

### `components/comparison-section.tsx`

Replace headline:

> Local setup vs ClawPilot

With:

> Self-hosting vs generic VPS vs ClawPilot

Recommended row copy is in the comparison table above.

Important: replace "Local setup: Not secure" with softer, accurate wording:

> Security is your responsibility.

### `components/faq-data.ts`

Add or replace FAQ items with the FAQ section above.

### `app/layout.tsx` Metadata

Current:

> ClawPilot | Your Own Openclaw in the Cloud

Recommended:

> ClawPilot | Managed Openclaw and Hermes Agent Hosting

Description:

> Run Openclaw or Hermes Agent on a private managed cloud machine. ClawPilot handles setup, hosting, updates, and uptime so your agent can stay online without VPS, Docker, or terminal work.

Keywords to include where relevant:

- managed Openclaw hosting
- Hermes Agent hosting
- hosted AI agent
- Openclaw cloud
- managed AI agent runtime
- private AI agent hosting

## Supporting Landing Pages

These pages can convert higher-intent visitors from search and competitor comparisons.

### `/hermes-agent-hosting`

Title:

> Hermes Agent hosting without the server setup.

Hero:

> Run Hermes Agent on a private managed cloud machine.

Subhead:

> Hermes Agent is built for memory, skills, scheduled work, terminal workflows, and repeated use. ClawPilot hosts it for you so you can start with the agent instead of configuring a VPS.

Sections:

1. What Hermes Agent is good for.
2. What ClawPilot manages.
3. Model and tool setup.
4. Hermes vs self-hosted.
5. FAQ.

CTA:

> Start hosted Hermes

### `/openclaw-hosting`

Title:

> Managed Openclaw hosting for always-on agent workflows.

Hero:

> Your own Openclaw, ready from the cloud.

Subhead:

> ClawPilot runs a private Openclaw instance for you so you can connect channels, bring your model key, and start using an always-on assistant without maintaining a server.

Sections:

1. Why host Openclaw.
2. Setup removed.
3. Channels and workflows.
4. Openclaw vs local setup.
5. FAQ.

CTA:

> Host Openclaw

### `/openclaw-vs-hermes-agent`

Title:

> Openclaw vs Hermes Agent: which should you host?

Hero:

> Openclaw and Hermes Agent solve different agent workflows.

Table:

| Need | Better starting point |
| --- | --- |
| Chat-channel assistant | Openclaw |
| Repeated workflows with memory | Hermes Agent |
| Broad integrations and skills | Openclaw |
| Scheduled terminal-backed jobs | Hermes Agent |
| First personal assistant | Openclaw |
| Self-improving task routines | Hermes Agent |

CTA:

> Start with the runtime that fits

### `/managed-ai-agent-hosting`

Title:

> Managed AI agent hosting for open-source runtimes.

Hero:

> Give your AI agent a private cloud machine.

Subhead:

> ClawPilot hosts Openclaw and Hermes Agent so your agent can stay online, keep its context, connect to tools, and run without you maintaining infrastructure.

Use this page for broader paid search or SEO outside branded Openclaw/Hermes queries.

## Screenshot and Asset Ideas

Use real product screenshots before illustrations. The buyer wants to see the thing they will get.

### Must-have screenshots

1. **Runtime selection**
   Show Openclaw and Hermes Agent as two clean cards inside onboarding.

2. **Dashboard with both runtime options**
   If only one runtime can be active per machine, show a selector plus current active runtime. Do not imply multiple live instances if not supported.

3. **Model setup**
   Show provider picker, API key/OAuth state, and save confirmation. This addresses a major setup fear.

4. **Launch screen**
   Show the secure launch button for Openclaw or Hermes Agent.

5. **Readiness/status panel**
   Show machine status, runtime status, model connected, and launch readiness.

6. **Channel/integration view**
   Show supported channel logos and a simple "connect in runtime" path.

### Optional assets

- Small Hermes Agent logo treatment using `public/hermesagentlogo.webp`.
- Runtime comparison icon pair: Openclaw logo and Hermes logo.
- One restrained diagram: "You -> ClawPilot -> private agent machine -> channels/tools/models."
- Short product GIF: choose runtime, connect model, launch dashboard.
- Open Graph image: "Managed Openclaw + Hermes Agent hosting" with dashboard screenshot.

### Avoid

- Generic robot illustrations.
- Large purple/blue AI gradients.
- Fake activity feeds.
- Claims like "1000+ users" unless they are verifiable.
- Dense terminal screenshots as the primary visual. Use terminal as supporting proof only.

## Conversion Techniques to Use

1. **One clear primary CTA**
   Use "Start 3-day trial" consistently. Secondary CTAs should scroll to comparison, not compete.

2. **Choice architecture**
   Give visitors a simple Openclaw vs Hermes choice. This reduces confusion and makes the new Hermes feature feel intentional.

3. **Objection removal**
   Repeat concrete removed work: no VPS, no Docker, no terminal, no reverse proxy, no update work.

4. **Proof near claims**
   Put product screenshots beside claims about launch, model setup, and runtime management.

5. **Specific use cases**
   Do not just say "AI agent." Say inbox helper, research agent, scheduled brief, chat-channel assistant.

6. **Honest security language**
   Use "managed baseline," "isolated runtime," and "you control connected tools." Avoid absolute claims like "secure" without detail.

7. **No fake urgency**
   The product is trust-sensitive. Avoid countdowns, hype language, or overpromising autonomous outcomes.

## Recommended Navigation

Keep nav short:

- Openclaw
- Hermes Agent
- Compare
- Pricing
- Blog
- Dashboard / Start trial

If nav space is tight, use:

- Agents
- Pricing
- Blog
- Dashboard

Where "Agents" opens a small menu with Openclaw, Hermes Agent, and Compare.

## Pricing Copy

If pricing is unchanged:

> One plan for managed agent hosting.

Description:

> Your subscription covers the private ClawPilot machine, managed setup, runtime launch access, maintenance, and dashboard controls. Model usage is separate unless explicitly included.

Pricing card bullets:

- Private hosted runtime
- Openclaw or Hermes Agent
- Managed setup and updates
- Secure dashboard launch
- Bring your model keys
- 3-day trial

CTA:

> Start 3-day trial

## Blog and Content Ideas

1. **Hermes Agent hosting is now available on ClawPilot**
   Announcement post. Explain what changed, who should use it, and how to deploy.

2. **Openclaw vs Hermes Agent: practical differences**
   SEO comparison post. Keep it balanced and decision-oriented.

3. **How to host Hermes Agent without a VPS**
   High-intent setup alternative page.

4. **What to run first on your hosted agent**
   Use-case post with 5 copy-paste starting prompts.

5. **Self-hosting vs managed agent hosting**
   Objection-handling post for technical visitors.

6. **Bring your own model key: what it means**
   Trust post explaining privacy, cost control, and setup.

## Suggested First Prompts for Marketing

Use these in screenshots, demos, or use-case cards.

**Openclaw prompt**

> Watch my Telegram messages for customer questions, draft replies in my tone, and ask before sending anything.

**Hermes Agent prompt**

> Every weekday morning, read the sources I care about, summarize what changed, and remember which topics I keep asking about.

**Research prompt**

> Research five companies that match this customer profile, summarize why each fits, and create a follow-up task list.

**Operations prompt**

> Check my calendar and inbox for anything that needs a reply today. Draft short responses and group them by urgency.

## Implementation Priority

1. Update homepage metadata and hero copy.
2. Add runtime choice section.
3. Update product showcase screenshot and copy.
4. Replace feature cards and how-it-works copy.
5. Update FAQ.
6. Add Hermes Agent hosting landing page.
7. Add Openclaw vs Hermes comparison page.
8. Add announcement blog post.

## Success Metrics

Track these before and after the copy update:

- Homepage CTA click-through rate.
- Signup start rate.
- Runtime selection split: Openclaw vs Hermes.
- Trial activation rate.
- Time from signup to first launch.
- FAQ expansion rate for "Openclaw vs Hermes."
- Search impressions for "Hermes Agent hosting" and "Openclaw Hermes hosting."

## Notes Before Shipping

- Verify exact Hermes Agent stats on the official Hermes site before using star/tool/platform numbers.
- Verify Openclaw stats currently displayed on the site before continuing to use them.
- Do not claim both runtimes can run simultaneously unless the product supports that today.
- If each managed machine supports one runtime, say that clearly.
- If Hermes support has limitations around providers, channels, OAuth, or tool gateway, list those limitations in FAQ instead of hiding them.
