import type { Metadata } from "next"
import Link from "next/link"
import { siteName, siteOgImage, siteUrl } from "@/lib/site"

const pageTitle = "Terms of Service for Managed OpenClaw Hosting"
const pageDescription =
  "Terms for using ClawPilot-managed OpenClaw agents, including safety, acceptable use, and risk allocation."

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: `${siteName} | ${pageTitle}`,
    description: pageDescription,
    url: "/terms",
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

export default function TermsPage() {
  const effectiveDate = "February 25, 2026"

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: `${siteUrl}/terms`,
    name: `${siteName} Terms of Service`,
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
          <h1 className="type-h1 mt-3">Terms of Service</h1>
          <p className="type-body mt-4 max-w-2xl">
            Please read these terms carefully before using ClawPilot. By using our service, you
            agree to these terms.
          </p>
          <p className="type-body-sm mt-4 text-muted-foreground">Effective date: {effectiveDate}</p>
        </header>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">1. Service Scope</h2>
          <p className="type-body-sm">
            ClawPilot provides managed hosting and operational tooling for OpenClaw-based agents.
            We offer infrastructure, deployment, monitoring, and workflow support, but the behavior
            and outputs of AI models remain probabilistic and may be incorrect.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">2. Autonomous Agent Risk</h2>
          <p className="type-body-sm">
            You acknowledge that agents can send messages, call tools, and trigger external actions.
            You are responsible for configuring approvals, access controls, and operational
            safeguards for your use case. Do not use agents as the sole control for high-risk
            decisions or irreversible actions.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">3. OpenClaw and Third-Party Services</h2>
          <p className="type-body-sm">
            OpenClaw is open-source software under its own license and documentation. Third-party
            services (including model providers, messaging channels, and external tools) have
            separate terms, uptime characteristics, and security practices. We are not responsible
            for outages, policy changes, or failures in third-party systems.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">4. Acceptable Use</h2>
          <p className="type-body-sm">You agree not to use ClawPilot to:</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/85">
            <li>Violate law, regulations, or third-party rights.</li>
            <li>Send spam, abusive, fraudulent, or deceptive communications.</li>
            <li>Attempt unauthorized access, data exfiltration, or service disruption.</li>
            <li>Process sensitive data in ways prohibited by law or contract.</li>
          </ul>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">5. Security Responsibilities</h2>
          <p className="type-body-sm">
            You are responsible for account security, credentials, channel permissions, prompt and
            workflow review, and any allowlist or authorization settings in your deployment. You
            must promptly rotate credentials and disable automations if suspicious behavior is
            detected.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">6. No Professional Advice</h2>
          <p className="type-body-sm">
            ClawPilot and its agents do not provide legal, medical, accounting, or financial advice.
            You are solely responsible for reviewing outputs and obtaining qualified professional
            advice where required.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">7. Disclaimers and Limitation of Liability</h2>
          <p className="type-body-sm">
            The service is provided on an "as is" and "as available" basis. To the fullest extent
            permitted by law, we disclaim warranties of merchantability, fitness for a particular
            purpose, and non-infringement. We are not liable for indirect, incidental, special,
            consequential, or punitive damages, or for losses resulting from agent outputs, external
            tool actions, third-party provider failures, or user configuration choices.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">8. Changes</h2>
          <p className="type-body-sm">
            We may update these terms from time to time. Updated terms become effective when posted
            on this page.
          </p>
        </section>

        <footer className="rounded-xl border border-border/45 bg-secondary/20 p-6">
          <p className="type-body-sm text-muted-foreground">
            Questions about these terms can be sent through the contact channel listed on the
            ClawPilot website.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/disclaimer"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border/70 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Read Disclaimer
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border/70 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Back to Homepage
            </Link>
          </div>
        </footer>
      </article>
    </main>
  )
}
