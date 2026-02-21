'use client'

import { ExternalLink, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button, type ButtonProps } from '@/components/ui/button'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'

interface OpenClawUiLaunchButtonProps {
  tenantId: string
  onUnauthorized: () => void
  onError?: (message: string) => void
  onLaunchStart?: () => void
  label?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
  disabled?: boolean
}

function readTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

export function OpenClawUiLaunchButton({
  tenantId,
  onUnauthorized,
  onError,
  onLaunchStart,
  label = 'Open OpenClaw UI',
  variant = 'outline',
  size = 'sm',
  className,
  disabled = false,
}: OpenClawUiLaunchButtonProps) {
  const [isOpening, setIsOpening] = useState(false)

  const handleOpenOpenClawUi = useCallback(async () => {
    if (!tenantId.trim() || isOpening || disabled) return
    onLaunchStart?.()

    const openedWindow = window.open('about:blank', '_blank')
    if (!openedWindow) {
      onError?.('Popup blocked. Allow popups to open OpenClaw in a new tab.')
      return
    }

    try {
      openedWindow.opener = null
      openedWindow.document.title = 'Opening OpenClaw...'
    } catch {
      // Ignore cross-window assignment errors.
    }

    setIsOpening(true)
    try {
      const session = await getRecoveredSupabaseSession({ timeoutMs: 2_500 })
      const accessToken = session?.access_token?.trim() ?? ''
      if (!accessToken) {
        if (!openedWindow.closed) openedWindow.close()
        onUnauthorized()
        return
      }

      const response = await fetch('/api/openclaw/launch', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      let payload: unknown = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      const payloadRecord =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : null
      const launchRecord =
        payloadRecord?.launch && typeof payloadRecord.launch === 'object' && !Array.isArray(payloadRecord.launch)
          ? (payloadRecord.launch as Record<string, unknown>)
          : null
      const message = readTrimmedString(payloadRecord?.message)
      const launchUrl = readTrimmedString(launchRecord?.url)

      if (!response.ok) {
        throw new Error(message ?? 'Unable to open OpenClaw right now.')
      }
      if (!launchUrl) {
        throw new Error('Launch URL is missing. Please try again.')
      }
      if (openedWindow.closed) {
        throw new Error('Launch tab was closed before OpenClaw could load.')
      }

      openedWindow.location.replace(launchUrl)
    } catch (error) {
      if (!openedWindow.closed) openedWindow.close()
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Unable to open OpenClaw right now.'
      onError?.(message)
    } finally {
      setIsOpening(false)
    }
  }, [disabled, isOpening, onError, onLaunchStart, onUnauthorized, tenantId])

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => void handleOpenOpenClawUi()}
      disabled={disabled || isOpening || !tenantId.trim()}
    >
      {isOpening ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ExternalLink className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  )
}
