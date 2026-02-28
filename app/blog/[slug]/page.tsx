import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BlogArticle } from "@/components/blog/blog-article"
import { BlogBreadcrumbSchema, BlogPostingSchema } from "@/components/blog/blog-schema"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { getBlogPostBySlug, getBlogPostSlugs, getRelatedBlogPosts } from "@/lib/blog-posts"
import { siteName, siteUrl } from "@/lib/site"

type BlogPostPageProps = {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return getBlogPostSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    return { title: "Post not found" }
  }

  const dateModified = post.updatedAt ?? post.publishedAt
  const authorName = post.authorName ?? `${siteName} Editorial Team`
  const authorUrl = post.authorUrl ?? siteUrl

  return {
    title: post.title,
    description: post.description,
    authors: [{ name: authorName, url: authorUrl }],
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    keywords: [post.primaryKeyword],
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
      siteName,
      publishedTime: post.publishedAt,
      modifiedTime: dateModified,
      authors: [authorName],
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
      title: post.title,
      description: post.description,
      images: ["/logo.svg"],
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = getRelatedBlogPosts(post.slug, 3)

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <BlogPostingSchema post={post} />
      <BlogBreadcrumbSchema post={post} />
      <Header />
      <BlogArticle post={post} relatedPosts={relatedPosts} />
      <Footer />
    </main>
  )
}
