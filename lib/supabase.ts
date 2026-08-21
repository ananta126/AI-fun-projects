import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Optional Supabase wiring. The MVP uses a simulated user + localStorage.
 * When NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set,
 * this client can be used for Auth and persistence without changing call sites much.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
