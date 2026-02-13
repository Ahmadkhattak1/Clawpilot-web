import { SetPasswordCard } from './set-password-card'

type SetPasswordPageProps = {
  searchParams?: Promise<{
    email?: string | string[]
  }>
}

export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawEmail = resolvedSearchParams?.email
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail

  return <SetPasswordCard initialEmail={email} />
}
