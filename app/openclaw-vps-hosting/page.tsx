import type { Metadata } from "next"

import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page"
import { buildLandingMetadata, openclawVpsHostingLandingPage } from "@/lib/landing-pages"

export const metadata: Metadata = buildLandingMetadata(openclawVpsHostingLandingPage)

export default function OpenclawVpsHostingPage() {
  return <MarketingLandingPage page={openclawVpsHostingLandingPage} />
}
