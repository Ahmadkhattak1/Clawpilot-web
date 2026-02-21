import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Chat",
  robots: {
    index: false,
    follow: false,
  },
}

export { default } from "@/app/dashboard/chat/page"
