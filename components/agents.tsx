import Image from "next/image"

const agents = [
  {
    imageSrc: "/site-images/email-funnel.svg",
    imageAlt: "Outreach pipeline artwork",
    title: "The Outreach Agent",
    description:
      "Finds prospects. Sends cold emails. Reads replies. Books meetings. You show up to the call.",
    replacement: "Replaces an SDR's daily email grind.",
  },
  {
    imageSrc: "/site-images/reply-agent.svg",
    imageAlt: "Reply automation artwork",
    title: "The Support Agent",
    description:
      "Lives on your WhatsApp. Answers customers instantly. Escalates when it should.",
    replacement: "Replaces 1-2 support hires handling the same 40 questions.",
  },
  {
    imageSrc: "/site-images/leads.png",
    imageAlt: "Lead generation workflow artwork",
    title: "The Lead Gen Agent",
    description:
      "Finds companies, finds decision-makers, verifies emails, scores fit, pushes to your CRM. Full pipeline while you sleep.",
    replacement: "Replaces a VA doing 20 hours/week of manual prospecting.",
  },
  {
    imageSrc: "/site-images/monitoring.svg",
    imageAlt: "Competitor monitoring artwork",
    title: "The Competitor Monitor",
    description:
      "Watches pricing, launches, job postings, and social — 24/7. Alerts you the moment something moves.",
    replacement: "Replaces checking competitor sites every few days and missing everything.",
  },
  {
    imageSrc: "/site-images/mascot-tools.png",
    imageAlt: "OpenClaw toolkit artwork",
    title: "Raw OpenClaw",
    description:
      "Full framework, your rules. We handle servers, updates, and uptime. You build whatever you want.",
    replacement: "For teams that want the power without the DevOps.",
  },
]

export function Agents() {
  return (
    <section id="agents" className="relative px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="type-h2 max-w-4xl text-balance">
          Pick an Agent. It Does One Job. It Does It Every Day.
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {agents.map((agent) => {
            return (
              <article
                key={agent.title}
                className="rounded-2xl border border-border/55 bg-secondary/35 p-6"
              >
                <div className="mb-5 overflow-hidden rounded-xl border border-border/60 bg-background/75 p-3">
                  <Image
                    src={agent.imageSrc}
                    alt={agent.imageAlt}
                    width={1536}
                    height={1024}
                    className="h-[170px] w-full object-contain"
                  />
                </div>
                <h3 className="type-h4">{agent.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90 md:text-base">
                  {agent.description}
                </p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-foreground/75">
                  {agent.replacement}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
