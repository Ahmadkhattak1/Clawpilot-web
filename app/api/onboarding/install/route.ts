import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

import {
  getProviderModelOption,
  isProviderAvailableForRuntime,
  isModelSupportedByProviderSetupMethod,
  toHermesModelId,
  toHermesProviderId,
  toOpenClawProviderId,
} from '@/lib/model-providers'
import { getBackendUrl } from '@/lib/runtime-controls'
import { getSupabaseAuthConfig } from '@/lib/supabase-auth-config'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'

const RequestBodySchema = z.object({
  tenantId: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  onboarding: z.object({
    runtimeKind: z.enum(['openclaw', 'hermes']).default('openclaw'),
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

  const selectedModel = getProviderModelOption(body.onboarding.modelProviderId, body.onboarding.modelId)
  if (!isProviderAvailableForRuntime(body.onboarding.modelProviderId, body.onboarding.runtimeKind)) {
    return NextResponse.json(
      {
        error: 'UNSUPPORTED_RUNTIME_PROVIDER',
        message: 'Selected provider is not supported for this runtime.',
      },
      { status: 400 },
    )
  }

  if (!selectedModel) {
    return NextResponse.json(
      {
        error: 'UNSUPPORTED_MODEL',
        message: 'Selected model is not supported for the chosen provider.',
      },
      { status: 400 },
    )
  }

  if (!isModelSupportedByProviderSetupMethod(
    body.onboarding.modelProviderId,
    body.onboarding.modelId,
    body.onboarding.modelSetup.method,
  )) {
    return NextResponse.json(
      {
        error: 'UNSUPPORTED_MODEL_AUTH_METHOD',
        message: `${selectedModel.label} does not support ${body.onboarding.modelSetup.method}.`,
      },
      { status: 400 },
    )
  }

  const isHermesNousOAuth =
    body.onboarding.runtimeKind === 'hermes'
    && body.onboarding.modelProviderId === 'nous'
    && body.onboarding.modelSetup.method === 'oauth'

  if (body.onboarding.runtimeKind === 'hermes' && body.onboarding.modelSetup.method !== 'api-key' && !isHermesNousOAuth) {
    return NextResponse.json(
      {
        error: 'UNSUPPORTED_RUNTIME_AUTH_METHOD',
        message: 'Hermes Agent managed deployment requires an API key unless Nous OAuth is selected.',
      },
      { status: 400 },
    )
  }

  const apiKey = body.onboarding.modelSetup.apiKey?.trim()
  if (body.onboarding.modelSetup.method === 'api-key' && !apiKey) {
    return NextResponse.json(
      {
        error: 'MISSING_MODEL_API_KEY',
        message: 'Enter an API key before deploying.',
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

  let supabaseUrl: string
  let supabaseKey: string

  try {
    const supabaseConfig = getSupabaseAuthConfig()
    supabaseUrl = supabaseConfig.supabaseUrl
    supabaseKey = supabaseConfig.supabaseKey
  } catch {
    return NextResponse.json(
      {
        error: 'SERVER_MISCONFIGURED',
        message: 'Supabase environment variables are missing.',
      },
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
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

  try {
    const runtimeKind = body.onboarding.runtimeKind
    const runtimeProviderId =
      runtimeKind === 'openclaw'
        ? (toOpenClawProviderId(body.onboarding.modelProviderId) ?? body.onboarding.modelProviderId)
        : (toHermesProviderId(body.onboarding.modelProviderId) ?? body.onboarding.modelProviderId)
    const runtimeModelId =
      runtimeKind === 'hermes'
        ? (toHermesModelId(body.onboarding.modelProviderId, body.onboarding.modelId) ?? body.onboarding.modelId)
        : body.onboarding.modelId

    const tenantConfig = {
      runtimeKind,
      modelProviderId: runtimeProviderId,
      modelId: runtimeModelId,
      modelAuthMethod: body.onboarding.modelSetup.method,
      modelApiKey: apiKey,
      modelOauthConnected: Boolean(body.onboarding.modelSetup.oauthConnected),
      channelId: body.onboarding.channelId,
      channelKind: body.onboarding.channelSetup?.kind,
      channelCredentials: body.onboarding.channelSetup?.values ?? {},
      gatewayPort: runtimeKind === 'hermes' ? 9119 : 18789,
      gatewayBindAddress: '0.0.0.0',
      gatewayExposure: 'public',
      hermesApiServerPort: 8642,
    }

    const daemonResponse = await backendRequest<{ daemon?: unknown; error?: string }>({
      path: '/api/v1/daemons',
      method: 'POST',
      headers: {
        'x-tenant-id': tenantId,
        authorization: `Bearer ${accessToken}`,
      },
      body: {
        desiredState: 'RUNNING',
        tenantConfig,
      },
    })

    if (daemonResponse.status >= 400) {
      const backendError = readString(readRecord(daemonResponse.data)?.error)
      const backendMessage = readString(readRecord(daemonResponse.data)?.message)
      if (
        daemonResponse.status === 403 &&
        (backendError === 'TENANT_TERMINATED' || backendError === 'TENANT_SUSPENDED' || backendError === 'UPGRADE_REQUIRED')
      ) {
        return NextResponse.json(
          {
            error: 'UPGRADE_REQUIRED',
            message: `Active managed-hosting subscription is required to deploy your managed ${
              runtimeKind === 'hermes' ? 'Hermes Agent' : 'OpenClaw'
            } instance.`,
            backend: daemonResponse.data,
          },
          { status: 403 },
        )
      }

      if (daemonResponse.status === 409 && backendError === 'TENANT_RUNTIME_KIND_LOCKED') {
        return NextResponse.json(
          {
            error: 'TENANT_RUNTIME_KIND_LOCKED',
            message: backendMessage ?? 'This account already has a hosted runtime. Additional runtimes are disabled in this build.',
            backend: daemonResponse.data,
          },
          { status: 409 },
        )
      }

      return NextResponse.json(
        {
          error: 'DAEMON_PROVISION_FAILED',
          message: backendMessage ?? backendError ?? 'Deploy failed.',
          backend: daemonResponse.data,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      status: 'ok',
      tenantId,
      setupCollected: {
        runtimeKind,
        modelProviderId: runtimeProviderId,
        modelId: runtimeModelId,
        channelId: body.onboarding.channelId ?? null,
      },
      daemon: daemonResponse.data,
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
