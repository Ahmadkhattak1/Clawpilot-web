import { faqItems } from "./faq-data"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export function SeoSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "ClawPilot",
        url: siteUrl,
        logo: `${siteUrl}/logo.svg`,
      },
      {
        "@type": "WebSite",
        name: "ClawPilot",
        url: siteUrl,
        description:
          "ClawPilot is the easiest way to install and manage OpenClaw, the open source personal AI that works inside your chat apps.",
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        name: "OpenClaw",
        applicationCategory: "ProductivityApplication",
        operatingSystem: "macOS, Windows, Linux",
        isAccessibleForFree: true,
        license: "https://github.com/openclaw/openclaw/blob/main/LICENSE",
      },
      {
        "@type": "FAQPage",
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
