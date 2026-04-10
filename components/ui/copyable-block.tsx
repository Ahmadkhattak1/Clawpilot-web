'use client'

import type { ReactNode } from 'react'

import { CopyButton } from '@/components/ui/copy-button'
import { cn } from '@/lib/utils'

interface CopyableBlockProps {
  value: string
  children: ReactNode
  className?: string
}

export function CopyableBlock({
  value,
  children,
  className,
}: CopyableBlockProps) {
  return (
    <div className={cn('relative mt-8 overflow-hidden rounded-xl border border-border/60 bg-secondary/15', className)}>
      <CopyButton value={value} className="absolute right-3 top-3 z-10" />
      <div className="[&_pre]:m-0 [&_pre]:overflow-x-auto [&_pre]:bg-transparent [&_pre]:px-4 [&_pre]:pb-4 [&_pre]:pt-14 [&_pre]:text-sm [&_pre]:leading-7 [&_pre]:text-foreground/90 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit">
        {children}
      </div>
    </div>
  )
}
