"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

/** Clears the persisted Supabase session; AppAccessGate returns to sign-in. */
export function SessionLogoutButton() {
  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut({ scope: "local" });
  }

  return <button type="button" onClick={() => void signOut()} aria-label="Kijelentkezés" className="absolute right-4 top-[calc(12px+env(safe-area-inset-top))] z-10 grid h-9 w-9 place-items-center rounded-full bg-deep-sea/20 text-white backdrop-blur-sm transition-opacity active:opacity-65"><Icon name="log-out" size={17} strokeWidth={2} /></button>;
}
