import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Browser client for read-only Home Timeline queries. */
export function createSupabaseBrowserClient() {
  if (!url || !publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return createClient<Database>(url, publishableKey, {
    auth: { flowType: "pkce" },
  });
}
