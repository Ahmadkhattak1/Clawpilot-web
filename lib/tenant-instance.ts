import { buildTenantAuthHeaders } from '@/lib/backend-auth'
import { getBackendUrl } from '@/lib/runtime-controls'

export interface TenantDaemonRecord {
  daemon?: {
    status?: string | null
    runtimeResourceId?: string | null
  }
}

export type TenantDaemonPresence = 'present' | 'missing' | 'unknown'

export interface TenantDaemonStatus {
  daemon?: {
    runtimeMode?: string
    status?: string
    runtimeResourceId?: string | null
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
  if (status?.instance && (status.instance.instanceId || status.instance.instanceState)) {
    return true
  }

  const runtimeResourceId = status?.daemon?.runtimeResourceId?.trim()
  return Boolean(runtimeResourceId)
}

export function tenantHasPersistedDaemon(daemonRecord: TenantDaemonRecord | null): boolean {
  const daemon = daemonRecord?.daemon
  if (!daemon) {
    return false
  }

  const runtimeResourceId = daemon.runtimeResourceId?.trim()
  if (runtimeResourceId) {
    return true
  }

  const daemonStatus = daemon.status?.trim().toUpperCase()
  if (daemonStatus === 'RUNNING' || daemonStatus === 'STOPPED') {
    return true
  }

  return false
}

export async function fetchTenantDaemonRecord(tenantId: string): Promise<TenantDaemonRecord | null> {
  const backendUrl = getBackendUrl()

  try {
    const headers = await buildTenantAuthHeaders(tenantId)
    const response = await fetch(`${backendUrl}/api/v1/daemons/${tenantId}`, {
      headers,
    })

    if (!response.ok) return null
    return (await response.json()) as TenantDaemonRecord
  } catch {
    return null
  }
}

export async function fetchTenantDaemonPresence(tenantId: string): Promise<TenantDaemonPresence> {
  const backendUrl = getBackendUrl()

  try {
    const headers = await buildTenantAuthHeaders(tenantId)
    const response = await fetch(`${backendUrl}/api/v1/daemons/${tenantId}`, {
      headers,
    })

    if (response.ok) {
      const payload = (await response.json()) as TenantDaemonRecord | null
      return tenantHasPersistedDaemon(payload) ? 'present' : 'missing'
    }

    if (response.status === 404) {
      return 'missing'
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
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
