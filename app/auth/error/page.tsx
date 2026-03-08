import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ErrorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getSafeNextPath(value: string | null | undefined, fallback = '/dashboard/chat') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

function getSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? null
  return null
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const resolvedSearchParams = await searchParams
  const message = getSingleParam(resolvedSearchParams?.message) ?? 'The sign-in link may be invalid or expired.'
  const nextPath = getSafeNextPath(getSingleParam(resolvedSearchParams?.next))

  return (
    <div className="relative grid min-h-[100dvh] w-full place-items-center overflow-hidden bg-background px-4 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background"
      />
      <Card className="relative z-10 w-full max-w-md border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-2">
          <CardTitle className="type-h4">Authentication failed</CardTitle>
          <CardDescription>The sign-in link may be invalid or expired.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">{message}</p>
          <Button asChild className="w-full">
            <Link href={`/signin?next=${encodeURIComponent(nextPath)}`}>Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
