import type { Metadata } from 'next'

import SubscriptionClawpilotTestPageClient from './page-client'

export const metadata: Metadata = {
  title: 'Subscription Conversion Test',
  description: 'Internal page for verifying the Subscription-Clawpilot Google Ads conversion action.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function SubscriptionClawpilotTestPage() {
  return <SubscriptionClawpilotTestPageClient />
}
