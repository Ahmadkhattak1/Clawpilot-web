export interface ModelProviderOption {
  id: string
  label: string
  isAvailable?: boolean
  isHostedRuntimeAvailable?: boolean
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
  {
    id: 'anthropic',
    label: 'Anthropic',
    isAvailable: true,
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/Anthropic_Symbol_0.svg',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    isAvailable: true,
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/openai-svgrepo-com.svg',
  },
  {
    id: 'google',
    label: 'Gemini',
    isAvailable: true,
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/google.svg',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/openrouter.png',
  },
  {
    id: 'qwen',
    label: 'Qwen',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/qwen.svg',
  },
  {
    id: 'zai',
    label: 'Z.AI',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/zai.png',
  },
  {
    id: 'xai',
    label: 'xAI',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/xai.png',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    isHostedRuntimeAvailable: true,
  },
  {
    id: 'groq',
    label: 'Groq',
    isHostedRuntimeAvailable: true,
  },
  {
    id: 'mistral',
    label: 'Mistral',
    isHostedRuntimeAvailable: true,
  },
  {
    id: 'qianfan',
    label: 'Qianfan',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/baidu.svg',
  },
  {
    id: 'moonshot',
    label: 'Moonshot AI',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/moonshot.svg',
  },
  {
    id: 'kimi',
    label: 'Kimi Coding',
    isHostedRuntimeAvailable: true,
  },
  {
    id: 'together',
    label: 'Together AI',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/togetherai.svg',
  },
  {
    id: 'venice',
    label: 'Venice AI',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/venice-logo-lockup-red.svg',
  },
  {
    id: 'vercel-ai-gateway',
    label: 'Vercel AI Gateway',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/vercel-icon-svgrepo-com.svg',
  },
  {
    id: 'cloudflare-ai-gateway',
    label: 'Cloudflare AI Gateway',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/cloudflare-color.svg',
  },
  {
    id: 'kilocode',
    label: 'Kilo Gateway',
    isHostedRuntimeAvailable: true,
  },
  {
    id: 'opencode',
    label: 'OpenCode Zen',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/opencode-logo-light.svg',
  },
  {
    id: 'opencode-go',
    label: 'OpenCode Go',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/opencode-logo-light.svg',
  },
  {
    id: 'synthetic',
    label: 'Synthetic',
    isHostedRuntimeAvailable: true,
  },
  {
    id: 'stepfun',
    label: 'StepFun',
    isHostedRuntimeAvailable: true,
  },
  {
    id: 'stepfun-plan',
    label: 'StepFun Plan',
    isHostedRuntimeAvailable: true,
  },
  {
    id: 'xiaomi',
    label: 'Xiaomi',
    isHostedRuntimeAvailable: true,
    logoSrc: '/ai-models-logos/xiaomi-logo-2.svg',
  },
  {
    id: 'fireworks',
    label: 'Fireworks',
    isHostedRuntimeAvailable: true,
  },
  {
    id: 'chutes',
    label: 'Chutes',
    isHostedRuntimeAvailable: true,
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    logoSrc: '/ai-models-logos/minimax-color.svg',
  },
  {
    id: 'copilot',
    label: 'Copilot',
    logoSrc: '/ai-models-logos/copilot-icon.svg',
  },
  {
    id: 'litellm',
    label: 'LiteLLM',
    logoEmoji: 'LL',
  },
  {
    id: 'custom-provider',
    label: 'Custom Provider',
  },
] as const

export type ModelProviderId = (typeof MODEL_PROVIDER_OPTIONS)[number]['id']

export const AVAILABLE_MODEL_PROVIDER_OPTIONS = MODEL_PROVIDER_OPTIONS.filter(
  (provider) => provider.isAvailable === true,
)

