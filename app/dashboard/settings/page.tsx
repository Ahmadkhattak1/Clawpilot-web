'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, ExternalLink, Key, Loader2, RefreshCw, Sparkles, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CHANNEL_OPTIONS } from '@/lib/channel-options'
import {
  AVAILABLE_MODEL_PROVIDER_OPTIONS,
  getProviderModelOptions,
  toOpenClawProviderId,
} from '@/lib/model-providers'
import {
  completeRuntimeOpenAICodexOAuth,
  startRuntimeOpenAICodexOAuth,
  updateRuntimeCurrentModel,
} from '@/lib/runtime-controls'
import {
  getPersistedRuntimeProfile,
  upsertPersistedRuntimeProfile,
  type PersistedRuntimeProfile,
} from '@/lib/runtime-persistence'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

const SUPPORTED_PROVIDER_IDS = ['openai', 'anthropic', 'google'] as const
const INITIAL_VISIBLE_MODELS = 3
type SupportedProviderId = (typeof SUPPORTED_PROVIDER_IDS)[number]

function isSupportedProviderId(value: string | null): value is SupportedProviderId {
  if (!value) return false
  return SUPPORTED_PROVIDER_IDS.includes(value as SupportedProviderId)
}

function inferProviderFromModelId(modelId: string): string | null {
  const normalized = modelId.trim()
  if (!normalized) return null
  const slashIndex = normalized.indexOf('/')
  if (slashIndex <= 0) return null
  const providerId = normalized.slice(0, slashIndex)
  if (providerId === 'openai-codex') return 'openai'
  return providerId
}

function normalizeOpenAIModelIdForUi(modelId: string): string {
  const normalized = modelId.trim()
  if (!normalized.startsWith('openai-codex/')) return normalized
  return `openai/${normalized.slice('openai-codex/'.length)}`
}

function normalizeOpenAIModelIdForRuntime(modelId: string): string {
  const normalized = modelId.trim()
  if (!normalized.startsWith('openai/')) return normalized
  return `openai-codex/${normalized.slice('openai/'.length)}`
}

function normalizeModelIdForComparison(modelId: string): string {
  return normalizeOpenAIModelIdForUi(modelId)
}

function formatOAuthExpiryCountdown(expiresAt: string, nowMs: number): string {
  const expiresAtMs = Date.parse(expiresAt)
  if (!Number.isFinite(expiresAtMs)) return 'Unknown'

  const remainingMs = expiresAtMs - nowMs
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const remainingMinutes = Math.floor(remainingSeconds / 60)
  const secondsPart = remainingSeconds % 60
  if (remainingMs <= 0) return 'Expired'
  return `${remainingMinutes}m ${secondsPart}s`
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    const normalized = error.message.trim()
    if (/not found/i.test(normalized)) return 'Runtime not ready. Open workspace first, then retry.'
    if (/daemon_not_found|daemon not found/i.test(normalized)) return 'Daemon not found. Retry in a moment.'
    if (/gateway_unavailable|gateway.*unavailable|gateway rpc timed out|not running/i.test(normalized)) return 'OpenClaw is starting. Try again in a moment.'
    return normalized
  }
  return fallback
}

function shortModelLabel(modelId: string): string {
  const normalized = modelId.trim()
  if (!normalized) return 'None'
  const slashIndex = normalized.indexOf('/')
  if (slashIndex > 0) return normalized.slice(slashIndex + 1)
  return normalized
}

function buildModelLabel(modelId: string) {
  const normalized = modelId.trim()
  if (!normalized) return modelId
  const fromKnownProviders = SUPPORTED_PROVIDER_IDS
    .flatMap((providerId) => getProviderModelOptions(providerId))
    .find((model) => model.id === normalized)
  if (fromKnownProviders) return fromKnownProviders.label
  return shortModelLabel(normalized)
}

const MANAGE_CHANNEL_INLINE_LOGOS = (() => {
  const seen = new Set<string>()
  const icons: Array<{ src: string; alt: string }> = []

  for (const channel of CHANNEL_OPTIONS) {
    if (!channel.logoSrc || seen.has(channel.logoSrc)) continue
    seen.add(channel.logoSrc)
    icons.push({ src: channel.logoSrc, alt: channel.label })
  }

  return icons
})()

