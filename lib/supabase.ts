import { createClient, type SupabaseClient } from "@supabase/supabase-js"

type SubscribeEmailResult =
  | { success: true; isDuplicate: boolean }
  | { success: false; error: unknown; code?: string; message?: string }

type UpdateSubscriberResult =
  | { success: true }
  | { success: false; error: unknown }

let supabaseClient: SupabaseClient | null = null

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    )
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return supabaseClient
}

function isUniqueConstraintError(error: unknown) {
  if (typeof error !== "object" || error === null) return false
  if (!("code" in error)) return false
  return (error as { code?: string }).code === "23505"
}

function getSupabaseErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined
  if (!("code" in error)) return undefined

  const code = (error as { code?: unknown }).code
  return typeof code === "string" ? code : undefined
}

function getSupabaseErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined
  if (!("message" in error)) return undefined

  const message = (error as { message?: unknown }).message
  return typeof message === "string" ? message : undefined
}

function toDebuggableError(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const code = getSupabaseErrorCode(error)
    const message = getSupabaseErrorMessage(error)
    const details =
      "details" in error && typeof (error as { details?: unknown }).details === "string"
        ? (error as { details: string }).details
        : undefined
    const hint =
      "hint" in error && typeof (error as { hint?: unknown }).hint === "string"
        ? (error as { hint: string }).hint
        : undefined

    return {
      code,
      message,
      details,
      hint,
    }
  }

  return error
}

export async function subscribeEmail(email: string): Promise<SubscribeEmailResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      return { success: false, error: new Error("Email is required.") }
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase.from("subscribers").insert({ email: normalizedEmail })

    if (error) {
      const code = getSupabaseErrorCode(error)
      const message = getSupabaseErrorMessage(error)

      if (isUniqueConstraintError(error)) {
        return { success: true, isDuplicate: true }
      }

      if (code === "PGRST205") {
        console.error(
          "Supabase waitlist table is missing. Run supabase/schema.sql in your Supabase SQL Editor, then retry.",
        )
      }

      console.error("Error subscribing email:", toDebuggableError(error))
      return { success: false, error, code, message }
    }

    return { success: true, isDuplicate: false }
  } catch (error) {
    console.error("Error subscribing email:", toDebuggableError(error))
    return {
      success: false,
      error,
      code: getSupabaseErrorCode(error),
      message: getSupabaseErrorMessage(error),
    }
  }
}

export async function updateSubscriber(
  id: string,
  data: Record<string, unknown>,
): Promise<UpdateSubscriberResult> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("subscribers")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error("Error updating subscriber:", error)
    return { success: false, error }
  }
}

export { getSupabaseClient as getSupabase }
