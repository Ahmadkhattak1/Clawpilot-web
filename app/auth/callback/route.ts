import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

import { getSafeNextPath } from '@/lib/supabase-auth'
import { getSupabaseServerAuthClient } from '@/lib/supabase-server-auth'

const SUPABASE_EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]

function isEmailOtpType(value: string | null): value is EmailOtpType {
  if (!value) return false
  return SUPABASE_EMAIL_OTP_TYPES.includes(value as EmailOtpType)
}

function getDefaultNextPathForOtpType(type: string | null) {
  if (type === 'signup' || type === 'email' || type === 'magiclink' || type === 'recovery') {
    return '/set-password'
  }
  return '/dashboard/chat'
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return 'Something went wrong while completing authentication.'
}

function buildErrorRedirectUrl(request: NextRequest, nextPath: string, message: string) {
  const errorUrl = new URL('/auth/error', request.url)
  errorUrl.searchParams.set('message', message)
  errorUrl.searchParams.set('next', nextPath)
  return errorUrl
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const otpType = searchParams.get('type')
  const providerError = searchParams.get('error_description') ?? searchParams.get('error')
  const requestedNextPath = searchParams.get('next')
  const nextPath = requestedNextPath
    ? getSafeNextPath(requestedNextPath)
    : getDefaultNextPathForOtpType(otpType)

  if (providerError) {
    return NextResponse.redirect(buildErrorRedirectUrl(request, nextPath, providerError))
  }

  try {
    const supabase = await getSupabaseServerAuthClient()

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } else if (tokenHash && isEmailOtpType(otpType)) {
      const { error } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: tokenHash,
      })
      if (error) throw error
    } else {
      throw new Error('Missing auth callback parameters. Please try signing in again.')
    }
  } catch (error) {
    return NextResponse.redirect(buildErrorRedirectUrl(request, nextPath, getErrorMessage(error)))
  }

  return NextResponse.redirect(new URL(nextPath, request.url))
}