export const HOSTED_RUNTIME_MODEL_PROVIDER_OPTIONS = MODEL_PROVIDER_OPTIONS.filter(
  (provider) => provider.isHostedRuntimeAvailable === true,
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
      summary: 'Higher-tier OpenAI API model for maximum reasoning quality.',
      supportedMethods: ['api-key'],
    },
    {
      id: 'openai/gpt-5.2',
      label: 'GPT-5.2',
      summary: 'Strong general-purpose default for reasoning and coding.',
      supportedMethods: ['api-key'],
    },
    {
      id: 'openai/gpt-5-mini',
      label: 'GPT-5 Mini',
      summary: 'Faster OpenAI option for lower-latency responses.',
      supportedMethods: ['api-key'],
    },
    {
      id: 'openai/gpt-5.1-codex',
      label: 'GPT-5.1 Codex',
      summary: 'OpenAI coding-focused model on the direct API path.',
      supportedMethods: ['api-key'],
    },
  ],
  google: [
    {
      id: 'google/gemini-3.1-pro-preview',
      label: 'Gemini 3.1 Pro (Preview)',
      summary: 'High-capability Gemini model for complex prompts.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'google/gemini-3-flash-preview',
      label: 'Gemini 3 Flash (Preview)',
      summary: 'Fast Gemini model for responsive conversations.',
      supportedMethods: ['api-key'],
    },
  ],
  openrouter: [
    {
      id: 'openrouter/auto',
      label: 'Auto',
      summary: 'OpenRouter-managed model selection with its bundled fallback catalog.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
  ],
  qwen: [
    {
      id: 'qwen/qwen3.5-plus',
      label: 'Qwen 3.5 Plus',
      summary: 'Default Qwen text model on the hosted Qwen provider surface.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'qwen/qwen3.6-plus',
      label: 'Qwen 3.6 Plus',
      summary: 'Higher-end Qwen option when the standard endpoint is required.',
      supportedMethods: ['api-key'],
    },
    {
      id: 'qwen/qwen3-coder-plus',
      label: 'Qwen 3 Coder Plus',
      summary: 'Qwen coding-focused model with large context.',
      supportedMethods: ['api-key'],
    },
  ],
  zai: [
    {
      id: 'zai/glm-5.1',
      label: 'GLM 5.1',
      summary: 'Current default Z.AI / GLM bundled model.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'zai/glm-5',
      label: 'GLM 5',
      summary: 'General-purpose GLM option on the hosted Z.AI surface.',
      supportedMethods: ['api-key'],
    },
  ],
  xai: [
    {
      id: 'xai/grok-4',
      label: 'Grok 4',
      summary: 'Default xAI text model reference on the hosted Grok provider.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'xai/grok-code-fast-1',
      label: 'Grok Code Fast 1',
      summary: 'xAI coding-oriented model for code-heavy agent work.',
      supportedMethods: ['api-key'],
    },
  ],
  deepseek: [
    {
      id: 'deepseek/deepseek-chat',
      label: 'DeepSeek Chat',
      summary: 'Default DeepSeek chat model.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'deepseek/deepseek-reasoner',
      label: 'DeepSeek Reasoner',
      summary: 'Reasoning-enabled DeepSeek model for harder tasks.',
      supportedMethods: ['api-key'],
    },
  ],
  groq: [
    {
      id: 'groq/llama-3.3-70b-versatile',
      label: 'Llama 3.3 70B Versatile',
      summary: 'Default Groq text model with fast inference and broad compatibility.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'groq/llama-3.1-8b-instant',
      label: 'Llama 3.1 8B Instant',
      summary: 'Lightweight Groq option for lower-latency chat.',
      supportedMethods: ['api-key'],
    },
  ],
  mistral: [
    {
      id: 'mistral/mistral-large-latest',
      label: 'Mistral Large Latest',
      summary: 'Default Mistral text model with broad multimodal capability.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'mistral/codestral-latest',
      label: 'Codestral Latest',
      summary: 'Mistral coding-focused model for development-heavy tasks.',
      supportedMethods: ['api-key'],
    },
  ],
  qianfan: [
    {
      id: 'qianfan/deepseek-v3.2',
      label: 'DeepSeek V3.2',
      summary: 'Default Qianfan bundled model reference.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
  ],
  moonshot: [
    {
      id: 'moonshot/kimi-k2.5',
      label: 'Kimi K2.5',
      summary: 'Default Moonshot reasoning model.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'moonshot/kimi-k2-thinking',
      label: 'Kimi K2 Thinking',
      summary: 'Moonshot reasoning-heavy variant.',
      supportedMethods: ['api-key'],
    },
  ],
  kimi: [
    {
      id: 'kimi/kimi-code',
      label: 'Kimi Code',
      summary: 'Hosted Kimi Coding model for code-first agent workflows.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
  ],
  together: [
    {
      id: 'together/moonshotai/Kimi-K2.5',
      label: 'Kimi K2.5',
      summary: 'Default Together text model with strong reasoning.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'together/deepseek-ai/DeepSeek-V3.1',
      label: 'DeepSeek V3.1',
      summary: 'Together-hosted DeepSeek option for general text tasks.',
      supportedMethods: ['api-key'],
    },
  ],
  venice: [
    {
      id: 'venice/kimi-k2-5',
      label: 'Kimi K2.5',
      summary: 'Default Venice hosted model for private reasoning plus vision.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'venice/claude-opus-4-6',
      label: 'Claude Opus 4.6',
      summary: 'Higher-end anonymized Venice route for best overall quality.',
      supportedMethods: ['api-key'],
    },
  ],
  'vercel-ai-gateway': [
    {
      id: 'vercel-ai-gateway/anthropic/claude-opus-4.6',
      label: 'Claude Opus 4.6',
      summary: 'Default starter model path through Vercel AI Gateway.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
  ],
  'cloudflare-ai-gateway': [
    {
      id: 'cloudflare-ai-gateway/claude-sonnet-4-5',
      label: 'Claude Sonnet 4.5',
      summary: 'Default Cloudflare AI Gateway starter model.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
  ],
  kilocode: [
    {
      id: 'kilocode/kilo/auto',
      label: 'Kilo Auto',
      summary: 'Default Kilo Gateway model route with upstream-managed selection.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
  ],
  opencode: [
    {
      id: 'opencode/claude-opus-4-6',
      label: 'Claude Opus 4.6',
      summary: 'Default OpenCode Zen catalog model.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'opencode/gpt-5.4',
      label: 'GPT-5.4',
      summary: 'OpenCode Zen route for GPT-5.4.',
      supportedMethods: ['api-key'],
    },
  ],
  'opencode-go': [
    {
      id: 'opencode-go/kimi-k2.5',
      label: 'Kimi K2.5',
      summary: 'Default OpenCode Go catalog model.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'opencode-go/glm-5',
      label: 'GLM 5',
      summary: 'Alternative OpenCode Go hosted model.',
      supportedMethods: ['api-key'],
    },
  ],
  synthetic: [
    {
      id: 'synthetic/hf:MiniMaxAI/MiniMax-M2.5',
      label: 'MiniMax M2.5',
      summary: 'Default Synthetic hosted model reference.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'synthetic/hf:zai-org/GLM-5',
      label: 'GLM 5',
      summary: 'Alternative Synthetic hosted GLM route.',
      supportedMethods: ['api-key'],
    },
  ],
  stepfun: [
    {
      id: 'stepfun/step-3.5-flash',
      label: 'Step 3.5 Flash',
      summary: 'Default StepFun standard model.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
  ],
  'stepfun-plan': [
    {
      id: 'stepfun-plan/step-3.5-flash',
      label: 'Step 3.5 Flash',
      summary: 'Default StepFun Plan model surface.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'stepfun-plan/step-3.5-flash-2603',
      label: 'Step 3.5 Flash 2603',
      summary: 'Alternate StepFun Plan hosted model.',
      supportedMethods: ['api-key'],
    },
  ],
  xiaomi: [
    {
      id: 'xiaomi/mimo-v2-flash',
      label: 'MiMo V2 Flash',
      summary: 'Default Xiaomi hosted model.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'xiaomi/mimo-v2-pro',
      label: 'MiMo V2 Pro',
      summary: 'Higher-capability Xiaomi reasoning model.',
      supportedMethods: ['api-key'],
    },
  ],
  fireworks: [
    {
      id: 'fireworks/accounts/fireworks/routers/kimi-k2p5-turbo',
      label: 'Kimi K2.5 Turbo',
      summary: 'Default Fireworks starter model route.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
  ],
  chutes: [
    {
      id: 'chutes/zai-org/GLM-4.7-TEE',
      label: 'GLM 4.7 TEE',
      summary: 'Default Chutes hosted model route for general text tasks.',
      isRecommended: true,
      supportedMethods: ['api-key'],
    },
    {
      id: 'chutes/deepseek-ai/DeepSeek-V3.2-TEE',
      label: 'DeepSeek V3.2 TEE',
      summary: 'Chutes route for private reasoning on DeepSeek.',
      supportedMethods: ['api-key'],
    },
  ],
}

const OPENCLAW_PROVIDER_IDS: Partial<Record<ModelProviderId, string>> = {
  anthropic: 'anthropic',
  chutes: 'chutes',
  'cloudflare-ai-gateway': 'cloudflare-ai-gateway',
  deepseek: 'deepseek',
  fireworks: 'fireworks',
  google: 'google',
  groq: 'groq',
  kimi: 'kimi',
  kilocode: 'kilocode',
  mistral: 'mistral',
  moonshot: 'moonshot',
  openai: 'openai',
  opencode: 'opencode',
  'opencode-go': 'opencode-go',
  openrouter: 'openrouter',
  qianfan: 'qianfan',
  qwen: 'qwen',
  stepfun: 'stepfun',
  'stepfun-plan': 'stepfun-plan',
  synthetic: 'synthetic',
  together: 'together',
  venice: 'venice',
  'vercel-ai-gateway': 'vercel-ai-gateway',
  xai: 'xai',
  xiaomi: 'xiaomi',
  zai: 'zai',
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
  if (!model) {
    if (providerId === 'openai') {
      return method === 'api-key' || modelId === 'openai/gpt-5.4'
    }
    return method === 'api-key'
  }
  return model.supportedMethods?.includes(method) ?? true
}

export function toOpenClawProviderId(providerId: string | null | undefined): string | null {
  if (!providerId) return null
  return OPENCLAW_PROVIDER_IDS[providerId as ModelProviderId] ?? providerId
}

export function fromOpenClawProviderId(providerId: string | null | undefined): string | null {
  if (!providerId) return null
  const normalized = providerId.trim().toLowerCase()
  if (normalized === 'openai-codex') return 'openai'
  if (normalized === 'google-gemini') return 'google'
  if (normalized === 'z-ai' || normalized === 'z.ai') return 'zai'
  if (normalized === 'together-ai') return 'together'
  if (normalized === 'venice-ai') return 'venice'
  if (normalized === 'opencode-zen') return 'opencode'
  return normalized
}

export function fromOpenClawModelId(modelId: string | null | undefined): string | null {
  if (!modelId) return null
  const normalized = modelId.trim().toLowerCase()
  if (normalized.startsWith('openai-codex/')) {
    return `openai/${normalized.slice('openai-codex/'.length)}`
  }
  if (normalized.startsWith('z-ai/')) {
    return `zai/${normalized.slice('z-ai/'.length)}`
  }
  if (normalized.startsWith('z.ai/')) {
    return `zai/${normalized.slice('z.ai/'.length)}`
  }
  return normalized
}
