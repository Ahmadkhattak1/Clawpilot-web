export interface ModelProviderOption {
  id: string
  label: string
  isAvailable?: boolean
  logoSrc?: string
  logoEmoji?: string
}

export const MODEL_PROVIDER_STORAGE_KEY = 'clawpilot:model-provider'
export const MODEL_PROVIDER_MODEL_STORAGE_KEY = 'clawpilot:model-provider-model'

export interface ProviderModelOption {
  id: string
  label: string
  summary: string
  isRecommended?: boolean
  supportedMethods?: readonly ('oauth' | 'api-key')[]
}

export const MODEL_PROVIDER_OPTIONS: readonly ModelProviderOption[] = [
  { id: 'anthropic', label: 'Anthropic', isAvailable: true, logoSrc: '/ai-models-logos/Anthropic_Symbol_0.svg' },
  { id: 'openai', label: 'OpenAI', isAvailable: true, logoSrc: '/ai-models-logos/openai-svgrepo-com.svg' },
  { id: 'minimax', label: 'Minimax', isAvailable: false, logoSrc: '/ai-models-logos/minimax-color.svg' },
  { id: 'moonshot', label: 'Moonshot AI', isAvailable: false, logoSrc: '/ai-models-logos/moonshot.svg' },
  { id: 'google', label: 'Gemini', isAvailable: true, logoSrc: '/ai-models-logos/google.svg' },
  { id: 'xai', label: 'xAI', isAvailable: false, logoSrc: '/ai-models-logos/xai.png' },
  { id: 'openrouter', label: 'OpenRouter', isAvailable: false, logoSrc: '/ai-models-logos/openrouter.png' },
  { id: 'qwen', label: 'Qwen', isAvailable: false, logoSrc: '/ai-models-logos/qwen.svg' },
  { id: 'z-ai', label: 'Z.AI', isAvailable: false, logoSrc: '/ai-models-logos/zai.png' },
  { id: 'copilot', label: 'Copilot', isAvailable: false, logoSrc: '/ai-models-logos/copilot-icon.svg' },
  {
    id: 'vercel-ai-gateway',
    label: 'Vercel AI Gateway',
    isAvailable: false,
    logoSrc: '/ai-models-logos/vercel-icon-svgrepo-com.svg',
  },
  { id: 'opencode-zen', label: 'Opencode Zen', isAvailable: false, logoSrc: '/ai-models-logos/opencode-logo-light.svg' },
  { id: 'xiaomi', label: 'Xiaomi', isAvailable: false, logoSrc: '/ai-models-logos/xiaomi-logo-2.svg' },
  { id: 'together-ai', label: 'Together AI', isAvailable: false, logoSrc: '/ai-models-logos/togetherai.svg' },
  { id: 'venice-ai', label: 'Venice AI', isAvailable: false, logoSrc: '/ai-models-logos/venice-logo-lockup-red.svg' },
  { id: 'litellm', label: 'LiteLLM', isAvailable: false, logoEmoji: '🚆' },
  {
    id: 'cloudflare-ai-gateway',
    label: 'Cloudflare AI Gateway',
    isAvailable: false,
    logoSrc: '/ai-models-logos/cloudflare-color.svg',
  },
  { id: 'custom-provider', label: 'Custom Provider', isAvailable: false },
] as const

export type ModelProviderId = (typeof MODEL_PROVIDER_OPTIONS)[number]['id']

export const AVAILABLE_MODEL_PROVIDER_OPTIONS = MODEL_PROVIDER_OPTIONS.filter(
  (provider) => provider.isAvailable !== false,
)

const PROVIDER_MODEL_OPTIONS: Partial<Record<ModelProviderId, readonly ProviderModelOption[]>> = {
  anthropic: [
    {
      id: 'anthropic/claude-opus-4-6',
      label: 'Claude Opus 4.6',
      summary: 'Highest quality Anthropic option for complex tasks.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'anthropic/claude-sonnet-4-5',
      label: 'Claude Sonnet 4.5',
      summary: 'Balanced speed and quality for day-to-day assistants.',
      supportedMethods: ['api-key'],
    },
    {
      id: 'anthropic/claude-haiku-4-5',
      label: 'Claude Haiku 4.5',
      summary: 'Fast Anthropic model for lightweight prompts.',
      supportedMethods: ['api-key'],
    },
  ],
  openai: [
    {
      id: 'openai/gpt-5.4',
      label: 'GPT-5.4',
      summary: 'Current OpenAI general-purpose GPT model for API key or Codex OAuth flows.',
      isRecommended: true,
      supportedMethods: ['oauth', 'api-key'],
    },
    {
      id: 'openai/gpt-5.4-pro',
      label: 'GPT-5.4 Pro',
      summary: 'Higher-tier OpenAI API model that requires API key setup.',
      supportedMethods: ['api-key'],
    },
    {
      id: 'openai/gpt-5.2',
      label: 'GPT-5.2',
      summary: 'Strong general-purpose default for reasoning and coding.',
    },
    {
      id: 'openai/gpt-5-mini',
      label: 'GPT-5 Mini',
      summary: 'Faster OpenAI option for lower-latency responses.',
    },
    {
      id: 'openai/gpt-5.1-codex',
      label: 'GPT-5.1 Codex',
      summary: 'Popular OpenAI pick for code-heavy agent workflows.',
    },
  ],
  google: [
    {
      id: 'google/gemini-3-pro-preview',
      label: 'Gemini 3 Pro (Preview)',
      summary: 'Higher-quality Gemini model for tougher prompts.',
      isRecommended: true,
    },
    {
      id: 'google/gemini-3-flash-preview',
      label: 'Gemini 3 Flash (Preview)',
      summary: 'Fast Gemini option for responsive chat use-cases.',
    },
  ],
}

const OPENCLAW_PROVIDER_IDS: Partial<Record<ModelProviderId, string>> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google: 'google',
}

export function getProviderModelOptions(providerId: string | null | undefined): readonly ProviderModelOption[] {
  if (!providerId) return []
  return PROVIDER_MODEL_OPTIONS[providerId as ModelProviderId] ?? []
}

export function isModelSupportedByProvider(
  providerId: string | null | undefined,
  modelId: string | null | undefined,
): boolean {
  if (!providerId || !modelId) return false
  return getProviderModelOptions(providerId).some((model) => model.id === modelId)
}

export function getProviderModelOption(
  providerId: string | null | undefined,
  modelId: string | null | undefined,
): ProviderModelOption | null {
  if (!providerId || !modelId) return null
  return getProviderModelOptions(providerId).find((model) => model.id === modelId) ?? null
}

export function isModelSupportedByProviderSetupMethod(
  providerId: string | null | undefined,
  modelId: string | null | undefined,
  method: 'oauth' | 'api-key',
): boolean {
  const model = getProviderModelOption(providerId, modelId)
  if (!model) return false
  return model.supportedMethods?.includes(method) ?? true
}

export function toOpenClawProviderId(providerId: string | null | undefined): string | null {
  if (!providerId) return null
  return OPENCLAW_PROVIDER_IDS[providerId as ModelProviderId] ?? providerId
}
