import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import type { BlogPost } from "@/lib/blog-posts"

type BlogArticleProps = {
  post: BlogPost
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function BlogArticle({ post }: BlogArticleProps) {
  return (
    <section className="relative px-6 pb-20 pt-28">
      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Back to blog
        </Link>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{post.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
          <span>{formatDate(post.publishedAt)}</span>
          <span>•</span>
          <span>{post.readMinutes} min read</span>
          <span>•</span>
          <span>{post.primaryKeyword}</span>
        </div>

        <p className="mt-5 text-base text-muted-foreground">{post.description}</p>

        <div className="prose prose-neutral mt-10 max-w-none prose-headings:tracking-tight prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
      </article>
    </section>
  )
}
