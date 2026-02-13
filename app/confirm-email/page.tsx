import { ConfirmEmailCard } from './confirm-email-card'

type ConfirmEmailPageProps = {
  searchParams?: Promise<{
    email?: string | string[]
  }>
}

export default async function ConfirmEmailPage({ searchParams }: ConfirmEmailPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawEmail = resolvedSearchParams?.email
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail

  return <ConfirmEmailCard initialEmail={email} />
}
