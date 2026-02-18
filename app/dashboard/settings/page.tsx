'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Key, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  AVAILABLE_MODEL_PROVIDER_OPTIONS,
  getProviderModelOptions,
  toOpenClawProviderId,
} from '@/lib/model-providers'
import {
  DEFAULT_CHAT_SESSION_KEY,
  listRuntimeModels,
  listRuntimeSessions,
  updateRuntimeCurrentModel,
} from '@/lib/runtime-controls'
import {
  getPersistedRuntimeProfile,
  upsertPersistedRuntimeProfile,
  type PersistedRuntimeProfile,
} from '@/lib/runtime-persistence'
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
  return normalized.slice(0, slashIndex)
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    const normalized = error.message.trim()
    if (/not found/i.test(normalized)) return 'Runtime not ready. Open chat first, then retry.'
    if (/daemon_not_found|daemon not found/i.test(normalized)) return 'Daemon not found. Retry in a moment.'
    if (/gateway_unavailable|gateway.*unavailable|not running/i.test(normalized)) return 'OpenClaw is starting. Try again in a moment.'
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

function resolveCurrentModelFromSessions(sessions: Array<{ key: string; modelId: string | null }>): string | null {
  const mainSession = sessions.find(
    (session) => session.key.trim() === DEFAULT_CHAT_SESSION_KEY && session.modelId?.trim(),
  )
  if (mainSession?.modelId?.trim()) {
    return mainSession.modelId.trim()
  }

  const mainAgentSession = sessions.find(
    (session) => session.key.trim().startsWith('agent:main:') && session.modelId?.trim(),
  )
  if (mainAgentSession?.modelId?.trim()) {
    return mainAgentSession.modelId.trim()
  }

  const anyModeledSession = sessions.find((session) => session.modelId?.trim())
  if (anyModeledSession?.modelId?.trim()) {
    return anyModeledSession.modelId.trim()
  }

  return null
}