export default function SettingsPageWrapper() {
  return (
    <Suspense fallback={<div className="grid min-h-[100svh] place-items-center bg-background"><p className="text-sm text-muted-foreground">Loading settings...</p></div>}>
      <SettingsPage />
    </Suspense>
  )
}

function SettingsPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [userId, setUserId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [loadingRuntime, setLoadingRuntime] = useState(false)
  const [runtimeError, setRuntimeError] = useState('')

  const [runtimeCurrentModelId, setRuntimeCurrentModelId] = useState('')

  const [selectedProviderId, setSelectedProviderId] = useState<SupportedProviderId>('openai')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [showAllModels, setShowAllModels] = useState(false)
  const [authMethod, setAuthMethod] = useState<'api-key' | 'oauth'>('api-key')
  const [authApiKey, setAuthApiKey] = useState('')
  const [oauthConnected, setOauthConnected] = useState(false)
  const [oauthSessionId, setOauthSessionId] = useState('')
  const [oauthAuthUrl, setOauthAuthUrl] = useState('')
  const [oauthExpiresAt, setOauthExpiresAt] = useState<string | null>(null)
  const [oauthCallback, setOauthCallback] = useState('')
  const [oauthBusy, setOauthBusy] = useState(false)
  const [oauthStatus, setOauthStatus] = useState('')
  const [oauthError, setOauthError] = useState('')
  const [savedAuthMethod, setSavedAuthMethod] = useState<'api-key' | 'oauth' | null>(null)
  const [savedProviderId, setSavedProviderId] = useState<SupportedProviderId | null>(null)
  const [savedOauthConnected, setSavedOauthConnected] = useState(false)
  const [editingAuth, setEditingAuth] = useState(false)
  const [oauthCountdownNowMs, setOauthCountdownNowMs] = useState(() => Date.now())
  const [modelStatus, setModelStatus] = useState('')
  const [modelStatusType, setModelStatusType] = useState<'success' | 'error' | 'info'>('info')
  const [savingModel, setSavingModel] = useState(false)
  const canUseOAuthInSettings = selectedProviderId === 'openai'

  const providerOptions = useMemo(() => {
    return AVAILABLE_MODEL_PROVIDER_OPTIONS.filter((provider) =>
      isSupportedProviderId(provider.id),
    )
  }, [])

  const providerModelOptions = useMemo(() => {
    return getProviderModelOptions(selectedProviderId)
  }, [selectedProviderId])

  useEffect(() => {
    if (!providerModelOptions.length) return
    const selectedIsStillValid = providerModelOptions.some((m) => m.id === selectedModelId)
    if (!selectedIsStillValid) {
      const rec = providerModelOptions.find((m) => m.isRecommended)
      setSelectedModelId(rec?.id ?? providerModelOptions[0].id)
    }
  }, [providerModelOptions, selectedModelId])

  useEffect(() => {
    setShowAllModels(false)
  }, [selectedProviderId])

  useEffect(() => {
    if (canUseOAuthInSettings) return
    if (authMethod === 'oauth') {
      setAuthMethod('api-key')
    }
    setOauthSessionId('')
    setOauthAuthUrl('')
    setOauthExpiresAt(null)
    setOauthCallback('')
    setOauthStatus('')
    setOauthError('')
    setEditingAuth(false)
  }, [canUseOAuthInSettings, authMethod])

  const visibleModelOptions = useMemo(() => {
    if (showAllModels || providerModelOptions.length <= INITIAL_VISIBLE_MODELS) {
      return providerModelOptions
    }

    const initialModels = providerModelOptions.slice(0, INITIAL_VISIBLE_MODELS)
    if (!selectedModelId) return initialModels
    if (initialModels.some((model) => model.id === selectedModelId)) return initialModels

    const selectedModel = providerModelOptions.find((model) => model.id === selectedModelId)
    if (!selectedModel) return initialModels

    return [...initialModels, selectedModel]
  }, [providerModelOptions, selectedModelId, showAllModels])

  const hiddenModelCount = providerModelOptions.length - visibleModelOptions.length
  const shouldShowModelToggle = showAllModels || hiddenModelCount > 0
  const hasSavedApiKeyForSelection = (
    authMethod === 'api-key' &&
    savedAuthMethod === 'api-key' &&
    savedProviderId === selectedProviderId
  )
  const hasSavedOAuthForSelection = (
    authMethod === 'oauth' &&
    selectedProviderId === 'openai' &&
    savedAuthMethod === 'oauth' &&
    savedProviderId === 'openai' &&
    savedOauthConnected
  )
  const shouldShowApiKeyInput = authMethod === 'api-key' && (!hasSavedApiKeyForSelection || editingAuth)
  const shouldShowOAuthFlow = authMethod === 'oauth' && (!hasSavedOAuthForSelection || editingAuth)

  const activeModelLabel = useMemo(() => {
    const id = runtimeCurrentModelId.trim()
    if (!id) return null
    return buildModelLabel(id)
  }, [runtimeCurrentModelId])

  useEffect(() => {
    setEditingAuth(false)
    setOauthError('')
    setOauthStatus('')
    setAuthApiKey('')
  }, [authMethod, selectedProviderId])

  useEffect(() => {
    if (!oauthExpiresAt) return
    setOauthCountdownNowMs(Date.now())
    const timer = setInterval(() => {
      setOauthCountdownNowMs(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [oauthExpiresAt])

  const applyPersistedProfile = useCallback((profile: PersistedRuntimeProfile | null) => {
    if (!profile) return false
    let persistedProviderForAuth: SupportedProviderId | null = null
    if (profile.modelId?.trim()) {
      setRuntimeCurrentModelId(profile.modelId)
      setSelectedModelId(normalizeOpenAIModelIdForUi(profile.modelId))
      const inferredProvider = inferProviderFromModelId(profile.modelId)
      if (isSupportedProviderId(inferredProvider)) {
        persistedProviderForAuth = inferredProvider
      }
    }
    if (profile.modelProviderId === 'openai-codex') {
      setSelectedProviderId('openai')
      persistedProviderForAuth = 'openai'
    } else if (isSupportedProviderId(profile.modelProviderId)) {
      setSelectedProviderId(profile.modelProviderId)
      persistedProviderForAuth = profile.modelProviderId
    } else if (profile.modelId) {
      const inferredProvider = inferProviderFromModelId(profile.modelId)
      if (isSupportedProviderId(inferredProvider)) setSelectedProviderId(inferredProvider)
    }
    if (profile.authMethod === 'oauth' || profile.authMethod === 'api-key') setAuthMethod(profile.authMethod)
    setOauthConnected(Boolean(profile.oauthConnected))
    setSavedAuthMethod(profile.authMethod ?? null)
    setSavedProviderId(persistedProviderForAuth)
    setSavedOauthConnected(Boolean(profile.oauthConnected))
    setEditingAuth(false)
    return true
  }, [])

  const loadPersistedProfile = useCallback(async (targetUserId: string, targetTenantId: string) => {
    if (!targetUserId || !targetTenantId) return null
    try {
      const persisted = await getPersistedRuntimeProfile(targetUserId, targetTenantId)
      if (persisted) applyPersistedProfile(persisted)
      return persisted
    } catch (error) {
      console.error('Failed to load persisted runtime profile', error)
      return null
    }
  }, [applyPersistedProfile])

  const refreshSettingsData = useCallback(async (
    targetTenantId: string,
    targetUserId?: string,
  ) => {
    setLoadingRuntime(true)
    setRuntimeError('')
    try {
      const persisted = targetUserId
        ? await loadPersistedProfile(targetUserId, targetTenantId)
        : null

      if (!persisted) {
        setRuntimeCurrentModelId('')
        setSavedAuthMethod(null)
        setSavedProviderId(null)
        setSavedOauthConnected(false)
        setOauthConnected(false)
      }
    } catch (error) {
      const message = normalizeErrorMessage(error, 'Failed to load saved settings.')
      setRuntimeError(message)
    } finally {
      setLoadingRuntime(false)
    }
  }, [loadPersistedProfile])

  const redirectToSignIn = useCallback(() => {
    const currentPath = typeof window === 'undefined'
      ? '/dashboard/settings'
      : `${window.location.pathname}${window.location.search}`
    router.replace(buildSignInPath(currentPath))
  }, [router])

  useEffect(() => {
    let cancelled = false
    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) { redirectToSignIn(); return }
        const complete = await isOnboardingComplete(session, { backfillFromProvisionedTenant: true })
        if (!complete) {
          router.replace('/dashboard')
          return
        }
        const nextTenantId = deriveTenantIdFromUserId(session.user.id)
        if (cancelled) return
        setUserId(session.user.id)
        setTenantId(nextTenantId)
        await refreshSettingsData(nextTenantId, session.user.id)
        if (!cancelled) setCheckingSession(false)
      } catch { redirectToSignIn() }
    }
    void loadSession()
    return () => { cancelled = true }
  }, [redirectToSignIn, refreshSettingsData])

  async function handleStartOpenAIOAuth() {
    if (!tenantId) return
    setEditingAuth(true)
    setOauthBusy(true)
    setOauthError('')
    setOauthStatus('')

    try {
      const runtimeModelId = normalizeOpenAIModelIdForRuntime(selectedModelId)
      const oauthStart = await startRuntimeOpenAICodexOAuth(tenantId, {
        modelId: runtimeModelId || undefined,
      })

      setOauthSessionId(oauthStart.sessionId)
      setOauthAuthUrl(oauthStart.authUrl)
      setOauthExpiresAt(oauthStart.expiresAt)
      setOauthConnected(false)
      setOauthStatus('OAuth URL ready. Sign in, then paste the localhost callback URL.')
      setModelStatus('')
    } catch (error) {
      setOauthError(normalizeErrorMessage(error, 'Failed to start OpenAI OAuth.'))
    } finally {
      setOauthBusy(false)
    }
  }

  async function handleCompleteOpenAIOAuth() {
    if (!tenantId || !userId) return

    const callback = oauthCallback.trim()
    if (!oauthSessionId) {
      setOauthError('Generate OAuth URL first.')
      return
    }
    if (!callback) {
      setOauthError('Paste callback URL.')
      return
    }

    setOauthBusy(true)
    setOauthError('')
    setOauthStatus('Completing OpenAI OAuth...')

    try {
      const runtimeModelId = normalizeOpenAIModelIdForRuntime(selectedModelId)
      const result = await completeRuntimeOpenAICodexOAuth(tenantId, {
        sessionId: oauthSessionId,
        callback,
        modelId: runtimeModelId || undefined,
      })

      if (!result.oauthConnected) {
        throw new Error('OAuth did not complete.')
      }

      const providerId = 'openai-codex'
      const modelIdForPersist = result.modelId ?? runtimeModelId

      await upsertPersistedRuntimeProfile({
        userId,
        tenantId,
        modelProviderId: providerId,
        modelId: modelIdForPersist,
        authMethod: 'oauth',
        oauthConnected: true,
      })

      setRuntimeCurrentModelId(modelIdForPersist)
      setAuthMethod('oauth')
      setOauthConnected(true)
      setSavedAuthMethod('oauth')
      setSavedProviderId('openai')
      setSavedOauthConnected(true)
      setEditingAuth(false)
      setOauthCallback('')
      setOauthStatus('OAuth connected and saved.')
      setModelStatus(`Saved ${buildModelLabel(normalizeOpenAIModelIdForUi(modelIdForPersist))} settings.`)
      setModelStatusType('success')
      setRuntimeError('')
    } catch (error) {
      setOauthError(normalizeErrorMessage(error, 'Failed to complete OpenAI OAuth.'))
      setOauthStatus('')
    } finally {
      setOauthBusy(false)
    }
  }

  async function handleSaveModel() {
    if (!tenantId || !userId) return
    let normalizedModelId = selectedModelId.trim()
    if (!normalizedModelId) {
      setModelStatus('Select a model first.')
      setModelStatusType('error')
      return
    }
    const usingSavedApiKey = hasSavedApiKeyForSelection && !editingAuth
    if (authMethod === 'api-key' && !authApiKey.trim() && !usingSavedApiKey) {
      setModelStatus('Enter an API key to continue.')
      setModelStatusType('error')
      return
    }
    if (authMethod === 'oauth' && !oauthConnected) {
      setModelStatus('Confirm OAuth is connected before saving.')
      setModelStatusType('error')
      return
    }

    setSavingModel(true)
    setModelStatus('')
    try {
      if (authMethod === 'oauth' && selectedProviderId === 'openai') {
        normalizedModelId = normalizeOpenAIModelIdForRuntime(normalizedModelId)
      }

      const normalizedProviderId = authMethod === 'oauth' && selectedProviderId === 'openai'
        ? 'openai-codex'
        : (toOpenClawProviderId(selectedProviderId) ?? selectedProviderId)
      await upsertPersistedRuntimeProfile({
        userId,
        tenantId,
        modelProviderId: normalizedProviderId,
        modelId: normalizedModelId,
        authMethod,
        oauthConnected: authMethod === 'oauth' ? oauthConnected : false,
      })
      setRuntimeCurrentModelId(normalizedModelId)
      setAuthApiKey('')
      if (authMethod === 'api-key') {
        setSavedAuthMethod('api-key')
        setSavedProviderId(selectedProviderId)
        setSavedOauthConnected(false)
        setOauthConnected(false)
        setEditingAuth(false)
      } else {
        setSavedAuthMethod('oauth')
        setSavedProviderId('openai')
        setSavedOauthConnected(oauthConnected)
      }
      setModelStatus(`Saved ${buildModelLabel(normalizedModelId)} settings.`)
      setModelStatusType('success')
      setRuntimeError('')

      try {
        await updateRuntimeCurrentModel(tenantId, {
          modelId: normalizedModelId,
          modelProviderId: normalizedProviderId,
          modelAuthMethod: authMethod,
          modelApiKey: authMethod === 'api-key' ? authApiKey.trim() : undefined,
          modelOauthConnected: authMethod === 'oauth' ? oauthConnected : undefined,
          persist: true,
        })
      } catch (error) {
        const runtimeApplyError = normalizeErrorMessage(error, 'Failed to update model settings.')
        setModelStatus(`Saved locally. OpenClaw sync pending: ${runtimeApplyError}`)
        setModelStatusType('error')
      }
    } catch (error) {
      setModelStatus(normalizeErrorMessage(error, 'Failed to save model settings.'))
      setModelStatusType('error')
    } finally {
      setSavingModel(false)
    }
  }

  const isCurrentModel = (modelId: string) => (
    normalizeModelIdForComparison(runtimeCurrentModelId) === normalizeModelIdForComparison(modelId)
  )
  const hasUnsavedChanges = (
    normalizeModelIdForComparison(selectedModelId) !== normalizeModelIdForComparison(runtimeCurrentModelId)
  )

  if (checkingSession) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />

      <div className="relative z-10 mx-auto w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/chat">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to chat
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (tenantId) void refreshSettingsData(tenantId, userId) }}
            disabled={loadingRuntime}
          >
            {loadingRuntime ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Reload saved
          </Button>
        </div>

        <div>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Configure your OpenClaw runtime.</p>
        </div>

        {runtimeError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {runtimeError}
          </div>
        )}

        {/* Active model badge */}
        {activeModelLabel && (
          <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card px-4 py-3">
            {(() => {
              const activeProvider = providerOptions.find((p) => p.id === inferProviderFromModelId(runtimeCurrentModelId))
              return activeProvider?.logoSrc ? (
                <Image src={activeProvider.logoSrc} alt="" width={20} height={20} className="shrink-0" />
              ) : null
            })()}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Active model</p>
              <p className="truncate text-sm font-medium">{activeModelLabel}</p>
            </div>
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
        )}

        {/* Model settings card */}
        <Card className="border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Provider selector */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Provider</p>
              <div className="grid grid-cols-3 gap-2">
                {providerOptions.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => {
                      if (isSupportedProviderId(provider.id)) setSelectedProviderId(provider.id as SupportedProviderId)
                    }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all',
                      selectedProviderId === provider.id
                        ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border/70 bg-card hover:border-primary/30 hover:bg-muted/30',
                    )}
                  >
                    {provider.logoSrc ? (
                      <Image src={provider.logoSrc} alt="" width={20} height={20} className="shrink-0" />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center text-sm">{provider.logoEmoji ?? '?'}</span>
                    )}
                    <span className="text-sm font-medium">{provider.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Model selector */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Model</p>
              <div className="space-y-2">
                {visibleModelOptions.map((model) => {
                  const active = isCurrentModel(model.id)
                  const selected = selectedModelId === model.id
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModelId(model.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                        selected
                          ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border/70 bg-card hover:border-primary/30 hover:bg-muted/30',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{model.label}</p>
                          {model.isRecommended && (
                            <span className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              <Sparkles className="h-2.5 w-2.5" />
                              Recommended
                            </span>
                          )}
                          {active && (
                            <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                              <Check className="h-2.5 w-2.5" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{model.summary}</p>
                      </div>
                      <div className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        selected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                      )}>
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                    </button>
                  )
                })}
              </div>
              {shouldShowModelToggle && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllModels((previous) => !previous)}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showAllModels ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Show more{hiddenModelCount > 0 ? ` (${hiddenModelCount})` : ''}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Auth section */}
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-4">
              <div className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Authentication</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAuthMethod('api-key')}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
                    authMethod === 'api-key'
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border/70 text-muted-foreground hover:border-primary/30',
                  )}
                >
                  API Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canUseOAuthInSettings) return
                    setAuthMethod('oauth')
                  }}
                  disabled={!canUseOAuthInSettings}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
                    authMethod === 'oauth'
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border/70 text-muted-foreground hover:border-primary/30',
                    !canUseOAuthInSettings && 'cursor-not-allowed opacity-50 hover:border-border/70',
                  )}
                >
                  OAuth
                </button>
              </div>

              {authMethod === 'api-key' ? (
                shouldShowApiKeyInput ? (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      value={authApiKey}
                      onChange={(event) => setAuthApiKey(event.target.value)}
                      placeholder={`Paste your ${providerOptions.find((p) => p.id === selectedProviderId)?.label ?? ''} API key`}
                      className="h-9 text-sm"
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveModel() }}
                    />
                    {hasSavedApiKeyForSelection ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">A saved API key is already configured.</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditingAuth(false)
                            setAuthApiKey('')
                          }}
                        >
                          Use saved key
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-2">
                    <Label className="text-xs text-muted-foreground">API key configured</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingAuth(true)}>
                      Update key
                    </Button>
                  </div>
                )
              ) : shouldShowOAuthFlow ? (
                <div className="space-y-3 rounded-md border border-border/70 bg-background p-3">
                  <Label className="text-xs text-muted-foreground">OpenAI OAuth</Label>
                  {oauthAuthUrl ? (
                    <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                      <li>Click <span className="font-medium text-foreground">Open URL</span> and sign in to your OpenAI account.</li>
                      <li>On the OpenAI page, click <span className="font-medium text-foreground">Continue</span> to authorize.</li>
                      <li>After redirect, copy the full browser URL that starts with <span className="font-mono text-foreground">http://localhost:1455/auth/callback</span>.</li>
                      <li>Paste the full URL below and click <span className="font-medium text-foreground">Complete OAuth</span>.</li>
                    </ol>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleStartOpenAIOAuth()}
                      disabled={oauthBusy}
                    >
                      {oauthBusy ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Generating
                        </>
                      ) : oauthSessionId ? (
                        'Regenerate URL'
                      ) : (
                        'Generate URL'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(oauthAuthUrl, '_blank', 'noopener,noreferrer')}
                      disabled={!oauthAuthUrl || oauthBusy}
                    >
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Open URL
                    </Button>
                  </div>

                  {oauthExpiresAt ? (
                    <p className="text-[11px] text-muted-foreground">
                      Expires in: {formatOAuthExpiryCountdown(oauthExpiresAt, oauthCountdownNowMs)}
                    </p>
                  ) : null}

                  <Input
                    value={oauthCallback}
                    onChange={(event) => setOauthCallback(event.target.value)}
                    placeholder="http://localhost:1455/auth/callback?code=...&state=..."
                    className="h-9 text-sm"
                    autoComplete="off"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleCompleteOpenAIOAuth()}
                      disabled={oauthBusy || !oauthSessionId || !oauthCallback.trim()}
                    >
                      {oauthBusy ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Completing
                        </>
                      ) : (
                        'Complete OAuth'
                      )}
                    </Button>
                    {hasSavedOAuthForSelection ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setEditingAuth(false)
                          setOauthConnected(true)
                          setOauthCallback('')
                          setOauthError('')
                          setOauthStatus('Using connected OAuth account.')
                        }}
                      >
                        Use connected
                      </Button>
                    ) : (
                      <span className={cn(
                        'text-xs',
                        oauthConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                      )}>
                        {oauthConnected ? 'Connected' : 'Not connected'}
                      </span>
                    )}
                  </div>

                  {oauthError ? (
                    <p className="text-xs text-destructive">{oauthError}</p>
                  ) : null}
                  {oauthStatus ? (
                    <p className="text-xs text-muted-foreground">{oauthStatus}</p>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-2">
                  <Label className="text-xs text-muted-foreground">OAuth connected</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingAuth(true)
                      setOauthSessionId('')
                      setOauthAuthUrl('')
                      setOauthExpiresAt(null)
                      setOauthCallback('')
                      setOauthError('')
                      setOauthStatus('')
                    }}
                  >
                    Reconnect
                  </Button>
                </div>
              )}
            </div>

            {/* Status message */}
            {modelStatus && (
              <p className={cn(
                'rounded-lg px-3 py-2 text-sm',
                modelStatusType === 'error'
                  ? 'border border-destructive/30 bg-destructive/5 text-destructive'
                  : modelStatusType === 'success'
                    ? 'border border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                    : 'border border-border/70 bg-muted/30 text-foreground/80',
              )}>
                {modelStatus}
              </p>
            )}

            {/* Save */}
            <div className="flex items-center justify-between gap-3 pt-1">
              {hasUnsavedChanges && (
                <p className="text-xs text-muted-foreground">
                  Switching to <span className="font-medium text-foreground">{buildModelLabel(selectedModelId)}</span>
                </p>
              )}
              <Button
                onClick={() => void handleSaveModel()}
                disabled={savingModel || !selectedModelId.trim()}
                className="ml-auto gap-2"
                size="sm"
              >
                {savingModel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Channels card */}
        <Card className="border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/channels"
              className="flex items-center gap-4 rounded-lg border border-border/70 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <div className="flex items-center -space-x-2">
                {MANAGE_CHANNEL_INLINE_LOGOS.slice(0, 7).map((icon) => (
                  <span
                    key={icon.src}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-background"
                  >
                    <Image src={icon.src} alt={icon.alt} width={20} height={20} className="h-5 w-5 object-contain" />
                  </span>
                ))}
                {MANAGE_CHANNEL_INLINE_LOGOS.length > 7 ? (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-[10px] font-medium text-muted-foreground ring-2 ring-background">
                    +{MANAGE_CHANNEL_INLINE_LOGOS.length - 7}
                  </span>
                ) : null}
              </div>
              <span className="flex-1 text-sm font-medium">Manage channels</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Skills & Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/skills"
              className="flex items-center gap-4 rounded-lg border border-border/70 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                MD
              </div>
              <span className="flex-1 text-sm font-medium">Manage skills and memory files</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-dashed border-border/70 bg-muted/20">
          <CardContent className="pt-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Account
            </p>
            <Link
              href="/settings/subscription"
              className="mt-2 flex items-center gap-3 rounded-lg border border-border/70 bg-background px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-muted/50">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Billing & subscription</span>
                <span className="block text-xs text-muted-foreground">
                  Change plan or cancel with a quick confirmation flow.
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
