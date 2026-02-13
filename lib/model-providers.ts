export interface ModelProviderOption {
  id: string
  label: string
  logoSrc?: string
  logoEmoji?: string
}

export const MODEL_PROVIDER_STORAGE_KEY = 'clawpilot:model-provider'

export const MODEL_PROVIDER_OPTIONS: readonly ModelProviderOption[] = [
  { id: 'anthropic', label: 'Anthropic', logoSrc: '/ai-models-logos/Anthropic_Symbol_0.svg' },
  { id: 'openai', label: 'OpenAI', logoSrc: '/ai-models-logos/openai-svgrepo-com.svg' },
  { id: 'minimax', label: 'Minimax', logoSrc: '/ai-models-logos/minimax-color.svg' },
  { id: 'moonshot', label: 'Moonshot AI', logoSrc: '/ai-models-logos/moonshot.svg' },
  { id: 'google', label: 'Google', logoSrc: '/ai-models-logos/google.svg' },
  { id: 'xai', label: 'xAI', logoSrc: '/ai-models-logos/xai.png' },
  { id: 'openrouter', label: 'OpenRouter', logoSrc: '/ai-models-logos/openrouter.png' },
  { id: 'qwen', label: 'Qwen', logoSrc: '/ai-models-logos/qwen.svg' },
  { id: 'z-ai', label: 'Z.AI', logoSrc: '/ai-models-logos/zai.png' },
  { id: 'copilot', label: 'Copilot', logoSrc: '/ai-models-logos/copilot-icon.svg' },
  {
    id: 'vercel-ai-gateway',
    label: 'Vercel AI Gateway',
    logoSrc: '/ai-models-logos/vercel-icon-svgrepo-com.svg',
  },
  { id: 'opencode-zen', label: 'Opencode Zen', logoSrc: '/ai-models-logos/opencode-logo-light.svg' },
  { id: 'xiaomi', label: 'Xiaomi', logoSrc: '/ai-models-logos/xiaomi-logo-2.svg' },
  { id: 'together-ai', label: 'Together AI', logoSrc: '/ai-models-logos/togetherai.svg' },
  { id: 'venice-ai', label: 'Venice AI', logoSrc: '/ai-models-logos/venice-logo-lockup-red.svg' },
  { id: 'litellm', label: 'LiteLLM', logoEmoji: '🚆' },
  {
    id: 'cloudflare-ai-gateway',
    label: 'Cloudflare AI Gateway',
    logoSrc: '/ai-models-logos/cloudflare-color.svg',
  },
  { id: 'custom-provider', label: 'Custom Provider' },
] as const

export type ModelProviderId = (typeof MODEL_PROVIDER_OPTIONS)[number]['id']
