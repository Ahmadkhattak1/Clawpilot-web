import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Skills",
  robots: {
    index: false,
    follow: false,
  },
}

export { default } from "@/app/dashboard/skills/page"
