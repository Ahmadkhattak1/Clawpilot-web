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

export type TenantDaemonStatusSnapshot =
  | { kind: 'ok'; status: TenantDaemonStatus }
  | { kind: 'missing-daemon'; message: string | null }
  | { kind: 'runtime-instance-missing'; message: string | null }
  | { kind: 'runtime-config-missing'; message: string | null }
  | { kind: 'unknown'; message: string | null }

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

export function tenantHasReadyGateway(status: TenantDaemonStatus | null) {
  return status?.instance?.setupComplete === true || status?.instance?.gatewayProbe?.ready === true
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
  const snapshot = await fetchTenantDaemonStatusSnapshot(tenantId)
  return snapshot.kind === 'ok' ? snapshot.status : null
}

export function tenantNeedsRedeploy(snapshot: TenantDaemonStatusSnapshot): boolean {
  return (
    snapshot.kind === 'missing-daemon'
    || snapshot.kind === 'runtime-instance-missing'
    || snapshot.kind === 'runtime-config-missing'
  )
}

export async function fetchTenantDaemonStatusSnapshot(tenantId: string): Promise<TenantDaemonStatusSnapshot> {
  const backendUrl = getBackendUrl()

  try {
    const headers = await buildTenantAuthHeaders(tenantId)
    const response = await fetch(`${backendUrl}/api/v1/daemons/${tenantId}/status`, {
      headers,
    })

    if (response.ok) {
      return {
        kind: 'ok',
        status: (await response.json()) as TenantDaemonStatus,
      }
    }

    let errorCode = ''
    let message: string | null = null
    try {
      const payload = (await response.json()) as { error?: string; message?: string } | null
      errorCode = payload?.error?.trim().toUpperCase() ?? ''
      message = payload?.message?.trim() ?? null
    } catch {
      message = null
    }

    if (response.status === 404 && errorCode === 'DAEMON_NOT_FOUND') {
      return { kind: 'missing-daemon', message }
    }
    if (response.status === 409 && errorCode === 'RUNTIME_INSTANCE_MISSING') {
      return { kind: 'runtime-instance-missing', message }
    }
    if (response.status === 409 && errorCode === 'TENANT_RUNTIME_CONFIG_MISSING') {
      return { kind: 'runtime-config-missing', message }
    }

    return { kind: 'unknown', message }
  } catch {
    return { kind: 'unknown', message: null }
  }
}
