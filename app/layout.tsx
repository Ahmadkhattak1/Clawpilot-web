import React from "react"
import Script from "next/script"
import { Analytics as VercelAnalytics } from "@vercel/analytics/react"
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { ThemeProvider } from "@/components/theme-provider"
import { GOOGLE_TAG_ID } from "@/lib/google-ads"
import { seoKeywords, siteName, siteOgImage, siteUrl } from "@/lib/site"

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ClawPilot | Managed Openclaw and Hermes Agent Hosting",
    template: "%s | ClawPilot",
  },
  description:
    "Managed AI agent hosting for Openclaw and Hermes Agent. Private cloud runtimes with no VPS, Docker, or terminal setup.",
  applicationName: siteName,
  referrer: "origin-when-cross-origin",
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "technology",
  keywords: seoKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ClawPilot | Managed Openclaw and Hermes Agent Hosting",
    description:
      "Managed AI agent hosting for Openclaw and Hermes Agent. No VPS, Docker, or terminal setup.",
    url: "/",
    siteName,
    locale: "en_US",
    images: [siteOgImage],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawPilot | Managed Openclaw and Hermes Agent Hosting",
    description:
      "Private Openclaw and Hermes Agent hosting. No VPS, Docker, or terminal setup.",
    images: [siteOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-gtag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_TAG_ID}');`}
        </Script>
      </head>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster closeButton position="top-right" richColors theme="system" />
        </ThemeProvider>
        <VercelAnalytics />
      </body>
    </html>
  )
}
