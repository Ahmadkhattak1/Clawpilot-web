import { buildTenantAuthHeaders } from '@/lib/backend-auth'
import { getBackendUrl } from '@/lib/runtime-controls'

export interface TenantDaemonStatus {
  daemon?: {
    runtimeMode?: string
    status?: string
  }
  instance?: {
    instanceState?: string
    instanceId?: string
    setupComplete?: boolean
    gatewayProbe?: {
      ready?: boolean
      checkedAt?: string
      gatewayPort?: number
      reachableVia?: 'public' | 'private' | null
      publicProbeError?: string | null
      privateProbeError?: string | null
    }
  }
}

export function deriveTenantIdFromUserId(userId: string) {
  const normalized = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `tenant_${normalized}`.slice(0, 64)
}

export function tenantHasProvisionedInstance(status: TenantDaemonStatus | null) {
  if (!status?.instance) return false
  return Boolean(status.instance.instanceId || status.instance.instanceState)
}

export async function fetchTenantDaemonStatus(tenantId: string): Promise<TenantDaemonStatus | null> {
  const backendUrl = getBackendUrl()

  try {
    const headers = await buildTenantAuthHeaders(tenantId)
    const response = await fetch(`${backendUrl}/api/v1/daemons/${tenantId}/status`, {
      headers,
    })

    if (!response.ok) return null
    return (await response.json()) as TenantDaemonStatus
  } catch {
    return null
  }
}
