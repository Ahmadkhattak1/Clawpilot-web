import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Channels",
  robots: {
    index: false,
    follow: false,
  },
}

export { default } from "@/app/dashboard/channels/page"
