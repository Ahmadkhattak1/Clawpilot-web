export function Features() {
  return (
    <section id="why-clawpilot" className="relative px-6 py-16 md:py-20">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border/60 bg-secondary/35 p-6 md:p-8">
        <h2 className="type-h2 text-balance">They sell infrastructure. We sell outcomes.</h2>

        <div className="mt-7 space-y-3">
          <div className="rounded-xl border border-border/55 bg-background/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Others</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90 md:text-base">
              A VPS with OpenClaw installed → you figure it out.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-300/55 bg-emerald-50/60 p-4 dark:border-emerald-700/55 dark:bg-emerald-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Clawpilot
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90 md:text-base">
              An agent doing a job on Day 1 → you collect results.
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-foreground/85 md:text-base">
          One price. Hosting, config, workflows, monitoring — all included. No surprise token bills.
        </p>
      </div>
    </section>
  )
}
