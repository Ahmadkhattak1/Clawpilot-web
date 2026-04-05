"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import {
  buildAuthCallbackUrl,
  getRecoveredSupabaseSession,
  getSupabaseAuthClient,
} from "@/lib/supabase-auth"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import {
  ClawContainer,
  ClawIconFrame,
  ClawSection,
  ClawSectionIntro,
  ClawStat,
  ClawSurface,
} from "@/components/ui/clawpilot"
import type { LandingPageConfig } from "@/lib/landing-pages"
import { siteUrl } from "@/lib/site"

type AuthStatus = "loading" | "authenticated" | "anonymous"

type MarketingLandingPageProps = {
  page: LandingPageConfig
}

function useAuthStatus() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabaseAuthClient()

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!cancelled) {
          setAuthStatus(session ? "authenticated" : "anonymous")
        }
      } catch {
        if (!cancelled) {
          setAuthStatus("anonymous")
        }
      }
    }

    void loadSession()

    const { data: authStateData } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setAuthStatus(session ? "authenticated" : "anonymous")
      }
    })

    return () => {
      cancelled = true
      authStateData.subscription.unsubscribe()
    }
  }, [])

  const onGoogleSignIn = async () => {
    if (isGoogleLoading || authStatus === "authenticated") return
    setAuthError("")
    setIsGoogleLoading(true)
    try {
      const supabase = getSupabaseAuthClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: buildAuthCallbackUrl("/dashboard/chat") },
      })
      if (error) throw error
    } catch {
      setAuthError("Google sign-in is temporarily unavailable. Please try again.")
      setIsGoogleLoading(false)
    }
  }

  return { authStatus, isGoogleLoading, authError, onGoogleSignIn }
}

