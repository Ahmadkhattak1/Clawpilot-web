import type { Metadata } from "next"

import { BlogIndex } from "@/components/blog/blog-index"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { getAllBlogPosts } from "@/lib/blog-posts"

export const metadata: Metadata = {
  title: "Blog",
  description: "OpenClaw hosting guides, comparisons, and setup posts.",
  alternates: {
    canonical: "/blog",
  },
}

export default function BlogPage() {
  const posts = getAllBlogPosts()

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <Header />
      <BlogIndex posts={posts} />
      <Footer />
    </main>
  )
}
