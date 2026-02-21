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
  "OpenClaw easy setup",
  "easy OpenClaw setup",
  "easy open claw setup",
  "easy open claw",
  "OpenClaw setup",
  "OpenClaw setup without server",
  "OpenClaw hosting",
  "hosted OpenClaw",
  "managed OpenClaw",
  "OpenClaw WhatsApp",
  "OpenClaw Telegram",
  "OpenClaw iMessage",
  "OpenClaw Slack",
  "OpenClaw Discord",
  "OpenClaw Signal",
  "AI chat assistant",
  "ClawPilot",
]

export const publicMarketingRoutes = ["/", "/openclaw-easy-setup"] as const
