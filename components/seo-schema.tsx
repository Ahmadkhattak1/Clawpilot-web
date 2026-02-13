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
        logo: `${siteUrl}/logo.png`,
      },
      {
        "@type": "WebSite",
        name: "ClawPilot",
        url: siteUrl,
        description:
          "ClawPilot hosts OpenClaw for you so you can use it in your chat apps without setup or uptime management overhead.",
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        name: "ClawPilot",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        isAccessibleForFree: false,
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
