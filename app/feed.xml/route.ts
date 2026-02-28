import { getAllBlogPosts } from "@/lib/blog-posts"
import { siteName, siteUrl } from "@/lib/site"

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const posts = [...getAllBlogPosts()].sort((a, b) => {
    const aDate = new Date(a.updatedAt ?? a.publishedAt).getTime()
    const bDate = new Date(b.updatedAt ?? b.publishedAt).getTime()
    return bDate - aDate
  })

  const itemsXml = posts
    .map((post) => {
      const postUrl = `${siteUrl}/blog/${post.slug}`
      const date = new Date(post.updatedAt ?? post.publishedAt).toUTCString()

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid>${escapeXml(postUrl)}</guid>
      <pubDate>${escapeXml(date)}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`
    })
    .join("")

  const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)} Blog</title>
    <link>${escapeXml(`${siteUrl}/blog`)}</link>
    <atom:link href="${escapeXml(`${siteUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml("OpenClaw hosting guides, comparisons, and setup posts.")}</description>
    <language>en-us</language>${itemsXml}
  </channel>
</rss>`

  return new Response(feedXml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  })
}
