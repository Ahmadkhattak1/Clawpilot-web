import {
  fetchTenantDaemonStatusSnapshot,
  tenantHasProvisionedInstance,
  tenantHasReadyGateway,
  tenantNeedsRedeploy,
} from '@/lib/tenant-instance'

export const DEPLOY_STARTED_STORAGE_KEY = 'clawpilot:deploy-started-at'

export function readPersistedDeployStartedAt(): number | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(DEPLOY_STARTED_STORAGE_KEY)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  } catch {
    return null
  }
}

export function writePersistedDeployStartedAt(ts: number | null) {
  if (typeof window === 'undefined') return

  try {
    if (ts === null) {
      window.localStorage.removeItem(DEPLOY_STARTED_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(DEPLOY_STARTED_STORAGE_KEY, String(ts))
  } catch {
    // Ignore storage write failures.
  }
}

export async function isTenantDeploymentStillStarting(tenantId: string): Promise<boolean> {
  if (!tenantId.trim()) {
    return false
  }

  const daemonSnapshot = await fetchTenantDaemonStatusSnapshot(tenantId)
  if (tenantNeedsRedeploy(daemonSnapshot)) {
    writePersistedDeployStartedAt(null)
    return false
  }

  if (daemonSnapshot.kind !== 'ok') {
    return false
  }
  const daemonStatus = daemonSnapshot.status

  if (tenantHasReadyGateway(daemonStatus)) {
    writePersistedDeployStartedAt(null)
    return false
  }

  const daemonState = daemonStatus.daemon?.status?.trim().toUpperCase() ?? null
  if (daemonState === 'TERMINATED') {
    writePersistedDeployStartedAt(null)
    return false
  }

  if (
    tenantHasProvisionedInstance(daemonStatus) ||
    daemonState === 'RUNNING' ||
    daemonState === 'STOPPED'
  ) {
    return true
  }

  return readPersistedDeployStartedAt() !== null
}
