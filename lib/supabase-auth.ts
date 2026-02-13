import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

let supabaseAuthClient: SupabaseClient | null = null
const SESSION_RECOVERY_RETRIES = 3
const SESSION_RECOVERY_RETRY_DELAY_MS = 150

export function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }

  if (!supabaseAuthClient) {
    supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }

  return supabaseAuthClient
}

export function buildAuthCallbackUrl(nextPath?: string) {
  if (typeof window === 'undefined') return undefined

  const callbackUrl = new URL('/auth/callback', window.location.origin)
  if (nextPath) {
    callbackUrl.searchParams.set('next', nextPath)
  }

  return callbackUrl.toString()
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function getRecoveredSupabaseSession(): Promise<Session | null> {
  const supabase = getSupabaseAuthClient()
  let lastError: unknown = null

  for (let attempt = 0; attempt < SESSION_RECOVERY_RETRIES; attempt += 1) {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      lastError = error
      break
    }

    if (data.session) return data.session
    if (attempt < SESSION_RECOVERY_RETRIES - 1) {
      await delay(SESSION_RECOVERY_RETRY_DELAY_MS)
    }
  }

  if (lastError) throw lastError
  return null
}
