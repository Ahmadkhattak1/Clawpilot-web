'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  value: string
  className?: string
  copyLabel?: string
  copiedLabel?: string
}

export function CopyButton({
  value,
  className,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return

    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleCopy()}
      className={cn('h-8 rounded-lg border-border/70 bg-background/80 px-2.5 text-xs shadow-sm', className)}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? copiedLabel : copyLabel}</span>
    </Button>
  )
}
