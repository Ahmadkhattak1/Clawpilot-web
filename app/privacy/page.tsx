import type { Metadata } from "next"
import Link from "next/link"
import { siteName, siteUrl } from "@/lib/site"

const pageTitle = "Privacy Policy for Managed OpenClaw Hosting"
const pageDescription =
  "How ClawPilot handles account, usage, and integration data when running managed OpenClaw agents."

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: `${siteName} | ${pageTitle}`,
    description: pageDescription,
    url: "/privacy",
    images: ["/logo.svg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | ${pageTitle}`,
    description: pageDescription,
    images: ["/logo.svg"],
  },
}

export default function PrivacyPage() {
  const effectiveDate = "February 25, 2026"

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: `${siteUrl}/privacy`,
    name: `${siteName} Privacy Policy`,
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
          <h1 className="type-h1 mt-3">Privacy Policy</h1>
          <p className="type-body mt-4 max-w-2xl">
            This policy explains what data we process to operate ClawPilot and managed OpenClaw
            agents.
          </p>
          <p className="type-body-sm mt-4 text-muted-foreground">Effective date: {effectiveDate}</p>
        </header>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">1. Data We Process</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/85">
            <li>Account information (such as email and authentication identifiers).</li>
            <li>Workspace and configuration data needed to run your agents.</li>
            <li>Agent interaction logs, run events, and operational telemetry.</li>
            <li>Integration metadata and tokens you provide for connected services.</li>
          </ul>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">2. How We Use Data</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/85">
            <li>Provision and operate managed OpenClaw infrastructure.</li>
            <li>Execute configured workflows and agent actions.</li>
            <li>Monitor reliability, security, and abuse prevention.</li>
            <li>Provide support, troubleshooting, and product improvements.</li>
          </ul>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">3. Third-Party Providers</h2>
          <p className="type-body-sm">
            Agent operations may involve third-party model providers, messaging channels, and API
            services you connect. Those providers process data under their own terms and privacy
            policies.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">4. Security</h2>
          <p className="type-body-sm">
            We apply reasonable technical and organizational safeguards, but no system is perfectly
            secure. You are responsible for secure configuration of credentials, approvals, and
            integration permissions in your workspace.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">5. Data Retention</h2>
          <p className="type-body-sm">
            We retain operational data for service delivery, security, and compliance purposes, then
            delete or anonymize it according to our retention practices and legal obligations.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">6. Your Responsibilities</h2>
          <p className="type-body-sm">
            You must only connect data and channels you are authorized to use, and you must comply
            with applicable privacy laws and contractual obligations in your jurisdiction.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border/45 bg-secondary/35 p-6">
          <h2 className="type-h3">7. Policy Updates</h2>
          <p className="type-body-sm">
            We may update this policy periodically. Changes take effect when posted on this page.
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
              href="/disclaimer"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border/70 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              View Disclaimer
            </Link>
          </div>
        </footer>
      </article>
    </main>
  )
}
