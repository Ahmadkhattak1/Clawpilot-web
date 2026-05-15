const DEFAULT_SITE_URL = "https://clawpilot.app"

function normalizeSiteUrl(value?: string): string {
  const raw = value?.trim() ? value.trim() : DEFAULT_SITE_URL
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`

  try {
    const parsed = new URL(withProtocol)
    const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"])
    if (blockedHosts.has(parsed.hostname)) {
      return DEFAULT_SITE_URL
    }

    return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, "")
  } catch {
    return DEFAULT_SITE_URL
  }
}

export const siteName = "ClawPilot"
export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
export const siteLastUpdatedAt = "2026-05-14"
const siteOgImageUrl = `${siteUrl}/og-img.png`
export const siteOgImage = {
  url: siteOgImageUrl,
  secureUrl: siteOgImageUrl,
  type: "image/png",
  width: 1672,
  height: 941,
  alt: "ClawPilot managed Openclaw and Hermes Agent hosting",
} as const

export const seoKeywords = [
  "Openclaw agents",
  "Openclaw outreach agent",
  "Openclaw support agent",
  "Openclaw lead gen agent",
  "Openclaw competitor monitor",
  "Openclaw hosting",
  "Openclaw cloud hosting",
  "hosted Openclaw",
  "managed Openclaw",
  "Openclaw managed service",
  "Hermes Agent hosting",
  "managed Hermes Agent",
  "hosted Hermes Agent",
  "Hermes AI agent hosting",
  "Hermes Agent cloud hosting",
  "Hermes Agent VPS hosting",
  "deploy Hermes Agent",
  "self host Hermes Agent",
  "AI agent hosting",
  "managed AI agent hosting",
  "private AI agent hosting",
  "cloud agent runtime",
  "Openclaw VPS hosting",
  "Openclaw VPS setup",
  "deploy Openclaw agents",
  "Openclaw automation",
  "WhatsApp support automation",
  "Openclaw WhatsApp automation",
  "cold email automation",
  "competitor monitoring automation",
  "Openclaw WhatsApp",
  "Openclaw Telegram",
  "Openclaw Discord",
  "Openclaw Slack",
  "Openclaw CRM automation",
  "AI sales agent",
  "AI support agent",
  "ClawPilot",
]

export const publicMarketingRoutes = [
  "/",
  "/blog",
  "/ai-agent-hosting",
  "/openclaw-hosting",
  "/managed-openclaw",
  "/openclaw-vps-hosting",
  "/openclaw-whatsapp-automation",
  "/hermes-agent-hosting",
  "/managed-hermes-agent",
  "/hermes-agent-vps-hosting",
  "/terms",
  "/privacy",
  "/disclaimer",
] as const
