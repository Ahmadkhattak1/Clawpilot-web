import { faqItems } from "./faq-data"

export function FAQ() {
  return (
    <section id="faq" className="relative px-6 py-16 md:py-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="type-h2 mb-4">
            FAQ
          </h2>
          <p className="type-body">
            Clear answers about hosted OpenClaw with ClawPilot.
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item) => (
            <div key={item.question} className="rounded-xl border border-border/50 bg-secondary/40 p-5">
              <h3 className="type-h4 mb-2">
                {item.question}
              </h3>
              <p className="type-body-sm">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
