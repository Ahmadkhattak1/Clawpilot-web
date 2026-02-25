'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Loader2, QrCode, Unplug, RefreshCw, Send, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { OpenClawUiLaunchButton } from '@/components/openclaw-ui-launch-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CHANNEL_OPTIONS } from '@/lib/channel-options'
import {
  connectRuntimeWhatsApp,
  connectRuntimeTelegram,
  listRuntimeChannelsStatus,
  logoutRuntimeChannel,
  startRuntimeWhatsAppLogin,
  waitRuntimeWhatsAppLogin,
  type RuntimeChannelsStatusData,
} from '@/lib/runtime-controls'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { deriveTenantIdFromUserId } from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

type ChannelId = 'whatsapp' | 'telegram'
type ChannelStatusRecord = Record<string, unknown>
type ChannelAccountRecord = Record<string, unknown>
type WhatsAppDmPolicy = 'pairing' | 'allowlist' | 'open' | 'disabled'

function shortChannelLabel(label: string): string {
  const withoutBracketSuffix = label.split('[')[0]?.trim() ?? label
  return withoutBracketSuffix.split('(')[0]?.trim() ?? withoutBracketSuffix
}

const OPENCLAW_UI_ONLY_CHANNELS = CHANNEL_OPTIONS
  .filter((channel) => channel.id !== 'whatsapp' && channel.id !== 'telegram' && channel.logoSrc)
  .map((channel) => ({
    id: channel.id,
    label: shortChannelLabel(channel.label),
    logoSrc: channel.logoSrc as string,
  }))

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function parseAllowlistEntries(value: string): string[] {
  const entries = value
    .split(/[\n,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
  return Array.from(new Set(entries))
}

function readBool(record: ChannelStatusRecord | undefined, key: string): boolean | null {
  const raw = record?.[key]
  return typeof raw === 'boolean' ? raw : null
}

function readStr(record: ChannelStatusRecord | undefined, key: string): string | null {
  const raw = record?.[key]
  if (typeof raw !== 'string') return null
  const normalized = raw.trim()
  return normalized || null
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message.trim()) return fallback
  const message = error.message.trim()
  const lower = message.toLowerCase()
  if (lower.includes('not found')) return 'Runtime not ready. Open workspace first, then retry.'
  if (lower.includes('daemon_not_found') || lower.includes('daemon not found')) return 'Daemon not found. Retry in a moment.'
  if (lower.includes('not_paired') || lower.includes('pairing required') || lower.includes('device identity required')) return 'Channel bridge is still pairing. Retry shortly.'
  if (lower.includes('control ui requires https') || lower.includes('control ui requires localhost') || lower.includes('secure context')) return 'Bridge setup in progress. Retry shortly.'
  if (
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('connect handshake') ||
    lower.includes('gateway websocket closed')
  ) {
    return 'OpenClaw is still starting. Retry in a few seconds.'
  }
  if (lower.includes('gateway_starting') || lower.includes('bootstrapping')) {
    return 'OpenClaw is still bootstrapping. Retry in a few seconds.'
  }
  if (lower.includes('gateway_unavailable') || (lower.includes('gateway') && lower.includes('unavailable'))) return 'OpenClaw is starting. Try again in a moment.'
  return message
}

function StatusDot({ status }: { status: 'connected' | 'running' | 'configured' | 'off' | 'loading' }) {
  if (status === 'loading') {
    return <span className="relative flex h-2.5 w-2.5"><Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" /></span>
  }
  const colorMap = {
    connected: 'bg-emerald-500',
    running: 'bg-amber-500',
    configured: 'bg-blue-400',
    off: 'bg-zinc-400',
  }
  const pulseMap = {
    connected: true,
    running: false,
    configured: false,
    off: false,
  }
  return (
    <span className="relative flex h-2.5 w-2.5">
      {pulseMap[status] && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', colorMap[status])} />}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', colorMap[status])} />
    </span>
  )
}

