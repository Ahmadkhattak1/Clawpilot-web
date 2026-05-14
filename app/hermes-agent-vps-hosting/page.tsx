import type { Metadata } from "next"

import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page"
import { buildLandingMetadata, hermesAgentVpsHostingLandingPage } from "@/lib/landing-pages"

export const metadata: Metadata = buildLandingMetadata(hermesAgentVpsHostingLandingPage)

export default function HermesAgentVpsHostingPage() {
  return <MarketingLandingPage page={hermesAgentVpsHostingLandingPage} />
}
