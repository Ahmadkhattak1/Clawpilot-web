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
    <section id="how-it-works" className="relative px-6 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          How It Works
        </h2>

        <div className="mt-10 space-y-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex items-start gap-4 rounded-xl border border-border/50 bg-card/80 p-5"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {step.number}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          No Docker. No terminal. No DevOps experience needed.
        </p>
      </div>
    </section>
  )
}
