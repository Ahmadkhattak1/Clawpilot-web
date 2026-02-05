import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Agents } from "@/components/agents"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
import { FAQ } from "@/components/faq"
import { CTA } from "@/components/cta"
import { Footer } from "@/components/footer"
import { SeoSchema } from "@/components/seo-schema"
import { SocialProof } from "@/components/social-proof"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Content */}
      <SeoSchema />
      <Header />
      <Hero />
      <Agents />
      <SocialProof />
      <Features />
      <HowItWorks />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  )
}
