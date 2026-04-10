'use client'

import Image from 'next/image'
import { Check, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AVAILABLE_MODEL_PROVIDER_OPTIONS,
  fromOpenClawModelId,
  fromOpenClawProviderId,
  getProviderModelOptions,
  isModelSupportedByProvider,
  isModelSupportedByProviderSetupMethod,
  toOpenClawProviderId,
  type ModelProviderId,
  type ModelProviderOption,
} from '@/lib/model-providers'
import {
  MODEL_PROVIDER_AUTH_CONFIG,
  type ProviderSetupMethod,
} from '@/lib/provider-auth-config'
import {
  completeRuntimeOpenAICodexOAuth,
  listRuntimeModels,
  startRuntimeOpenAICodexOAuth,
  updateRuntimeModelConfig,
  type RuntimeModelsData,
} from '@/lib/runtime-controls'
import { cn } from '@/lib/utils'

interface RuntimeModelsDialogProps {
  tenantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUnauthorized: () => void
  onConfigured?: (config: RuntimeModelsData['storedModelConfig']) => void
}

interface DialogModelConfig {
  providerId: ModelProviderId | null
  modelId: string | null
  authMethod: ProviderSetupMethod | null
  oauthConnected: boolean
}

const ENABLED_MODEL_PROVIDER_IDS = new Set(
  AVAILABLE_MODEL_PROVIDER_OPTIONS.map((provider) => provider.id),
)

function isEnabledModelProviderId(value: string | null): value is ModelProviderId {
  return Boolean(value && ENABLED_MODEL_PROVIDER_IDS.has(value))
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  return fallback
}

function isUnauthorizedMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('unauthorized')
    || normalized.includes('forbidden')
    || normalized.includes('(401)')
    || normalized.includes('(403)')
    || normalized.includes('invalid token')
    || normalized.includes('auth')
    || normalized.includes('jwt')
  )
}

function getProviderInitials(label: string): string {
  return label
    .split(/[\s./-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('')
}

function normalizeOpenAIModelIdForRuntime(modelId: string): string {
  const normalized = modelId.trim().toLowerCase()
  if (!normalized.startsWith('openai/')) return normalized
  return `openai-codex/${normalized.slice('openai/'.length)}`
}

function formatOAuthExpiryCountdown(expiresAt: string, nowMs: number): string {
  const expiresAtMs = Date.parse(expiresAt)
  if (!Number.isFinite(expiresAtMs)) return 'Unknown'
  const remainingMs = expiresAtMs - nowMs
  if (remainingMs <= 0) return 'Expired'

  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1_000))
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  return `${minutes}m ${seconds}s`
}

function getSupportedMethods(
  providerId: ModelProviderId | null,
  modelId: string | null,
): ProviderSetupMethod[] {
  if (!providerId || !modelId) return []

  const providerConfig = MODEL_PROVIDER_AUTH_CONFIG[providerId]
  if (!providerConfig) return []

  return providerConfig.methods.filter((method) => (
    isModelSupportedByProviderSetupMethod(providerId, modelId, method)
  ))
}

function inferProviderIdFromModelId(modelId: string | null | undefined): string | null {
  if (!modelId) return null
  const normalized = modelId.trim().toLowerCase()
  const slashIndex = normalized.indexOf('/')
  if (slashIndex <= 0) return null
  return normalized.slice(0, slashIndex)
}

function toDialogModelConfig(
  config: RuntimeModelsData['storedModelConfig'],
): DialogModelConfig {
  const providerId = (
    fromOpenClawProviderId(config?.modelProviderId)
    ?? fromOpenClawProviderId(inferProviderIdFromModelId(config?.modelId))
  )
  const modelId = fromOpenClawModelId(config?.modelId)
  const authMethod = config?.modelAuthMethod ?? null

  if (!isEnabledModelProviderId(providerId)) {
    return {
      providerId: null,
      modelId: null,
      authMethod: null,
      oauthConnected: false,
    }
  }

  if (!isModelSupportedByProvider(providerId, modelId)) {
    return {
      providerId,
      modelId: null,
      authMethod: null,
      oauthConnected: false,
    }
  }

  return {
    providerId,
    modelId,
    authMethod,
    oauthConnected: config?.modelOauthConnected === true,
  }
}

