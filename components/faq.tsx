import { faqItems } from "./faq-data"
import { siteUrl } from "@/lib/site"

export function FAQ() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl}/#faq`,
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }

  return (
    <section id="faq" className="relative px-6 py-16 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="type-h2 mb-4">
            FAQ
          </h2>
          <p className="type-body">
            Clear answers about hosted OpenClaw and easy setup with ClawPilot.
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
