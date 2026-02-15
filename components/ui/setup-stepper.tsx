'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

interface SetupStep {
  id: 'model' | 'channel' | 'deployment'
  label: string
}

const SETUP_STEPS: readonly SetupStep[] = [
  { id: 'model', label: 'Model' },
  { id: 'channel', label: 'Channel' },
  { id: 'deployment', label: 'Deployment' },
] as const

export type SetupStepId = SetupStep['id']

type SetupStepStatus = 'upcoming' | 'current' | 'complete'

let lastVisitedSetupStepId: SetupStepId | null = null

const indicatorVariants: Record<
  SetupStepStatus,
  { backgroundColor: string; borderColor: string; color: string }
> = {
  upcoming: {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    color: 'hsl(var(--muted-foreground))',
  },
  current: {
    backgroundColor: 'hsl(var(--primary))',
    borderColor: 'hsl(var(--primary))',
    color: 'hsl(var(--primary-foreground))',
  },
  complete: {
    backgroundColor: 'hsl(var(--primary))',
    borderColor: 'hsl(var(--primary))',
    color: 'hsl(var(--primary-foreground))',
  },
}

function AnimatedCheck() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth={2.4}
    >
      <motion.path
        d="M5 13.5l4 4L19 7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.8 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </svg>
  )
}

export function SetupStepper({
  currentStep,
  className,
}: {
  currentStep: SetupStepId
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  const currentStepIndex = Math.max(
    0,
    SETUP_STEPS.findIndex((step) => step.id === currentStep),
  )
  const [animatedStepIndex, setAnimatedStepIndex] = useState(() => {
    if (!lastVisitedSetupStepId) return currentStepIndex
    const previousIndex = SETUP_STEPS.findIndex((step) => step.id === lastVisitedSetupStepId)
    return previousIndex >= 0 ? previousIndex : currentStepIndex
  })

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setAnimatedStepIndex(currentStepIndex)
    })

    lastVisitedSetupStepId = currentStep

    return () => window.cancelAnimationFrame(frameId)
  }, [currentStep, currentStepIndex])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-xs font-medium text-muted-foreground sm:hidden">
        Step {currentStepIndex + 1} of {SETUP_STEPS.length}: {SETUP_STEPS[currentStepIndex]?.label}
      </div>

      <ol className="hidden items-start gap-2 sm:flex" aria-label="Setup progress">
        {SETUP_STEPS.map((step, index) => {
          const status: SetupStepStatus =
            index < animatedStepIndex ? 'complete' : index === animatedStepIndex ? 'current' : 'upcoming'
          const connectorComplete = index < animatedStepIndex
          const isActive = status !== 'upcoming'

          return (
            <motion.li
              key={step.id}
              className="flex min-w-0 flex-1"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center">
                  <motion.span
                    initial={false}
                    animate={{
                      ...indicatorVariants[status],
                      scale: 1,
                      opacity: 1,
                    }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 340, damping: 24, mass: 0.75 }
                    }
                    className={cn(
                      'relative grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[11px] font-semibold',
                      status === 'current' ? 'ring-4 ring-primary/15' : undefined,
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {status === 'complete' ? (
                        <motion.span
                          key="complete"
                          className="grid place-items-center"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                        >
                          <AnimatedCheck />
                        </motion.span>
                      ) : status === 'current' ? (
                        <motion.span
                          key="current"
                          className="h-2.5 w-2.5 rounded-full bg-primary-foreground"
                          initial={{ scale: 0.65, opacity: 0.55 }}
                          animate={
                            reduceMotion
                              ? { scale: 1, opacity: 1 }
                              : { scale: [0.9, 1.1, 0.9], opacity: [0.86, 1, 0.86] }
                          }
                          transition={
                            reduceMotion
                              ? { duration: 0.15, ease: 'easeOut' }
                              : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                          }
                        />
                      ) : (
                        <motion.span
                          key="upcoming"
                          initial={{ y: 2, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -2, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                          {index + 1}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.span>

                  {index < SETUP_STEPS.length - 1 ? (
                    <span className="ml-2 mt-0.5 h-1 flex-1 overflow-hidden rounded-full bg-border/80">
                      <motion.span
                        className="block h-full rounded-full bg-primary"
                        style={{ transformOrigin: 'left center' }}
                        initial={false}
                        animate={{ scaleX: connectorComplete ? 1 : 0 }}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }
                        }
                      />
                    </span>
                  ) : null}
                </div>

                <p
                  className={cn(
                    'mt-1 truncate pr-2 text-[11px] font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
