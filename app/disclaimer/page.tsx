import type { Metadata } from "next"
import Link from "next/link"
import { siteName, siteOgImage, siteUrl } from "@/lib/site"

const pageTitle = "Agent Risk Disclaimer"
const pageDescription =
  "Important risk disclosures for using ClawPilot and OpenClaw-powered agents in production workflows."

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/disclaimer",
  },
  openGraph: {
    title: `${siteName} | ${pageTitle}`,
    description: pageDescription,
    url: "/disclaimer",
    images: [siteOgImage],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | ${pageTitle}`,
    description: pageDescription,
    images: [siteOgImage.url],
  },
}

export default function DisclaimerPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: `${siteUrl}/disclaimer`,
    name: `${siteName} Agent Risk Disclaimer`,
    description: pageDescription,
  }

  return (
    <main className="min-h-screen bg-background px-6 py-20">
      <article className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <header className="rounded-2xl border border-border/50 bg-secondary/30 p-8 md:p-10">
          <p className="type-nav text-muted-foreground">Legal</p>
          <h1 className="type-h1 mt-3">Agent Risk Disclaimer</h1>
          <p className="type-body mt-4 max-w-2xl">
            ClawPilot helps deploy OpenClaw-based agents. Agent systems can be powerful and risky.
            Read this before enabling production automations.
          </p>
        </header>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">1. AI Outputs Can Be Wrong</h2>
          <p className="type-body-sm">
            Agent outputs can be inaccurate, incomplete, outdated, or misleading. You must review
            critical outputs before acting on them.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">2. Tool Access Increases Risk</h2>
          <p className="type-body-sm">
            When agents have access to external tools, channels, and APIs, they can trigger real
            actions. Misconfiguration or prompt misuse may lead to unintended behavior, including
            unwanted outbound messages or data operations.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">3. You Must Configure Safeguards</h2>
          <p className="type-body-sm">
            Use approval gates, allowlists, access boundaries, and monitoring before running live
            automations. Do not grant broad permissions that are unnecessary for your workflow.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">4. High-Risk Use Requires Human Oversight</h2>
          <p className="type-body-sm">
            Do not use autonomous agents as the sole control for legal, medical, financial, safety,
            hiring, identity, or irreversible business decisions.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">5. Third-Party Dependencies</h2>
          <p className="type-body-sm">
            ClawPilot depends on third-party model providers, communication channels, and APIs.
            Outages, policy changes, and rate limits in those systems can affect your agents.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">6. OpenClaw Is Separate Software</h2>
          <p className="type-body-sm">
            OpenClaw documentation and license terms apply to the underlying software. You are
            responsible for complying with all relevant licenses, laws, and third-party terms.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">7. No Guarantee</h2>
          <p className="type-body-sm">
            We do not guarantee uninterrupted availability, error-free outputs, or fitness for your
            specific use case. Use ClawPilot with appropriate operational controls.
          </p>
        </section>

        <footer className="rounded-xl border border-border/45 bg-secondary/20 p-6">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/terms"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border/70 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              View Terms
            </Link>
            <Link
              href="/privacy"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border/70 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              View Privacy Policy
            </Link>
          </div>
        </footer>
      </article>
    </main>
  )
}
