import { ConfirmEmailCard } from './confirm-email-card'
import type { Metadata } from "next"
import { getSafeNextPath } from '@/lib/supabase-auth'

export const metadata: Metadata = {
  title: "Confirm email",
  robots: {
    index: false,
    follow: false,
  },
}

type ConfirmEmailPageProps = {
  searchParams?: Promise<{
    email?: string | string[]
    next?: string | string[]
  }>
}

export default async function ConfirmEmailPage({ searchParams }: ConfirmEmailPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawEmail = resolvedSearchParams?.email
  const rawNext = resolvedSearchParams?.next
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail
  const nextPath = getSafeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext)

  return <ConfirmEmailCard initialEmail={email} initialNextPath={nextPath} />
}
