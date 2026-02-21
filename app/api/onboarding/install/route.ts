import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { toOpenClawProviderId } from '@/lib/model-providers'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

const RequestBodySchema = z.object({
  tenantId: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  onboarding: z.object({
    modelProviderId: z.string().min(1),
    modelId: z.string().min(1),
    modelSetup: z.object({
      method: z.enum(['oauth', 'api-key']),
      hasApiKey: z.boolean().optional(),
      apiKey: z.string().optional(),
      oauthConnected: z.boolean().optional(),
      updatedAt: z.string(),
    }),
    channelId: z.string().min(1).optional(),
    channelSetup: z
      .object({
        channelId: z.string(),
        kind: z.string(),
        values: z.record(z.string()),
        linked: z.boolean().optional(),
        updatedAt: z.string(),
      })
      .optional(),
    skillIds: z.array(z.string()).default([]),
    skillConfigs: z.record(z.string(), z.record(z.string())).default({}),
  }),
})

interface BackendRequestOptions {
  path: string
  method?: 'GET' | 'POST' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

async function backendRequest<T>({
  path,
  method = 'GET',
  headers = {},
  body,
}: BackendRequestOptions): Promise<{ status: number; data: T }> {
  const backendApiUrl =
    process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4000'

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
        message: 'Authenticated user cannot provision this tenant.',
      },
      { status: 403 },
    )
  }

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

  try {
    const openClawProviderId =
      toOpenClawProviderId(body.onboarding.modelProviderId) ?? body.onboarding.modelProviderId

    const tenantResponse = await backendRequest<{ tenant?: unknown; error?: string }>({
      path: '/api/v1/internal/tenants',
      method: 'POST',
      headers: {
        'x-internal-api-token': internalToken,
      },
      body: {
        tenantId,
        state: 'ACTIVE',
      },
    })

    if (tenantResponse.status >= 400) {
      return NextResponse.json(
        {
          error: 'TENANT_BOOTSTRAP_FAILED',
          backend: tenantResponse.data,
        },
        { status: 502 },
      )
    }

    const tenantConfig = {
      modelProviderId: openClawProviderId,
      modelId: body.onboarding.modelId,
      modelAuthMethod: body.onboarding.modelSetup.method,
      modelApiKey: body.onboarding.modelSetup.apiKey,
      modelOauthConnected: Boolean(body.onboarding.modelSetup.oauthConnected),
      channelId: body.onboarding.channelId,
      channelKind: body.onboarding.channelSetup?.kind,
      channelCredentials: body.onboarding.channelSetup?.values ?? {},
      skillIds: body.onboarding.skillIds,
      skillConfigs: body.onboarding.skillConfigs,
    }

    const daemonResponse = await backendRequest<{ daemon?: unknown; error?: string }>({
      path: '/api/v1/daemons',
      method: 'POST',
      headers: {
        'x-tenant-id': tenantId,
        'x-internal-api-token': internalToken,
      },
      body: {
        desiredState: 'RUNNING',
        tenantConfig,
      },
    })

    if (daemonResponse.status >= 400) {
      const backendError = readString(readRecord(daemonResponse.data)?.error)
      if (daemonResponse.status === 403 && backendError === 'TENANT_TERMINATED') {
        return NextResponse.json(
          {
            error: 'UPGRADE_REQUIRED',
            message: 'Your trial has ended. Upgrade to deploy your managed OpenClaw instance.',
            backend: daemonResponse.data,
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          error: 'DAEMON_PROVISION_FAILED',
          backend: daemonResponse.data,
        },
        { status: 502 },
      )
    }

    await backendRequest({
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
    })

    const subscriptionResponse = await backendRequest({
      path: '/api/v1/subscription',
      method: 'GET',
      headers: {
        'x-tenant-id': tenantId,
        'x-internal-api-token': internalToken,
      },
    })

    const costsResponse = await backendRequest({
      path: '/api/v1/costs/current-month',
      method: 'GET',
      headers: {
        'x-tenant-id': tenantId,
        'x-internal-api-token': internalToken,
      },
    })

    return NextResponse.json({
      status: 'ok',
      tenantId,
      setupCollected: {
        modelProviderId: openClawProviderId,
        modelId: body.onboarding.modelId,
        channelId: body.onboarding.channelId ?? null,
        skillsCount: body.onboarding.skillIds.length,
      },
      tenant: tenantResponse.data,
      daemon: daemonResponse.data,
      subscription: subscriptionResponse.data,
      costs: costsResponse.data,
    })
  } catch {
    return NextResponse.json(
      {
        error: 'BACKEND_UNREACHABLE',
        message: 'Unable to connect to backend API. Check BACKEND_API_URL and backend service health.',
      },
      { status: 502 },
    )
  }
}
