'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { Check, ExternalLink, Loader2, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  HOSTED_RUNTIME_MODEL_PROVIDER_OPTIONS,
  fromOpenClawModelId,
  fromOpenClawProviderId,
  getModelAuthCueMethods,
  getProviderModelOptions,
  isModelSupportedByProviderSetupMethod,
  toOpenClawProviderId,
  type ModelProviderId,
  type ModelProviderOption,
  type ProviderModelOption,
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
  type RuntimeModelSummary,
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

type DialogStep = 'provider' | 'model' | 'auth'

const DIALOG_STEPS: { id: DialogStep; label: string }[] = [
  { id: 'provider', label: 'Provider' },
  { id: 'model', label: 'Model' },
  { id: 'auth', label: 'Auth' },
]

function getDialogStepIndex(step: DialogStep): number {
  return DIALOG_STEPS.findIndex((item) => item.id === step)
}

const ENABLED_MODEL_PROVIDER_IDS = new Set(
  HOSTED_RUNTIME_MODEL_PROVIDER_OPTIONS.map((provider) => provider.id),
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

function getRuntimeProviderModelOptions(
  providerId: ModelProviderId | null,
  runtimeModels: RuntimeModelSummary[],
): ProviderModelOption[] {
  if (!providerId) return []

  const toCanonicalModelId = (model: RuntimeModelSummary): string => {
    const rawModelId = model.id.trim().toLowerCase()
    if (!rawModelId) return rawModelId

    const normalizedProviderId = (
      fromOpenClawProviderId(model.providerId)
      ?? fromOpenClawProviderId(inferProviderIdFromModelId(model.id))
      ?? providerId
    )

    if (!rawModelId.includes('/')) {
      return `${normalizedProviderId}/${rawModelId}`
    }

    if (rawModelId.startsWith('openai-codex/')) {
      return `openai/${rawModelId.slice('openai-codex/'.length)}`
    }

    const slashIndex = rawModelId.indexOf('/')
    const rawProviderId = rawModelId.slice(0, slashIndex)
    const modelName = rawModelId.slice(slashIndex + 1)
    const canonicalProviderId = fromOpenClawProviderId(rawProviderId) ?? rawProviderId
    return `${canonicalProviderId}/${modelName}`
  }

  const discoveredModels = runtimeModels
    .filter((model) => {
      const normalizedProviderId = fromOpenClawProviderId(model.providerId)
        ?? fromOpenClawProviderId(inferProviderIdFromModelId(model.id))
      return normalizedProviderId === providerId
    })
    .map((model) => ({
      id: toCanonicalModelId(model),
      label: model.label?.trim() || toCanonicalModelId(model),
      summary: 'Available in the hosted OpenClaw runtime catalog.',
      supportedMethods: undefined,
    }))

  const fallbackModels = getProviderModelOptions(providerId)
  const mergedModels = [...discoveredModels, ...fallbackModels]
  const seen = new Set<string>()

  return mergedModels.filter((model) => {
    if (seen.has(model.id)) {
      return false
    }
    seen.add(model.id)
    return true
  })
}

function buildProviderLabel(providerId: string): string {
  const normalized = providerId.trim()
  if (!normalized) return 'Provider'

  return normalized
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 3) return part.toUpperCase()
      return `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`
    })
    .join(' ')
}

