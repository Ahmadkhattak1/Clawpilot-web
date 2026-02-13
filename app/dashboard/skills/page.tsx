'use client'

import Link from 'next/link'
import { ArrowLeft, Check, Info, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  SKILL_OPTIONS,
  SKILLS_SKIPPED_STORAGE_KEY,
  SKILLS_STORAGE_KEY,
  SKILL_SELECTION_OPTIONS,
  filterSelectableSkillIds,
  getSkillOptionById,
} from '@/lib/skill-options'
import { getRecoveredSupabaseSession } from '@/lib/supabase-auth'
import { cn } from '@/lib/utils'

export default function SkillsPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [infoSkillId, setInfoSkillId] = useState<string | null>(null)

  const selectedCount = useMemo(() => selectedSkillIds.length, [selectedSkillIds])
  const infoSkill = useMemo(
    () => (infoSkillId ? getSkillOptionById(infoSkillId) : null),
    [infoSkillId],
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

        const storedSkillsRaw = window.localStorage.getItem(SKILLS_STORAGE_KEY)
        const storedSkills = storedSkillsRaw ? (JSON.parse(storedSkillsRaw) as unknown) : []
        const isStringArray = Array.isArray(storedSkills) && storedSkills.every((item) => typeof item === 'string')

        if (!cancelled && isStringArray) {
          setSelectedSkillIds(filterSelectableSkillIds(storedSkills))
        }
      } catch {
        router.replace('/signin')
        return
      }

      if (!cancelled) {
        setCheckingSession(false)
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [router])

  function persistSelectedSkills(skillIds: string[], skipped: boolean) {
    window.localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(skillIds))
    window.localStorage.setItem(SKILLS_SKIPPED_STORAGE_KEY, skipped ? 'true' : 'false')
  }

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((previous) => {
      const next = previous.includes(skillId)
        ? previous.filter((id) => id !== skillId)
        : [...previous, skillId]
      persistSelectedSkills(next, false)
      return next
    })
  }

  function onSkip() {
    persistSelectedSkills([], true)
    setSelectedSkillIds([])
    router.push('/dashboard/skills/setup')
  }

  function onNext() {
    persistSelectedSkills(selectedSkillIds, false)
    router.push('/dashboard/skills/setup')
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
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-8 sm:px-6 md:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_rgb(214_214_214)_1px,transparent_1px)] [background-size:18px_18px] opacity-55"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background"
      />

      <Card className="relative z-10 mx-auto w-full max-w-6xl border-border/70 shadow-sm shadow-primary/10">
        <CardHeader className="space-y-2">
          <Button variant="link" className="h-auto w-fit p-0 text-xs text-muted-foreground" asChild>
            <Link href="/dashboard/channels/setup">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>Skills (optional)</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {SKILL_SELECTION_OPTIONS.map((skill) => {
              const isSelected = selectedSkillIds.includes(skill.id)
              return (
                <div key={skill.id} className="relative">
                  <button
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    className={cn(
                      'w-full rounded-xl border bg-card p-3 text-left transition-colors',
                      'hover:border-primary/40',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/70',
                    )}
                  >
                    <div className="flex h-12 items-center justify-center rounded-md bg-muted/40 p-2">
                      <span className="text-2xl leading-none">{skill.emoji}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground/95 line-clamp-2">{skill.label}</p>
                      {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-label={`Info for ${skill.label}`}
                    onClick={() => setInfoSkillId(skill.id)}
                    className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-background text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    i
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {selectedCount > 0
                  ? `Selected: ${selectedCount} skill${selectedCount > 1 ? 's' : ''}`
                  : 'No optional skills selected.'}
              </p>
              <p className="text-xs text-muted-foreground">
                {`ClawHub (${SKILL_OPTIONS.find((skill) => skill.id === 'clawhub')?.emoji ?? '🧩'} clawhub) will be installed by default.`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onSkip}>
                Skip
              </Button>
              <Button type="button" onClick={onNext}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(infoSkill)} onOpenChange={(open) => (!open ? setInfoSkillId(null) : undefined)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{infoSkill?.emoji}</span>
              <span>{infoSkill?.label}</span>
            </DialogTitle>
            <DialogDescription>{infoSkill?.summary}</DialogDescription>
          </DialogHeader>

          {infoSkill ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Requires</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                  {infoSkill.requiredFromUser.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium">Configuration Collected Next</p>
                {infoSkill.configFields?.length ? (
                  <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                    {infoSkill.configFields.map((field) => (
                      <li key={field.id}>{`${field.label}${field.required ? ' (required)' : ' (optional)'}`}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No additional fields required.</p>
                )}
              </div>

              <a
                href={infoSkill.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Info className="h-3.5 w-3.5" />
                Open on ClawHub
              </a>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
