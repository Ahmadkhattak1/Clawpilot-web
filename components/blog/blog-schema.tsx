import type { BlogPost } from "@/lib/blog-posts"
import { siteName, siteUrl } from "@/lib/site"

type JsonLdProps = {
  data: Record<string, unknown>
}

function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

function getDateModified(post: BlogPost): string {
  return post.updatedAt ?? post.publishedAt
}

function getAuthorName(post: BlogPost): string {
  return post.authorName ?? `${siteName} Editorial Team`
}

function getAuthorUrl(post: BlogPost): string {
  return post.authorUrl ?? siteUrl
}

export function BlogPostingSchema({ post }: { post: BlogPost }) {
  const articleUrl = `${siteUrl}/blog/${post.slug}`
  const dateModified = getDateModified(post)
  const authorName = getAuthorName(post)
  const authorUrl = getAuthorUrl(post)

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${articleUrl}#blogposting`,
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified,
    mainEntityOfPage: articleUrl,
    keywords: [post.primaryKeyword],
    inLanguage: "en-US",
    author: {
      "@type": "Person",
      name: authorName,
      url: authorUrl,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: siteName,
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.webp`,
      },
    },
    image: [`${siteUrl}/logo.webp`],
  } satisfies Record<string, unknown>

  return <JsonLd data={schema} />
}

export function BlogBreadcrumbSchema({ post }: { post: BlogPost }) {
  const articleUrl = `${siteUrl}/blog/${post.slug}`

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${articleUrl}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: articleUrl,
      },
    ],
  } satisfies Record<string, unknown>

  return <JsonLd data={schema} />
}

export function BlogCollectionSchema({ posts }: { posts: BlogPost[] }) {
  const latestDate = posts.reduce((latest, post) => {
    const postDate = getDateModified(post)
    return postDate > latest ? postDate : latest
  }, posts[0]?.publishedAt ?? "")

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}/blog#collection`,
    url: `${siteUrl}/blog`,
    name: `${siteName} Blog`,
    description: "OpenClaw hosting guides, comparisons, and setup posts.",
    inLanguage: "en-US",
    dateModified: latestDate || undefined,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: posts.length,
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/blog/${post.slug}`,
        name: post.title,
      })),
    },
  } satisfies Record<string, unknown>

  return <JsonLd data={schema} />
}
