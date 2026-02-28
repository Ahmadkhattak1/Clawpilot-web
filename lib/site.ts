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

export const seoKeywords = [
  "OpenClaw agents",
  "OpenClaw outreach agent",
  "OpenClaw support agent",
  "OpenClaw lead gen agent",
  "OpenClaw competitor monitor",
  "OpenClaw hosting",
  "hosted OpenClaw",
  "managed OpenClaw",
  "deploy OpenClaw agents",
  "OpenClaw automation",
  "WhatsApp support automation",
  "cold email automation",
  "competitor monitoring automation",
  "OpenClaw WhatsApp",
  "OpenClaw Telegram",
  "OpenClaw CRM automation",
  "AI sales agent",
  "AI support agent",
  "ClawPilot",
]

export const publicMarketingRoutes = [
  "/",
  "/blog",
  "/terms",
  "/privacy",
  "/disclaimer",
] as const
