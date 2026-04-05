import { faqItems } from "./faq-data"
import { siteUrl } from "@/lib/site"
import {
  ClawContainer,
  ClawSection,
  ClawSectionIntro,
  ClawSurface,
} from "@/components/ui/clawpilot"

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
    <ClawSection id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ClawContainer size="md">
        <ClawSectionIntro
          className="mb-12"
          description="Clear answers about hosted OpenClaw and easy setup with ClawPilot."
          title="FAQ"
        />

        <div className="space-y-4">
          {faqItems.map((item) => (
            <ClawSurface key={item.question} padding="md" radius="lg" tone="muted">
              <h3 className="type-h4 mb-2">{item.question}</h3>
              <p className="type-body-sm">{item.answer}</p>
            </ClawSurface>
          ))}
        </div>
      </ClawContainer>
    </ClawSection>
  )
}
