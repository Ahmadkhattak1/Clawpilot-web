import { getSupabaseAuthClient } from '@/lib/supabase-auth'

export async function getBrowserAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const supabase = getSupabaseAuthClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      return null
    }
    const token = data.session?.access_token?.trim() ?? ''
    return token || null
  } catch {
    return null
  }
}

export async function buildTenantAuthHeaders(
  tenantId: string,
  initialHeaders?: HeadersInit,
): Promise<Record<string, string>> {
  const headers = normalizeHeaders(initialHeaders)
  const normalizedTenantId = tenantId.trim()
  if (normalizedTenantId) {
    headers['x-tenant-id'] = normalizedTenantId
  }

  const accessToken = await getBrowserAccessToken()
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`
  }

  return headers
}

function normalizeHeaders(initialHeaders?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {}

  if (!initialHeaders) {
    return headers
  }

  if (initialHeaders instanceof Headers) {
    initialHeaders.forEach((value, key) => {
      headers[key] = value
    })
    return headers
  }

  if (Array.isArray(initialHeaders)) {
    for (const [key, value] of initialHeaders) {
      headers[key] = value
    }
    return headers
  }

  for (const [key, value] of Object.entries(initialHeaders)) {
    if (typeof value === 'string') {
      headers[key] = value
      continue
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      headers[key] = String(value)
    }
  }

  return headers
}
