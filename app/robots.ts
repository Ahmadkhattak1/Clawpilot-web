import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  const publicPaths = [
    "/",
    "/openclaw-easy-setup",
    "/terms",
    "/privacy",
    "/disclaimer",
    "/signin",
    "/llms.txt",
    "/llms-full.txt",
  ]

  return {
    rules: [
      {
        userAgent: "*",
        allow: publicPaths,
        disallow: [
          "/api/",
          "/dashboard/",
          "/chat",
          "/channels",
          "/skills",
          "/settings",
          "/signup",
          "/sign-in",
          "/sign-up",
          "/confirm-email",
          "/set-password",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "anthropic-ai",
          "ClaudeBot",
          "PerplexityBot",
          "CCBot",
        ],
        allow: publicPaths,
      },
    ],
    host: siteUrl,
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
