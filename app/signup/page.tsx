import { redirect } from 'next/navigation'
import type { Metadata } from "next"
import { getSafeNextPath } from '@/lib/supabase-auth'

export const metadata: Metadata = {
  title: "Sign in",
  robots: {
    index: false,
    follow: false,
  },
}

type SignUpRouteProps = {
  searchParams?: Promise<{
    next?: string | string[]
  }>
}

export default async function SignUpRoute({ searchParams }: SignUpRouteProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawNext = resolvedSearchParams?.next
  const nextParam = Array.isArray(rawNext) ? rawNext[0] : rawNext
  if (nextParam) {
    redirect(`/signin?next=${encodeURIComponent(getSafeNextPath(nextParam))}`)
  }
  redirect('/signin')
}
