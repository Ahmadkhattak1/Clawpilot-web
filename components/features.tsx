import { Cloud, Clock, Zap } from "lucide-react"

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
    <section id="why-clawpilot" className="relative px-6 py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Why ClawPilot
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
          All the power of OpenClaw. None of the server work.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border/50 bg-card/80 p-6"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-background">
                <feature.icon className="h-5 w-5 text-foreground/70" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
