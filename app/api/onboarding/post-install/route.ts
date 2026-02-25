import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { getBackendUrl } from '@/lib/runtime-controls'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

const RequestBodySchema = z.object({
  tenantId: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
})

interface BackendRequestOptions {
  path: string
  method?: 'GET' | 'POST' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
}

interface DeferredTaskResult {
  status: 'ok' | 'failed' | 'skipped'
  error?: string
}

async function backendRequest<T>({
  path,
  method = 'GET',
  headers = {},
  body,
}: BackendRequestOptions): Promise<{ status: number; data: T }> {
  const backendApiUrl = getBackendUrl()

  try {
    const response = await fetch(`${backendApiUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })

    const text = await response.text()
    let data = {} as T

    if (text) {
      try {
        data = JSON.parse(text) as T
      } catch {
        data = {
          raw: text,
        } as T
      }
    }

    return {
      status: response.status,
      data,
    }
  } catch {
    throw new Error('BACKEND_UNREACHABLE')
  }
}

function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null
  const normalized = authorizationHeader.trim()
  if (!normalized) return null
  if (!normalized.toLowerCase().startsWith('bearer ')) return null
  const token = normalized.slice(7).trim()
  return token || null
}

async function runDeferredTask(task: () => Promise<{ status: number }>): Promise<DeferredTaskResult> {
  try {
    const response = await task()
    if (response.status >= 400) {
      return {
        status: 'failed',
        error: `HTTP_${response.status}`,
      }
    }
    return {
      status: 'ok',
    }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    }
  }
}

export async function POST(request: Request) {
  let body: z.infer<typeof RequestBodySchema>

  try {
    const raw = await request.json()
    const parsed = RequestBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    body = parsed.data
  } catch {
    return NextResponse.json(
      {
        error: 'INVALID_JSON',
      },
      { status: 400 },
    )
  }

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
  if (body.tenantId !== tenantId) {
    return NextResponse.json(
      {
        error: 'TENANT_ACCESS_DENIED',
        message: 'Authenticated user cannot finalize onboarding for this tenant.',
      },
      { status: 403 },
    )
  }

  const internalToken = process.env.BACKEND_INTERNAL_API_TOKEN?.trim() || ''
  const usageEventsTask: Promise<DeferredTaskResult> = internalToken
    ? runDeferredTask(() => backendRequest({
        path: '/api/v1/internal/usage-events',
        method: 'POST',
        headers: {
          'x-internal-api-token': internalToken,
        },
        body: {
          tenantId,
          apiRequests: 5,
          daemonRuntimeMinutes: 5,
          egressGb: 0,
        },
      }))
    : Promise.resolve({
        status: 'skipped',
      } as DeferredTaskResult)

  const usageEvents = await usageEventsTask

  const complete = usageEvents.status !== 'failed'

  return NextResponse.json({
    status: complete ? 'ok' : 'partial',
    complete,
    tenantId,
    tasks: {
      usageEvents,
    },
  })
}