function deriveChannelStatus(record: ChannelStatusRecord | null | undefined): 'connected' | 'running' | 'configured' | 'off' {
  if (!record) return 'off'
  if (readBool(record, 'connected') === true) return 'connected'
  if (readBool(record, 'running') === true) return 'running'
  if (readBool(record, 'configured') === true) return 'configured'
  return 'off'
}

function statusLabel(status: 'connected' | 'running' | 'configured' | 'off'): string {
  const labels: Record<typeof status, string> = {
    connected: 'Connected',
    running: 'Running',
    configured: 'Configured',
    off: 'Not connected',
  }
  return labels[status]
}

export default function ChannelsPage() {
  const router = useRouter()

  const [checkingSession, setCheckingSession] = useState(true)
  const [tenantId, setTenantId] = useState('')

  const [loadingStatus, setLoadingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [openClawUiError, setOpenClawUiError] = useState('')
  const [statusSnapshot, setStatusSnapshot] = useState<RuntimeChannelsStatusData | null>(null)

  const [activeChannel, setActiveChannel] = useState<ChannelId | null>(null)

  // WhatsApp
  const [waBusy, setWaBusy] = useState(false)
  const [waMessage, setWaMessage] = useState('')
  const [waQr, setWaQr] = useState<string | null>(null)
  const [waPhoneMode, setWaPhoneMode] = useState<'personal' | 'dedicated'>('personal')
  const [waOwnerPhone, setWaOwnerPhone] = useState('')
  const [waDmPolicy, setWaDmPolicy] = useState<WhatsAppDmPolicy>('allowlist')
  const [waAllowFromInput, setWaAllowFromInput] = useState('')

  // Telegram
  const [tgBusy, setTgBusy] = useState(false)
  const [tgMessage, setTgMessage] = useState('')
  const [tgBotToken, setTgBotToken] = useState('')
  const [tgShowTokenInput, setTgShowTokenInput] = useState(false)

  const redirectToSignIn = useCallback(() => {
    const currentPath = typeof window === 'undefined'
      ? '/channels'
      : `${window.location.pathname}${window.location.search}`
    router.replace(buildSignInPath(currentPath))
  }, [router])

  const refreshStatus = useCallback(async (tid: string, probe = true) => {
    if (!tid) return
    setLoadingStatus(true)
    setStatusError('')
    try {
      const snapshot = await listRuntimeChannelsStatus(tid, { probe, timeoutMs: 8_000 })
      setStatusSnapshot(snapshot)
    } catch (error) {
      setStatusError(normalizeErrorMessage(error, 'Failed to load channel status.'))
    } finally {
      setLoadingStatus(false)
    }
  }, [])

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
        setTenantId(nextTenantId)
        await refreshStatus(nextTenantId, true)
      } catch { redirectToSignIn(); return }
      if (!cancelled) setCheckingSession(false)
    }
    void loadSession()
    return () => { cancelled = true }
  }, [redirectToSignIn, refreshStatus])

  const waStatus = useMemo(() => (statusSnapshot?.channels?.whatsapp ?? null) as ChannelStatusRecord | null, [statusSnapshot])
  const tgStatus = useMemo(() => (statusSnapshot?.channels?.telegram ?? null) as ChannelStatusRecord | null, [statusSnapshot])
  const waAccounts = useMemo(() => (statusSnapshot?.channelAccounts?.whatsapp ?? []) as ChannelAccountRecord[], [statusSnapshot])
  const tgAccounts = useMemo(() => (statusSnapshot?.channelAccounts?.telegram ?? []) as ChannelAccountRecord[], [statusSnapshot])

  const waDerived = deriveChannelStatus(waStatus)
  const tgDerived = deriveChannelStatus(tgStatus)
  const waLinkedIdentity = useMemo(() => {
    const statusSelf = asRecord(waStatus?.self)
    const statusE164 = typeof statusSelf?.e164 === 'string' ? statusSelf.e164.trim() : ''
    const statusJid = typeof statusSelf?.jid === 'string' ? statusSelf.jid.trim() : ''

    if (statusE164 || statusJid) {
      return {
        e164: statusE164 || null,
        jid: statusJid || null,
      }
    }

    for (const account of waAccounts) {
      const accountSelf = asRecord(account.self)
      const accountE164 = typeof accountSelf?.e164 === 'string' ? accountSelf.e164.trim() : ''
      const accountJid = typeof accountSelf?.jid === 'string' ? accountSelf.jid.trim() : ''
      if (accountE164 || accountJid) {
        return {
          e164: accountE164 || null,
          jid: accountJid || null,
        }
      }
    }

    return {
      e164: null,
      jid: null,
    }
  }, [waAccounts, waStatus])
  const waCurrentDmPolicy = useMemo(() => {
    const statusPolicy = readStr(waStatus ?? undefined, 'dmPolicy')
    if (statusPolicy) return statusPolicy
    for (const account of waAccounts) {
      const policy = readStr(account, 'dmPolicy')
      if (policy) return policy
    }
    return null
  }, [waAccounts, waStatus])

  const tgConnectedIdentity = useMemo(() => {
    for (const account of tgAccounts) {
      const probe = asRecord(account.probe)
      const bot = asRecord(probe?.bot)
      if (!bot) continue

      const usernameRaw = typeof bot.username === 'string' ? bot.username.trim() : ''
      const firstNameRaw = typeof bot.first_name === 'string' ? bot.first_name.trim() : ''
      const idRaw = typeof bot.id === 'number'
        ? String(bot.id)
        : (typeof bot.id === 'string' ? bot.id.trim() : '')

      if (usernameRaw || firstNameRaw || idRaw) {
        return {
          username: usernameRaw ? `@${usernameRaw}` : null,
          displayName: firstNameRaw || null,
          id: idRaw || null,
        }
      }
    }

    return {
      username: null,
      displayName: null,
      id: null,
    }
  }, [tgAccounts])

  const tgBotUsername = tgConnectedIdentity.username

  // --- WhatsApp actions ---
  const handleWaShowQr = useCallback(async () => {
    if (!tenantId) return
    const ownerPhone = waOwnerPhone.trim()
    const allowFromEntries = parseAllowlistEntries(waAllowFromInput)
    if (waPhoneMode === 'personal' && !ownerPhone) {
      setWaMessage('Enter the personal number you will link with the QR code.')
      return
    }
    setWaBusy(true)
    setWaMessage('')
    try {
      await connectRuntimeWhatsApp(tenantId, {
        phoneMode: waPhoneMode,
        ownerPhone: waPhoneMode === 'personal' ? ownerPhone : undefined,
        dmPolicy: waDmPolicy,
        allowFrom: allowFromEntries.length > 0 ? allowFromEntries : undefined,
      })

      let result = await startRuntimeWhatsAppLogin(tenantId, {
        force: waDerived === 'connected',
        timeoutMs: 45_000,
      })
      const normalizedStartMessage = (result.message ?? '').toLowerCase()
      const needsForcedRelinkStart = (
        waDerived !== 'connected' &&
        !result.connected &&
        !result.qrDataUrl &&
        (normalizedStartMessage.includes('already linked') || normalizedStartMessage.includes('relink'))
      )
      if (needsForcedRelinkStart) {
        result = await startRuntimeWhatsAppLogin(tenantId, { force: true, timeoutMs: 45_000 })
      }
      setWaQr(result.qrDataUrl ?? null)
      if (result.connected) {
        setWaMessage('Already connected.')
        setWaQr(null)
        await refreshStatus(tenantId, true)
      } else {
        setWaMessage(result.message ?? 'Scan this QR in WhatsApp.')
        try {
          let waitResult = await waitRuntimeWhatsAppLogin(tenantId, { timeoutMs: 120_000 })
          let followupWaitCount = 0
          const maxFollowupWaits = 1

          while (!waitResult.connected && waitResult.qrDataUrl && followupWaitCount < maxFollowupWaits) {
            setWaQr(waitResult.qrDataUrl)
            setWaMessage('Generated a fresh WhatsApp QR. Scan it now in Linked Devices.')
            followupWaitCount += 1
            waitResult = await waitRuntimeWhatsAppLogin(tenantId, { timeoutMs: 120_000 })
          }

          if (waitResult.connected) {
            setWaMessage('WhatsApp linked successfully.')
            setWaQr(null)
          } else {
            if (waitResult.qrDataUrl) {
              setWaQr(waitResult.qrDataUrl)
            } else {
              setWaQr(null)
            }
            setWaMessage(waitResult.message ?? 'Scan timed out. Show QR again to retry.')
          }
          await refreshStatus(tenantId, true)
        } catch (waitError) {
          setWaMessage(normalizeErrorMessage(waitError, 'Timed out waiting for scan. Try again.'))
        }
      }
    } catch (error) {
      setWaMessage(normalizeErrorMessage(error, 'Failed to start WhatsApp login.'))
      setWaQr(null)
    } finally {
      setWaBusy(false)
    }
  }, [refreshStatus, tenantId, waAllowFromInput, waDerived, waDmPolicy, waOwnerPhone, waPhoneMode])

  const handleWaDisconnect = useCallback(async () => {
    if (!tenantId) return
    setWaBusy(true)
    setWaMessage('')
    try {
      await logoutRuntimeChannel(tenantId, { channelId: 'whatsapp' })
      setWaQr(null)
      setWaMessage('Disconnected.')
      await refreshStatus(tenantId, true)
    } catch (error) {
      setWaMessage(normalizeErrorMessage(error, 'Failed to disconnect WhatsApp.'))
    } finally {
      setWaBusy(false)
    }
  }, [refreshStatus, tenantId])

  // --- Telegram actions ---
  const handleTgConnect = useCallback(async () => {
    if (!tenantId) return
    const token = tgBotToken.trim()
    if (!token) { setTgMessage('Bot token is required.'); return }
    setTgBusy(true)
    setTgMessage('')
    try {
      await connectRuntimeTelegram(tenantId, { botToken: token })
      setTgBotToken('')
      setTgShowTokenInput(false)
      setTgMessage('Bot token saved. Refreshing channel status...')
      await refreshStatus(tenantId, true)
      setTgMessage('Token configured. Open your bot in Telegram, tap Start, then approve the pairing code in OpenClaw chat.')
    } catch (error) {
      setTgMessage(normalizeErrorMessage(error, 'Failed to connect Telegram.'))
    } finally {
      setTgBusy(false)
    }
  }, [refreshStatus, tgBotToken, tenantId])

  const handleTgDisconnect = useCallback(async () => {
    if (!tenantId) return
    setTgBusy(true)
    setTgMessage('')
    try {
      await logoutRuntimeChannel(tenantId, { channelId: 'telegram' })
      setTgMessage('Disconnected.')
      await refreshStatus(tenantId, true)
    } catch (error) {
      setTgMessage(normalizeErrorMessage(error, 'Failed to disconnect Telegram.'))
    } finally {
      setTgBusy(false)
    }
  }, [refreshStatus, tenantId])

  const toggleChannel = (id: ChannelId) => {
    setActiveChannel((prev) => (prev === id ? null : id))
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

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />

      <div className="relative z-10 mx-auto w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loadingStatus || !tenantId}
            onClick={() => { if (tenantId) void refreshStatus(tenantId, true) }}
          >
            {loadingStatus
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        <div>
          <h1 className="text-lg font-semibold tracking-tight">Channels</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Connect messaging platforms to your runtime.</p>
        </div>

        {statusError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {statusError}
          </div>
        )}

        {openClawUiError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {openClawUiError}
          </div>
        )}

        <div className="rounded-xl border border-border/70 bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Need more channels?</p>
              <p className="text-xs text-muted-foreground">
                Configure WhatsApp and Telegram here. Open OpenClaw UI for the rest.
              </p>
            </div>
            <OpenClawUiLaunchButton
              tenantId={tenantId}
              onUnauthorized={redirectToSignIn}
              onLaunchStart={() => setOpenClawUiError('')}
              onError={setOpenClawUiError}
              className="shrink-0"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {OPENCLAW_UI_ONLY_CHANNELS.map((channel) => (
              <span
                key={channel.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5"
                title={`${channel.label} setup is available in OpenClaw UI`}
              >
                <Image src={channel.logoSrc} alt={channel.label} width={14} height={14} className="h-3.5 w-3.5 object-contain" />
                <span className="text-[11px] text-muted-foreground">{channel.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Channel selector buttons */}
        <div className="grid grid-cols-2 gap-3">
          <ChannelButton
            name="WhatsApp"
            icon="/integrations/whatsapp.svg"
            status={loadingStatus ? 'loading' : waDerived}
            detail={waLinkedIdentity.e164}
            active={activeChannel === 'whatsapp'}
            onClick={() => toggleChannel('whatsapp')}
          />
          <ChannelButton
            name="Telegram"
            icon="/integrations/telegram.svg"
            status={loadingStatus ? 'loading' : tgDerived}
            detail={tgConnectedIdentity.username}
            active={activeChannel === 'telegram'}
            onClick={() => toggleChannel('telegram')}
          />
        </div>

        {/* WhatsApp panel */}
        {activeChannel === 'whatsapp' && (
          <div className="animate-in fade-in slide-in-from-top-2 space-y-4 rounded-xl border border-border/70 bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/integrations/whatsapp.svg" alt="WhatsApp" width={28} height={28} />
                <div>
                  <p className="text-sm font-medium">WhatsApp</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <StatusDot status={waDerived} />
                    {statusLabel(waDerived)}
                    {waDerived === 'connected' && readStr(waStatus ?? undefined, 'lastConnectedAt') && (
                      <span className="text-muted-foreground/60">&middot; since {new Date(readStr(waStatus ?? undefined, 'lastConnectedAt')!).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {(waLinkedIdentity.e164 || waLinkedIdentity.jid) && (
              <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/20 p-3">
                <p className="text-xs font-medium text-foreground/90">Current linked identity</p>
                {waLinkedIdentity.e164 && (
                  <p className="text-xs text-muted-foreground">
                    Phone: <span className="font-medium text-foreground/90">{waLinkedIdentity.e164}</span>
                  </p>
                )}
                {waLinkedIdentity.jid && (
                  <p className="text-xs text-muted-foreground">
                    JID: <span className="font-medium text-foreground/90">{waLinkedIdentity.jid}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground/90">Linked account type</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose which WhatsApp account will scan the QR. The scanned account is the one OpenClaw will run on.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={waPhoneMode === 'personal' ? 'default' : 'outline'}
                  disabled={waBusy || loadingStatus}
                  onClick={() => {
                    setWaPhoneMode('personal')
                    setWaDmPolicy('allowlist')
                  }}
                >
                  Personal account
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={waPhoneMode === 'dedicated' ? 'default' : 'outline'}
                  disabled={waBusy || loadingStatus}
                  onClick={() => {
                    setWaPhoneMode('dedicated')
                    setWaDmPolicy('pairing')
                  }}
                >
                  Separate account
                </Button>
              </div>
              {waPhoneMode === 'personal' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="wa-owner-phone" className="text-xs">Personal number (the same number that will scan QR)</Label>
                  <Input
                    id="wa-owner-phone"
                    type="text"
                    placeholder="+15555550123"
                    value={waOwnerPhone}
                    disabled={waBusy || loadingStatus}
                    onChange={(event) => setWaOwnerPhone(event.target.value)}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    OpenClaw will treat this as your own WhatsApp identity and enable self-chat mode.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Use this when a separate WhatsApp account will scan the QR and run OpenClaw. Your personal number can
                  message it and get approved through pairing.
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs font-medium text-foreground/90">DM access policy</p>
              <p className="text-xs text-muted-foreground">
                Controls who can trigger OpenClaw in WhatsApp direct messages.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={waDmPolicy === 'pairing' ? 'default' : 'outline'}
                  disabled={waBusy || loadingStatus}
                  onClick={() => setWaDmPolicy('pairing')}
                >
                  Pairing (recommended)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={waDmPolicy === 'allowlist' ? 'default' : 'outline'}
                  disabled={waBusy || loadingStatus}
                  onClick={() => setWaDmPolicy('allowlist')}
                >
                  Allowlist
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={waDmPolicy === 'open' ? 'default' : 'outline'}
                  disabled={waBusy || loadingStatus}
                  onClick={() => setWaDmPolicy('open')}
                >
                  Open
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={waDmPolicy === 'disabled' ? 'default' : 'outline'}
                  disabled={waBusy || loadingStatus}
                  onClick={() => setWaDmPolicy('disabled')}
                >
                  Disabled
                </Button>
              </div>
              {waCurrentDmPolicy && (
                <p className="text-[11px] text-muted-foreground">
                  Current runtime policy: <span className="font-medium text-foreground/90">{waCurrentDmPolicy}</span>
                </p>
              )}
              {waDmPolicy === 'pairing' && (
                <p className="text-[11px] text-muted-foreground">
                  Unknown senders get a code and are blocked until approved with{' '}
                  <code className="rounded bg-background px-1 py-0.5 text-[11px] text-foreground/90">openclaw pairing approve whatsapp &lt;CODE&gt;</code>.
                </p>
              )}
              {(waDmPolicy === 'allowlist' || waDmPolicy === 'open') && (
                <div className="space-y-1.5">
                  <Label htmlFor="wa-allow-from" className="text-xs">Allowlist numbers (E.164; comma or newline separated)</Label>
                  <Input
                    id="wa-allow-from"
                    type="text"
                    placeholder="+15551234567, +447700900123"
                    value={waAllowFromInput}
                    disabled={waBusy || loadingStatus}
                    onChange={(event) => setWaAllowFromInput(event.target.value)}
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {waDmPolicy === 'open'
                      ? 'Open mode allows any sender (wildcard is applied automatically).'
                      : 'Allowlist mode permits only listed numbers plus already-approved pairings.'}
                  </p>
                </div>
              )}
              {waDmPolicy === 'disabled' && (
                <p className="text-[11px] text-muted-foreground">
                  Incoming WhatsApp DMs are ignored until policy is changed.
                </p>
              )}
            </div>

            {waMessage && (
              <p className={cn(
                'rounded-lg px-3 py-2 text-sm',
                waMessage.toLowerCase().includes('fail') || waMessage.toLowerCase().includes('error')
                  ? 'border border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border border-border/70 bg-muted/30 text-foreground/80',
              )}>
                {waMessage}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              In WhatsApp, open <span className="font-medium">Linked Devices</span> and tap <span className="font-medium">Link a device</span>, then scan this QR directly there.
            </p>

            {waQr && (
              <div className="flex justify-center rounded-lg border border-border/70 bg-white p-4">
                <img src={waQr} alt="WhatsApp QR" className="h-52 w-52 rounded" />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={waBusy || loadingStatus}
                onClick={() => void handleWaShowQr()}
                className="gap-2"
              >
                {waBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                {waDerived === 'connected' ? 'Re-link' : 'Show QR'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={waBusy || loadingStatus || waDerived === 'off'}
                onClick={() => void handleWaDisconnect()}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Unplug className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          </div>
        )}

        {/* Telegram panel */}
        {activeChannel === 'telegram' && (
          <div className="animate-in fade-in slide-in-from-top-2 space-y-4 rounded-xl border border-border/70 bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/integrations/telegram.svg" alt="Telegram" width={28} height={28} />
                <div>
                  <p className="text-sm font-medium">Telegram</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <StatusDot status={tgDerived} />
                    {statusLabel(tgDerived)}
                    {tgBotUsername && (
                      <span className="text-muted-foreground/60">&middot; {tgBotUsername}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {tgMessage && (
              <p className={cn(
                'rounded-lg px-3 py-2 text-sm',
                tgMessage.toLowerCase().includes('fail') || tgMessage.toLowerCase().includes('error') || tgMessage.toLowerCase().includes('required')
                  ? 'border border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border border-border/70 bg-muted/30 text-foreground/80',
              )}>
                {tgMessage}
              </p>
            )}

            {(tgConnectedIdentity.username || tgConnectedIdentity.displayName || tgConnectedIdentity.id) && (
              <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/20 p-3">
                <p className="text-xs font-medium text-foreground/90">Current connected bot</p>
                {tgConnectedIdentity.username && (
                  <p className="text-xs text-muted-foreground">
                    Username: <span className="font-medium text-foreground/90">{tgConnectedIdentity.username}</span>
                  </p>
                )}
                {tgConnectedIdentity.displayName && (
                  <p className="text-xs text-muted-foreground">
                    Name: <span className="font-medium text-foreground/90">{tgConnectedIdentity.displayName}</span>
                  </p>
                )}
                {tgConnectedIdentity.id && (
                  <p className="text-xs text-muted-foreground">
                    Bot ID: <span className="font-medium text-foreground/90">{tgConnectedIdentity.id}</span>
                  </p>
                )}
              </div>
            )}

            {(tgDerived !== 'connected' || tgShowTokenInput) && (
              <div className="space-y-2">
                <Label htmlFor="tg-bot-token" className="text-xs">Bot token from @BotFather</Label>
                <div className="flex gap-2">
                  <Input
                    id="tg-bot-token"
                    type="password"
                    autoComplete="off"
                    placeholder="Paste bot token"
                    value={tgBotToken}
                    onChange={(e) => setTgBotToken(e.target.value)}
                    disabled={tgBusy}
                    className="h-9 text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleTgConnect() }}
                  />
                  <Button
                    size="sm"
                    disabled={tgBusy || loadingStatus || !tgBotToken.trim()}
                    onClick={() => void handleTgConnect()}
                    className="gap-2 shrink-0"
                  >
                    {tgBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {tgDerived === 'connected' ? 'Update' : 'Connect'}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs font-medium text-foreground/90">First-time Telegram pairing</p>
              <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                <li>Create the bot in <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="underline underline-offset-2">@BotFather</a>, then paste the token above.</li>
                <li>Open the bot link from BotFather and press <span className="font-medium text-foreground/90">Start</span>.</li>
                <li>The bot replies with a pairing code and an approval instruction.</li>
                <li>In your OpenClaw chat, send <code className="rounded bg-background px-1 py-0.5 text-[11px] text-foreground/90">openclaw pairing approve telegram &lt;CODE&gt;</code>.</li>
                <li>Wait for the approval confirmation, then refresh this page.</li>
              </ol>
              <p className="text-[11px] text-muted-foreground">
                Send the approval command in the OpenClaw conversation (not in @BotFather).
              </p>
              <p className="text-[11px] text-muted-foreground">
                Docs:{' '}
                <a href="https://docs.openclaw.ai/channels/telegram" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  Telegram setup
                </a>
              </p>
            </div>

            <div className="flex gap-2">
              {tgDerived === 'connected' && !tgShowTokenInput && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={tgBusy || loadingStatus}
                  onClick={() => { setTgMessage(''); setTgBotToken(''); setTgShowTokenInput(true) }}
                  className="gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Update token
                </Button>
              )}
              {tgShowTokenInput && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setTgShowTokenInput(false); setTgBotToken('') }}
                  className="gap-2"
                >
                  Cancel
                </Button>
              )}
              {tgDerived !== 'off' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={tgBusy || loadingStatus}
                  onClick={() => void handleTgDisconnect()}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChannelButton({
  name,
  icon,
  status,
  detail,
  active,
  onClick,
}: {
  name: string
  icon: string
  status: 'connected' | 'running' | 'configured' | 'off' | 'loading'
  detail?: string | null
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
        active
          ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border/70 bg-card hover:border-primary/30 hover:bg-muted/30',
      )}
    >
      <Image src={icon} alt={name} width={32} height={32} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{name}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <StatusDot status={status} />
          {status === 'loading' ? 'Checking...' : statusLabel(status)}
        </div>
        {detail && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">{detail}</p>
        )}
      </div>
    </button>
  )
}
