export type SkillConfigInputType = 'text' | 'password' | 'url'

export interface SkillConfigField {
  id: string
  label: string
  placeholder?: string
  required?: boolean
  inputType?: SkillConfigInputType
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
      'Sign in only if you need private skills or publishing.',
    ],
    configFields: [{ id: 'clawhub_token', label: 'ClawHub token (optional)', placeholder: 'ch_...', inputType: 'password' }],
  },
  {
    id: '1password',
    label: '1password',
    emoji: '🔐',
    summary:
      'Set up and use 1Password CLI (op). Use when installing the CLI, enabling desktop app integration, signing in (single or multi-account), or reading/injecting/running secrets via op.',
    docsUrl: docsUrl('1password'),
    requiredFromUser: ['1Password app + op CLI installed and signed in.', 'Access to target vaults/items.'],
    configFields: [
      { id: 'account', label: 'Account shorthand', placeholder: 'my.1password.com' },
      { id: 'default_vault', label: 'Default vault', placeholder: 'Engineering' },
    ],
  },
  {
    id: 'blogwatcher',
    label: 'blogwatcher',
    emoji: '📰',
    summary: 'Monitor blogs and RSS/Atom feeds for updates using the blogwatcher CLI.',
    docsUrl: docsUrl('blogwatcher'),
    requiredFromUser: ['blogwatcher CLI installed.', 'At least one RSS/Atom feed URL.'],
    configFields: [
      { id: 'feed_urls', label: 'Feed URLs', placeholder: 'https://site.com/rss, https://blog.com/feed', required: true },
      { id: 'poll_minutes', label: 'Polling interval (minutes)', placeholder: '30' },
    ],
  },
  {
    id: 'blucli',
    label: 'blucli',
    emoji: '🫐',
    summary: 'BluOS CLI (blu) for discovery, playback, grouping, and volume.',
    docsUrl: docsUrl('blucli'),
    requiredFromUser: ['blucli installed.', 'BluOS device reachable on local network.'],
    configFields: [
      { id: 'player_host', label: 'Player host/IP', placeholder: '192.168.1.20', required: true },
      { id: 'zone', label: 'Default zone', placeholder: 'Living Room' },
    ],
  },
  {
    id: 'camsnap',
    label: 'camsnap',
    emoji: '📸',
    summary: 'Capture frames or clips from RTSP/ONVIF cameras.',
    docsUrl: docsUrl('camsnap'),
    requiredFromUser: ['camsnap + ffmpeg installed.', 'Camera stream URL and credentials (if protected).'],
    configFields: [
      { id: 'camera_url', label: 'RTSP/ONVIF URL', placeholder: 'rtsp://camera.local/stream', required: true, inputType: 'url' },
      { id: 'camera_username', label: 'Camera username', placeholder: 'admin' },
      { id: 'camera_password', label: 'Camera password', placeholder: 'Password', inputType: 'password' },
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
      { id: 'email', label: 'Eight Sleep email', placeholder: 'you@example.com', required: true },
      { id: 'password', label: 'Eight Sleep password', placeholder: 'Password', required: true, inputType: 'password' },
    ],
  },
  {
    id: 'gemini',
    label: 'gemini',
    emoji: '♊️',
    summary: 'Gemini CLI for one-shot Q&A, summaries, and generation.',
    docsUrl: docsUrl('gemini'),
    requiredFromUser: ['Gemini CLI installed.', 'Gemini API access token/key.'],
    configFields: [{ id: 'gemini_api_key', label: 'Gemini API key', placeholder: 'AIza...', required: true, inputType: 'password' }],
  },
  {
    id: 'gifgrep',
    label: 'gifgrep',
    emoji: '🧲',
    summary: 'Search GIF providers with CLI/TUI, download results, and extract stills/sheets.',
    docsUrl: docsUrl('gifgrep'),
    requiredFromUser: ['gifgrep installed.', 'Optional provider key for higher limits.'],
    configFields: [
      { id: 'provider', label: 'GIF provider', placeholder: 'giphy | tenor' },
      { id: 'provider_api_key', label: 'Provider API key (optional)', placeholder: 'API key', inputType: 'password' },
    ],
  },
  {
    id: 'github',
    label: 'github',
    emoji: '🐙',
    summary:
      'Interact with GitHub using the `gh` CLI. Use `gh issue`, `gh pr`, `gh run`, and `gh api` for issues, PRs, CI runs, and advanced queries.',
    docsUrl: docsUrl('github'),
    requiredFromUser: ['gh CLI installed.', 'GitHub authentication token/session.'],
    configFields: [
      { id: 'github_token', label: 'GitHub token', placeholder: 'ghp_...', required: true, inputType: 'password' },
      { id: 'github_host', label: 'GitHub host (optional)', placeholder: 'github.com' },
    ],
  },
  {
    id: 'gog',
    label: 'gog',
    emoji: '🎮',
    summary: 'Google Workspace CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs.',
    docsUrl: docsUrl('gog'),
    requiredFromUser: ['gog CLI installed.', 'Google OAuth client credentials and refresh token.'],
    configFields: [
      { id: 'client_id', label: 'Google client ID', placeholder: '...apps.googleusercontent.com', required: true },
      { id: 'client_secret', label: 'Google client secret', placeholder: 'Secret', required: true, inputType: 'password' },
      { id: 'refresh_token', label: 'Google refresh token', placeholder: '1//0...', required: true, inputType: 'password' },
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
    configFields: [{ id: 'google_places_api_key', label: 'Google Places API key', placeholder: 'AIza...', required: true, inputType: 'password' }],
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
      { id: 'email', label: 'Email address', placeholder: 'you@example.com', required: true },
      { id: 'imap_host', label: 'IMAP host', placeholder: 'imap.example.com', required: true },
      { id: 'smtp_host', label: 'SMTP host', placeholder: 'smtp.example.com', required: true },
      { id: 'app_password', label: 'App password', placeholder: 'App password', required: true, inputType: 'password' },
    ],
  },
  {
    id: 'mcporter',
    label: 'mcporter',
    emoji: '📦',
    summary:
      'Use the mcporter CLI to list, configure, auth, and call MCP servers/tools directly (HTTP or stdio), including ad-hoc servers, config edits, and CLI/type generation.',
    docsUrl: docsUrl('mcporter'),
    requiredFromUser: ['mcporter CLI installed.', 'At least one MCP server endpoint or local config path.'],
    configFields: [
      { id: 'default_server_url', label: 'Default MCP server URL', placeholder: 'https://mcp.example.com', inputType: 'url' },
      { id: 'server_token', label: 'MCP server token (optional)', placeholder: 'Token', inputType: 'password' },
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
      { id: 'gemini_api_key', label: 'Gemini API key', placeholder: 'AIza...', required: true, inputType: 'password' },
      { id: 'default_size', label: 'Default image size', placeholder: '1024x1024' },
    ],
  },
  {
    id: 'nano-pdf',
    label: 'nano-pdf',
    emoji: '📄',
    summary: 'Edit PDFs with natural-language instructions using the nano-pdf CLI.',
    docsUrl: docsUrl('nano-pdf'),
    requiredFromUser: ['nano-pdf CLI installed.', 'Local PDF file access.'],
    configFields: [{ id: 'output_dir', label: 'Default output folder', placeholder: '/path/to/output' }],
  },
  {
    id: 'obsidian',
    label: 'obsidian',
    emoji: '💎',
    summary: 'Work with Obsidian vaults and automate via obsidian-cli.',
    docsUrl: docsUrl('obsidian'),
    requiredFromUser: ['obsidian-cli installed.', 'Vault path available on this machine.'],
    configFields: [{ id: 'vault_path', label: 'Vault path', placeholder: '/Users/name/Obsidian/Vault', required: true }],
  },
  {
    id: 'openai-image-gen',
    label: 'openai-image-gen',
    emoji: '🖼️',
    summary: 'Batch-generate images via OpenAI Images API.',
    docsUrl: docsUrl('openai-image-gen'),
    requiredFromUser: ['OpenAI Images API enabled.', 'OpenAI API key.'],
    configFields: [
      { id: 'openai_api_key', label: 'OpenAI API key', placeholder: 'sk-...', required: true, inputType: 'password' },
      { id: 'model', label: 'Image model', placeholder: 'gpt-image-1' },
    ],
  },
  {
    id: 'openai-whisper',
    label: 'openai-whisper',
    emoji: '🎙️',
    summary: 'Local speech-to-text with the Whisper CLI (no API key).',
    docsUrl: docsUrl('openai-whisper'),
    requiredFromUser: ['Whisper CLI installed locally.', 'Audio input files available.'],
    configFields: [{ id: 'model_size', label: 'Whisper model size', placeholder: 'base | small | medium | large' }],
  },
  {
    id: 'openhue',
    label: 'openhue',
    emoji: '💡',
    summary: 'Control Philips Hue lights/scenes via the OpenHue CLI.',
    docsUrl: docsUrl('openhue'),
    requiredFromUser: ['OpenHue CLI installed.', 'Hue bridge IP and app key/token.'],
    configFields: [
      { id: 'bridge_ip', label: 'Hue bridge IP', placeholder: '192.168.1.40', required: true },
      { id: 'bridge_key', label: 'Hue bridge key', placeholder: 'Bridge key', required: true, inputType: 'password' },
    ],
  },
  {
    id: 'oracle',
    label: 'oracle',
    emoji: '🧿',
    summary:
      'Use the @steipete/oracle CLI to bundle a prompt plus the right files and get a second-model review (API or browser) for debugging, refactors, design checks, or cross-validation.',
    docsUrl: docsUrl('oracle'),
    requiredFromUser: ['oracle CLI installed.', 'Provider credentials for whichever model backend you use.'],
    configFields: [
      { id: 'provider', label: 'Oracle provider', placeholder: 'openai | anthropic | gemini', required: true },
      { id: 'provider_api_key', label: 'Provider API key', placeholder: 'API key', required: true, inputType: 'password' },
    ],
  },
  {
    id: 'ordercli',
    label: 'ordercli',
    emoji: '🛵',
    summary: 'Foodora-only CLI for checking past orders and active order status.',
    docsUrl: docsUrl('ordercli'),
    requiredFromUser: ['ordercli installed.', 'Foodora account access.'],
    configFields: [
      { id: 'email', label: 'Foodora email', placeholder: 'you@example.com', required: true },
      { id: 'session_token', label: 'Session token (optional)', placeholder: 'Token', inputType: 'password' },
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
      { id: 'elevenlabs_api_key', label: 'ElevenLabs API key', placeholder: 'API key', required: true, inputType: 'password' },
      { id: 'voice_id', label: 'Voice ID (optional)', placeholder: '21m00Tcm4TlvDq8ikWAM' },
    ],
  },
  {
    id: 'songsee',
    label: 'songsee',
    emoji: '🌊',
    summary: 'Generate spectrograms and feature-panel visualizations from audio with the songsee CLI.',
    docsUrl: docsUrl('songsee'),
    requiredFromUser: ['songsee CLI installed.', 'Audio files available for analysis.'],
    configFields: [{ id: 'sample_rate', label: 'Default sample rate (optional)', placeholder: '44100' }],
  },
  {
    id: 'sonoscli',
    label: 'sonoscli',
    emoji: '🔊',
    summary: 'Control Sonos speakers (discover/status/play/volume/group).',
    docsUrl: docsUrl('sonoscli'),
    requiredFromUser: ['sonoscli installed.', 'Sonos speakers discoverable on local network.'],
    configFields: [{ id: 'speaker_ip', label: 'Preferred speaker IP (optional)', placeholder: '192.168.1.55' }],
  },
  {
    id: 'summarize',
    label: 'summarize',
    emoji: '🧾',
    summary: 'Summarize URLs or files with the summarize CLI (web, PDFs, images, audio, YouTube).',
    docsUrl: docsUrl('summarize'),
    requiredFromUser: ['summarize CLI installed.', 'Optional API key if using hosted model providers.'],
    configFields: [
      { id: 'provider', label: 'Default provider (optional)', placeholder: 'openai | anthropic | local' },
      { id: 'provider_api_key', label: 'Provider API key (optional)', placeholder: 'API key', inputType: 'password' },
    ],
  },
  {
    id: 'video-frames',
    label: 'video-frames',
    emoji: '🎞️',
    summary: 'Extract frames or short clips from videos using ffmpeg.',
    docsUrl: docsUrl('video-frames'),
    requiredFromUser: ['ffmpeg installed.', 'Local video files available.'],
    configFields: [{ id: 'ffmpeg_path', label: 'ffmpeg path (optional)', placeholder: '/usr/local/bin/ffmpeg' }],
  },
  {
    id: 'wacli',
    label: 'wacli',
    emoji: '📱',
    summary: 'Send WhatsApp messages to other people or search/sync WhatsApp history via the wacli CLI (not for normal user chats).',
    docsUrl: docsUrl('wacli'),
    requiredFromUser: ['wacli installed.', 'Linked WhatsApp device/session for CLI usage.'],
    configFields: [
      { id: 'device_name', label: 'Device name (optional)', placeholder: 'primary-phone' },
      { id: 'data_dir', label: 'Session data directory (optional)', placeholder: '/path/to/wacli-data' },
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
