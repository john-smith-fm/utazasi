"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Belépés ellenőrzése…");

  useEffect(() => {
    async function completeSignIn() {
      try {
        const supabase = createSupabaseBrowserClient();
        const code = new URLSearchParams(window.location.search).get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error("A belépési link érvénytelen vagy lejárt.");
        router.replace("/");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "A belépés nem sikerült.");
      }
    }

    void completeSignIn();
  }, [router]);

  return <main className="grid min-h-dvh place-items-center bg-deep-sea px-6 text-center text-quartz"><p className="max-w-xs text-sm leading-6">{message}</p></main>;
}
