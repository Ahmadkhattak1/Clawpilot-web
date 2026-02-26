import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { SocialProof } from "@/components/social-proof"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
import { CTA } from "@/components/cta"
import { Footer } from "@/components/footer"
import { SeoSchema } from "@/components/seo-schema"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <SeoSchema />
      <Header />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </main>
  )
}
