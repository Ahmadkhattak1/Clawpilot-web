export type SkillConfigInputType = 'text' | 'password' | 'url'

export interface SkillConfigField {
  id: string
  label: string
  placeholder?: string
  required?: boolean
  inputType?: SkillConfigInputType
  description?: string
  howToGet?: string
  envKeys?: readonly string[]
}

export interface SkillOption {
  id: string
  label: string
  emoji: string
  summary: string
  docsUrl: string
  requiredFromUser: readonly string[]
  configFields?: readonly SkillConfigField[]
  requiredByDefault?: boolean
}

export interface SkillConfigRecord {
  skillId: string
  values: Record<string, string>
  updatedAt: string
}

export type SkillConfigStorage = Partial<Record<string, SkillConfigRecord>>

export const SKILLS_STORAGE_KEY = 'clawpilot:skills'
export const SKILLS_SKIPPED_STORAGE_KEY = 'clawpilot:skills-skipped'
export const SKILLS_CONFIG_STORAGE_KEY = 'clawpilot:skills-config'
export const SKILLS_ALWAYS_ON = ['clawhub'] as const

function docsUrl(skillId: string) {
  return `https://clawhub.ai/skills?q=${encodeURIComponent(skillId)}`
}

export const SKILL_OPTIONS: readonly SkillOption[] = [
  {
    id: 'clawhub',
    label: 'clawhub',
    emoji: '🧩',
    summary: 'Use the ClawHub CLI to search, install, update, and publish agent skills from clawhub.com.',
    docsUrl: docsUrl('clawhub'),
    requiredByDefault: true,
    requiredFromUser: [
      'ClawHub CLI is installed by default during onboarding.',
      'Run `clawhub auth login` only if you need private skills or publishing.',
    ],
    configFields: [
      {
        id: 'clawhub_token',
        label: 'ClawHub token',
        placeholder: 'ch_...',
        inputType: 'password',
        description: 'Optional. Use only for private skills or non-interactive installs.',
        howToGet: 'Create a token in your ClawHub account settings, or use `clawhub auth login`.',
      },
    ],
  },
  {
    id: '1password',
    label: '1password',
    emoji: '🔐',
    summary:
      'Set up and use 1Password CLI (op). Use when installing the CLI, enabling desktop app integration, signing in (single or multi-account), or reading/injecting/running secrets via op.',
    docsUrl: docsUrl('1password'),
    requiredFromUser: [
      '1Password desktop app and `op` CLI installed.',
      'Run `op signin` once in terminal to authorize this machine.',
      'Access to target vaults/items.',
    ],
  },
  {
    id: 'blogwatcher',
    label: 'blogwatcher',
    emoji: '📰',
    summary: 'Monitor blogs and RSS/Atom feeds for updates using the blogwatcher CLI.',
    docsUrl: docsUrl('blogwatcher'),
    requiredFromUser: [
      'blogwatcher CLI installed.',
      'Add feeds with `blogwatcher add "<name>" <feed-url>`.',
    ],
  },
  {
    id: 'blucli',
    label: 'blucli',
    emoji: '🫐',
    summary: 'BluOS CLI (blu) for discovery, playback, grouping, and volume.',
    docsUrl: docsUrl('blucli'),
    requiredFromUser: [
      'blu CLI installed.',
      'BluOS device reachable on local network.',
    ],
  },
  {
    id: 'camsnap',
    label: 'camsnap',
    emoji: '📸',
    summary: 'Capture frames or clips from RTSP/ONVIF cameras.',
    docsUrl: docsUrl('camsnap'),
    requiredFromUser: [
      'camsnap installed (and `ffmpeg` available on PATH).',
      'Run `camsnap add ...` once to store camera credentials in local config.',
    ],
  },
  {
    id: 'eightctl',
    label: 'eightctl',
    emoji: '🎛️',
    summary: 'Control Eight Sleep pods (status, temperature, alarms, schedules).',
    docsUrl: docsUrl('eightctl'),
    requiredFromUser: ['eightctl installed.', 'Eight Sleep account credentials/session.'],
    configFields: [
      {
        id: 'email',
        label: 'Eight Sleep email',
        placeholder: 'you@example.com',
        required: true,
        description: 'Account email used by eightctl authentication.',
        envKeys: ['EIGHTCTL_EMAIL'],
      },
      {
        id: 'password',
        label: 'Eight Sleep password',
        placeholder: 'Account password',
        required: true,
        inputType: 'password',
        description: 'Account password used by eightctl authentication.',
        howToGet: 'Use your normal Eight Sleep app credentials.',
        envKeys: ['EIGHTCTL_PASSWORD'],
      },
    ],
  },
  {
    id: 'gemini',
    label: 'gemini',
    emoji: '♊️',
    summary: 'Gemini CLI for one-shot Q&A, summaries, and generation.',
    docsUrl: docsUrl('gemini'),
    requiredFromUser: [
      'Gemini CLI installed.',
      'Run `gemini` once interactively and complete the login flow when prompted.',
    ],
  },
  {
    id: 'gifgrep',
    label: 'gifgrep',
    emoji: '🧲',
    summary: 'Search GIF providers with CLI/TUI, download results, and extract stills/sheets.',
    docsUrl: docsUrl('gifgrep'),
    requiredFromUser: ['gifgrep installed.', 'Optional provider key for higher limits.'],
    configFields: [
      {
        id: 'default_provider',
        label: 'Default provider',
        placeholder: 'auto | tenor | giphy',
        description: 'Optional. Leave empty to use auto mode.',
      },
      {
        id: 'giphy_api_key',
        label: 'GIPHY API key',
        placeholder: 'giphy_...',
        inputType: 'password',
        description: 'Required only when you force `--source giphy`.',
        howToGet: 'Create an app in GIPHY Developers and copy its API key.',
        envKeys: ['GIPHY_API_KEY'],
      },
      {
        id: 'tenor_api_key',
        label: 'Tenor API key',
        placeholder: 'tenor_...',
        inputType: 'password',
        description: 'Optional. Tenor demo key is used when unset.',
        howToGet: 'Request a Tenor API key from Google/Tenor developer access.',
        envKeys: ['TENOR_API_KEY'],
      },
    ],
  },
  {
    id: 'github',
    label: 'github',
    emoji: '🐙',
    summary:
      'Interact with GitHub using the `gh` CLI. Use `gh issue`, `gh pr`, `gh run`, and `gh api` for issues, PRs, CI runs, and advanced queries.',
    docsUrl: docsUrl('github'),
    requiredFromUser: [
      'gh CLI installed.',
      'Authenticate with `gh auth login` (token is optional for non-interactive usage).',
    ],
    configFields: [
      {
        id: 'github_token',
        label: 'GitHub token',
        placeholder: 'ghp_...',
        inputType: 'password',
        description: 'Optional. Useful for CI/headless setups instead of `gh auth login`.',
        howToGet: 'GitHub -> Settings -> Developer settings -> Personal access tokens.',
        envKeys: ['GITHUB_TOKEN'],
      },
      {
        id: 'github_host',
        label: 'GitHub host',
        placeholder: 'github.com',
        description: 'Optional. Only set for GitHub Enterprise Server.',
      },
    ],
  },
  {
    id: 'gog',
    label: 'gog',
    emoji: '🎮',
    summary: 'Google Workspace CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs.',
    docsUrl: docsUrl('gog'),
    requiredFromUser: [
      'gog CLI installed.',
      'Run `gog auth credentials <client_secret.json>` and `gog auth add <email>` once.',
    ],
    configFields: [
      {
        id: 'gog_account',
        label: 'Default Google account',
        placeholder: 'you@example.com',
        description: 'Optional. Sets default account (same as `GOG_ACCOUNT`).',
        envKeys: ['GOG_ACCOUNT'],
      },
    ],
  },
  {
    id: 'goplaces',
    label: 'goplaces',
    emoji: '📍',
    summary:
      'Query Google Places API (New) via the goplaces CLI for text search, place details, resolve, and reviews. Use for human-friendly place lookup or JSON output for scripts.',
    docsUrl: docsUrl('goplaces'),
    requiredFromUser: ['goplaces CLI installed.', 'Google Places API key with Places API enabled.'],
    configFields: [
      {
        id: 'google_places_api_key',
        label: 'Google Places API key',
        placeholder: 'AIza...',
        required: true,
        inputType: 'password',
        description: 'Required by goplaces for all API calls.',
        howToGet: 'Google Cloud Console -> APIs & Services -> Credentials -> Create API key, then enable Places API (New).',
        envKeys: ['GOOGLE_PLACES_API_KEY'],
      },
    ],
  },
  {
    id: 'himalaya',
    label: 'himalaya',
    emoji: '📧',
    summary:
      'CLI to manage emails via IMAP/SMTP. Use `himalaya` to list, read, write, reply, forward, search, and organize emails from the terminal. Supports multiple accounts and message composition with MML (MIME Meta Language).',
    docsUrl: docsUrl('himalaya'),
    requiredFromUser: ['himalaya CLI installed.', 'Mailbox IMAP/SMTP settings and credentials.'],
    configFields: [
      {
        id: 'email',
        label: 'Email address',
        placeholder: 'you@example.com',
        required: true,
        description: 'Mailbox identity for Himalaya account config.',
      },
      {
        id: 'imap_host',
        label: 'IMAP host',
        placeholder: 'imap.example.com',
        required: true,
        description: 'Incoming mail host from your email provider settings.',
      },
      {
        id: 'smtp_host',
        label: 'SMTP host',
        placeholder: 'smtp.example.com',
        required: true,
        description: 'Outgoing mail host from your email provider settings.',
      },
      {
        id: 'app_password',
        label: 'App password',
        placeholder: 'App password',
        required: true,
        inputType: 'password',
        description: 'Mailbox password/app-password used by IMAP+SMTP.',
        howToGet: 'Generate an app password in your mail provider security settings (for example Gmail App Passwords).',
      },
    ],
  },
  {
    id: 'mcporter',
    label: 'mcporter',
    emoji: '📦',
    summary:
      'Use the mcporter CLI to list, configure, auth, and call MCP servers/tools directly (HTTP or stdio), including ad-hoc servers, config edits, and CLI/type generation.',
    docsUrl: docsUrl('mcporter'),
    requiredFromUser: [
      'mcporter CLI installed.',
      'Configure server auth/endpoints with `mcporter config ...` or `mcporter auth ...`.',
    ],
  },
  {
    id: 'nano-banana-pro',
    label: 'nano-banana-pro',
    emoji: '🍌',
    summary:
      'Generate/edit images with Nano Banana Pro (Gemini 3 Pro Image). Use for image create/modify requests incl. edits. Supports text-to-image + image-to-image; 1K/2K/4K; use --input-image.',
    docsUrl: docsUrl('nano-banana-pro'),
    requiredFromUser: ['Nano Banana Pro dependencies installed.', 'Gemini image API key/access.'],
    configFields: [
      {
        id: 'gemini_api_key',
        label: 'Gemini API key',
        placeholder: 'AIza...',
        required: true,
        inputType: 'password',
        description: 'Required unless you pass `--api-key` at runtime.',
        howToGet: 'Google AI Studio -> Get API key.',
        envKeys: ['GEMINI_API_KEY'],
      },
    ],
  },
  {
    id: 'nano-pdf',
    label: 'nano-pdf',
    emoji: '📄',
    summary: 'Edit PDFs with natural-language instructions using the nano-pdf CLI.',
    docsUrl: docsUrl('nano-pdf'),
    requiredFromUser: ['nano-pdf CLI installed.', 'Local PDF file access.'],
  },
  {
    id: 'obsidian',
    label: 'obsidian',
    emoji: '💎',
    summary: 'Work with Obsidian vaults and automate via obsidian-cli.',
    docsUrl: docsUrl('obsidian'),
    requiredFromUser: ['obsidian-cli installed.', 'Vault path available on this machine.'],
    configFields: [
      {
        id: 'vault_path',
        label: 'Vault path',
        placeholder: '/Users/name/Obsidian/Vault',
        description: 'Optional if you already set a default via `obsidian-cli set-default`.',
      },
    ],
  },
  {
    id: 'openai-image-gen',
    label: 'openai-image-gen',
    emoji: '🖼️',
    summary: 'Batch-generate images via OpenAI Images API.',
    docsUrl: docsUrl('openai-image-gen'),
    requiredFromUser: ['OpenAI Images API enabled.', 'OpenAI API key.'],
    configFields: [
      {
        id: 'openai_api_key',
        label: 'OpenAI API key',
        placeholder: 'sk-...',
        required: true,
        inputType: 'password',
        description: 'Required by openai-image-gen skill.',
        howToGet: 'OpenAI dashboard -> API keys.',
        envKeys: ['OPENAI_API_KEY'],
      },
      {
        id: 'model',
        label: 'Image model',
        placeholder: 'gpt-image-1',
        description: 'Optional model override.',
      },
    ],
  },
  {
    id: 'openai-whisper',
    label: 'openai-whisper',
    emoji: '🎙️',
    summary: 'Local speech-to-text with the Whisper CLI (no API key).',
    docsUrl: docsUrl('openai-whisper'),
    requiredFromUser: ['Whisper CLI installed locally.', 'Audio input files available.'],
  },
  {
    id: 'openhue',
    label: 'openhue',
    emoji: '💡',
    summary: 'Control Philips Hue lights/scenes via the OpenHue CLI.',
    docsUrl: docsUrl('openhue'),
    requiredFromUser: [
      'OpenHue CLI installed.',
      'Run `openhue setup` and press the Hue bridge button when prompted.',
    ],
  },
  {
    id: 'oracle',
    label: 'oracle',
    emoji: '🧿',
    summary:
      'Use the @steipete/oracle CLI to bundle a prompt plus the right files and get a second-model review (API or browser) for debugging, refactors, design checks, or cross-validation.',
    docsUrl: docsUrl('oracle'),
    requiredFromUser: [
      'Node.js + npx available to run Oracle.',
      'Browser mode works without API keys; API mode needs provider API keys.',
    ],
    configFields: [
      {
        id: 'openai_api_key',
        label: 'OpenAI API key',
        placeholder: 'sk-...',
        inputType: 'password',
        description: 'Optional. Needed only when using `oracle --engine api` with OpenAI.',
        howToGet: 'OpenAI dashboard -> API keys.',
        envKeys: ['OPENAI_API_KEY'],
      },
    ],
  },
  {
    id: 'ordercli',
    label: 'ordercli',
    emoji: '🛵',
    summary: 'Foodora-only CLI for checking past orders and active order status.',
    docsUrl: docsUrl('ordercli'),
    requiredFromUser: [
      'ordercli installed.',
      'Run `ordercli foodora login ...` once to create an authenticated session.',
    ],
  },
  {
    id: 'sag',
    label: 'sag',
    emoji: '🗣️',
    summary: 'ElevenLabs text-to-speech with mac-style say UX.',
    docsUrl: docsUrl('sag'),
    requiredFromUser: ['sag installed.', 'ElevenLabs API key and optional voice ID.'],
    configFields: [
      {
        id: 'elevenlabs_api_key',
        label: 'ElevenLabs API key',
        placeholder: 'API key',
        required: true,
        inputType: 'password',
        description: 'Required for all sag TTS calls.',
        howToGet: 'ElevenLabs dashboard -> Profile/Settings -> API Keys.',
        envKeys: ['ELEVENLABS_API_KEY', 'SAG_API_KEY'],
      },
      {
        id: 'voice_id',
        label: 'Default voice ID',
        placeholder: '21m00Tcm4TlvDq8ikWAM',
        description: 'Optional. Leave empty to use CLI default voice.',
        howToGet: 'Open the voice in ElevenLabs and copy its Voice ID.',
        envKeys: ['ELEVENLABS_VOICE_ID', 'SAG_VOICE_ID'],
      },
    ],
  },
  {
    id: 'songsee',
    label: 'songsee',
    emoji: '🌊',
    summary: 'Generate spectrograms and feature-panel visualizations from audio with the songsee CLI.',
    docsUrl: docsUrl('songsee'),
    requiredFromUser: ['songsee CLI installed.', 'Audio files available for analysis.'],
  },
  {
    id: 'sonoscli',
    label: 'sonoscli',
    emoji: '🔊',
    summary: 'Control Sonos speakers (discover/status/play/volume/group).',
    docsUrl: docsUrl('sonoscli'),
    requiredFromUser: ['sonoscli installed.', 'Sonos speakers discoverable on local network.'],
    configFields: [
      {
        id: 'speaker_ip',
        label: 'Preferred speaker IP',
        placeholder: '192.168.1.55',
        description: 'Optional. Only needed if SSDP discovery is unreliable.',
      },
      {
        id: 'spotify_client_id',
        label: 'Spotify client ID',
        placeholder: 'spotify-client-id',
        description: 'Optional. Needed only for Spotify Web API search features.',
        howToGet: 'Spotify Developer Dashboard -> create app -> copy Client ID.',
        envKeys: ['SPOTIFY_CLIENT_ID'],
      },
      {
        id: 'spotify_client_secret',
        label: 'Spotify client secret',
        placeholder: 'spotify-client-secret',
        inputType: 'password',
        description: 'Optional. Needed only for Spotify Web API search features.',
        howToGet: 'Spotify Developer Dashboard -> create app -> copy Client Secret.',
        envKeys: ['SPOTIFY_CLIENT_SECRET'],
      },
    ],
  },
  {
    id: 'summarize',
    label: 'summarize',
    emoji: '🧾',
    summary: 'Summarize URLs or files with the summarize CLI (web, PDFs, images, audio, YouTube).',
    docsUrl: docsUrl('summarize'),
    requiredFromUser: ['summarize CLI installed.', 'Optional API key if using hosted model providers.'],
    configFields: [
      {
        id: 'provider',
        label: 'Default provider',
        placeholder: 'google | openai | anthropic | xai',
        description: 'Optional. Leave empty to use summarize CLI defaults.',
      },
      {
        id: 'provider_api_key',
        label: 'Provider API key',
        placeholder: 'API key',
        inputType: 'password',
        description: 'Optional. Needed only when your selected provider requires a key.',
        howToGet: 'Use the provider dashboard for your chosen model (for example OpenAI, Anthropic, xAI, or Google Gemini).',
      },
    ],
  },
  {
    id: 'video-frames',
    label: 'video-frames',
    emoji: '🎞️',
    summary: 'Extract frames or short clips from videos using ffmpeg.',
    docsUrl: docsUrl('video-frames'),
    requiredFromUser: ['ffmpeg installed.', 'Local video files available.'],
  },
  {
    id: 'wacli',
    label: 'wacli',
    emoji: '📱',
    summary: 'Send WhatsApp messages to other people or search/sync WhatsApp history via the wacli CLI (not for normal user chats).',
    docsUrl: docsUrl('wacli'),
    requiredFromUser: [
      'wacli installed.',
      'Linked WhatsApp device/session set up locally before using this skill.',
    ],
  },
] as const

const SKILL_IDS_SET = new Set<string>(SKILL_OPTIONS.map((skill) => skill.id))
const ALWAYS_ON_IDS_SET = new Set<string>(SKILLS_ALWAYS_ON)

export const SKILL_SELECTION_OPTIONS: readonly SkillOption[] = SKILL_OPTIONS.filter(
  (skill) => !skill.requiredByDefault,
)

export function getSkillOptionById(skillId: string) {
  return SKILL_OPTIONS.find((skill) => skill.id === skillId) ?? null
}

export function getEffectiveSkillIds(selectedSkillIds: readonly string[]) {
  const merged = [...SKILLS_ALWAYS_ON, ...selectedSkillIds]
  return Array.from(new Set(merged)).filter((skillId) => SKILL_IDS_SET.has(skillId))
}

export function filterSelectableSkillIds(skillIds: readonly string[]) {
  return skillIds.filter((skillId) => SKILL_IDS_SET.has(skillId) && !ALWAYS_ON_IDS_SET.has(skillId))
}
