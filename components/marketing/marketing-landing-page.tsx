import Link from "next/link"
import { ArrowRight, CheckCircle2, Gauge, ShieldCheck, Sparkles } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import type { LandingPageConfig } from "@/lib/landing-pages"
import { siteUrl } from "@/lib/site"

type MarketingLandingPageProps = {
  page: LandingPageConfig
}

function trimForDisplay(text: string, maxLength = 120) {
  const compact = text.replace(/\s+/g, " ").trim()
  const sentenceMatch = compact.match(/^.+?[.!?](?:\s|$)/)
  const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : compact
  const baseline = firstSentence.length > maxLength ? compact : firstSentence
  if (baseline.length <= maxLength) {
    return baseline
  }
  return `${baseline.slice(0, maxLength - 3).trimEnd()}...`
}

export function MarketingLandingPage({ page }: MarketingLandingPageProps) {
  const pageUrl = `${siteUrl}${page.path}`
  const quickPoints = page.heroPoints.slice(0, 3)
  const valueProps = page.valueProps.slice(0, 3)
  const fitItems = page.fitChecklist.slice(0, 3)
  const channelItems = page.channelNotes.slice(0, 3)
  const comparisonRows = page.comparisonRows.slice(0, 4)
  const faqItems = page.faq.slice(0, 3)
  const relatedLinks = page.relatedLinks.slice(0, 4)
  const valueIcons = [Gauge, ShieldCheck, Sparkles] as const

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: page.metaTitle,
        description: page.metaDescription,
        inLanguage: "en",
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        url: `${pageUrl}#faq`,
        mainEntity: page.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <Header />

      <article className="relative overflow-hidden px-6 pb-14 pt-24 md:pb-16 md:pt-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[980px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(179,33,40,0.08),transparent_72%)]"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <section className="relative mx-auto max-w-6xl">
          <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-3xl border border-border/50 bg-card/75 p-7 shadow-sm md:p-10">
              <p className="type-nav text-muted-foreground">{page.searchIntentLabel}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                {page.headline}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {trimForDisplay(page.subheadline, 180)}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {page.keywords.slice(0, 3).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-border/60 bg-secondary/70 px-3 py-1 text-xs text-foreground/85"
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/signin"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/blog"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Read Guides
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-border/50 bg-secondary/35 p-6 md:p-7">
              <p className="text-xs font-semibold tracking-wide text-foreground/70">At a glance</p>
              <ul className="mt-4 space-y-3">
                {quickPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-foreground/90">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                    <span>{trimForDisplay(point, 95)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border/50 bg-card/75 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Setup</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">Minutes</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/75 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ops</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">Managed</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/75 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Focus</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">Workflows</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Why teams choose this
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {valueProps.map((item, index) => {
              const Icon = valueIcons[index] ?? Sparkles
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border/50 bg-card/75 p-6"
                >
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background">
                    <Icon className="h-4 w-4 text-foreground/80" />
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {trimForDisplay(item.description, 115)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto mt-10 grid max-w-6xl gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-card/75 p-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Best fit</h2>
            <ul className="mt-4 space-y-2">
              {fitItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                  <span>{trimForDisplay(item, 88)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/75 p-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Channel notes</h2>
            <ul className="mt-4 space-y-2">
              {channelItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                  <span>{trimForDisplay(item, 90)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Quick comparison
          </h2>
          <div className="mt-5 grid gap-3">
            {comparisonRows.map((row) => (
              <div
                key={row.category}
                className="rounded-2xl border border-border/50 bg-card/75 p-5 md:p-6"
              >
                <p className="text-sm font-semibold text-foreground">{row.category}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border/50 bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Managed</p>
                    <p className="mt-1 text-sm text-foreground/90">
                      {trimForDisplay(row.managed, 95)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Self-hosted</p>
                    <p className="mt-1 text-sm text-foreground/90">
                      {trimForDisplay(row.selfHosted, 95)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto mt-10 max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">FAQ</h2>
          <div className="mt-5 space-y-3">
            {faqItems.map((item) => (
              <div key={item.question} className="rounded-xl border border-border/50 bg-card/75 p-5">
                <h3 className="text-base font-semibold text-foreground">{item.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {trimForDisplay(item.answer, 145)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Related resources</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {relatedLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-border/50 bg-card/75 p-5 transition-colors hover:bg-muted/40"
              >
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {trimForDisplay(item.description, 110)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </article>

      <Footer />
    </main>
  )
}
