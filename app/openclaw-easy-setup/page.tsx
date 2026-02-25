import Link from "next/link"
import type { Metadata } from "next"
import { siteName, siteUrl } from "@/lib/site"

const pageTitle = "OpenClaw Easy Setup | Easy OpenClaw Setup in Minutes"
const pageDescription =
  "ClawPilot is the easiest OpenClaw setup path. Run OpenClaw without hardware, terminal work, or manual server maintenance."

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    "OpenClaw easy setup",
    "easy OpenClaw setup",
    "easy open claw setup",
    "easy open claw",
    "OpenClaw managed hosting",
  ],
  alternates: {
    canonical: "/openclaw-easy-setup",
  },
  openGraph: {
    title: `${siteName} | OpenClaw Easy Setup`,
    description: pageDescription,
    url: "/openclaw-easy-setup",
    images: ["/logo.svg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | OpenClaw Easy Setup`,
    description: pageDescription,
    images: ["/logo.svg"],
  },
}

const setupSteps = [
  {
    title: "Create your account",
    detail: "Sign in and start your OpenClaw workspace without provisioning servers.",
  },
  {
    title: "Connect your channels",
    detail: "Link WhatsApp, Telegram, Slack, Discord, and more from one dashboard.",
  },
  {
    title: "Delegate tasks in chat",
    detail: "Use OpenClaw right away while ClawPilot handles uptime, updates, and ops.",
  },
]

const quickAnswers = [
  {
    question: "Is this really an easy OpenClaw setup?",
    answer:
      "Yes. ClawPilot removes the manual OpenClaw install steps so non-technical users can launch quickly.",
  },
  {
    question: "Do I need a Mac mini or local machine running all day?",
    answer:
      "No. ClawPilot hosts OpenClaw in the cloud, so your setup is always on without local hardware.",
  },
  {
    question: "Can I still control what OpenClaw can access?",
    answer:
      "Yes. You choose integrations and permissions, and can require confirmations for sensitive actions.",
  },
]

export default function OpenClawEasySetupPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        url: `${siteUrl}/openclaw-easy-setup`,
        name: "OpenClaw Easy Setup | Easy OpenClaw Setup in Minutes",
        description: pageDescription,
      },
      {
        "@type": "FAQPage",
        mainEntity: quickAnswers.map((item) => ({
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
    <main className="min-h-screen bg-background px-6 py-20">
      <article className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <header className="rounded-2xl border border-border/50 bg-secondary/30 p-8 md:p-10">
          <p className="type-nav text-muted-foreground">Launch guide</p>
          <h1 className="type-h1 mt-3">OpenClaw easy setup with ClawPilot</h1>
          <p className="type-body mt-4 max-w-2xl">
            Looking for an easy open claw setup? ClawPilot gives you hosted OpenClaw with no terminal work,
            no server babysitting, and a fast path to production use.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signin"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start easy setup
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Back to homepage
            </Link>
          </div>
        </header>

        <section aria-labelledby="how-setup-works">
          <h2 id="how-setup-works" className="type-h2">
            How the easy OpenClaw setup works
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {setupSteps.map((step) => (
              <div key={step.title} className="rounded-xl border border-border/40 bg-secondary/40 p-5">
                <h3 className="type-h4">{step.title}</h3>
                <p className="type-body-sm mt-2">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="why-clawpilot">
          <h2 id="why-clawpilot" className="type-h2">
            Why teams choose this over manual OpenClaw setup
          </h2>
          <ul className="mt-5 space-y-3">
            <li className="rounded-lg border border-border/40 bg-secondary/25 px-4 py-3 type-body-sm">
              Faster launch than self-hosting because install, updates, and uptime are managed.
            </li>
            <li className="rounded-lg border border-border/40 bg-secondary/25 px-4 py-3 type-body-sm">
              No infrastructure bottlenecks while still keeping control over permissions and actions.
            </li>
            <li className="rounded-lg border border-border/40 bg-secondary/25 px-4 py-3 type-body-sm">
              Production-ready OpenClaw operations without buying extra hardware.
            </li>
          </ul>
        </section>

        <section aria-labelledby="easy-openclaw-faq">
          <h2 id="easy-openclaw-faq" className="type-h2">
            Easy OpenClaw setup FAQ
          </h2>
          <div className="mt-6 space-y-4">
            {quickAnswers.map((item) => (
              <div key={item.question} className="rounded-xl border border-border/45 bg-secondary/40 p-5">
                <h3 className="type-h4">{item.question}</h3>
                <p className="type-body-sm mt-2">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </main>
  )
}
