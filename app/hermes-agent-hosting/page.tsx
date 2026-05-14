import type { Metadata } from "next"

import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page"
import { buildLandingMetadata, hermesAgentHostingLandingPage } from "@/lib/landing-pages"

export const metadata: Metadata = buildLandingMetadata(hermesAgentHostingLandingPage)

export default function HermesAgentHostingPage() {
  return <MarketingLandingPage page={hermesAgentHostingLandingPage} />
}
