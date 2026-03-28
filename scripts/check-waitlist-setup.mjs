import fs from "node:fs"
import path from "node:path"
import process from "node:process"

import { createClient } from "@supabase/supabase-js"

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const content = fs.readFileSync(filePath, "utf8")
  const entries = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const delimiter = line.indexOf("=")
      if (delimiter === -1) return null
      const key = line.slice(0, delimiter).trim()
      const value = line.slice(delimiter + 1).trim()
      return [key, value]
    })
    .filter(Boolean)

  return Object.fromEntries(entries)
}

const envFromFile = readEnvFile(path.join(process.cwd(), ".env.local"))
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? envFromFile.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  ?? envFromFile.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? envFromFile.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? envFromFile.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase publishable key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env.local first.",
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

const healthcheckEmail = `setup-check-${Date.now()}@clawpilot.invalid`
const { error } = await supabase.from("subscribers").insert({ email: healthcheckEmail })

if (error) {
  if (error.code === "PGRST205") {
    console.error("Supabase setup error: table public.subscribers was not found in the API schema cache.")
    console.error("Run supabase/schema.sql in Supabase SQL Editor for this same project, then retry.")
    process.exit(1)
  }

  if (error.code === "42501") {
    console.error("Supabase setup error: insert was blocked by permissions/RLS.")
    console.error("Re-run supabase/schema.sql to apply grants + policy, then retry.")
    process.exit(1)
  }

  console.error(
    `Supabase setup error: ${error.code ?? "UNKNOWN"} ${error.message ?? "Unknown error"}`,
  )
  process.exit(1)
}

console.log("Supabase waitlist setup looks good.")
console.log(`Verified table access using ${healthcheckEmail}.`)
