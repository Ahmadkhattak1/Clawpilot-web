const baseUrl = (process.env.SEO_AUDIT_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000").replace(
  /\/+$/,
  ""
)

const trainingBots = ["GPTBot", "Google-Extended", "anthropic-ai", "ClaudeBot"]
const retrievalBots = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "Googlebot"]
const privatePathFragments = [
  "/api/",
  "/dashboard",
  "/chat",
  "/channels",
  "/skills",
  "/settings",
  "/signup",
  "/sign-in",
  "/sign-up",
  "/confirm-email",
  "/set-password",
]

const failures = []

function fail(message) {
  failures.push(message)
}

function extractUrls(input) {
  const matches = input.match(/https?:\/\/[^\s)]+/g) ?? []
  return matches.map((match) => match.replace(/[.,;:!?]+$/, ""))
}

function extractLocs(xml) {
  const locRegex = /<loc>([^<]+)<\/loc>/g
  const urls = []
  let match = locRegex.exec(xml)
  while (match) {
    urls.push(match[1].trim())
    match = locRegex.exec(xml)
  }
  return urls
}

function getRobotsSection(robotsText, userAgent) {
  const sections = robotsText.split(/\n\s*\n/g)
  const target = `user-agent: ${userAgent}`.toLowerCase()
  return sections.find((section) => section.toLowerCase().includes(target)) ?? ""
}

async function fetchText(url) {
  const response = await fetch(url)
  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  }
}

async function main() {
  const base = new URL(baseUrl)
  const origin = base.origin

  const rewriteToBaseOrigin = (url) => {
    try {
      const parsed = new URL(url)
      parsed.protocol = base.protocol
      parsed.host = base.host
      return parsed.toString()
    } catch {
      return url
    }
  }

  const robotsResponse = await fetchText(`${baseUrl}/robots.txt`)
  if (!robotsResponse.ok) {
    fail(`robots.txt must return 200. Received ${robotsResponse.status}.`)
  } else {
    const robotsText = robotsResponse.text

    for (const bot of trainingBots) {
      const section = getRobotsSection(robotsText, bot)
      if (!section) {
        fail(`Missing robots section for training bot '${bot}'.`)
        continue
      }
      if (!/Disallow:\s*\/(?:\s|$)/i.test(section)) {
        fail(`Training bot '${bot}' must include 'Disallow: /'.`)
      }
    }

    for (const bot of retrievalBots) {
      const section = getRobotsSection(robotsText, bot)
      if (!section) {
        fail(`Missing robots section for retrieval bot '${bot}'.`)
        continue
      }
      if (!/Allow:\s*\//i.test(section)) {
        fail(`Retrieval bot '${bot}' must include an allow rule.`)
      }
    }
  }

  const sitemapResponse = await fetchText(`${baseUrl}/sitemap.xml`)
  if (!sitemapResponse.ok) {
    fail(`sitemap.xml must return 200. Received ${sitemapResponse.status}.`)
  }

  const sitemapUrls = sitemapResponse.ok ? extractLocs(sitemapResponse.text) : []
  if (sitemapUrls.length === 0) {
    fail("sitemap.xml did not contain any <loc> URLs.")
  }

  const sitemapOrigins = new Set(
    sitemapUrls
      .map((url) => {
        try {
          return new URL(url).origin
        } catch {
          return null
        }
      })
      .filter(Boolean)
  )

  for (const url of sitemapUrls) {
    for (const privateFragment of privatePathFragments) {
      if (url.includes(privateFragment)) {
        fail(`Private path found in sitemap: ${url}`)
        break
      }
    }

    const response = await fetch(rewriteToBaseOrigin(url))
    if (!response.ok) {
      fail(`Sitemap URL must return 200: ${url} (received ${response.status})`)
    }
  }

  const llmsPaths = ["/llms.txt", "/llms-full.txt"]
  for (const path of llmsPaths) {
    const response = await fetchText(`${baseUrl}${path}`)
    if (!response.ok) {
      fail(`${path} must return 200. Received ${response.status}.`)
      continue
    }

    const sameSiteUrls = extractUrls(response.text).filter((url) => {
      try {
        const parsed = new URL(url)
        return parsed.origin === origin || sitemapOrigins.has(parsed.origin)
      } catch {
        return false
      }
    })

    for (const url of sameSiteUrls) {
      const urlResponse = await fetch(rewriteToBaseOrigin(url))
      if (!urlResponse.ok) {
        fail(`LLMS URL must return 200: ${url} (received ${urlResponse.status})`)
      }
    }
  }

  const blogArticleUrls = sitemapUrls.filter((url) => {
    try {
      const pathname = new URL(url).pathname
      return pathname.startsWith("/blog/") && pathname !== "/blog"
    } catch {
      return false
    }
  })

  for (const url of blogArticleUrls) {
    const response = await fetchText(rewriteToBaseOrigin(url))
    if (!response.ok) {
      fail(`Blog URL must return 200: ${url} (received ${response.status})`)
      continue
    }

    if (!response.text.includes('"@type":"BlogPosting"')) {
      fail(`BlogPosting schema missing from ${url}`)
    }
    if (!response.text.includes('"@type":"BreadcrumbList"')) {
      fail(`BreadcrumbList schema missing from ${url}`)
    }
  }

  if (failures.length > 0) {
    console.error("\nSEO audit failed:")
    for (const [index, message] of failures.entries()) {
      console.error(`${index + 1}. ${message}`)
    }
    process.exit(1)
  }

  console.log("SEO audit passed.")
}

main().catch((error) => {
  console.error("SEO audit crashed:", error)
  process.exit(1)
})
