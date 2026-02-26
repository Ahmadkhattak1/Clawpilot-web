import Image from "next/image"

export function SocialProof() {
  return (
    <section className="relative px-6 py-12 md:py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
          Powered by
        </p>
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="OpenClaw"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            OpenClaw
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">191K+</span>
            <span className="text-xs text-muted-foreground">GitHub stars</span>
          </div>
          <div className="hidden h-3.5 w-px bg-border/60 sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">900+</span>
            <span className="text-xs text-muted-foreground">contributors</span>
          </div>
          <div className="hidden h-3.5 w-px bg-border/60 sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">50+</span>
            <span className="text-xs text-muted-foreground">integrations</span>
          </div>
        </div>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          OpenClaw is one of the fastest-growing open-source AI projects in the world.
          ClawPilot lets you run it without touching a terminal.
        </p>
      </div>
    </section>
  )
}
