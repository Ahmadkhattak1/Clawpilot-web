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
        logo: `${siteUrl}/logo.webp`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: siteName,
        url: siteUrl,
        description:
          "ClawPilot provides managed AI agent hosting for Openclaw and Hermes Agent.",
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
        name: "ClawPilot | Managed Openclaw and Hermes Agent Hosting",
        description:
          "Private Openclaw and Hermes Agent hosting with no VPS, Docker, or terminal setup.",
        inLanguage: "en",
        isPartOf: {
          "@id": `${siteUrl}#website`,
        },
        keywords: [
          "Openclaw hosting",
          "managed Openclaw",
          "Openclaw job search",
          "Openclaw job applications",
          "Hermes Agent hosting",
          "managed Hermes Agent",
          "Hermes Agent beginner setup",
          "Hermes Agent job search",
          "Hermes Agent business automation",
          "hosted Hermes Agent",
          "Hermes AI agent hosting",
          "AI agent hosting",
          "Openclaw cloud",
          "private AI agent hosting",
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
          "Managed Openclaw and Hermes Agent hosting with no server setup required.",
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
