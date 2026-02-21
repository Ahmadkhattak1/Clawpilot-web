import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getBackendUrl } from '@/lib/runtime-controls'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

export const dynamic = 'force-dynamic'

interface InternalLaunchResponse {
  launch?: {
    url?: unknown
    sessionExpiresAt?: unknown
    sessionIdleTimeoutSeconds?: unknown
    instanceState?: unknown
    reachableVia?: unknown
  }
  error?: unknown
  message?: unknown
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null
  const normalized = authorizationHeader.trim()
  if (!normalized) return null
  if (!normalized.toLowerCase().startsWith('bearer ')) return null
  const token = normalized.slice(7).trim()
  return token || null
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

function normalizeLaunchUrl(rawUrl: string, backendBaseUrl: string): string | null {
  if (!rawUrl.trim()) {
    return null
  }
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl.trim()
  }
  if (!backendBaseUrl.trim()) {
    return null
  }
  const base = backendBaseUrl.trim().replace(/\/+$/, '')
  const path = rawUrl.trim().startsWith('/') ? rawUrl.trim() : `/${rawUrl.trim()}`
  return `${base}${path}`
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const accessToken = extractBearerToken(request.headers.get('authorization'))
  if (!accessToken) {
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Missing access token',
      },
      { status: 401 },
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        error: 'SERVER_MISCONFIGURED',
        message: 'Supabase environment variables are missing.',
      },
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired session token.',
      },
      { status: 401 },
    )
  }

  const tenantId = deriveTenantIdFromUserId(userData.user.id)
  const backendApiUrl = getBackendUrl()
  const backendPublicApiUrl = getBackendUrl()
  const internalToken = process.env.BACKEND_INTERNAL_API_TOKEN
  if (!internalToken) {
    return NextResponse.json(
      {
        error: 'SERVER_MISCONFIGURED',
        message: 'BACKEND_INTERNAL_API_TOKEN is missing',
      },
      { status: 500 },
    )
  }

  let backendResponse: Response
  try {
    backendResponse = await fetch(
      `${backendApiUrl}/api/v1/internal/tenants/${encodeURIComponent(tenantId)}/openclaw/launch`,
      {
        method: 'GET',
        headers: {
          'x-internal-api-token': internalToken,
        },
        cache: 'no-store',
      },
    )
  } catch {
    return NextResponse.json(
      {
        error: 'BACKEND_UNREACHABLE',
        message: 'Unable to connect to backend API.',
      },
      { status: 502 },
    )
  }

  const backendPayload = (await parseJsonSafe(backendResponse)) as InternalLaunchResponse | null
  if (!backendResponse.ok) {
    return NextResponse.json(
      {
        error: readString(backendPayload?.error) ?? 'OPENCLAW_LAUNCH_UNAVAILABLE',
        message: readString(backendPayload?.message) ?? 'Unable to launch OpenClaw right now.',
      },
      { status: backendResponse.status },
    )
  }

  const launchUrl = readString(backendPayload?.launch?.url)
  const instanceState = readString(backendPayload?.launch?.instanceState)
  const reachableVia = readString(backendPayload?.launch?.reachableVia)
  const sessionExpiresAt = readString(backendPayload?.launch?.sessionExpiresAt)
  const sessionIdleTimeoutSeconds =
    typeof backendPayload?.launch?.sessionIdleTimeoutSeconds === 'number' &&
    Number.isFinite(backendPayload.launch.sessionIdleTimeoutSeconds)
      ? Math.max(30, Math.trunc(backendPayload.launch.sessionIdleTimeoutSeconds))
      : null

  if (!launchUrl) {
    return NextResponse.json(
      {
        error: 'INVALID_BACKEND_RESPONSE',
        message: 'Backend launch payload is missing launch URL.',
      },
      { status: 502 },
    )
  }

  const normalizedLaunchUrl = normalizeLaunchUrl(launchUrl, backendPublicApiUrl)
  if (!normalizedLaunchUrl) {
    return NextResponse.json(
      {
        error: 'INVALID_BACKEND_RESPONSE',
        message: 'Backend launch URL is not valid.',
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    tenantId,
    launch: {
      url: normalizedLaunchUrl,
      instanceState,
      reachableVia: reachableVia === 'public' || reachableVia === 'private' ? reachableVia : null,
      sessionExpiresAt,
      sessionIdleTimeoutSeconds,
    },
  })
}
