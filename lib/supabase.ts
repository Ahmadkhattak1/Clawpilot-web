import { createClient, type SupabaseClient } from "@supabase/supabase-js"

type SubscribeEmailResult =
  | { success: true; id?: string; isDuplicate: boolean }
  | { success: false; error: unknown }

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

export async function subscribeEmail(email: string): Promise<SubscribeEmailResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      return { success: false, error: new Error("Email is required.") }
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("subscribers")
      .insert({ email: normalizedEmail })
      .select("id")
      .single()

    if (error) {
      if (isUniqueConstraintError(error)) {
        return { success: true, isDuplicate: true }
      }

      throw error
    }

    return { success: true, id: data.id, isDuplicate: false }
  } catch (error) {
    console.error("Error subscribing email:", error)
    return { success: false, error }
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
