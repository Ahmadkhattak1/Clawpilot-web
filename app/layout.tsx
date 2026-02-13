import React from "react"
import { Analytics as VercelAnalytics } from "@vercel/analytics/react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics as GAAnalytics } from "@/components/analytics"
import { ThemeProvider } from "@/components/theme-provider"

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
const siteUrl = rawSiteUrl.startsWith("http") ? rawSiteUrl : `https://${rawSiteUrl}`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ClawPilot | Hosted OpenClaw Without Setup Drama",
  description:
    "ClawPilot hosts OpenClaw for you. No servers to manage, no uptime babysitting, and full control over access and actions.",
  keywords: [
    "OpenClaw",
    "hosted OpenClaw",
    "OpenClaw hosting",
    "OpenClaw WhatsApp",
    "OpenClaw Telegram",
    "OpenClaw iMessage",
    "OpenClaw Slack",
    "OpenClaw Discord",
    "OpenClaw Signal",
    "AI chat assistant",
    "ClawPilot",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ClawPilot | Hosted OpenClaw Without Setup Drama",
    description:
      "ClawPilot handles OpenClaw hosting, updates, and reliability so your assistant is ready when you need it.",
    url: "/",
    siteName: "ClawPilot",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "ClawPilot logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawPilot | Hosted OpenClaw Without Setup Drama",
    description:
      "Hosted OpenClaw by ClawPilot. No setup overhead. You stay in control.",
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
