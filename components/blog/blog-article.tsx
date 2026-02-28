import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"

import type { BlogPost } from "@/lib/blog-posts"

type BlogArticleProps = {
  post: BlogPost
  relatedPosts: BlogPost[]
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

const markdownComponents: Components = {
  h2: ({ children }) => <h2 className="mt-10 text-3xl font-semibold tracking-tight text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 text-2xl font-semibold tracking-tight text-foreground">{children}</h3>,
  p: ({ children }) => <p className="mt-4 text-base leading-relaxed text-foreground">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-base text-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-base text-foreground">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="underline underline-offset-4 hover:no-underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border/60">
      <table className="min-w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-secondary/40">{children}</thead>,
  th: ({ children }) => <th className="border-b border-border/60 px-3 py-2 font-semibold text-foreground">{children}</th>,
  td: ({ children }) => <td className="border-b border-border/40 px-3 py-2 align-top text-foreground">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="mt-6 rounded-r border-l-4 border-border bg-secondary/20 px-4 py-3 text-sm italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.92em] text-foreground">{children}</code>
  ),
}

export function BlogArticle({ post, relatedPosts }: BlogArticleProps) {
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

        <div className="mt-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {post.content}
          </ReactMarkdown>
        </div>

        {relatedPosts.length > 0 ? (
          <aside className="mt-12 rounded-2xl border border-border/60 bg-secondary/20 p-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Related posts</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {relatedPosts.map((relatedPost) => (
                <li key={relatedPost.slug}>
                  <Link
                    href={`/blog/${relatedPost.slug}`}
                    className="underline underline-offset-4 hover:no-underline"
                  >
                    {relatedPost.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </article>
    </section>
  )
}
