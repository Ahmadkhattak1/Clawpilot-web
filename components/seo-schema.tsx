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
          "ClawPilot provides managed OpenClaw hosting. Get your own private OpenClaw instance in the cloud with no servers, no Docker, and no terminal.",
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
        name: "ClawPilot | Your Own OpenClaw in the Cloud",
        description:
          "Get a private OpenClaw instance running in minutes. ClawPilot handles hosting, updates, and uptime so you can focus on what your AI assistant does.",
        inLanguage: "en",
        isPartOf: {
          "@id": `${siteUrl}#website`,
        },
        keywords: [
          "OpenClaw hosting",
          "managed OpenClaw",
          "OpenClaw cloud",
          "private OpenClaw instance",
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
          "Managed OpenClaw hosting. A private, always-on OpenClaw instance in the cloud with no server setup required.",
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