function ProviderLogo({
  hasImageError,
  onError,
  provider,
}: {
  hasImageError: boolean
  onError: (providerId: string) => void
  provider: ModelProviderOption
}) {
  if ((!provider.logoSrc || hasImageError) && provider.logoEmoji) {
    return <span className="text-2xl leading-none">{provider.logoEmoji}</span>
  }

  if (!provider.logoSrc || hasImageError) {
    return (
      <span className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
        {getProviderInitials(provider.label)}
      </span>
    )
  }

  return (
    <Image
      src={provider.logoSrc}
      alt={`${provider.label} logo`}
      width={96}
      height={40}
      className="h-full w-full object-contain"
      onError={() => onError(provider.id)}
    />
  )
}

export function RuntimeModelsDialog({
  tenantId,
  open,
  onOpenChange,
  onUnauthorized,
  onConfigured,
}: RuntimeModelsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const [storedConfig, setStoredConfig] = useState<DialogModelConfig>({
    providerId: null,
    modelId: null,
    authMethod: null,
    oauthConnected: false,
  })
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<ProviderSetupMethod | null>(null)
  const [apiKeyValue, setApiKeyValue] = useState('')
  const [replaceApiKey, setReplaceApiKey] = useState(false)

  const [oauthBusy, setOauthBusy] = useState(false)
  const [oauthError, setOauthError] = useState('')
  const [oauthStatus, setOauthStatus] = useState('')
  const [oauthSessionId, setOauthSessionId] = useState('')
  const [oauthAuthUrl, setOauthAuthUrl] = useState('')
  const [oauthExpiresAt, setOauthExpiresAt] = useState<string | null>(null)
  const [oauthCallback, setOauthCallback] = useState('')
  const [oauthNowMs, setOauthNowMs] = useState(() => Date.now())

  const selectedProviderModels = useMemo(
    () => getProviderModelOptions(selectedProviderId),
    [selectedProviderId],
  )
  const supportedMethods = useMemo(
    () => getSupportedMethods(selectedProviderId, selectedModelId),
    [selectedModelId, selectedProviderId],
  )
  const oauthUrlExpired = oauthExpiresAt ? Date.parse(oauthExpiresAt) <= oauthNowMs : false
  const oauthCountdownLabel = useMemo(
    () => (oauthExpiresAt ? formatOAuthExpiryCountdown(oauthExpiresAt, oauthNowMs) : null),
    [oauthExpiresAt, oauthNowMs],
  )

  const loadRuntimeConfig = useCallback(async () => {
    if (!tenantId.trim()) return

    setLoading(true)
    setError('')
    setStatus('')
    setOauthError('')
    setOauthStatus('')
    setOauthSessionId('')
    setOauthAuthUrl('')
    setOauthExpiresAt(null)
    setOauthCallback('')
    setApiKeyValue('')
    setReplaceApiKey(false)

    try {
      const runtimeModels = await listRuntimeModels(tenantId, {
        includeModels: false,
        syncRuntime: true,
      })
      const nextConfig = toDialogModelConfig(runtimeModels.storedModelConfig)
      const fallbackProviderId = nextConfig.providerId
      const fallbackModelId = nextConfig.modelId
        ?? (fallbackProviderId ? getProviderModelOptions(fallbackProviderId)[0]?.id ?? null : null)
      const fallbackAuthMethod = (
        nextConfig.authMethod
        && getSupportedMethods(fallbackProviderId, fallbackModelId).includes(nextConfig.authMethod)
      )
        ? nextConfig.authMethod
        : getSupportedMethods(fallbackProviderId, fallbackModelId)[0] ?? null

      setStoredConfig(nextConfig)
      setSelectedProviderId(fallbackProviderId)
      setSelectedModelId(fallbackModelId)
      setSelectedAuthMethod(fallbackAuthMethod)
    } catch (loadError) {
      const message = extractErrorMessage(loadError, 'Failed to load hosted model settings.')
      if (isUnauthorizedMessage(message)) {
        onUnauthorized()
        onOpenChange(false)
        return
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [onOpenChange, onUnauthorized, tenantId])

  useEffect(() => {
    if (!open || !tenantId.trim()) return
    void loadRuntimeConfig()
  }, [loadRuntimeConfig, open, tenantId])

  useEffect(() => {
    if (!selectedProviderId) {
      setSelectedModelId(null)
      setSelectedAuthMethod(null)
      return
    }

    if (!selectedModelId || !isModelSupportedByProvider(selectedProviderId, selectedModelId)) {
      const firstModelId = getProviderModelOptions(selectedProviderId)[0]?.id ?? null
      setSelectedModelId(firstModelId)
      return
    }

    if (supportedMethods.length === 0) {
      setSelectedAuthMethod(null)
      return
    }

    if (!selectedAuthMethod || !supportedMethods.includes(selectedAuthMethod)) {
      setSelectedAuthMethod(supportedMethods[0] ?? null)
    }
  }, [selectedAuthMethod, selectedModelId, selectedProviderId, supportedMethods])

  useEffect(() => {
    if (!open || !oauthExpiresAt) {
      return
    }

    setOauthNowMs(Date.now())
    const timer = window.setInterval(() => setOauthNowMs(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [oauthExpiresAt, open])

  const handleProviderSelect = useCallback((providerId: ModelProviderId) => {
    setSelectedProviderId(providerId)
    setSelectedModelId((previous) => {
      if (isModelSupportedByProvider(providerId, previous)) {
        return previous
      }
      return getProviderModelOptions(providerId)[0]?.id ?? null
    })
    setApiKeyValue('')
    setReplaceApiKey(false)
    setOauthError('')
    setOauthStatus('')
  }, [])

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId)
    setApiKeyValue('')
    setReplaceApiKey(false)
    setOauthError('')
    setOauthStatus('')
  }, [])

  const handleImageError = useCallback((providerId: string) => {
    setImageErrors((previous) => ({
      ...previous,
      [providerId]: true,
    }))
  }, [])

  const isStoredApiKeySelection = (
    storedConfig.providerId === selectedProviderId
    && storedConfig.authMethod === 'api-key'
    && selectedAuthMethod === 'api-key'
  )
  const isStoredOauthSelection = (
    storedConfig.providerId === selectedProviderId
    && storedConfig.authMethod === 'oauth'
    && selectedAuthMethod === 'oauth'
    && storedConfig.oauthConnected
  )
  const apiKeyRequired = selectedAuthMethod === 'api-key' && (!isStoredApiKeySelection || replaceApiKey)
  const hasSelection = Boolean(selectedProviderId && selectedModelId && selectedAuthMethod)
  const selectionChanged = (
    storedConfig.providerId !== selectedProviderId
    || storedConfig.modelId !== selectedModelId
    || storedConfig.authMethod !== selectedAuthMethod
  )

  const handleStartOpenAIOAuth = useCallback(async (
    options: {
      openWindow?: boolean
      preopenedWindow?: Window | null
    } = {},
  ) => {
    if (!tenantId.trim() || !selectedModelId) return

    const { openWindow = false, preopenedWindow = null } = options
    setOauthBusy(true)
    setOauthError('')
    setOauthStatus('')

    try {
      const oauthStart = await startRuntimeOpenAICodexOAuth(tenantId, {
        modelId: normalizeOpenAIModelIdForRuntime(selectedModelId),
      })

      setOauthSessionId(oauthStart.sessionId)
      setOauthAuthUrl(oauthStart.authUrl)
      setOauthExpiresAt(oauthStart.expiresAt)
      setOauthNowMs(Date.now())
      setOauthStatus('OAuth window is ready. Sign in, then paste the localhost callback URL.')

      if (openWindow) {
        let openedWindow = preopenedWindow
        if (openedWindow && !openedWindow.closed) {
          openedWindow.location.href = oauthStart.authUrl
          openedWindow.focus()
        } else {
          openedWindow = window.open(oauthStart.authUrl, '_blank', 'noopener,noreferrer')
        }
        if (!openedWindow) {
          setOauthError('Popup blocked. Allow popups, then try again.')
        }
      }
    } catch (startError) {
      if (preopenedWindow && !preopenedWindow.closed) {
        preopenedWindow.close()
      }
      setOauthError(extractErrorMessage(startError, 'Failed to start OpenAI OAuth.'))
    } finally {
      setOauthBusy(false)
    }
  }, [selectedModelId, tenantId])

  const handleOpenOauthWindow = useCallback(() => {
    setOauthError('')
    if (oauthAuthUrl && !oauthUrlExpired) {
      const openedWindow = window.open(oauthAuthUrl, '_blank', 'noopener,noreferrer')
      if (!openedWindow) {
        setOauthError('Popup blocked. Allow popups, then try again.')
      }
      return
    }

    const preopenedWindow = window.open('', '_blank')
    if (!preopenedWindow) {
      setOauthError('Popup blocked. Allow popups, then try again.')
      return
    }

    preopenedWindow.document.write('<title>OpenAI OAuth</title><p style="font-family: sans-serif; padding: 24px;">Preparing OpenAI sign-in...</p>')
    void handleStartOpenAIOAuth({ openWindow: true, preopenedWindow })
  }, [handleStartOpenAIOAuth, oauthAuthUrl, oauthUrlExpired])

  const handleCompleteOpenAIOAuth = useCallback(async () => {
    if (!tenantId.trim() || !selectedModelId) return
    if (!oauthSessionId) {
      setOauthError('Generate the OAuth URL first.')
      return
    }

    const callback = oauthCallback.trim()
    if (!callback) {
      setOauthError('Paste the callback URL.')
      return
    }

    setOauthBusy(true)
    setOauthError('')
    setOauthStatus('Completing OpenAI OAuth...')

    try {
      const result = await completeRuntimeOpenAICodexOAuth(tenantId, {
        sessionId: oauthSessionId,
        callback,
        modelId: normalizeOpenAIModelIdForRuntime(selectedModelId),
      })
      if (!result.oauthConnected) {
        throw new Error('OAuth did not complete.')
      }

      const nextStoredConfig: RuntimeModelsData['storedModelConfig'] = {
        modelProviderId: result.providerId,
        modelId: result.modelId,
        modelAuthMethod: 'oauth',
        modelOauthConnected: true,
      }

      setStoredConfig(toDialogModelConfig(nextStoredConfig))
      setStatus('OpenAI OAuth connected and saved to your hosted runtime.')
      setOauthStatus('OpenAI OAuth is connected.')
      setOauthCallback('')
      setOauthSessionId('')
      setOauthAuthUrl('')
      setOauthExpiresAt(null)
      onConfigured?.(nextStoredConfig)
      onOpenChange(false)
    } catch (completeError) {
      setOauthError(extractErrorMessage(completeError, 'Failed to complete OpenAI OAuth.'))
      setOauthStatus('')
    } finally {
      setOauthBusy(false)
    }
  }, [onConfigured, onOpenChange, oauthCallback, oauthSessionId, selectedModelId, tenantId])

  const handleSaveApiKeySelection = useCallback(async () => {
    if (!tenantId.trim() || !selectedProviderId || !selectedModelId || selectedAuthMethod !== 'api-key') {
      return
    }

    const keyToPersist = apiKeyRequired ? apiKeyValue.trim() : undefined
    if (apiKeyRequired && !keyToPersist) {
      setError('Enter an API key for the selected provider.')
      return
    }

    if (!selectionChanged && !replaceApiKey) {
      onOpenChange(false)
      return
    }

    setSaving(true)
    setError('')
    setStatus('')

    try {
      const result = await updateRuntimeModelConfig(tenantId, {
        modelId: selectedModelId,
        modelProviderId: toOpenClawProviderId(selectedProviderId) ?? selectedProviderId,
        modelAuthMethod: 'api-key',
        modelApiKey: keyToPersist,
        persist: true,
      })

      const nextStoredConfig: RuntimeModelsData['storedModelConfig'] = {
        modelProviderId: result.modelProviderId,
        modelId: result.modelId,
        modelAuthMethod: result.modelAuthMethod,
        modelOauthConnected: result.modelOauthConnected,
      }

      setStoredConfig(toDialogModelConfig(nextStoredConfig))
      setApiKeyValue('')
      setReplaceApiKey(false)
      setStatus('Hosted model settings saved.')
      onConfigured?.(nextStoredConfig)
      onOpenChange(false)
    } catch (saveError) {
      const message = extractErrorMessage(saveError, 'Failed to save hosted model settings.')
      if (isUnauthorizedMessage(message)) {
        onUnauthorized()
        onOpenChange(false)
        return
      }
      setError(message)
    } finally {
      setSaving(false)
    }
  }, [
    apiKeyRequired,
    apiKeyValue,
    onConfigured,
    onOpenChange,
    onUnauthorized,
    replaceApiKey,
    selectedAuthMethod,
    selectedModelId,
    selectedProviderId,
    selectionChanged,
    tenantId,
  ])

  const footerDisabled = loading || saving || oauthBusy
  const selectedProvider = selectedProviderId
    ? AVAILABLE_MODEL_PROVIDER_OPTIONS.find((provider) => provider.id === selectedProviderId) ?? null
    : null
  const apiKeyLabel = selectedProviderId
    ? MODEL_PROVIDER_AUTH_CONFIG[selectedProviderId]?.apiKeyLabel ?? 'API key'
    : 'API key'
  const apiKeyPlaceholder = selectedProviderId
    ? MODEL_PROVIDER_AUTH_CONFIG[selectedProviderId]?.apiKeyPlaceholder ?? ''
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Models</DialogTitle>
          <DialogDescription>
            Choose the hosted provider, model, and provider auth flow for your OpenClaw runtime.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Changes are saved to your hosted OpenClaw runtime, not this browser.
        </div>

        {status ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
            {status}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void loadRuntimeConfig()}
            disabled={loading || saving || oauthBusy}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        <section className="space-y-4">
          <p className="text-sm font-semibold text-foreground">Choose provider</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {AVAILABLE_MODEL_PROVIDER_OPTIONS.map((provider) => {
              const isSelected = selectedProviderId === provider.id
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleProviderSelect(provider.id as ModelProviderId)}
                  className={cn(
                    'rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/70',
                  )}
                >
                  <div className="flex h-14 items-center justify-center rounded-md bg-muted/40 p-2">
                    <ProviderLogo
                      provider={provider}
                      onError={handleImageError}
                      hasImageError={Boolean(imageErrors[provider.id])}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{provider.label}</p>
                    {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {selectedProvider ? (
          <section className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4">
            <p className="text-sm font-semibold text-foreground">Choose model</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedProviderModels.map((model) => {
                const isSelected = selectedModelId === model.id
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleModelSelect(model.id)}
                    className={cn(
                      'rounded-xl border bg-background/70 p-3 text-left transition-colors hover:border-primary/40',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/70',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{model.label}</p>
                      {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{model.summary}</p>
                    {model.isRecommended ? (
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-primary">
                        Recommended
                      </p>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        {selectedProviderId && selectedModelId && supportedMethods.length > 0 ? (
          <section className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Choose auth method</p>
              {supportedMethods.length === 1 ? (
                <Badge variant="outline" className="capitalize">
                  {supportedMethods[0]}
                </Badge>
              ) : null}
            </div>

            {supportedMethods.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {supportedMethods.map((method) => {
                  const isSelected = selectedAuthMethod === method
                  return (
                    <Button
                      key={method}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedAuthMethod(method)
                        setApiKeyValue('')
                        setReplaceApiKey(false)
                        setOauthError('')
                        setOauthStatus('')
                      }}
                    >
                      {method === 'api-key' ? 'API key' : 'OAuth'}
                    </Button>
                  )
                })}
              </div>
            ) : null}

            {selectedAuthMethod === 'api-key' ? (
              <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4">
                {isStoredApiKeySelection && !replaceApiKey ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                      {apiKeyLabel} is already configured on the hosted runtime.
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setReplaceApiKey(true)}
                    >
                      Replace key
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="runtime-model-api-key">{apiKeyLabel}</Label>
                    <Input
                      id="runtime-model-api-key"
                      type="password"
                      value={apiKeyValue}
                      onChange={(event) => setApiKeyValue(event.target.value)}
                      placeholder={apiKeyPlaceholder}
                    />
                  </div>
                )}
              </div>
            ) : null}

            {selectedAuthMethod === 'oauth' ? (
              <div className="space-y-4 rounded-xl border border-border/70 bg-background/60 p-4">
                {isStoredOauthSelection ? (
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                    OpenAI OAuth is already connected on the hosted runtime.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>1. Open the OAuth window.</p>
                      <p>2. Finish the OpenAI sign-in flow.</p>
                      <p>3. Paste the localhost callback URL below to complete the hosted runtime setup.</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={handleOpenOauthWindow}
                        disabled={oauthBusy}
                      >
                        {oauthBusy ? 'Preparing OAuth...' : oauthUrlExpired ? 'Refresh OAuth Window' : 'Open OAuth Window'}
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleStartOpenAIOAuth()}
                        disabled={oauthBusy}
                      >
                        Regenerate URL
                      </Button>
                    </div>

                    {oauthCountdownLabel ? (
                      <p className="text-xs text-muted-foreground">
                        OAuth URL expires in {oauthCountdownLabel}.
                      </p>
                    ) : null}

                    <div className="space-y-2">
                      <Label htmlFor="runtime-model-oauth-callback">Callback URL</Label>
                      <Textarea
                        id="runtime-model-oauth-callback"
                        value={oauthCallback}
                        onChange={(event) => setOauthCallback(event.target.value)}
                        rows={3}
                        placeholder="http://localhost:1455/callback?..."
                      />
                    </div>

                    {oauthStatus ? <p className="text-xs text-muted-foreground">{oauthStatus}</p> : null}
                    {oauthError ? <p className="text-xs text-destructive">{oauthError}</p> : null}

                    <Button
                      type="button"
                      onClick={() => void handleCompleteOpenAIOAuth()}
                      disabled={oauthBusy || !oauthSessionId || !oauthCallback.trim()}
                    >
                      {oauthBusy ? 'Completing...' : 'Complete OAuth'}
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={footerDisabled}>
            Close
          </Button>
          {selectedAuthMethod === 'api-key' ? (
            <Button
              type="button"
              onClick={() => void handleSaveApiKeySelection()}
              disabled={!hasSelection || footerDisabled || (apiKeyRequired && !apiKeyValue.trim())}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
