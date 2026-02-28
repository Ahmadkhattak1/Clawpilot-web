import type { Metadata } from "next"

import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page"
import { buildLandingMetadata, openclawHostingLandingPage } from "@/lib/landing-pages"

export const metadata: Metadata = buildLandingMetadata(openclawHostingLandingPage)

export default function OpenclawHostingPage() {
  return <MarketingLandingPage page={openclawHostingLandingPage} />
}
