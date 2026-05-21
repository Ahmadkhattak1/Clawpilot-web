import type { Metadata } from "next"

import { BlogIndex } from "@/components/blog/blog-index"
import { BlogCollectionSchema } from "@/components/blog/blog-schema"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { getAllBlogPosts } from "@/lib/blog-posts"
import { siteName, siteOgImage } from "@/lib/site"

export const metadata: Metadata = {
  title: "Openclaw Setup, Hosting, and Agent Guides",
  description:
    "Openclaw setup guides, hosting comparisons, Openclaw alternatives, and Hermes Agent articles for teams choosing managed agent runtimes.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: `${siteName} Blog`,
    description:
      "Openclaw setup guides, hosting comparisons, Openclaw alternatives, and Hermes Agent articles for teams choosing managed agent runtimes.",
    url: "/blog",
    siteName,
    type: "website",
    images: [siteOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} Blog`,
    description:
      "Openclaw setup guides, hosting comparisons, Openclaw alternatives, and Hermes Agent articles for teams choosing managed agent runtimes.",
    images: [siteOgImage],
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
