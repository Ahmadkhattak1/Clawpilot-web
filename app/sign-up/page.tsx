import { redirect } from 'next/navigation'
import type { Metadata } from "next"
import { getSafeNextPath } from '@/lib/supabase-auth'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

type SignUpAliasRouteProps = {
  searchParams?: Promise<{
    next?: string | string[]
  }>
}

export default async function SignUpAliasRoute({ searchParams }: SignUpAliasRouteProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawNext = resolvedSearchParams?.next
  const nextParam = Array.isArray(rawNext) ? rawNext[0] : rawNext
  if (nextParam) {
    redirect(`/signup?next=${encodeURIComponent(getSafeNextPath(nextParam))}`)
  }
  redirect('/signup')
}
