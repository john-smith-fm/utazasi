import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Browser client for authenticated, read-only family Timeline queries. */
export function createSupabaseBrowserClient() {
  if (!url || !publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return createClient<Database>(url, publishableKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      // OTP is completed explicitly inside the installed PWA. Keeping URL
      // detection off prevents the legacy callback route from double-consuming
      // a PKCE code if it is opened from an old e-mail.
      detectSessionInUrl: false,
      storageKey: "utazasi-auth",
    },
  });
}
