import { faqItems } from "./faq-data"
import { seoKeywords, siteName, siteUrl } from "@/lib/site"

export function SeoSchema() {
  const keywordText = seoKeywords.join(", ")

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: siteName,
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: siteName,
        url: siteUrl,
        description:
          "ClawPilot provides easy OpenClaw setup with managed hosting, updates, and uptime.",
        inLanguage: "en",
        keywords: keywordText,
        publisher: {
          "@id": `${siteUrl}#organization`,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: siteUrl,
        name: "ClawPilot | OpenClaw Easy Setup Without Server Work",
        description:
          "Easy OpenClaw setup from ClawPilot. Launch hosted OpenClaw without hardware, terminal setup, or maintenance work.",
        inLanguage: "en",
        isPartOf: {
          "@id": `${siteUrl}#website`,
        },
        keywords: [
          "OpenClaw easy setup",
          "easy OpenClaw setup",
          "easy open claw",
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}#software`,
        name: siteName,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        isAccessibleForFree: false,
        url: siteUrl,
        description:
          "Managed OpenClaw hosting that gives teams easy setup and always-on reliability.",
        brand: {
          "@id": `${siteUrl}#organization`,
        },
        license: "https://github.com/openclaw/openclaw/blob/main/LICENSE",
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}#faq`,
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