export default function SettingsPage() {
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
  const [modelStatus, setModelStatus] = useState('')
  const [modelStatusType, setModelStatusType] = useState<'success' | 'error' | 'info'>('info')
  const [savingModel, setSavingModel] = useState(false)

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

  const activeModelLabel = useMemo(() => {
    const id = runtimeCurrentModelId.trim()
    if (!id) return null
    return buildModelLabel(id)
  }, [runtimeCurrentModelId])

  const applyPersistedProfile = useCallback((profile: PersistedRuntimeProfile | null) => {
    if (!profile) return false
    if (profile.modelId?.trim()) {
      setRuntimeCurrentModelId(profile.modelId)
      setSelectedModelId(profile.modelId)
    }
    if (isSupportedProviderId(profile.modelProviderId)) {
      setSelectedProviderId(profile.modelProviderId)
    } else if (profile.modelId) {
      const inferredProvider = inferProviderFromModelId(profile.modelId)
      if (isSupportedProviderId(inferredProvider)) setSelectedProviderId(inferredProvider)
    }
    if (profile.authMethod === 'oauth' || profile.authMethod === 'api-key') setAuthMethod(profile.authMethod)
    setOauthConnected(Boolean(profile.oauthConnected))
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

  const refreshRuntimeData = useCallback(async (
    targetTenantId: string,
    targetUserId?: string,
    options?: {
      fallbackModelId?: string | null
    },
  ) => {
    setLoadingRuntime(true)
    setRuntimeError('')
    try {
      const [runtime, sessionsResult] = await Promise.all([
        listRuntimeModels(targetTenantId),
        listRuntimeSessions(targetTenantId, {
          includeGlobal: true,
          includeUnknown: false,
          agentId: 'main',
          limit: 200,
        }).catch(() => null),
      ])

      const sessionModel = sessionsResult
        ? resolveCurrentModelFromSessions(sessionsResult.sessions)
        : null
      const fallbackModel = options?.fallbackModelId?.trim() || null
      const currentModel = sessionModel || runtime.currentModelId?.trim() || fallbackModel || ''

      setRuntimeCurrentModelId(currentModel)
      if (currentModel) {
        const inferredProvider = inferProviderFromModelId(currentModel)
        if (isSupportedProviderId(inferredProvider)) setSelectedProviderId(inferredProvider)
        setSelectedModelId(currentModel)
        if (targetUserId) {
          await upsertPersistedRuntimeProfile({
            userId: targetUserId,
            tenantId: targetTenantId,
            modelProviderId: inferredProvider,
            modelId: currentModel,
          })
        }
      } else {
        setSelectedModelId((previous) => previous.trim())
      }
    } catch (error) {
      const fallbackMessage = normalizeErrorMessage(error, 'Failed to load model settings.')
      if (targetUserId) {
        const persisted = await loadPersistedProfile(targetUserId, targetTenantId)
        if (persisted) {
          setRuntimeError('Could not reach runtime. Showing last saved settings.')
        } else {
          setRuntimeError(fallbackMessage)
        }
      } else {
        setRuntimeError(fallbackMessage)
      }
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
        const nextTenantId = deriveTenantIdFromUserId(session.user.id)
        if (cancelled) return
        setUserId(session.user.id)
        setTenantId(nextTenantId)
        const persisted = await loadPersistedProfile(session.user.id, nextTenantId)
        await refreshRuntimeData(nextTenantId, session.user.id, {
          fallbackModelId: persisted?.modelId ?? null,
        })
        if (!cancelled) setCheckingSession(false)
      } catch { redirectToSignIn() }
    }
    void loadSession()
    return () => { cancelled = true }
  }, [loadPersistedProfile, redirectToSignIn, refreshRuntimeData])

  async function handleSaveModel() {
    if (!tenantId || !userId) return
    const normalizedModelId = selectedModelId.trim()
    if (!normalizedModelId) {
      setModelStatus('Select a model first.')
      setModelStatusType('error')
      return
    }
    if (authMethod === 'api-key' && !authApiKey.trim()) {
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
      const normalizedProviderId = toOpenClawProviderId(selectedProviderId) ?? selectedProviderId
      let runtimeApplyError = ''
      try {
        await updateRuntimeCurrentModel(tenantId, {
          modelId: normalizedModelId,
          modelProviderId: normalizedProviderId,
          modelAuthMethod: authMethod,
          modelApiKey: authMethod === 'api-key' ? authApiKey.trim() : undefined,
          modelOauthConnected: authMethod === 'oauth' ? oauthConnected : undefined,
          persist: true,
        })
        setRuntimeError('')
      } catch (error) {
        runtimeApplyError = normalizeErrorMessage(error, 'Failed to update model settings.')
      }
      try {
        await upsertPersistedRuntimeProfile({
          userId,
          tenantId,
          modelProviderId: normalizedProviderId,
          modelId: normalizedModelId,
          authMethod,
          oauthConnected,
        })
      } catch (error) {
        console.error('Failed to persist runtime profile', error)
      }
      setRuntimeCurrentModelId(normalizedModelId)
      setAuthApiKey('')
      if (!runtimeApplyError) {
        setModelStatus(`Switched to ${buildModelLabel(normalizedModelId)}.`)
        setModelStatusType('success')
        await refreshRuntimeData(tenantId, userId)
      } else {
        setModelStatus(`Saved preference. Runtime: ${runtimeApplyError}`)
        setModelStatusType('error')
      }
    } finally {
      setSavingModel(false)
    }
  }

  const isCurrentModel = (modelId: string) => runtimeCurrentModelId.trim() === modelId.trim()
  const hasUnsavedChanges = selectedModelId.trim() !== runtimeCurrentModelId.trim()

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
            onClick={() => { if (tenantId) void refreshRuntimeData(tenantId, userId) }}
            disabled={loadingRuntime}
          >
            {loadingRuntime ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
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
                  onClick={() => setAuthMethod('oauth')}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
                    authMethod === 'oauth'
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border/70 text-muted-foreground hover:border-primary/30',
                  )}
                >
                  OAuth
                </button>
              </div>

              {authMethod === 'api-key' ? (
                <Input
                  type="password"
                  value={authApiKey}
                  onChange={(event) => setAuthApiKey(event.target.value)}
                  placeholder={`Paste your ${providerOptions.find((p) => p.id === selectedProviderId)?.label ?? ''} API key`}
                  className="h-9 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveModel() }}
                />
              ) : (
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-2">
                  <Label className="text-xs text-muted-foreground">OAuth connected</Label>
                  <Switch checked={oauthConnected} onCheckedChange={setOauthConnected} />
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
          <CardContent>
            <Link
              href="/dashboard/channels"
              className="flex items-center gap-4 rounded-lg border border-border/70 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <div className="flex -space-x-2">
                <Image src="/integrations/whatsapp.svg" alt="WhatsApp" width={24} height={24} className="rounded-full ring-2 ring-background" />
                <Image src="/integrations/telegram.svg" alt="Telegram" width={24} height={24} className="rounded-full ring-2 ring-background" />
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
              href="/dashboard/settings/skills"
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
      </div>
    </div>
  )
}
