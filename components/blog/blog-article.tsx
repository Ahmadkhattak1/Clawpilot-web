import { isValidElement, type ReactElement, type ReactNode } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"

import { CopyableBlock } from "@/components/ui/copyable-block"
import type { BlogPost } from "@/lib/blog-posts"
import { cn } from "@/lib/utils"

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

function extractTextContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(extractTextContent).join("")
  }

  if (!node) {
    return ""
  }

  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>
    return extractTextContent(element.props.children)
  }

  return ""
}

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-12 text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem]">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-8 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{children}</h3>,
  p: ({ children }) => <p className="mt-5 text-[1.02rem] leading-8 text-foreground/90">{children}</p>,
  ul: ({ children }) => (
    <ul className="mt-5 space-y-3 text-[1.02rem] text-foreground/88 [&>li]:relative [&>li]:pl-6 [&>li]:leading-8 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[1rem] [&>li]:before:h-px [&>li]:before:w-3 [&>li]:before:bg-foreground/30">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-5 list-decimal space-y-3 pl-6 text-[1.02rem] text-foreground/88 marker:text-foreground/45">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
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
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  table: ({ children }) => (
    <div className="mt-8 overflow-x-auto rounded-xl border border-border/50">
      <table className="min-w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-secondary/20">{children}</thead>,
  th: ({ children }) => <th className="border-b border-border/50 px-3 py-2 font-medium text-foreground">{children}</th>,
  td: ({ children }) => <td className="border-b border-border/30 px-3 py-2 align-top text-foreground/88">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="mt-8 border-l border-border/60 pl-5 text-[1.02rem] leading-8 text-muted-foreground">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <CopyableBlock value={extractTextContent(children).replace(/\n$/, "")}>
      <pre>{children}</pre>
    </CopyableBlock>
  ),
  code: ({ className, children }) => (
    <code
      className={cn(
        "font-mono text-[0.92em] text-foreground",
        className ? className : "rounded bg-secondary px-1.5 py-0.5"
      )}
    >
      {children}
    </code>
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
          <span>/</span>
          <span>{post.readMinutes} min read</span>
          <span>/</span>
          <span>{post.primaryKeyword}</span>
        </div>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{post.description}</p>

        <div className="mt-12">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {post.content}
          </ReactMarkdown>
        </div>

        {relatedPosts.length > 0 ? (
          <aside className="mt-14 rounded-2xl border border-border/60 bg-secondary/15 p-6">
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
