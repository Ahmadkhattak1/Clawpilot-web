import React from "react"
import { Analytics as VercelAnalytics } from "@vercel/analytics/react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics as GAAnalytics } from "@/components/analytics"
import { ThemeProvider } from "@/components/theme-provider"
import { seoKeywords, siteName, siteUrl } from "@/lib/site"

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ClawPilot | OpenClaw Easy Setup Without Server Work",
    template: "%s | ClawPilot",
  },
  description:
    "ClawPilot is the easy OpenClaw setup: hosted OpenClaw in minutes, no hardware, no terminal setup, and reliable always-on uptime.",
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
    title: "ClawPilot | OpenClaw Easy Setup Without Server Work",
    description:
      "Get easy OpenClaw setup with ClawPilot. We host, install, and maintain OpenClaw so you can start fast.",
    url: "/",
    siteName,
    locale: "en_US",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "ClawPilot - hosted OpenClaw with easy setup",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawPilot | OpenClaw Easy Setup Without Server Work",
    description:
      "Easy OpenClaw setup in minutes. ClawPilot handles hosting and uptime.",
    images: ["/logo.png"],
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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
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
