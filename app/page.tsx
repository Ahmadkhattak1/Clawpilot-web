import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { ProductShowcase } from "@/components/product-showcase"
import { HowItWorks } from "@/components/how-it-works"
import { ComparisonSection } from "@/components/comparison-section"
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
      <HowItWorks />
      <ComparisonSection />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  )
}