export function MarketingLandingPage({ page }: MarketingLandingPageProps) {
  const { authStatus, isGoogleLoading, authError, onGoogleSignIn } = useAuthStatus()
  const pageUrl = `${siteUrl}${page.path}`

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
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Header />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-24"
      >
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(179,33,40,0.05),transparent_70%)]"
        />

        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
          {/* Logo */}
          <div className="relative mb-10">
            <div
              aria-hidden="true"
              className="absolute inset-0 scale-[2] rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.03),transparent_70%)]"
            />
            <Image
              src="/logo.svg"
              alt="ClawPilot"
              width={120}
              height={120}
              priority
              className="relative h-[90px] w-[90px] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:h-[110px] sm:w-[110px]"
            />
          </div>

          {/* Intent label */}
          <p className="type-eyebrow mb-4">{page.searchIntentLabel}</p>

          {/* Headline */}
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[46px] md:text-[54px]">
            {page.headline}
          </h1>

          {/* Subheadline */}
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            {page.subheadline}
          </p>

          {/* Keyword tags */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {page.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-border/60 bg-secondary/60 px-3 py-0.5 text-xs text-foreground/80"
              >
                {keyword}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-9 flex flex-col items-center gap-3">
            {authStatus === "authenticated" ? (
              <Button asChild className="group" size="hero" variant="brand">
                <Link href="/dashboard/chat">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onGoogleSignIn}
                disabled={isGoogleLoading || authStatus === "loading"}
                className="group"
                size="hero"
                variant="brand"
              >
                {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {authStatus === "loading" ? "Loading..." : "Get Started"}
                {!isGoogleLoading && authStatus !== "loading" ? (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                ) : null}
              </Button>
            )}
            {authError ? <p className="text-center text-sm text-destructive">{authError}</p> : null}
          </div>
        </div>
      </section>

      {/* ── At a glance (stats strip) ────────────────────────── */}
      <ClawSection spacing="compact">
        <ClawContainer size="md" className="flex flex-col items-center gap-5 text-center">
          <p className="type-eyebrow">Why it matters</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {page.heroPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-3">
                {i > 0 && <div className="hidden h-3.5 w-px bg-border/60 sm:block" />}
                <p className="text-sm text-muted-foreground">{point}</p>
              </div>
            ))}
          </div>
        </ClawContainer>
      </ClawSection>

      {/* ── Value props (feature cards) ───────────────────────── */}
      <ClawSection id="features">
        <ClawContainer size="lg">
          <ClawSectionIntro
            title="Why teams choose this"
            description="All the workflow power, without the infrastructure burden."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {page.valueProps.map((item) => (
              <ClawSurface key={item.title} className="h-full">
                <ClawIconFrame>
                  <span className="text-base font-bold text-foreground/60">✦</span>
                </ClawIconFrame>
                <h3 className="type-h4 mt-4">{item.title}</h3>
                <p className="type-body-sm mt-2">{item.description}</p>
              </ClawSurface>
            ))}
          </div>
        </ClawContainer>
      </ClawSection>

      {/* ── How it works (numbered steps) ────────────────────── */}
      <ClawSection id="how-it-works">
        <ClawContainer size="md">
          <ClawSectionIntro title="Best fit for" />
          <div className="mt-10 space-y-3">
            {page.fitChecklist.map((item, i) => (
              <ClawSurface key={i} className="flex items-start gap-4" padding="md" radius="lg">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                  {i + 1}
                </span>
                <p className="type-body-sm pt-1">{item}</p>
              </ClawSurface>
            ))}
          </div>
        </ClawContainer>
      </ClawSection>

      {/* ── Comparison table ──────────────────────────────────── */}
      <ClawSection id="comparison">
        <ClawContainer size="lg">
          <ClawSectionIntro
            title="Managed vs Self-Hosted"
            description="A clear side-by-side so you can pick the right path for your team."
          />
          <div className="mt-10 overflow-hidden rounded-2xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/40">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Managed (ClawPilot)
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Self-Hosted
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.comparisonRows.map((row, i) => (
                  <tr
                    key={row.category}
                    className={
                      i % 2 === 0
                        ? "border-b border-border/30 bg-background"
                        : "border-b border-border/30 bg-secondary/20"
                    }
                  >
                    <td className="px-5 py-4 font-medium text-foreground">{row.category}</td>
                    <td className="px-5 py-4 text-muted-foreground">{row.managed}</td>
                    <td className="px-5 py-4 text-muted-foreground">{row.selfHosted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ClawContainer>
      </ClawSection>

      {/* ── Channel notes ─────────────────────────────────────── */}
      <ClawSection id="channels">
        <ClawContainer size="md">
          <ClawSectionIntro title="Channel notes" />
          <div className="mt-10 space-y-3">
            {page.channelNotes.map((note, i) => (
              <ClawSurface key={i} padding="md" radius="lg" tone="muted">
                <p className="type-body-sm">{note}</p>
              </ClawSurface>
            ))}
          </div>
        </ClawContainer>
      </ClawSection>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <ClawSection id="faq">
        <ClawContainer size="md">
          <ClawSectionIntro
            className="mb-12"
            title="FAQ"
            description="Common questions about this deployment model."
          />
          <div className="space-y-4">
            {page.faq.map((item) => (
              <ClawSurface key={item.question} padding="md" radius="lg" tone="muted">
                <h3 className="type-h4 mb-2">{item.question}</h3>
                <p className="type-body-sm">{item.answer}</p>
              </ClawSurface>
            ))}
          </div>
        </ClawContainer>
      </ClawSection>

      {/* ── Related resources ─────────────────────────────────── */}
      <ClawSection id="related">
        <ClawContainer size="lg">
          <ClawSectionIntro title="Related resources" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {page.relatedLinks.map((item) => (
              <ClawSurface key={item.href} interactive className="block" radius="xl">
                <Link href={item.href} className="block">
                  <p className="type-h4">{item.label}</p>
                  <p className="type-body-sm mt-2">{item.description}</p>
                </Link>
              </ClawSurface>
            ))}
          </div>
        </ClawContainer>
      </ClawSection>

      {/* ── Bottom CTA ────────────────────────────────────────── */}
      <ClawSection>
        <ClawContainer size="sm">
          <ClawSectionIntro
            title="Ready to try it?"
            description="Your private instance is a few clicks away."
          />
          <div className="mt-8 flex flex-col items-center gap-3">
            {authStatus === "authenticated" ? (
              <Button asChild className="group" size="hero" variant="brand">
                <Link href="/dashboard/chat">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onGoogleSignIn}
                disabled={isGoogleLoading || authStatus === "loading"}
                className="group"
                size="hero"
                variant="brand"
              >
                {isGoogleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {authStatus === "loading" ? "Loading..." : "Get Started"}
                {!isGoogleLoading && authStatus !== "loading" ? (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                ) : null}
              </Button>
            )}
            {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
          </div>
        </ClawContainer>
      </ClawSection>

      <Footer />
    </main>
  )
}
