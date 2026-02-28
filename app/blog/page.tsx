import type { Metadata } from "next"

import { BlogIndex } from "@/components/blog/blog-index"
import { BlogCollectionSchema } from "@/components/blog/blog-schema"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { getAllBlogPosts } from "@/lib/blog-posts"
import { siteName } from "@/lib/site"

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
    images: [
      {
        url: "/logo.svg",
        width: 512,
        height: 512,
        alt: "ClawPilot mascot logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} Blog`,
    description: "OpenClaw hosting guides, comparisons, and setup posts.",
    images: ["/logo.svg"],
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
