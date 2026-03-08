import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { getSupabaseAuthConfig, supabaseAuthCookieOptions } from '@/lib/supabase-auth-config'

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  try {
    const { supabaseUrl, supabaseKey } = getSupabaseAuthConfig()
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        persistSession: true,
      },
      cookieOptions: supabaseAuthCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    await supabase.auth.getUser()
  } catch {
    return response
  }

  return response
}
