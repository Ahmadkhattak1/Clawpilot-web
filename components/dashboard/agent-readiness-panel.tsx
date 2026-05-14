'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  readPersistedDeployStartedAt,
  writePersistedDeployStartedAt,
} from '@/lib/deploy-progress'
import { getRuntimeProduct, type RuntimeKind } from '@/lib/runtime-products'
import {
  tenantHasProvisionedInstance,
  type TenantDaemonStatus,
} from '@/lib/tenant-instance'
import { cn } from '@/lib/utils'

type TerminalLine = {
  id: string
  text: string
  tone: 'ok' | 'active' | 'idle' | 'error'
}

interface AgentReadinessPanelProps {
  runtimeKind: RuntimeKind
  status: TenantDaemonStatus | null
  ready: boolean
  error?: string
  className?: string
}

function parseTimestampMs(value: string | null | undefined): number | null {
  if (!value?.trim()) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveStartedAtMs(status: TenantDaemonStatus | null): number | null {
  return (
    readPersistedDeployStartedAt()
    ?? parseTimestampMs(status?.daemon?.createdAt)
    ?? parseTimestampMs(status?.daemon?.updatedAt)
  )
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function buildReadinessLines(input: {
  runtimeKind: RuntimeKind
  status: TenantDaemonStatus | null
  ready: boolean
  error?: string
}): TerminalLine[] {
  const product = getRuntimeProduct(input.runtimeKind)
  const hasMachine = tenantHasProvisionedInstance(input.status)
  const instanceState = input.status?.instance?.instanceState?.trim()
  const gatewayProbe = input.status?.instance?.gatewayProbe
  const publicProbeError = gatewayProbe?.publicProbeError?.trim()
  const privateProbeError = gatewayProbe?.privateProbeError?.trim()
  const port = gatewayProbe?.gatewayPort

  const lines: TerminalLine[] = [
    { id: 'provider', text: 'Provider is ready.', tone: 'ok' },
    { id: 'model', text: 'Model is ready.', tone: 'ok' },
    { id: 'auth', text: 'Auth is ready.', tone: 'ok' },
    {
      id: 'machine',
      text: hasMachine
        ? `Your hosted machine has been reserved${instanceState ? ` (${instanceState})` : ''}.`
        : 'Reserving your hosted machine...',
      tone: hasMachine ? 'ok' : 'active',
    },
  ]

  if (input.ready) {
    lines.push({
      id: 'ready',
      text: `${product.name} is reachable and ready to use.`,
      tone: 'ok',
    })
    return lines
  }

  lines.push({
    id: 'agent',
    text: product.startingText,
    tone: 'active',
  })

  if (port) {
    lines.push({
      id: 'gateway',
      text: `Checking gateway on port ${port}...`,
      tone: 'idle',
    })
  }

  if (publicProbeError || privateProbeError) {
    lines.push({
      id: 'probe',
      text: `Gateway probe pending${publicProbeError ? `; public=${publicProbeError}` : ''}${privateProbeError ? `; private=${privateProbeError}` : ''}.`,
      tone: 'idle',
    })
  }

  if (input.error?.trim()) {
    lines.push({
      id: 'error',
      text: input.error.trim(),
      tone: 'error',
    })
  }

  return lines
}

export function AgentReadinessPanel({
  runtimeKind,
  status,
  ready,
  error,
  className,
}: AgentReadinessPanelProps) {
  const product = getRuntimeProduct(runtimeKind)
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    const startedAtMs = resolveStartedAtMs(status)
    return startedAtMs ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)) : 0
  })

  useEffect(() => {
    if (ready) {
      writePersistedDeployStartedAt(null)
      return
    }

    const updateElapsed = () => {
      const startedAtMs = resolveStartedAtMs(status) ?? Date.now()
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)))
    }

    updateElapsed()
    const timer = window.setInterval(updateElapsed, 1_000)
    return () => window.clearInterval(timer)
  }, [ready, status])

  const lines = useMemo(
    () => buildReadinessLines({ runtimeKind, status, ready, error }),
    [error, ready, runtimeKind, status],
  )

  return (
    <section className={cn(
      'mx-auto mt-12 max-w-6xl rounded-2xl border border-border/70 bg-card/80 p-0 shadow-sm shadow-black/5 md:mt-16',
      className,
    )}>
      <div className="flex flex-col gap-4 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            {ready ? <CheckCircle2 className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {ready ? 'All set and running' : `${product.name} is still starting`}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {ready
                ? 'Your instance is live and ready to go. Use the tools above to manage and explore.'
                : 'You can stay here while the machine finishes bootstrapping.'}
            </p>
          </div>
        </div>

        {!ready ? (
          <div className="shrink-0 rounded-xl border border-border/70 bg-background px-3 py-2 text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Elapsed</p>
            <p className="font-mono text-sm font-semibold text-foreground">{formatElapsed(elapsedSeconds)}</p>
          </div>
        ) : null}
      </div>

      {!ready ? (
        <div className="px-5 py-5 md:px-6">
          <div className="min-h-[172px] overflow-auto rounded-xl border border-border/70 bg-background px-4 py-4 font-mono text-[11px] leading-6">
            {lines.map((line) => (
              <p
                key={line.id}
                className={
                  line.tone === 'ok'
                    ? 'text-emerald-700'
                    : line.tone === 'active'
                      ? 'text-amber-700'
                      : line.tone === 'error'
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                }
              >
                {line.text}
              </p>
            ))}
            <span className="mt-1 inline-block h-4 w-2 animate-pulse bg-foreground" />
          </div>
        </div>
      ) : null}
    </section>
  )
}
