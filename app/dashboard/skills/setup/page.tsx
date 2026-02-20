'use client'

import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SKILLS_CONFIG_STORAGE_KEY,
  SKILLS_STORAGE_KEY,
  getEffectiveSkillIds,
  getSkillOptionById,
  type SkillConfigStorage,
  type SkillOption,
} from '@/lib/skill-options'
import { isOnboardingComplete } from '@/lib/onboarding-state'
import { buildSignInPath, getRecoveredSupabaseSession } from '@/lib/supabase-auth'

function getStoredSkillIds() {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(SKILLS_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => typeof item === 'string')
  } catch {
    return []
  }
}

function getStoredSkillConfig(): SkillConfigStorage {
  if (typeof window === 'undefined') return {}

  const raw = window.localStorage.getItem(SKILLS_CONFIG_STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as SkillConfigStorage
  } catch {
    return {}
  }
}

export default function SkillsSetupPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [selectedSkills, setSelectedSkills] = useState<SkillOption[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({})
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  function redirectToSignIn() {
    const currentPath = typeof window === 'undefined'
      ? '/skills/setup'
      : `${window.location.pathname}${window.location.search}`
    router.replace(buildSignInPath(currentPath))
  }

  const selectedCount = useMemo(() => selectedSkills.length, [selectedSkills.length])

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const session = await getRecoveredSupabaseSession()
        if (!session) {
          redirectToSignIn()
          return
        }

        const complete = await isOnboardingComplete(session, { backfillFromProvisionedTenant: true })
        if (complete) {
          router.replace('/chat')
          return
        }

        const storedSkillIds = getStoredSkillIds()
        const effectiveSkillIds = getEffectiveSkillIds(storedSkillIds)
        const resolvedSkills = effectiveSkillIds
          .map((skillId) => getSkillOptionById(skillId))
          .filter((skill): skill is SkillOption => Boolean(skill))

        if (!resolvedSkills.length) {
          router.replace('/skills')
          return
        }

        const storedConfig = getStoredSkillConfig()
        const nextFieldValues: Record<string, Record<string, string>> = {}

        for (const skill of resolvedSkills) {
          nextFieldValues[skill.id] = storedConfig[skill.id]?.values ?? {}
        }

        if (!cancelled) {
          setSelectedSkills(resolvedSkills)
          setFieldValues(nextFieldValues)
          setCheckingSession(false)
        }
      } catch {
        redirectToSignIn()
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [router])

  function onFieldChange(skillId: string, fieldId: string, value: string) {
    setFieldValues((previous) => ({
      ...previous,
      [skillId]: {
        ...(previous[skillId] ?? {}),
        [fieldId]: value,
      },
    }))
    setError('')
    setStatus('')
  }

  function saveConfig(): boolean {
    for (const skill of selectedSkills) {
      for (const field of skill.configFields ?? []) {
        if (!field.required) continue
        const value = fieldValues[skill.id]?.[field.id]?.trim()
        if (!value) {
          setError(`${skill.label}: ${field.label} required.`)
          setStatus('')
          return false
        }
      }
    }

    const nextStore: SkillConfigStorage = {}
    for (const skill of selectedSkills) {
      nextStore[skill.id] = {
        skillId: skill.id,
        values: fieldValues[skill.id] ?? {},
        updatedAt: new Date().toISOString(),
      }
    }

    window.localStorage.setItem(SKILLS_CONFIG_STORAGE_KEY, JSON.stringify(nextStore))
    setError('')
    setStatus('Saved')
    return true
  }

  function onNext() {
    const didSave = saveConfig()
    if (!didSave) return
    router.push('/dashboard/hooks')
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
            <Link href="/skills">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <CardTitle className="type-h4">ClawPilot Setup</CardTitle>
          <CardDescription>Skill setup</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-6 pb-7 md:px-10 md:pb-10">
          <div className="space-y-7">
            <p className="text-sm text-muted-foreground">{`${selectedCount} skill${selectedCount > 1 ? 's' : ''}`}</p>
            <p className="text-xs text-muted-foreground">Only fields marked with * are required.</p>

            {selectedSkills.map((skill) => (
              <section key={skill.id} className="rounded-xl border border-border/70 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{`${skill.emoji} ${skill.label}`}</h3>
                  </div>
                  <a
                    href={skill.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs font-medium text-primary hover:underline"
                  >
                    Docs
                  </a>
                </div>

                {skill.configFields?.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {skill.configFields.map((field) => (
                      <div key={`${skill.id}-${field.id}`} className="space-y-1.5">
                        <Label htmlFor={`${skill.id}-${field.id}`}>
                          {field.label}
                          {field.required ? ' *' : ''}
                        </Label>
                        <Input
                          id={`${skill.id}-${field.id}`}
                          value={fieldValues[skill.id]?.[field.id] ?? ''}
                          onChange={(event) => onFieldChange(skill.id, field.id, event.target.value)}
                          placeholder={field.placeholder}
                          type={field.inputType ?? 'text'}
                          autoComplete="off"
                        />
                        {field.description ? (
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        ) : null}
                        {field.howToGet ? (
                          <p className="text-xs text-muted-foreground">{`How to get it: ${field.howToGet}`}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No setup values required for this skill.</p>
                )}
              </section>
            ))}
          </div>

          <div className="mt-auto border-t border-border/70 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
              </div>
              <Button type="button" onClick={onNext}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
