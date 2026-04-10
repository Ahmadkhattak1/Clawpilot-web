import Link from "next/link"
import { ArrowRight } from "lucide-react"

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

        <div className="mt-8 flex justify-center">
          <Link
            href="#get-started"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-foreground/75"
          >
            Ready to try it?
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </ClawContainer>
    </ClawSection>
  )
}
