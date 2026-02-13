'use client'

import Link from 'next/link'
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MODEL_PROVIDER_OPTIONS,
  MODEL_PROVIDER_STORAGE_KEY,
  type ModelProviderId,
} from '@/lib/model-providers'
import {
  MODEL_PROVIDER_AUTH_CONFIG,
  MODEL_PROVIDER_SETUP_STORAGE_KEY,
  type ProviderSetupMethod,
  type ProviderSetupStorage,
} from '@/lib/provider-auth-config'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { cn } from '@/lib/utils'

const MODEL_PROVIDER_IDS = new Set(MODEL_PROVIDER_OPTIONS.map((provider) => provider.id))

function isModelProviderId(value: string | null): value is ModelProviderId {
  if (!value) return false
  return MODEL_PROVIDER_IDS.has(value)
}

function getStoredSetup(): ProviderSetupStorage {
  if (typeof window === 'undefined') return {}

  const raw = window.localStorage.getItem(MODEL_PROVIDER_SETUP_STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as ProviderSetupStorage
  } catch {
    return {}
  }
}

export default function OpenCloudStepPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [selectedProviderId, setSelectedProviderId] = useState<ModelProviderId | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<ProviderSetupMethod | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [savedSetup, setSavedSetup] = useState<ProviderSetupStorage>({})

  const selectedProvider = useMemo(
    () => MODEL_PROVIDER_OPTIONS.find((provider) => provider.id === selectedProviderId) ?? null,
    [selectedProviderId],
  )

  const providerConfig = useMemo(() => {
    if (!selectedProviderId) return null
    return MODEL_PROVIDER_AUTH_CONFIG[selectedProviderId]
  }, [selectedProviderId])

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          router.replace('/signin')
          return
        }

        const providerId = window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)
        if (!isModelProviderId(providerId)) {
          router.replace('/dashboard')
          return
        }

        if (!cancelled) {
          setSelectedProviderId(providerId)
          setSavedSetup(getStoredSetup())
          setCheckingSession(false)
        }
      } catch {
        router.replace('/signin')
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!providerConfig || !selectedProviderId) {
      setSelectedMethod(null)
      return
    }

    const savedMethod = savedSetup[selectedProviderId]?.method
    if (savedMethod && providerConfig.methods.includes(savedMethod)) {
      setSelectedMethod(savedMethod)
      return
    }

    setSelectedMethod(providerConfig.methods[0] ?? null)
  }, [providerConfig, savedSetup, selectedProviderId])

  function persistSetup(nextSetup: ProviderSetupStorage) {
    setSavedSetup(nextSetup)
    window.localStorage.setItem(MODEL_PROVIDER_SETUP_STORAGE_KEY, JSON.stringify(nextSetup))
  }

  function saveOAuthSelection() {
    if (!selectedProviderId || !selectedProvider) return

    const nextSetup: ProviderSetupStorage = {
      ...savedSetup,
      [selectedProviderId]: {
        method: 'oauth',
        oauthConnected: true,
        hasApiKey: false,
        updatedAt: new Date().toISOString(),
      },
    }

    persistSetup(nextSetup)
    setApiKey('')
    setError('')
    setStatus('Saved.')
  }

  function saveApiKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProviderId || !selectedProvider || !providerConfig) return

    const trimmedApiKey = apiKey.trim()
    if (!providerConfig.apiKeyOptional && !trimmedApiKey) {
      setError('API key required.')
      setStatus('')
      return
    }

    const nextSetup: ProviderSetupStorage = {
      ...savedSetup,
      [selectedProviderId]: {
        method: 'api-key',
        hasApiKey: Boolean(trimmedApiKey),
        oauthConnected: false,
        updatedAt: new Date().toISOString(),
      },
    }

    persistSetup(nextSetup)
    setApiKey('')
    setError('')
    setStatus('Saved.')
  }

  function onNext() {
    router.push('/dashboard/channels')
  }

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

  if (!selectedProvider || !providerConfig || !selectedMethod) return null

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-8 sm:px-6 md:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background"
      />

      <Card className="relative z-10 mx-auto w-full max-w-6xl border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-3">
          <Button variant="link" className="h-auto w-fit p-0 text-xs text-muted-foreground" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>{selectedProvider.label} authentication</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 max-w-2xl">
          {providerConfig.methods.length > 1 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('oauth')
                  setError('')
                  setStatus('')
                }}
                className={cn(
                  'rounded-lg border bg-card p-3 text-left transition-colors',
                  selectedMethod === 'oauth'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border/70 hover:border-primary/40',
                )}
              >
                <p className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  OAuth
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('api-key')
                  setError('')
                  setStatus('')
                }}
                className={cn(
                  'rounded-lg border bg-card p-3 text-left transition-colors',
                  selectedMethod === 'api-key'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border/70 hover:border-primary/40',
                )}
              >
                <p className="flex items-center gap-2 text-sm font-medium">
                  <KeyRound className="h-4 w-4" />
                  API key
                </p>
              </button>
            </div>
          ) : null}

          {selectedMethod === 'oauth' ? (
            <div className="rounded-lg border border-border/70 bg-card p-4">
              <p className="text-sm font-medium">OAuth</p>
              <Button className="mt-3" onClick={saveOAuthSelection}>
                Connect
              </Button>
            </div>
          ) : (
            <form className="space-y-3 rounded-lg border border-border/70 bg-card p-4" onSubmit={saveApiKey}>
              <div className="space-y-1.5">
                <Label htmlFor="provider-api-key">
                  {providerConfig.apiKeyLabel ?? `${selectedProvider.label} API key`}
                </Label>
                <Input
                  id="provider-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={providerConfig.apiKeyPlaceholder ?? 'Enter API key'}
                  autoComplete="off"
                />
              </div>
              <Button type="submit">Save</Button>
            </form>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            </div>
            <Button onClick={onNext} className="sm:min-w-28">
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
