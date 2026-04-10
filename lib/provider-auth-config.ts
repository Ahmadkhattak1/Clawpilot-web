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
    oauthHint: 'Use OpenAI OAuth for Codex, or an API key for direct OpenAI models.',
  },
  google: {
    methods: ['api-key'],
    apiKeyLabel: 'Google Gemini API key',
    apiKeyPlaceholder: 'AIza...',
  },
  openrouter: {
    methods: ['api-key'],
    apiKeyLabel: 'OpenRouter API key',
    apiKeyPlaceholder: 'sk-or-...',
  },
  qwen: {
    methods: ['api-key'],
    apiKeyLabel: 'Qwen API key',
  },
  zai: {
    methods: ['api-key'],
    apiKeyLabel: 'Z.AI API key',
  },
  xai: {
    methods: ['api-key'],
    apiKeyLabel: 'xAI API key',
  },
  deepseek: {
    methods: ['api-key'],
    apiKeyLabel: 'DeepSeek API key',
  },
  groq: {
    methods: ['api-key'],
    apiKeyLabel: 'Groq API key',
    apiKeyPlaceholder: 'gsk_...',
  },
  mistral: {
    methods: ['api-key'],
    apiKeyLabel: 'Mistral API key',
  },
  qianfan: {
    methods: ['api-key'],
    apiKeyLabel: 'Qianfan API key',
    apiKeyPlaceholder: 'bce-v3/ALTAK-...',
  },
  moonshot: {
    methods: ['api-key'],
    apiKeyLabel: 'Moonshot API key',
  },
  kimi: {
    methods: ['api-key'],
    apiKeyLabel: 'Kimi API key',
  },
  together: {
    methods: ['api-key'],
    apiKeyLabel: 'Together API key',
  },
  venice: {
    methods: ['api-key'],
    apiKeyLabel: 'Venice API key',
    apiKeyPlaceholder: 'vapi_...',
  },
  'vercel-ai-gateway': {
    methods: ['api-key'],
    apiKeyLabel: 'Vercel AI Gateway API key',
  },
  'cloudflare-ai-gateway': {
    methods: ['api-key'],
    apiKeyLabel: 'Cloudflare AI Gateway API key',
  },
  kilocode: {
    methods: ['api-key'],
    apiKeyLabel: 'Kilo Gateway API key',
  },
  opencode: {
    methods: ['api-key'],
    apiKeyLabel: 'OpenCode API key',
  },
  'opencode-go': {
    methods: ['api-key'],
    apiKeyLabel: 'OpenCode API key',
  },
  synthetic: {
    methods: ['api-key'],
    apiKeyLabel: 'Synthetic API key',
  },
  stepfun: {
    methods: ['api-key'],
    apiKeyLabel: 'StepFun API key',
  },
  'stepfun-plan': {
    methods: ['api-key'],
    apiKeyLabel: 'StepFun API key',
  },
  xiaomi: {
    methods: ['api-key'],
    apiKeyLabel: 'Xiaomi API key',
  },
  fireworks: {
    methods: ['api-key'],
    apiKeyLabel: 'Fireworks API key',
  },
  chutes: {
    methods: ['api-key'],
    apiKeyLabel: 'Chutes API key',
  },
  minimax: {
    methods: ['api-key'],
    apiKeyLabel: 'MiniMax API key',
  },
  copilot: {
    methods: ['oauth', 'api-key'],
    apiKeyLabel: 'GitHub Copilot token / key',
  },
  litellm: {
    methods: ['api-key'],
    apiKeyLabel: 'LiteLLM API key',
  },
  'custom-provider': {
    methods: ['api-key'],
    apiKeyLabel: 'Custom provider API key',
    apiKeyOptional: true,
    apiKeyPlaceholder: 'Optional',
  },
}
