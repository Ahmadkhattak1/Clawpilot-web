import type { ModelProviderId } from '@/lib/model-providers'

export type ProviderSetupMethod = 'oauth' | 'api-key'

export interface ProviderSetupConfig {
  methods: readonly ProviderSetupMethod[]
  apiKeyLabel?: string
  apiKeyPlaceholder?: string
  apiKeyOptional?: boolean
  oauthHint?: string
}

export interface ProviderSetupRecord {
  method: ProviderSetupMethod
  hasApiKey?: boolean
  apiKey?: string
  oauthConnected?: boolean
  updatedAt: string
}

export type ProviderSetupStorage = Partial<Record<ModelProviderId, ProviderSetupRecord>>

export const MODEL_PROVIDER_SETUP_STORAGE_KEY = 'clawpilot:provider-auth-setup'

export const MODEL_PROVIDER_AUTH_CONFIG: Record<ModelProviderId, ProviderSetupConfig> = {
  anthropic: {
    methods: ['api-key'],
    apiKeyLabel: 'Anthropic API key',
    apiKeyPlaceholder: 'sk-ant-...',
  },
  openai: {
    methods: ['oauth', 'api-key'],
    apiKeyLabel: 'OpenAI API key',
    apiKeyPlaceholder: 'sk-...',
    oauthHint: 'After deployment, sign in with OpenAI Code to finish setup.',
  },
  minimax: {
    methods: ['oauth', 'api-key'],
    apiKeyLabel: 'MiniMax API key',
  },
  moonshot: {
    methods: ['api-key'],
    apiKeyLabel: 'Moonshot/Kimi API key',
  },
  google: {
    methods: ['api-key'],
    apiKeyLabel: 'Google Gemini API key',
    apiKeyPlaceholder: 'AIza...',
  },
  xai: {
    methods: ['api-key'],
    apiKeyLabel: 'xAI API key',
  },
  openrouter: {
    methods: ['api-key'],
    apiKeyLabel: 'OpenRouter API key',
    apiKeyPlaceholder: 'sk-or-...',
  },
  qwen: {
    methods: ['oauth'],
    oauthHint: 'Qwen uses an OAuth/device login flow.',
  },
  'z-ai': {
    methods: ['api-key'],
    apiKeyLabel: 'Z.AI API key',
  },
  copilot: {
    methods: ['oauth', 'api-key'],
    apiKeyLabel: 'GitHub Copilot token / key',
  },
  'vercel-ai-gateway': {
    methods: ['api-key'],
    apiKeyLabel: 'Vercel AI Gateway API key',
  },
  'opencode-zen': {
    methods: ['api-key'],
    apiKeyLabel: 'OpenCode Zen API key',
  },
  xiaomi: {
    methods: ['api-key'],
    apiKeyLabel: 'Xiaomi API key',
  },
  'together-ai': {
    methods: ['api-key'],
    apiKeyLabel: 'Together AI API key',
  },
  'venice-ai': {
    methods: ['api-key'],
    apiKeyLabel: 'Venice AI API key',
  },
  litellm: {
    methods: ['api-key'],
    apiKeyLabel: 'LiteLLM API key',
  },
  'cloudflare-ai-gateway': {
    methods: ['api-key'],
    apiKeyLabel: 'Cloudflare AI Gateway API key',
  },
  'custom-provider': {
    methods: ['api-key'],
    apiKeyLabel: 'Custom provider API key',
    apiKeyOptional: true,
    apiKeyPlaceholder: 'Optional',
  },
}
