import { SetPasswordCard } from './set-password-card'
import type { Metadata } from "next"
import { getSafeNextPath } from '@/lib/supabase-auth'

export const metadata: Metadata = {
  title: "Set password",
  robots: {
    index: false,
    follow: false,
  },
}

type SetPasswordPageProps = {
  searchParams?: Promise<{
    email?: string | string[]
    next?: string | string[]
  }>
}

export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawEmail = resolvedSearchParams?.email
  const rawNext = resolvedSearchParams?.next
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail
  const nextPath = getSafeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext)

  return <SetPasswordCard initialEmail={email} initialNextPath={nextPath} />
}
