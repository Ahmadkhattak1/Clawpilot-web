import { buildTenantAuthHeaders } from '@/lib/backend-auth'
import { getBackendUrl } from '@/lib/runtime-controls'

export interface TenantDaemonStatus {
  daemon?: {
    daemonId?: string
    tenantId?: string
    runtimeMode?: string
    status?: string
    createdAt?: string
    updatedAt?: string
    runtimeResourceId?: string | null
  }
  instance?: {
    instanceState?: string
    instanceId?: string
    instanceName?: string | null
    setupComplete?: boolean
    publicIp?: string | null
    privateIp?: string | null
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

const TENANT_STATUS_SNAPSHOT_PENDING_CACHE_MS = 3_000
const TENANT_STATUS_SNAPSHOT_READY_CACHE_MS = 60_000
const tenantStatusSnapshotCache = new Map<
  string,
  {
    expiresAtMs: number
    promise: Promise<TenantDaemonStatusSnapshot>
  }
>()

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

export function resolveTenantMachineLabel(status: TenantDaemonStatus | null) {
  const name = status?.instance?.instanceName?.trim()
  if (name) return name

  const id = status?.instance?.instanceId?.trim() ?? status?.daemon?.runtimeResourceId?.trim()
  if (id) return `droplet-${id}`

  const state = status?.instance?.instanceState?.trim()
  if (state && state !== 'unknown') return `digitalocean.${state}`

  return 'managed machine'
}

export async function fetchTenantDaemonStatus(
  tenantId: string,
  options: { cache?: 'default' | 'no-store' } = {},
): Promise<TenantDaemonStatus | null> {
  const snapshot = await fetchTenantDaemonStatusSnapshot(tenantId, options)
  return snapshot.kind === 'ok' ? snapshot.status : null
}

export function tenantNeedsRedeploy(snapshot: TenantDaemonStatusSnapshot): boolean {
  return (
    snapshot.kind === 'missing-daemon'
    || snapshot.kind === 'runtime-instance-missing'
    || snapshot.kind === 'runtime-config-missing'
  )
}

export async function fetchTenantDaemonStatusSnapshot(
  tenantId: string,
  options: { cache?: 'default' | 'no-store' } = {},
): Promise<TenantDaemonStatusSnapshot> {
  const normalizedTenantId = tenantId.trim()
  if (!normalizedTenantId) {
    return { kind: 'unknown', message: null }
  }

  const canUseCache = options.cache !== 'no-store' && typeof window !== 'undefined'

  if (canUseCache) {
    const cached = tenantStatusSnapshotCache.get(normalizedTenantId)
    if (cached && Date.now() < cached.expiresAtMs) {
      return cached.promise
    }
  } else if (typeof window !== 'undefined') {
    tenantStatusSnapshotCache.delete(normalizedTenantId)
  }

  const snapshotPromise = fetchTenantDaemonStatusSnapshotUncached(normalizedTenantId)
  if (canUseCache) {
    tenantStatusSnapshotCache.set(normalizedTenantId, {
      expiresAtMs: Date.now() + TENANT_STATUS_SNAPSHOT_PENDING_CACHE_MS,
      promise: snapshotPromise,
    })
    void snapshotPromise
      .then((snapshot) => {
        const cacheMs = resolveTenantStatusSnapshotCacheMs(snapshot)
        tenantStatusSnapshotCache.set(normalizedTenantId, {
          expiresAtMs: Date.now() + cacheMs,
          promise: Promise.resolve(snapshot),
        })
      })
      .catch(() => {
        tenantStatusSnapshotCache.delete(normalizedTenantId)
      })
  }

  return snapshotPromise
}

function resolveTenantStatusSnapshotCacheMs(snapshot: TenantDaemonStatusSnapshot): number {
  if (snapshot.kind === 'ok' && tenantHasReadyGateway(snapshot.status)) {
    return TENANT_STATUS_SNAPSHOT_READY_CACHE_MS
  }
  return TENANT_STATUS_SNAPSHOT_PENDING_CACHE_MS
}

async function fetchTenantDaemonStatusSnapshotUncached(tenantId: string): Promise<TenantDaemonStatusSnapshot> {
  const backendUrl = getBackendUrl()

  try {
    const headers = await buildTenantAuthHeaders(tenantId)
    const response = await fetch(`${backendUrl}/api/v1/daemons/${tenantId}/status`, {
      headers,
      cache: 'no-store',
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
