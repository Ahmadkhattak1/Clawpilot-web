import type { Metadata } from "next"
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: "Chat",
  robots: {
    index: false,
    follow: false,
  },
}

type LegacyChatRouteProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LegacyChatRoute({ searchParams }: LegacyChatRouteProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === 'string') {
      params.set(key, value)
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item)
      }
    }
  }

  const query = params.toString()
  redirect(query ? `/dashboard/chat?${query}` : '/dashboard/chat')
}
