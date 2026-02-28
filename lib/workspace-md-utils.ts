export type WorkspaceFileRiskLevel = 'critical' | 'operational' | 'normal'

export interface WorkspaceFileRisk {
  level: WorkspaceFileRiskLevel
  label: string
  message: string
}

export function isValidRelativeMdPath(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) return false
  if (normalized.startsWith('/')) return false
  if (normalized.includes('..')) return false
  return /^[A-Za-z0-9._/-]+\.md$/i.test(normalized)
}

export function affectsWorkspaceHealthSummary(relativePath: string): boolean {
  const normalized = relativePath.trim().toLowerCase()
  if (!normalized) return false
  if (normalized.includes('/')) return false
  return normalized === 'memory.md' || normalized === 'boot.md' || normalized === 'agents.md'
}

export function getPathFileName(relativePath: string): string {
  const normalized = relativePath.trim()
  if (!normalized) return ''
  const segments = normalized.split('/')
  return segments[segments.length - 1] ?? normalized
}

export function isCriticalWorkspaceFile(relativePath: string): boolean {
  const normalized = relativePath.trim().toLowerCase()
  if (!normalized || normalized.includes('/')) {
    return false
  }

  return [
    'agents.md',
    'soul.md',
    'user.md',
    'identity.md',
    'tools.md',
    'heartbeat.md',
    'boot.md',
    'bootstrap.md',
    'memory.md',
  ].includes(normalized)
}

export function workspaceFileRisk(relativePath: string): WorkspaceFileRisk {
  if (isCriticalWorkspaceFile(relativePath)) {
    return {
      level: 'critical',
      label: 'Critical',
      message: 'Changing this file can alter startup behavior, memory, or core assistant behavior.',
    }
  }

  const normalized = relativePath.trim().toLowerCase()
  if (normalized.startsWith('memory/') || normalized.endsWith('/skill.md')) {
    return {
      level: 'operational',
      label: 'Operational',
      message: 'This file influences memory or skills. Changes can impact assistant quality.',
    }
  }

  return {
    level: 'normal',
    label: 'Normal',
    message: 'Standard markdown file.',
  }
}
