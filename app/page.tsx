import { Header } from "@/components/header"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { Hero } from "@/components/hero"
import { RuntimeChoice } from "@/components/runtime-choice"
import { ProductShowcase } from "@/components/product-showcase"
import { HowItWorks } from "@/components/how-it-works"
import { IsolationSection } from "@/components/isolation-section"
import { ComparisonSection } from "@/components/comparison-section"
import { FAQ } from "@/components/faq"
import { CTA } from "@/components/cta"
import { Footer } from "@/components/footer"
import { SeoSchema } from "@/components/seo-schema"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <SeoSchema />
      <AnnouncementBanner />
      <Header />
      <Hero />
      <ProductShowcase />
      <RuntimeChoice />
      <HowItWorks />
      <IsolationSection />
      <ComparisonSection />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  )
}
