'use client'

import { Loader2, Terminal } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button, type ButtonProps } from '@/components/ui/button'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'

interface ConsoleLaunchButtonProps {
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

function buildLaunchPlaceholderHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Opening Console...</title>
    <style>
      html, body {
        height: 100%;
        margin: 0;
      }
      body {
        display: grid;
        place-items: center;
        background: #000;
        color: #f4f4f5;
        font: 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      }
    </style>
  </head>
  <body>Opening console...</body>
</html>`
}

function readTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

export function ConsoleLaunchButton({
  tenantId,
  onUnauthorized,
  onError,
  onLaunchStart,
  label = 'Open Console',
  variant = 'outline',
  size = 'sm',
  className,
  disabled = false,
}: ConsoleLaunchButtonProps) {
  const [isOpening, setIsOpening] = useState(false)

  const handleOpenConsole = useCallback(async () => {
    if (!tenantId.trim() || isOpening || disabled) return
    onLaunchStart?.()

    const openedWindow = window.open('about:blank', '_blank')
    if (!openedWindow) {
      onError?.('Popup blocked. Allow popups to open the console in a new window.')
      return
    }

    try {
      openedWindow.opener = null
      openedWindow.document.open()
      openedWindow.document.write(buildLaunchPlaceholderHtml())
      openedWindow.document.close()
    } catch {
      // Ignore popup DOM access failures.
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

      const response = await fetch('/api/console/launch', {
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
      const launchUrl = readTrimmedString(launchRecord?.url)
      const message = readTrimmedString(payloadRecord?.message)

      if (!response.ok) {
        throw new Error(message ?? 'Unable to open console right now.')
      }
      if (!launchUrl) {
        throw new Error('Console launch URL is missing. Please try again.')
      }
      if (openedWindow.closed) {
        throw new Error('Console window was closed before it could load.')
      }

      openedWindow.location.replace(launchUrl)
    } catch (error) {
      if (!openedWindow.closed) openedWindow.close()
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Unable to open console right now.'
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
      onClick={() => void handleOpenConsole()}
      disabled={disabled || isOpening || !tenantId.trim()}
    >
      {isOpening ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Terminal className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  )
}
