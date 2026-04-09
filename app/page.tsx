import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { ProductShowcase } from "@/components/product-showcase"
import { Features } from "@/components/features"
import { LandingPagesHub } from "@/components/marketing/landing-pages-hub"
import { HowItWorks } from "@/components/how-it-works"
import { FAQ } from "@/components/faq"
import { CTA } from "@/components/cta"
import { Footer } from "@/components/footer"
import { SeoSchema } from "@/components/seo-schema"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <SeoSchema />
      <Header />
      <Hero />
      <ProductShowcase />
      <Features />
      <LandingPagesHub />
      <HowItWorks />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  )
}
