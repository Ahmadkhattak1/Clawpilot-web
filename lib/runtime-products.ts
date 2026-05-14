export type RuntimeKind = 'openclaw' | 'hermes'

export interface RuntimeProduct {
  id: RuntimeKind
  name: string
  shortName: string
  description: string
  logoSrc: string
  logoAlt: string
  deploymentNoun: string
  readyText: string
  startingText: string
}

export const RUNTIME_KIND_STORAGE_KEY = 'clawpilot:runtime-kind'

export const RUNTIME_GATEWAY_PORTS: Record<RuntimeKind, number> = {
  openclaw: 18789,
  hermes: 9119,
}

export const RUNTIME_PRODUCTS: readonly RuntimeProduct[] = [
  {
    id: 'openclaw',
    name: 'OpenClaw',
    shortName: 'OpenClaw',
    description: 'Hosted agent workspace with the OpenClaw gateway and control UI.',
    logoSrc: '/pfp.png',
    logoAlt: 'OpenClaw logo',
    deploymentNoun: 'OpenClaw workspace',
    readyText: 'OpenClaw is ready.',
    startingText: 'OpenClaw is starting and we are checking the connection.',
  },
  {
    id: 'hermes',
    name: 'Hermes Agent',
    shortName: 'Hermes',
    description: 'Managed Hermes Agent with dashboard, TUI chat, and API server.',
    logoSrc: '/hermesagentlogo.png',
    logoAlt: 'Hermes Agent logo',
    deploymentNoun: 'Hermes Agent machine',
    readyText: 'Hermes Agent is ready.',
    startingText: 'Hermes Agent is starting and we are checking the dashboard.',
  },
] as const

export function isRuntimeKind(value: string | null | undefined): value is RuntimeKind {
  return value === 'openclaw' || value === 'hermes'
}

export function getRuntimeProduct(runtimeKind: RuntimeKind | null | undefined): RuntimeProduct {
  return RUNTIME_PRODUCTS.find((product) => product.id === runtimeKind) ?? RUNTIME_PRODUCTS[0]
}

export function getRuntimeAgentPath(runtimeKind: RuntimeKind | null | undefined): string {
  return runtimeKind === 'hermes' ? '/dashboard/hermes' : '/dashboard/chat'
}

export function inferRuntimeKindFromGatewayPort(port: number | null | undefined): RuntimeKind | null {
  if (port === RUNTIME_GATEWAY_PORTS.hermes) return 'hermes'
  if (port === RUNTIME_GATEWAY_PORTS.openclaw) return 'openclaw'
  return null
}

export function readStoredRuntimeKind(): RuntimeKind | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(RUNTIME_KIND_STORAGE_KEY)
    return isRuntimeKind(value) ? value : null
  } catch {
    return null
  }
}

export function writeStoredRuntimeKind(runtimeKind: RuntimeKind): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RUNTIME_KIND_STORAGE_KEY, runtimeKind)
  } catch {
    // Ignore storage write failures.
  }
}
