import { faqItems } from "./faq-data"

export function FAQ() {
  return (
    <section id="faq" className="relative py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
            FAQ
          </h2>
          <p className="text-muted-foreground text-[15px]">
            Clear answers about OpenClaw and how ClawPilot helps you.
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item) => (
            <div key={item.question} className="rounded-xl border border-border/50 bg-secondary/40 p-5">
              <h3 className="font-display text-[15px] font-semibold mb-2">
                {item.question}
              </h3>
              <p className="text-muted-foreground text-[14px] leading-relaxed">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
