import type { MetadataRoute } from "next"
import { getBlogPostSlugs } from "@/lib/blog-posts"
import { publicMarketingRoutes, siteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  const blogPaths = ["/blog", ...getBlogPostSlugs().map((slug) => `/blog/${slug}`)]

  const publicPaths = Array.from(
    new Set([
      ...publicMarketingRoutes,
      ...blogPaths,
      "/signin",
      "/feed.xml",
      "/llms.txt",
      "/llms-full.txt",
    ])
  )

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
        userAgent: ["GPTBot", "Google-Extended", "anthropic-ai", "ClaudeBot"],
        disallow: ["/"],
      },
      {
        userAgent: ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "Googlebot"],
        allow: publicPaths,
      },
    ],
    host: siteUrl,
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
