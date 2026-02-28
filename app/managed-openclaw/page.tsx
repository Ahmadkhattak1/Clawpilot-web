import type { Metadata } from "next"

import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page"
import { buildLandingMetadata, managedOpenclawLandingPage } from "@/lib/landing-pages"

export const metadata: Metadata = buildLandingMetadata(managedOpenclawLandingPage)

export default function ManagedOpenclawPage() {
  return <MarketingLandingPage page={managedOpenclawLandingPage} />
}
