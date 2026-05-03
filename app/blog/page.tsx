import type { Metadata } from "next"

import { BlogIndex } from "@/components/blog/blog-index"
import { BlogCollectionSchema } from "@/components/blog/blog-schema"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { getAllBlogPosts } from "@/lib/blog-posts"
import { siteName, siteOgImage } from "@/lib/site"

export const metadata: Metadata = {
  title: "Blog",
  description: "OpenClaw hosting guides, comparisons, and setup posts.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: `${siteName} Blog`,
    description: "OpenClaw hosting guides, comparisons, and setup posts.",
    url: "/blog",
    siteName,
    type: "website",
    images: [siteOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} Blog`,
    description: "OpenClaw hosting guides, comparisons, and setup posts.",
    images: [siteOgImage.url],
  },
}

export default function BlogPage() {
  const posts = getAllBlogPosts()

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <BlogCollectionSchema posts={posts} />
      <Header />
      <BlogIndex posts={posts} />
      <Footer />
    </main>
  )
}
