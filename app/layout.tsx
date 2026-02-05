import React from "react"
import { Analytics as VercelAnalytics } from "@vercel/analytics/react"
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics as GAAnalytics } from "@/components/analytics"

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
})

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
const siteUrl = rawSiteUrl.startsWith("http") ? rawSiteUrl : `https://${rawSiteUrl}`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ClawPilot | Set Up OpenClaw in 60 Seconds",
  description:
    "ClawPilot is the easiest way to install and manage OpenClaw, the open source personal AI that works inside WhatsApp, Telegram, Slack, Discord, Signal, and iMessage. Local or cloud, no coding required.",
  keywords: [
    "OpenClaw",
    "OpenClaw setup",
    "OpenClaw install",
    "OpenClaw WhatsApp",
    "OpenClaw Telegram",
    "OpenClaw iMessage",
    "OpenClaw Slack",
    "OpenClaw Discord",
    "OpenClaw Signal",
    "OpenClaw gateway",
    "self hosted AI assistant",
    "local AI assistant",
    "Clawdbot",
    "Moltbot",
    "ClawPilot",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ClawPilot | Set Up OpenClaw in 60 Seconds",
    description:
      "OpenClaw is the personal AI that works in your chat apps. ClawPilot makes setup and hosting simple.",
    url: "/",
    siteName: "ClawPilot",
    images: [
      {
        url: "/logo.svg",
        width: 512,
        height: 512,
        alt: "ClawPilot logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawPilot | Set Up OpenClaw in 60 Seconds",
    description:
      "OpenClaw is the personal AI that works in your chat apps. ClawPilot makes setup and hosting simple.",
    images: ["/logo.svg"],
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
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans">
        {children}
        <VercelAnalytics />
        <GAAnalytics />
      </body>
    </html>
  )
}
