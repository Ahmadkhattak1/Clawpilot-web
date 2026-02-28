import Link from "next/link"

import type { BlogPost } from "@/lib/blog-posts"

type BlogIndexProps = {
  posts: BlogPost[]
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function BlogIndex({ posts }: BlogIndexProps) {
  return (
    <section className="relative px-6 pb-20 pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">Blog</p>
          <p className="text-xs text-muted-foreground/75">{posts.length} posts</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <article key={post.slug} className="rounded-2xl border border-border/70 bg-card/80 p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/75">
                <span>{formatDate(post.publishedAt)}</span>
                <span>•</span>
                <span>{post.readMinutes} min read</span>
              </div>

              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                <Link href={`/blog/${post.slug}`} className="underline-offset-4 hover:underline">
                  {post.title}
                </Link>
              </h2>

              <p className="mt-3 text-sm text-muted-foreground">{post.description}</p>
              <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground/75">{post.primaryKeyword}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
