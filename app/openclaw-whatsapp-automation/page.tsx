import type { Metadata } from "next"

import { MarketingLandingPage } from "@/components/marketing/marketing-landing-page"
import {
  buildLandingMetadata,
  openclawWhatsappAutomationLandingPage,
} from "@/lib/landing-pages"

export const metadata: Metadata = buildLandingMetadata(openclawWhatsappAutomationLandingPage)

export default function OpenclawWhatsappAutomationPage() {
  return <MarketingLandingPage page={openclawWhatsappAutomationLandingPage} />
}
