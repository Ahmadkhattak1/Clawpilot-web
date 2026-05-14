import type { Metadata } from "next"

import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page"
import { buildLandingMetadata, managedHermesAgentLandingPage } from "@/lib/landing-pages"

export const metadata: Metadata = buildLandingMetadata(managedHermesAgentLandingPage)

export default function ManagedHermesAgentPage() {
  return <MarketingLandingPage page={managedHermesAgentLandingPage} />
}
