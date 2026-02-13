export interface ChannelOption {
  id: string
  label: string
  logoSrc?: string
  logoEmoji?: string
  logoScale?: number
  connectsVia: string
  requiredFromUser: readonly string[]
  docsUrl: string
  setup: ChannelSetupConfig
}

export type ChannelSetupKind = 'api' | 'qr' | 'plugin' | 'cli' | 'bot-framework'

export interface ChannelSetupField {
  id: string
  label: string
  placeholder?: string
  required?: boolean
  inputType?: 'text' | 'password' | 'url'
}

export interface ChannelSetupConfig {
  kind: ChannelSetupKind
  methodLabel: string
  fields?: readonly ChannelSetupField[]
  qrHint?: string
  actionLabel?: string
}

export interface ChannelSetupRecord {
  channelId: string
  kind: ChannelSetupKind
  values: Record<string, string>
  linked?: boolean
  updatedAt: string
}

export const CHANNEL_STORAGE_KEY = 'clawpilot:channel'
export const CHANNEL_SETUP_STORAGE_KEY = 'clawpilot:channel-setup'

export type ChannelSetupStorage = Partial<Record<string, ChannelSetupRecord>>

export const CHANNEL_OPTIONS: readonly ChannelOption[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp (QR link)',
    logoSrc: '/integrations/whatsapp.svg',
    connectsVia: 'WhatsApp Web (Baileys)',
    requiredFromUser: [
      'Run channel login and scan QR',
      'Set access policy and approve first DM pairing',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/whatsapp',
    setup: {
      kind: 'qr',
      methodLabel: 'QR pairing',
      qrHint: 'Open WhatsApp on your phone and scan the QR code to link this session.',
      actionLabel: 'Mark linked',
    },
  },
  {
    id: 'telegram',
    label: 'Telegram (bot API)',
    logoSrc: '/integrations/telegram.svg',
    connectsVia: 'Telegram Bot API (grammY)',
    requiredFromUser: [
      'Create bot token in @BotFather',
      'Set bot token and approve first DM pairing',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/telegram',
    setup: {
      kind: 'api',
      methodLabel: 'Bot API token',
      fields: [{ id: 'bot_token', label: 'Bot token', placeholder: '123456:ABC...', required: true, inputType: 'password' }],
      actionLabel: 'Save token',
    },
  },
  {
    id: 'discord',
    label: 'Discord (bot API)',
    logoSrc: '/integrations/discord.svg',
    connectsVia: 'Discord Bot API + Gateway',
    requiredFromUser: [
      'Create bot in Developer Portal and enable intents',
      'Add bot token, invite bot, approve first DM pairing',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/discord',
    setup: {
      kind: 'api',
      methodLabel: 'Bot API credentials',
      fields: [
        { id: 'bot_token', label: 'Bot token', placeholder: 'Paste token', required: true, inputType: 'password' },
        { id: 'application_id', label: 'Application ID', placeholder: '1234567890', required: true },
      ],
      actionLabel: 'Save credentials',
    },
  },
  {
    id: 'slack',
    label: 'Slack (Socket Mode)',
    logoSrc: '/integrations/Slack.svg',
    logoScale: 1.52,
    connectsVia: 'Slack app (Socket Mode / Events API)',
    requiredFromUser: [
      'Create app token (xapp) and bot token (xoxb)',
      'Enable required events and install app to workspace',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/slack',
    setup: {
      kind: 'api',
      methodLabel: 'Socket Mode tokens',
      fields: [
        { id: 'app_token', label: 'App token (xapp-)', placeholder: 'xapp-...', required: true, inputType: 'password' },
        { id: 'bot_token', label: 'Bot token (xoxb-)', placeholder: 'xoxb-...', required: true, inputType: 'password' },
      ],
      actionLabel: 'Save tokens',
    },
  },
  {
    id: 'google-chat',
    label: 'Google Chat (Chat API)',
    logoSrc: '/integrations/google.svg',
    connectsVia: 'Google Chat API webhook',
    requiredFromUser: [
      'Create Google Chat app + service account JSON',
      'Expose HTTPS /googlechat webhook and set audience config',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/googlechat',
    setup: {
      kind: 'api',
      methodLabel: 'Chat API config',
      fields: [
        { id: 'service_account_json', label: 'Service account JSON', placeholder: 'Paste JSON', required: true },
        { id: 'webhook_url', label: 'Webhook URL', placeholder: 'https://...', required: true, inputType: 'url' },
      ],
      actionLabel: 'Save config',
    },
  },
  {
    id: 'mattermost',
    label: 'Mattermost (Plugin)',
    logoSrc: '/integrations/mattermost.svg',
    logoScale: 1.14,
    connectsVia: 'Mattermost Bot API + WebSocket',
    requiredFromUser: [
      'Install @openclaw/mattermost plugin',
      'Provide base URL and bot token',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/mattermost',
    setup: {
      kind: 'plugin',
      methodLabel: 'Plugin configuration',
      fields: [
        { id: 'base_url', label: 'Mattermost URL', placeholder: 'https://mattermost.example.com', required: true, inputType: 'url' },
        { id: 'bot_token', label: 'Bot token', placeholder: 'Paste token', required: true, inputType: 'password' },
      ],
      actionLabel: 'Save plugin config',
    },
  },
  {
    id: 'signal',
    label: 'Signal (Signal CLI, iMessage) [IMSG]',
    logoSrc: '/integrations/Signal.svg',
    connectsVia: 'signal-cli daemon (JSON-RPC + SSE)',
    requiredFromUser: [
      'Install signal-cli and link device',
      'Set account number + cliPath and start gateway',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/signal',
    setup: {
      kind: 'cli',
      methodLabel: 'Signal CLI setup',
      fields: [
        { id: 'account_number', label: 'Signal number', placeholder: '+1...', required: true },
        { id: 'cli_path', label: 'signal-cli path', placeholder: '/usr/local/bin/signal-cli', required: true },
      ],
      actionLabel: 'Save CLI config',
    },
  },
  {
    id: 'imessage',
    label: 'iMessage [IMSG]',
    logoSrc: '/integrations/imessage.svg',
    connectsVia: 'imsg CLI (legacy)',
    requiredFromUser: [
      'Install imsg on macOS',
      'Set cliPath + Messages chat.db path',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/imessage',
    setup: {
      kind: 'cli',
      methodLabel: 'iMessage CLI setup',
      fields: [
        { id: 'cli_path', label: 'imsg path', placeholder: '/usr/local/bin/imsg', required: true },
        { id: 'chat_db_path', label: 'Messages chat.db path', placeholder: '~/Library/Messages/chat.db', required: true },
      ],
      actionLabel: 'Save CLI config',
    },
  },
  {
    id: 'bluebubbles',
    label: 'BlueBubbles (MacOS app)',
    logoSrc: '/integrations/bluebubbles.svg',
    logoScale: 1.08,
    connectsVia: 'BlueBubbles macOS server REST',
    requiredFromUser: [
      'Run BlueBubbles app/server on macOS',
      'Provide server URL + password and set webhook',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/bluebubbles',
    setup: {
      kind: 'plugin',
      methodLabel: 'BlueBubbles server config',
      fields: [
        { id: 'server_url', label: 'Server URL', placeholder: 'https://...', required: true, inputType: 'url' },
        { id: 'password', label: 'Server password', placeholder: 'Password', required: true, inputType: 'password' },
      ],
      actionLabel: 'Save server config',
    },
  },
  {
    id: 'microsoft-teams',
    label: 'Microsoft Teams (Bot Framework)',
    logoSrc: '/integrations/microsoft-teams.svg',
    logoScale: 1.1,
    connectsVia: 'Bot Framework webhook + Teams app',
    requiredFromUser: [
      'Install @openclaw/msteams plugin and create Azure Bot credentials',
      'Upload Teams app package and point endpoint to /api/messages',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/msteams',
    setup: {
      kind: 'bot-framework',
      methodLabel: 'Bot Framework credentials',
      fields: [
        { id: 'app_id', label: 'Application (client) ID', placeholder: 'GUID', required: true },
        { id: 'app_password', label: 'Client secret', placeholder: 'Secret', required: true, inputType: 'password' },
      ],
      actionLabel: 'Save credentials',
    },
  },
  {
    id: 'line',
    label: 'LINE (Messaging API)',
    logoSrc: '/integrations/line-messenger.svg',
    connectsVia: 'LINE Messaging API webhook',
    requiredFromUser: [
      'Install @openclaw/line plugin and create Messaging API channel',
      'Provide channel access token + secret and set HTTPS webhook',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/line',
    setup: {
      kind: 'api',
      methodLabel: 'Messaging API credentials',
      fields: [
        { id: 'channel_access_token', label: 'Channel access token', placeholder: 'Paste token', required: true, inputType: 'password' },
        { id: 'channel_secret', label: 'Channel secret', placeholder: 'Paste secret', required: true, inputType: 'password' },
      ],
      actionLabel: 'Save credentials',
    },
  },
  {
    id: 'matrix',
    label: 'Matrix (Plugin)',
    logoSrc: '/integrations/matrix.svg',
    connectsVia: 'Matrix homeserver via bot SDK',
    requiredFromUser: [
      'Install @openclaw/matrix plugin',
      'Provide homeserver + access token (or user/password)',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/matrix',
    setup: {
      kind: 'plugin',
      methodLabel: 'Plugin configuration',
      fields: [
        { id: 'homeserver_url', label: 'Homeserver URL', placeholder: 'https://matrix.example.com', required: true, inputType: 'url' },
        { id: 'access_token', label: 'Access token', placeholder: 'Paste token', required: true, inputType: 'password' },
      ],
      actionLabel: 'Save plugin config',
    },
  },
  {
    id: 'tlon',
    label: 'Tlon (Orbit)',
    logoSrc: '/integrations/Urbit.svg',
    logoScale: 1.06,
    connectsVia: 'Urbit/Tlon ship API',
    requiredFromUser: [
      'Install @openclaw/tlon plugin',
      'Provide ship name, URL, and login code',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/tlon',
    setup: {
      kind: 'plugin',
      methodLabel: 'Orbit configuration',
      fields: [
        { id: 'ship_name', label: 'Ship name', placeholder: '~zod', required: true },
        { id: 'ship_url', label: 'Ship URL', placeholder: 'https://...', required: true, inputType: 'url' },
        { id: 'login_code', label: 'Login code', placeholder: 'Code', required: true, inputType: 'password' },
      ],
      actionLabel: 'Save Orbit config',
    },
  },
  {
    id: 'zalo',
    label: 'Zalo (bot API)',
    logoSrc: '/integrations/Zalo.svg',
    connectsVia: 'Zalo Bot API',
    requiredFromUser: [
      'Install @openclaw/zalo plugin',
      'Set bot token and restart gateway',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/zalo',
    setup: {
      kind: 'api',
      methodLabel: 'Bot API token',
      fields: [{ id: 'bot_token', label: 'Bot token', placeholder: 'Paste token', required: true, inputType: 'password' }],
      actionLabel: 'Save token',
    },
  },
  {
    id: 'zalo-personal',
    label: 'Zalo (Personal account)',
    logoSrc: '/integrations/Zalo.svg',
    connectsVia: 'zca-cli personal account automation',
    requiredFromUser: [
      'Install @openclaw/zalouser plugin and zca-cli',
      'Run channel login and scan QR in terminal',
    ],
    docsUrl: 'https://docs.openclaw.ai/channels/zalouser',
    setup: {
      kind: 'qr',
      methodLabel: 'Personal account QR login',
      fields: [{ id: 'zca_cli_path', label: 'zca-cli path', placeholder: '/usr/local/bin/zca-cli', required: true }],
      qrHint: 'Run channel login and scan this QR in Zalo mobile app.',
      actionLabel: 'Mark linked',
    },
  },
] as const
