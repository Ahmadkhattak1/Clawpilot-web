import type { Metadata } from "next"

import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page"
import { aiAgentHostingLandingPage, buildLandingMetadata } from "@/lib/landing-pages"

export const metadata: Metadata = buildLandingMetadata(aiAgentHostingLandingPage)

export default function AiAgentHostingPage() {
  return <MarketingLandingPage page={aiAgentHostingLandingPage} />
}
