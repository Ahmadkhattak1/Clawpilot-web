import type { CookieOptionsWithName } from '@supabase/ssr'

export const supabaseAuthCookieOptions: CookieOptionsWithName = {
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()
    ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
}

export function getSupabaseAuthConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseKey = getSupabasePublishableKey()

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and one of NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }

  return { supabaseUrl, supabaseKey }
}
