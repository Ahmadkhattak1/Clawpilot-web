import { createClient, type AuthChangeEvent, type Session, type SupabaseClient } from '@supabase/supabase-js'

let supabaseAuthClient: SupabaseClient | null = null
const SESSION_RECOVERY_DEFAULT_TIMEOUT_MS = 5000
const SESSION_RECOVERY_EVENTS: readonly AuthChangeEvent[] = [
  'SIGNED_IN',
  'TOKEN_REFRESHED',
  'INITIAL_SESSION',
]

type SessionRecoveryOptions = {
  timeoutMs?: number
}

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
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  }

  return supabaseAuthClient
}

export function getSafeNextPath(value: string | null | undefined, fallback = '/dashboard/chat') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

export function buildSignInPath(nextPath: string) {
  const params = new URLSearchParams()
  params.set('next', getSafeNextPath(nextPath))
  return `/signin?${params.toString()}`
}

export function buildAuthCallbackUrl(nextPath?: string) {
  if (typeof window === 'undefined') return undefined

  const callbackUrl = new URL('/auth/callback', window.location.origin)
  if (nextPath) {
    callbackUrl.searchParams.set('next', getSafeNextPath(nextPath))
  }

  return callbackUrl.toString()
}

export async function getRecoveredSupabaseSession(
  options: SessionRecoveryOptions = {},
): Promise<Session | null> {
  const { timeoutMs = SESSION_RECOVERY_DEFAULT_TIMEOUT_MS } = options
  const supabase = getSupabaseAuthClient()

  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }
  if (data.session) {
    return data.session
  }
  if (timeoutMs <= 0 || typeof window === 'undefined') {
    return null
  }

  return new Promise<Session | null>((resolve) => {
    let settled = false
    let timeoutId: number | null = null
    let unsubscribe = () => {}

    const settle = (session: Session | null) => {
      if (settled) return
      settled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      unsubscribe()
      resolve(session)
    }

    const { data: authStateData } = supabase.auth.onAuthStateChange((event, session) => {
      if (!SESSION_RECOVERY_EVENTS.includes(event)) return
      if (session) {
        settle(session)
        return
      }
      if (event === 'INITIAL_SESSION') {
        settle(null)
      }
    })

    unsubscribe = () => {
      authStateData.subscription.unsubscribe()
    }
    if (settled) {
      unsubscribe()
      return
    }

    timeoutId = window.setTimeout(() => {
      settle(null)
    }, timeoutMs)
  })
}
