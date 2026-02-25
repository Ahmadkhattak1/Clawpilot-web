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
        logo: `${siteUrl}/logo.svg`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: siteName,
        url: siteUrl,
        description:
          "ClawPilot deploys OpenClaw agents for outreach, support, lead generation, and competitor monitoring with managed hosting and uptime.",
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
        name: "ClawPilot | Deploy OpenClaw Agents That Work on Day 1",
        description:
          "Deploy OpenClaw agents for outreach, lead response, WhatsApp support, and competitor monitoring. ClawPilot handles hosting, workflows, and uptime.",
        inLanguage: "en",
        isPartOf: {
          "@id": `${siteUrl}#website`,
        },
        keywords: [
          "OpenClaw agents",
          "OpenClaw outreach agent",
          "OpenClaw support agent",
          "OpenClaw lead gen agent",
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
          "Managed OpenClaw infrastructure that runs production agents for outreach, support, lead generation, and monitoring.",
        brand: {
          "@id": `${siteUrl}#organization`,
        },
        license: "https://github.com/openclaw/openclaw/blob/main/LICENSE",
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
