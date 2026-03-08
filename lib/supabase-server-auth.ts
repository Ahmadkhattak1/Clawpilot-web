import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { getSupabaseAuthConfig, supabaseAuthCookieOptions } from '@/lib/supabase-auth-config'

export async function getSupabaseServerAuthClient() {
  const cookieStore = await cookies()
  const { supabaseUrl, supabaseKey } = getSupabaseAuthConfig()

  return createServerClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
    },
    cookieOptions: supabaseAuthCookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Some server contexts are read-only. The proxy handles refresh writes.
        }
      },
    },
  })
}
