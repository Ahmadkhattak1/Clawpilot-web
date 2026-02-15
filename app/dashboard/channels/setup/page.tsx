'use client'

import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SetupStepper } from '@/components/ui/setup-stepper'
import {
  AVAILABLE_CHANNEL_OPTIONS,
  CHANNEL_SETUP_STORAGE_KEY,
  CHANNEL_STORAGE_KEY,
  type ChannelSetupStorage,
} from '@/lib/channel-options'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { cn } from '@/lib/utils'

function getStoredChannelSetup(): ChannelSetupStorage {
  if (typeof window === 'undefined') return {}

  const raw = window.localStorage.getItem(CHANNEL_SETUP_STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as ChannelSetupStorage
  } catch {
    return {}
  }
}

export default function ChannelSetupPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [setupStore, setSetupStore] = useState<ChannelSetupStorage>({})
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const selectedChannel = useMemo(
    () => AVAILABLE_CHANNEL_OPTIONS.find((channel) => channel.id === selectedChannelId) ?? null,
    [selectedChannelId],
  )

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          router.replace('/signin')
          return
        }

        const storedChannelId = window.localStorage.getItem(CHANNEL_STORAGE_KEY)
        const channelExists = AVAILABLE_CHANNEL_OPTIONS.some((channel) => channel.id === storedChannelId)
        if (!channelExists || !storedChannelId) {
          router.replace('/dashboard/channels')
          return
        }

        if (!cancelled) {
          setSelectedChannelId(storedChannelId)
          setSetupStore(getStoredChannelSetup())
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
    if (!selectedChannel) return
    const saved = setupStore[selectedChannel.id]
    setFieldValues(saved?.values ?? {})
    setStatus('')
    setError('')
  }, [selectedChannel, setupStore])

  function persistSetup(nextSetup: ChannelSetupStorage) {
    setSetupStore(nextSetup)
    window.localStorage.setItem(CHANNEL_SETUP_STORAGE_KEY, JSON.stringify(nextSetup))
  }

  function saveCurrentSetup(showStatusMessage = true): boolean {
    if (!selectedChannel) return false

    const { setup } = selectedChannel
    const missingField = setup.fields?.find((field) => field.required && !fieldValues[field.id]?.trim())
    if (missingField) {
      setError(`${missingField.label} required.`)
      setStatus('')
      return false
    }

    const nextSetup: ChannelSetupStorage = {
      ...setupStore,
      [selectedChannel.id]: {
        channelId: selectedChannel.id,
        kind: setup.kind,
        values: fieldValues,
        linked: true,
        updatedAt: new Date().toISOString(),
      },
    }
    persistSetup(nextSetup)
    setError('')
    if (showStatusMessage) {
      setStatus('Saved')
    }
    return true
  }

  function saveChannelSetup(event?: React.FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault()
    saveCurrentSetup(true)
  }

  function onNext() {
    const didSave = saveCurrentSetup(false)
    if (!didSave) return
    router.push('/dashboard/hooks')
  }

  function onSetupFieldChange(fieldId: string, value: string) {
    setFieldValues((previous) => ({
      ...previous,
      [fieldId]: value,
    }))
    setError('')
    setStatus('')
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

  if (!selectedChannel) return null
  const shouldDeferQrUntilDeployment = selectedChannel.id === 'whatsapp'

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background"
      />

      <Card className="relative z-10 mx-auto flex min-h-[620px] w-full max-w-5xl flex-col border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-3 px-6 pt-7 md:px-10 md:pt-9">
          <Button variant="link" className="h-auto w-fit p-0 text-xs text-muted-foreground" asChild>
            <Link href="/dashboard/channels">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>{selectedChannel.label}</CardDescription>
          <SetupStepper currentStep="channel" />
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-6 pb-7 md:px-10 md:pb-10">
          <div className="max-w-2xl space-y-8">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4">
              <p className="text-sm text-muted-foreground">{selectedChannel.connectsVia}</p>
              <a
                href={selectedChannel.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                Docs
              </a>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-4">
              <p className="text-sm font-medium">{selectedChannel.setup.methodLabel}</p>

              {selectedChannel.setup.kind === 'qr' ? (
                <div className="mt-3 space-y-3">
                  {selectedChannel.setup.fields?.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label htmlFor={`${selectedChannel.id}-${field.id}`}>{field.label}</Label>
                      <Input
                        id={`${selectedChannel.id}-${field.id}`}
                        value={fieldValues[field.id] ?? ''}
                        onChange={(event) => onSetupFieldChange(field.id, event.target.value)}
                        placeholder={field.placeholder}
                        type={field.inputType ?? 'text'}
                        autoComplete="off"
                      />
                    </div>
                  ))}

                  {shouldDeferQrUntilDeployment ? (
                    <div className="rounded-lg border border-border/70 bg-card p-3">
                      <p className="text-xs text-muted-foreground">
                        QR appears after deploy starts.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" onClick={() => saveChannelSetup()}>
                          {selectedChannel.setup.actionLabel ?? 'Mark linked'}
                        </Button>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-card p-3">
                        <div className="mx-auto grid h-40 w-40 grid-cols-10 gap-0.5 rounded-md bg-white p-2">
                          {Array.from({ length: 100 }).map((_, index) => {
                            const seed = selectedChannel.id.length + selectedChannel.label.length
                            const isDark = ((index * 11 + seed) % 7) < 3
                            return (
                              <span
                                key={index}
                                className={cn('h-full w-full rounded-[1px]', isDark ? 'bg-black' : 'bg-white')}
                              />
                            )
                          })}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {selectedChannel.setup.qrHint ?? 'Scan in app.'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <form className="mt-3 space-y-3" onSubmit={saveChannelSetup}>
                  {selectedChannel.setup.fields?.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label htmlFor={`${selectedChannel.id}-${field.id}`}>{field.label}</Label>
                      <Input
                        id={`${selectedChannel.id}-${field.id}`}
                        value={fieldValues[field.id] ?? ''}
                        onChange={(event) => onSetupFieldChange(field.id, event.target.value)}
                        placeholder={field.placeholder}
                        type={field.inputType ?? 'text'}
                        autoComplete="off"
                      />
                    </div>
                  ))}
                  <Button type="submit">{selectedChannel.setup.actionLabel ?? 'Save'}</Button>
                </form>
              )}
            </div>
          </div>

          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
              </div>
              <Button type="button" onClick={onNext} className="sm:min-w-28">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