function getRuntimeProviderOptions(
  runtimeModels: RuntimeModelSummary[],
  selectedProviderId: ModelProviderId | null,
): ModelProviderOption[] {
  const seen = new Set<string>()
  const merged: ModelProviderOption[] = []

  const appendProvider = (provider: ModelProviderOption | null) => {
    if (!provider || seen.has(provider.id)) return
    seen.add(provider.id)
    merged.push(provider)
  }

  for (const provider of HOSTED_RUNTIME_MODEL_PROVIDER_OPTIONS) {
    appendProvider(provider)
  }

  if (selectedProviderId) {
    appendProvider(
      HOSTED_RUNTIME_MODEL_PROVIDER_OPTIONS.find((provider) => provider.id === selectedProviderId) ?? {
        id: selectedProviderId,
        label: buildProviderLabel(selectedProviderId),
      },
    )
  }

  for (const model of runtimeModels) {
    const normalizedProviderId = fromOpenClawProviderId(model.providerId)
      ?? fromOpenClawProviderId(inferProviderIdFromModelId(model.id))
    if (!isEnabledModelProviderId(normalizedProviderId)) {
      continue
    }

    appendProvider(
      HOSTED_RUNTIME_MODEL_PROVIDER_OPTIONS.find((provider) => provider.id === normalizedProviderId) ?? {
        id: normalizedProviderId,
        label: buildProviderLabel(normalizedProviderId),
      },
    )
  }

  return merged
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
  const reduceMotion = useReducedMotion()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
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
  const [currentStep, setCurrentStep] = useState<DialogStep>('provider')
  const [runtimeModels, setRuntimeModels] = useState<RuntimeModelSummary[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<ProviderSetupMethod | null>(null)
  const [providerSearchQuery, setProviderSearchQuery] = useState('')
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

  const runtimeProviderOptions = useMemo(
    () => getRuntimeProviderOptions(runtimeModels, selectedProviderId),
    [runtimeModels, selectedProviderId],
  )
  const filteredProviderOptions = useMemo(() => {
    const query = providerSearchQuery.trim().toLowerCase()
    if (!query) return runtimeProviderOptions

    return runtimeProviderOptions.filter((provider) => (
      provider.label.toLowerCase().includes(query)
      || provider.id.toLowerCase().includes(query)
    ))
  }, [providerSearchQuery, runtimeProviderOptions])
  const selectedProviderModels = useMemo(
    () => getRuntimeProviderModelOptions(selectedProviderId, runtimeModels),
    [runtimeModels, selectedProviderId],
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
    setProviderSearchQuery('')
    setCurrentStep('provider')

    try {
      const runtimeModels = await listRuntimeModels(tenantId, {
        syncRuntime: true,
      })
      setRuntimeModels(runtimeModels.models)
      const nextConfig = toDialogModelConfig(runtimeModels.storedModelConfig)
      const fallbackProviderId = nextConfig.providerId
      const fallbackModelId = nextConfig.modelId
        ?? getRuntimeProviderModelOptions(fallbackProviderId, runtimeModels.models)[0]?.id
        ?? null
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

    if (!selectedModelId || !selectedProviderModels.some((model) => model.id === selectedModelId)) {
      const firstModelId = selectedProviderModels[0]?.id ?? null
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
  }, [selectedAuthMethod, selectedModelId, selectedProviderId, selectedProviderModels, supportedMethods])

  useEffect(() => {
    if (!open || !oauthExpiresAt) {
      return
    }

    setOauthNowMs(Date.now())
    const timer = window.setInterval(() => setOauthNowMs(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [oauthExpiresAt, open])

  useEffect(() => {
    if (!open) return

    const frameId = window.requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({
        top: 0,
        behavior: reduceMotion ? 'auto' : 'smooth',
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [currentStep, open, reduceMotion])

  const navigateToStep = useCallback((nextStep: DialogStep) => {
    if (nextStep === currentStep) return
    setCurrentStep(nextStep)
  }, [currentStep])

  const handleProviderSelect = useCallback((providerId: ModelProviderId) => {
    setSelectedProviderId(providerId)
    setSelectedModelId((previous) => {
      const providerModels = getRuntimeProviderModelOptions(providerId, runtimeModels)
      if (providerModels.some((model) => model.id === previous)) {
        return previous
      }
      return providerModels[0]?.id ?? null
    })
    setApiKeyValue('')
    setReplaceApiKey(false)
    setOauthError('')
    setOauthStatus('')
  }, [runtimeModels])

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
      toast.success('Model updated', {
        description: 'OpenAI OAuth is connected and saved to your hosted runtime.',
      })
      onOpenChange(false)
      onConfigured?.(nextStoredConfig)
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
      toast.success('Model updated', {
        description: 'Your hosted OpenClaw runtime is now using the new model settings.',
      })
      onOpenChange(false)
      onConfigured?.(nextStoredConfig)
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
    ? runtimeProviderOptions.find((provider) => provider.id === selectedProviderId) ?? null
    : null
  const apiKeyLabel = selectedProviderId
    ? MODEL_PROVIDER_AUTH_CONFIG[selectedProviderId]?.apiKeyLabel ?? 'API key'
    : 'API key'
  const apiKeyPlaceholder = selectedProviderId
    ? MODEL_PROVIDER_AUTH_CONFIG[selectedProviderId]?.apiKeyPlaceholder ?? ''
    : ''
  const selectedModelAuthCueMethods = getModelAuthCueMethods(selectedProviderId, selectedModelId)
  const docsOnlyAuthCueMethods = selectedModelAuthCueMethods.filter((method) => !supportedMethods.includes(method))
  const stepItems = DIALOG_STEPS
  const currentStepIndex = getDialogStepIndex(currentStep)
  const canAdvanceFromProvider = Boolean(selectedProviderId)
  const canAdvanceFromModel = Boolean(selectedProviderId && selectedModelId)
  const stepTransition = reduceMotion
    ? { duration: 0.08, ease: 'easeOut' as const }
    : { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const }
  const stepMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 18 },
      }
  const cardGridVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.02 } },
        exit: { opacity: 0, transition: { staggerChildren: 0.015, staggerDirection: -1 } },
      }
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
        exit: { opacity: 0, transition: { staggerChildren: 0.02, staggerDirection: -1 } },
      }
  const cardItemVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: { opacity: 0, x: -18 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 14 },
      }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-4xl flex-col overflow-hidden p-0">
        <div className="shrink-0 space-y-4 border-b border-border/70 bg-background/95 px-6 pb-4 pt-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <DialogHeader className="pr-10">
            <DialogTitle>Models</DialogTitle>
          </DialogHeader>

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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {stepItems.map((step, index) => {
                const isActive = currentStep === step.id
                const isComplete = currentStepIndex > index
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
                      isActive
                        ? 'border-primary bg-primary/5 text-primary'
                        : isComplete
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'
                          : 'border-border/70 text-muted-foreground',
                    )}
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background text-[11px]">
                      {index + 1}
                    </span>
                    {step.label}
                  </div>
                )
              })}
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void loadRuntimeConfig()}
              disabled={loading || saving || oauthBusy}
              className="shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="relative">
            <AnimatePresence mode="wait" initial={false}>

              {currentStep === 'provider' ? (
                <motion.section
                  key="provider"
                  className="space-y-4"
                  initial={stepMotion.initial}
                  animate={stepMotion.animate}
                  exit={stepMotion.exit}
                  transition={stepTransition}
                >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Step 1: Choose provider</p>
              <p className="text-sm text-muted-foreground">
                Start with the provider. The model list in the next step is loaded from this runtime when available.
              </p>
            </div>
            <div className="space-y-4">
              <div className="relative max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={providerSearchQuery}
                  onChange={(event) => setProviderSearchQuery(event.target.value)}
                  placeholder="Search providers"
                  className="h-9 pl-9 text-sm"
                  aria-label="Search providers"
                />
              </div>

              {filteredProviderOptions.length > 0 ? (
                <motion.div
                  className="grid gap-4 sm:grid-cols-3"
                  variants={cardGridVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {filteredProviderOptions.map((provider) => {
                    const isSelected = selectedProviderId === provider.id
                    return (
                      <motion.button
                        key={provider.id}
                        type="button"
                        variants={cardItemVariants}
                        transition={stepTransition}
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
                      </motion.button>
                    )
                  })}
                </motion.div>
              ) : (
                <div className="rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  No providers match that search.
                </div>
              )}
            </div>
                </motion.section>
              ) : null}

              {currentStep === 'model' ? (
                <motion.section
                  key="model"
                  className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4"
                  initial={stepMotion.initial}
                  animate={stepMotion.animate}
                  exit={stepMotion.exit}
                  transition={stepTransition}
                >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Step 2: Choose model</p>
              <p className="text-sm text-muted-foreground">
                Select the model you want this runtime to use for {selectedProvider?.label ?? 'the selected provider'}.
              </p>
            </div>

            {selectedProviderModels.length > 0 ? (
              <motion.div
                className="grid gap-3 sm:grid-cols-2"
                variants={cardGridVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {selectedProviderModels.map((model) => {
                  const isSelected = selectedModelId === model.id
                  const authCueMethods = getModelAuthCueMethods(selectedProviderId, model.id)
                  return (
                    <motion.button
                      key={model.id}
                      type="button"
                      variants={cardItemVariants}
                      transition={stepTransition}
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
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {authCueMethods.map((method) => (
                          <Badge key={`${model.id}-${method}`} variant="secondary" className="text-[10px] capitalize">
                            {method === 'api-key' ? 'API key' : 'OAuth'}
                          </Badge>
                        ))}
                      </div>
                      {model.isRecommended ? (
                        <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-primary">
                          Recommended
                        </p>
                      ) : null}
                    </motion.button>
                  )
                })}
              </motion.div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                No models were available for this provider in the runtime or fallback catalog.
              </div>
            )}
                </motion.section>
              ) : null}

              {currentStep === 'auth' ? (
                <motion.section
                  key="auth"
                  className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4"
                  initial={stepMotion.initial}
                  animate={stepMotion.animate}
                  exit={stepMotion.exit}
                  transition={stepTransition}
                >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Step 3: Configure auth</p>
              <p className="text-sm text-muted-foreground">
                Choose how this deployed runtime should authenticate for the selected provider and model.
              </p>
            </div>

            {docsOnlyAuthCueMethods.length > 0 ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                OpenClaw docs also mention {docsOnlyAuthCueMethods.map((method) => method === 'api-key' ? 'API key' : 'OAuth').join(' + ')} for this route, but this ClawPilot flow currently configures {supportedMethods.map((method) => method === 'api-key' ? 'API key' : 'OAuth').join(' + ')} directly.
              </div>
            ) : null}

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
                      <Button type="button" onClick={handleOpenOauthWindow} disabled={oauthBusy}>
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
                </motion.section>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border/70 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={footerDisabled}>
              Close
            </Button>
            {currentStep !== 'provider' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigateToStep(currentStep === 'auth' ? 'model' : 'provider')}
                disabled={footerDisabled}
              >
                Back
              </Button>
            ) : null}
          </div>

          <div className="flex gap-2">
            {currentStep === 'provider' ? (
              <Button
                type="button"
                onClick={() => navigateToStep('model')}
                disabled={footerDisabled || !canAdvanceFromProvider}
              >
                Next
              </Button>
            ) : null}

            {currentStep === 'model' ? (
              <Button
                type="button"
                onClick={() => navigateToStep('auth')}
                disabled={footerDisabled || !canAdvanceFromModel}
              >
                Next
              </Button>
            ) : null}

            {currentStep === 'auth' && selectedAuthMethod === 'api-key' ? (
              <Button
                type="button"
                onClick={() => void handleSaveApiKeySelection()}
                disabled={!hasSelection || footerDisabled || (apiKeyRequired && !apiKeyValue.trim())}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
