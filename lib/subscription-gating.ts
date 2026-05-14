import { buildTenantAuthHeaders } from '@/lib/backend-auth'
import { getBackendUrl } from '@/lib/runtime-controls'
import { getSafeNextPath } from '@/lib/supabase-auth'

type BillingPlan = 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY'

export interface SubscriptionSnapshot {
  state?: string
  plan?: string
  billingStatus?: string
  isPaidPlan?: boolean
}

const SUBSCRIPTION_SNAPSHOT_ACTIVE_CACHE_MS = 120_000
const SUBSCRIPTION_SNAPSHOT_INACTIVE_CACHE_MS = 5_000
const subscriptionSnapshotCache = new Map<
  string,
  {
    expiresAtMs: number
    promise: Promise<SubscriptionSnapshot | null>
  }
>()

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeBillingPlan(value: unknown): BillingPlan | null {
  const normalized = readString(value)?.toUpperCase()
  if (!normalized) return null
  if (normalized === 'FREE' || normalized === 'PRO_MONTHLY' || normalized === 'PRO_YEARLY') {
    return normalized as BillingPlan
  }
  return null
}

export function hasManagedHostingPlan(snapshot: SubscriptionSnapshot | null): boolean {
  if (!snapshot) return false
  if (typeof snapshot.isPaidPlan === 'boolean') {
    return snapshot.isPaidPlan
  }

  const plan = normalizeBillingPlan(snapshot.plan)
  if (plan !== 'PRO_MONTHLY' && plan !== 'PRO_YEARLY') {
    return false
  }

  const state = readString(snapshot.state)?.toUpperCase() ?? ''
  if (state === 'TERMINATED' || state === 'SUSPENDED') {
    return false
  }

  const billingStatus = readString(snapshot.billingStatus)?.toUpperCase() ?? ''
  return billingStatus === 'ACTIVE' || billingStatus === 'TRIALING' || billingStatus === 'PAST_DUE'
}

export async function fetchSubscriptionSnapshot(
  tenantId: string,
  options: { cache?: 'default' | 'no-store' } = {},
): Promise<SubscriptionSnapshot | null> {
  const normalizedTenantId = tenantId.trim()
  if (!normalizedTenantId) return null

  const canUseCache = options.cache !== 'no-store' && typeof window !== 'undefined'

  if (canUseCache) {
    const cached = subscriptionSnapshotCache.get(normalizedTenantId)
    if (cached && Date.now() < cached.expiresAtMs) {
      return cached.promise
    }
  } else if (typeof window !== 'undefined') {
    subscriptionSnapshotCache.delete(normalizedTenantId)
  }

  const snapshotPromise = fetchSubscriptionSnapshotUncached(normalizedTenantId)
  if (canUseCache) {
    subscriptionSnapshotCache.set(normalizedTenantId, {
      expiresAtMs: Date.now() + 5_000,
      promise: snapshotPromise,
    })
    void snapshotPromise
      .then((snapshot) => {
        const cacheMs = resolveSubscriptionSnapshotCacheMs(snapshot)
        subscriptionSnapshotCache.set(normalizedTenantId, {
          expiresAtMs: Date.now() + cacheMs,
          promise: Promise.resolve(snapshot),
        })
      })
      .catch(() => {
        subscriptionSnapshotCache.delete(normalizedTenantId)
      })
  }

  return snapshotPromise
}

async function fetchSubscriptionSnapshotUncached(tenantId: string): Promise<SubscriptionSnapshot | null> {
  try {
    const headers = await buildTenantAuthHeaders(tenantId)
    const response = await fetch(`${getBackendUrl()}/api/v1/subscription`, {
      method: 'GET',
      headers,
    })

    const payloadText = await response.text()
    const payload = readRecord(payloadText ? JSON.parse(payloadText) : null)

    if (response.status === 403 && readString(payload?.error) === 'TENANT_TERMINATED') {
      return {
        state: 'TERMINATED',
        plan: 'FREE',
        isPaidPlan: false,
      }
    }

    if (!response.ok || !payload) {
      return null
    }

    return payload as SubscriptionSnapshot
  } catch {
    return null
  }
}

function resolveSubscriptionSnapshotCacheMs(snapshot: SubscriptionSnapshot | null): number {
  return hasManagedHostingPlan(snapshot)
    ? SUBSCRIPTION_SNAPSHOT_ACTIVE_CACHE_MS
    : SUBSCRIPTION_SNAPSHOT_INACTIVE_CACHE_MS
}

export function buildBillingRequiredPath(nextPath = '/dashboard/runtime'): string {
  const query = new URLSearchParams()
  query.set('required', '1')
  query.set('next', getSafeNextPath(nextPath, '/dashboard/runtime'))
  return `/dashboard/settings/subscription?${query.toString()}`
}
