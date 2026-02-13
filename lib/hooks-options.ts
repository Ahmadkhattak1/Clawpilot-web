export interface HookOption {
  id: string
  label: string
  summary: string
}

export const HOOKS_STORAGE_KEY = 'clawpilot:hooks'

export const HOOK_OPTIONS: readonly HookOption[] = [
  {
    id: 'boot-md',
    label: 'boot-md',
    summary: 'Loads boot markdown context at startup.',
  },
  {
    id: 'command-logger',
    label: 'command-logger',
    summary: 'Records executed commands for traceability.',
  },
  {
    id: 'session-memory',
    label: 'session-memory',
    summary: 'Keeps session memory available across runs.',
  },
] as const

export const HOOK_DEFAULT_IDS = HOOK_OPTIONS.map((hook) => hook.id) as readonly string[]
