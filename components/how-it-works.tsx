const steps = [
  {
    number: "1",
    text: "Pick your agent.",
  },
  {
    number: "2",
    text: "Tell us your business. ICP, product, tone, tools.",
  },
  {
    number: "3",
    text: "Approve and launch. It runs 24/7 on our infrastructure.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="type-h2 text-center">How It Works</h2>

        <div className="mt-8 space-y-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex items-start gap-4 rounded-xl border border-border/55 bg-secondary/35 p-5"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80 text-sm font-semibold">
                {step.number}
              </span>
              <p className="text-sm leading-relaxed text-foreground/90 md:text-base">{step.text}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm font-medium text-foreground/80 md:text-base">
          Days, not months. No Docker. No terminal.
        </p>
      </div>
    </section>
  )
}
