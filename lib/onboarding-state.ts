import type { Session } from '@supabase/supabase-js'

import { getSupabaseAuthClient } from '@/lib/supabase-auth'
import {
  deriveTenantIdFromUserId,
  fetchTenantDaemonStatusSnapshot,
  tenantNeedsRedeploy,
  tenantHasReadyGateway,
} from '@/lib/tenant-instance'

interface RuntimeOnboardingRow {
  onboarding_complete?: boolean | null
  onboarding_completed_at?: string | null
  model_provider_id?: string | null
  model_id?: string | null
  auth_method?: string | null
  oauth_connected?: boolean | null
}

function isSchemaError(code: string | undefined) {
  if (!code) return false
  return code === 'PGRST204' || code === 'PGRST205' || code === '42703'
}

export async function markOnboardingComplete(session: Session): Promise<void> {
  const supabase = getSupabaseAuthClient()
  const tenantId = deriveTenantIdFromUserId(session.user.id)
  const nowIso = new Date().toISOString()

  const { error } = await supabase.from('openclaw_runtime_profiles').upsert({
    user_id: session.user.id,
    tenant_id: tenantId,
    onboarding_complete: true,
    onboarding_completed_at: nowIso,
    updated_at: nowIso,
  })

  if (error && !isSchemaError(error.code)) {
    throw error
  }
}

export async function markOnboardingIncomplete(session: Session): Promise<void> {
  const supabase = getSupabaseAuthClient()
  const tenantId = deriveTenantIdFromUserId(session.user.id)
  const nowIso = new Date().toISOString()

  const { error } = await supabase.from('openclaw_runtime_profiles').upsert({
    user_id: session.user.id,
    tenant_id: tenantId,
    onboarding_complete: false,
    onboarding_completed_at: null,
    model_provider_id: null,
    model_id: null,
    auth_method: null,
    oauth_connected: false,
    updated_at: nowIso,
  })

  if (error && !isSchemaError(error.code)) {
    throw error
  }
}

export async function isOnboardingComplete(
  session: Session,
  options: { backfillFromProvisionedTenant?: boolean } = {},
): Promise<boolean> {
  const supabase = getSupabaseAuthClient()
  const tenantId = deriveTenantIdFromUserId(session.user.id)

  const { data, error } = await supabase
    .from('openclaw_runtime_profiles')
    .select('onboarding_complete,onboarding_completed_at,model_provider_id,model_id,auth_method,oauth_connected')
    .eq('user_id', session.user.id)
    .eq('tenant_id', tenantId)
    .maybeSingle<RuntimeOnboardingRow>()

  if (error && !isSchemaError(error.code)) {
    throw error
  }

  const legacyProfileConfigured = Boolean(
    data?.model_provider_id?.trim() ||
    data?.model_id?.trim() ||
    data?.auth_method?.trim() ||
    data?.oauth_connected === true,
  )
  const hasExplicitOnboardingFlag = Boolean(data?.onboarding_complete || data?.onboarding_completed_at)
  const complete = Boolean(hasExplicitOnboardingFlag || legacyProfileConfigured)
  let daemonSnapshotPromise: Promise<Awaited<ReturnType<typeof fetchTenantDaemonStatusSnapshot>>> | null = null
  const getDaemonSnapshot = () => {
    if (!daemonSnapshotPromise) {
      daemonSnapshotPromise = fetchTenantDaemonStatusSnapshot(tenantId)
    }
    return daemonSnapshotPromise
  }

  if (complete) {
    const daemonSnapshot = await getDaemonSnapshot()
    if (tenantNeedsRedeploy(daemonSnapshot)) {
      try {
        await markOnboardingIncomplete(session)
      } catch {
        // Prefer treating the deleted runtime as the source of truth even if profile cleanup lags.
      }
      return false
    }

    if (!hasExplicitOnboardingFlag && legacyProfileConfigured) {
      await markOnboardingComplete(session)
    }
    return true
  }
  if (!options.backfillFromProvisionedTenant) return false

  const daemonSnapshot = await getDaemonSnapshot()
  if (daemonSnapshot.kind !== 'ok') return false
  if (!tenantHasReadyGateway(daemonSnapshot.status)) return false

  await markOnboardingComplete(session)
  return true
}
