import React from "react"
import Script from "next/script"
import { Analytics as VercelAnalytics } from "@vercel/analytics/react"
import type { Metadata, Viewport } from 'next'
import { Analytics as GAAnalytics } from "@/components/analytics"
import { ThemeProvider } from "@/components/theme-provider"
import { seoKeywords, siteName, siteUrl } from "@/lib/site"

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ClawPilot | Your Own OpenClaw in the Cloud",
    template: "%s | ClawPilot",
  },
  description:
    "Get a private OpenClaw instance running in minutes. ClawPilot handles hosting, updates, and uptime. No servers, no Docker, no terminal.",
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
    title: "ClawPilot | Your Own OpenClaw in the Cloud",
    description:
      "Get a private OpenClaw instance running in minutes. No servers, no Docker, no terminal. Just sign up and go.",
    url: "/",
    siteName,
    locale: "en_US",
    images: [
      {
        url: "/logo.webp",
        width: 512,
        height: 512,
        alt: "ClawPilot mascot logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawPilot | Your Own OpenClaw in the Cloud",
    description:
      "A private OpenClaw instance running in minutes. No servers, no Docker, no terminal.",
    images: ["/logo.webp"],
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
          src="https://www.googletagmanager.com/gtag/js?id=AW-17277705517"
          strategy="afterInteractive"
        />
        <Script id="google-ads-gtag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'AW-17277705517');`}
        </Script>
      </head>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <VercelAnalytics />
        <GAAnalytics />
      </body>
    </html>
  )
}
