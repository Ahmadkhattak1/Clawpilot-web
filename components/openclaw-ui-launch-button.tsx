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

const OPENCLAW_LAUNCH_RETRY_WINDOW_MS = 30_000
const OPENCLAW_LAUNCH_RETRY_DELAY_MS = 2_000

function buildLaunchPlaceholderHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Opening OpenClaw...</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f5f1;
        --panel: rgba(255, 255, 255, 0.92);
        --text: #171717;
        --muted: #6b6b6b;
        --border: rgba(23, 23, 23, 0.08);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        height: 100%;
        margin: 0;
      }

      body {
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top, rgba(0, 0, 0, 0.03), transparent 35%),
          linear-gradient(180deg, #fbfaf8 0%, var(--bg) 100%);
      }

      .card {
        width: min(420px, 100%);
        padding: 28px 24px;
        border-radius: 28px;
        border: 1px solid var(--border);
        background: var(--panel);
        box-shadow: 0 28px 70px rgba(0, 0, 0, 0.08);
        text-align: center;
      }

      .handle {
        width: 68px;
        height: 6px;
        margin: 0 auto 22px;
        border-radius: 999px;
        background: rgba(23, 23, 23, 0.14);
      }

      .icon {
        width: 72px;
        height: 72px;
        margin: 0 auto 18px;
        border-radius: 20px;
        border: 1px solid rgba(23, 23, 23, 0.06);
        background: #fff;
        display: grid;
        place-items: center;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
      }

      .spinner {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 2px solid rgba(23, 23, 23, 0.12);
        border-top-color: #171717;
        animation: spin 900ms linear infinite;
      }

      h1 {
        margin: 0 0 10px;
        font-size: 20px;
        line-height: 1.2;
        font-weight: 700;
      }

      p {
        margin: 0;
        font-size: 14px;
        line-height: 1.6;
        color: var(--muted);
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    </style>
  </head>
  <body>
    <main class="card" aria-live="polite">
      <div class="handle"></div>
      <div class="icon" aria-hidden="true">
        <div class="spinner"></div>
      </div>
      <h1 id="cp-launch-title">Opening OpenClaw</h1>
      <p id="cp-launch-message">Please wait while your secure session is prepared.</p>
    </main>
  </body>
</html>`
}

function updateLaunchPlaceholder(
  openedWindow: Window,
  input: {
    title?: string
    message: string
  },
) {
  try {
    if (input.title) {
      openedWindow.document.title = input.title
    }
    const titleElement = openedWindow.document.getElementById('cp-launch-title')
    if (titleElement && input.title) {
      titleElement.textContent = input.title
    }
    const messageElement = openedWindow.document.getElementById('cp-launch-message')
    if (messageElement) {
      messageElement.textContent = input.message
    }
  } catch {
    // Ignore popup DOM access failures.
  }
}

function isRetryableLaunchError(status: number, errorCode: string | null): boolean {
  if (errorCode === 'GATEWAY_PROXY_HANDSHAKE_UNAVAILABLE') {
    return true
  }
  if (status === 409 && errorCode === 'GATEWAY_STARTING') {
    return true
  }
  if (status === 503 && (errorCode === 'GATEWAY_UNAVAILABLE' || errorCode === 'OPENCLAW_LAUNCH_UNAVAILABLE')) {
    return true
  }
  return false
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
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
      openedWindow.document.open()
      openedWindow.document.write(buildLaunchPlaceholderHtml())
      openedWindow.document.close()
      updateLaunchPlaceholder(openedWindow, {
        title: 'Opening OpenClaw',
        message: 'Please wait while your secure session is prepared.',
      })
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

      const launchAttemptStartedAtMs = Date.now()
      let launchUrl: string | null = null

      while (Date.now() - launchAttemptStartedAtMs <= OPENCLAW_LAUNCH_RETRY_WINDOW_MS) {
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
        const errorCode = readTrimmedString(payloadRecord?.error)
        const message = readTrimmedString(payloadRecord?.message)
        launchUrl = readTrimmedString(launchRecord?.url)

        if (response.ok) {
          break
        }

        if (isRetryableLaunchError(response.status, errorCode)) {
          updateLaunchPlaceholder(openedWindow, {
            title: 'Opening OpenClaw',
            message: 'Preparing secure access. This can take a few more seconds.',
          })
          await delay(OPENCLAW_LAUNCH_RETRY_DELAY_MS)
          continue
        }

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
