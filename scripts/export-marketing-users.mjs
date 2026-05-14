import fs from "node:fs"
import path from "node:path"
import process from "node:process"

import { createClient } from "@supabase/supabase-js"

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const entries = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const delimiter = line.indexOf("=")
      if (delimiter === -1) return null

      const key = line.slice(0, delimiter).trim()
      let value = line.slice(delimiter + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      return [key, value]
    })
    .filter(Boolean)

  return Object.fromEntries(entries)
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : ""
}

function resolveDisplayName(user) {
  const metadata = user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {}
  const appMetadata = user.app_metadata && typeof user.app_metadata === "object" ? user.app_metadata : {}

  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.display_name,
    metadata.first_name && metadata.last_name ? `${metadata.first_name} ${metadata.last_name}` : "",
    appMetadata.full_name,
    appMetadata.name,
    appMetadata.display_name,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeString(candidate)
    if (normalized) return normalized
  }

  return ""
}

function escapeCsvCell(value) {
  const normalized = normalizeString(value)
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`
  }
  return normalized
}

function usersToCsv(users) {
  const lines = ["name,email"]
  for (const user of users) {
    lines.push([resolveDisplayName(user), user.email].map(escapeCsvCell).join(","))
  }
  return `${lines.join("\r\n")}\r\n`
}

const webRoot = process.cwd()
const repoRoot = path.resolve(webRoot, "..")
const backendEnv = readEnvFile(path.join(repoRoot, "clawpilot-backend", ".env.local"))
const webEnv = readEnvFile(path.join(webRoot, ".env.local"))

const supabaseUrl =
  process.env.SUPABASE_URL ??
  backendEnv.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  webEnv.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? backendEnv.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the local environment.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

const perPage = 1000
const users = []

for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
  if (error) {
    console.error(`Supabase user export failed: ${error.message}`)
    process.exit(1)
  }

  const pageUsers = data?.users ?? []
  users.push(...pageUsers)

  if (pageUsers.length < perPage) break
}

const exportableUsers = users
  .filter((user) => normalizeString(user.email))
  .sort((left, right) => normalizeString(left.email).localeCompare(normalizeString(right.email)))

const outputDir = path.join(repoRoot, "outputs")
fs.mkdirSync(outputDir, { recursive: true })

const stamp = new Date().toISOString().slice(0, 10)
const outputPath = path.join(outputDir, `marketing-users-${stamp}.csv`)
fs.writeFileSync(outputPath, usersToCsv(exportableUsers), "utf8")

const missingNameCount = exportableUsers.filter((user) => !resolveDisplayName(user)).length

console.log(JSON.stringify({
  outputPath,
  userCount: exportableUsers.length,
  missingNameCount,
}))
