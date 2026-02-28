import type { MetadataRoute } from "next"
import { getAllBlogPosts } from "@/lib/blog-posts"
import { publicMarketingRoutes, siteLastUpdatedAt, siteUrl } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const siteLastModified = new Date(siteLastUpdatedAt)
  const pageEntries = publicMarketingRoutes.map((path) => ({
    url: path === "/" ? siteUrl : `${siteUrl}${path}`,
    lastModified: siteLastModified,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.9,
  })) satisfies MetadataRoute.Sitemap

  const machineReadableEntries = [
    {
      url: `${siteUrl}/llms.txt`,
      lastModified: siteLastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/llms-full.txt`,
      lastModified: siteLastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/feed.xml`,
      lastModified: siteLastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
  ]

  const blogEntries = getAllBlogPosts().map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  return [...pageEntries, ...blogEntries, ...machineReadableEntries]
}
