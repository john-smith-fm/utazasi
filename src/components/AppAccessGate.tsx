"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabBar } from "@/components/TabBar";

const ACTIVE_TRIP_SLUG = "sardinia-family-2026";
const OWNER_CACHE_KEY = "utazasi-owned-trip-user";

type AccessState = "loading" | "signed-out" | "signed-in" | "access-denied" | "offline" | "configuration-error";

export function AppAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<AccessState>("loading");

  useEffect(() => {
    if (pathname === "/auth/callback") return;

    let active = true;
    let unsubscribe = () => {};

    const authorize = async (session: Session) => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: trip, error } = await supabase
          .from("trips")
          .select("id")
          .eq("slug", ACTIVE_TRIP_SLUG)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;

        if (trip) {
          window.localStorage.setItem(OWNER_CACHE_KEY, session.user.id);
          setState("signed-in");
        } else {
          window.localStorage.removeItem(OWNER_CACHE_KEY);
          setState("access-denied");
        }
      } catch {
        if (!active) return;
        setState(window.localStorage.getItem(OWNER_CACHE_KEY) === session.user.id ? "signed-in" : "offline");
      }
    };

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        if (session) void authorize(session);
        else {
          window.localStorage.removeItem(OWNER_CACHE_KEY);
          setState("signed-out");
        }
      });
      unsubscribe = () => listener.subscription.unsubscribe();

      void supabase.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error || !data.session) setState("signed-out");
        else void authorize(data.session);
      });
    } catch {
      setState("configuration-error");
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [pathname]);

  if (pathname === "/auth/callback") return <>{children}</>;
  if (state === "loading") return <AccessLoadingScreen />;
  if (state === "signed-in") return <>{children}<TabBar /></>;
  return <MagicLinkScreen configurationError={state === "configuration-error"} accessState={state} />;
}

function AccessLoadingScreen() {
  return <main className="grid min-h-dvh place-items-center bg-deep-sea px-6 text-quartz"><span className="h-2 w-2 rounded-full bg-turquoise motion-safe:animate-pulse" aria-label="Belépés ellenőrzése" /></main>;
}

function MagicLinkScreen({ configurationError, accessState }: { configurationError: boolean; accessState: AccessState }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;
      setStatus("sent");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "A belépési link küldése nem sikerült.");
    }
  }

  async function signOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // The gate will retry the normal signed-out state on the next load.
    }
  }

  return <main className="flex min-h-dvh flex-col justify-between bg-deep-sea px-6 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(48px+env(safe-area-inset-top))] text-quartz">
    <header><p className="font-mono text-xs uppercase tracking-[.16em] text-turquoise">Utazási</p><h1 className="mt-4 max-w-[280px] font-display text-4xl font-semibold leading-tight tracking-[-.04em]">A családi útiterv csak nektek szól.</h1></header>
    <section className="rounded-[24px] bg-quartz p-5 text-deep-sea shadow-2xl"><h2 className="font-display text-2xl font-semibold tracking-[-.03em]">Belépés e-mail-linkkel</h2><p className="mt-2 text-sm leading-5 text-deep-sea/65">Küldünk egy egyszer használható, biztonságos belépési linket.</p>{configurationError ? <p className="mt-4 rounded-xl bg-coral/10 p-3 text-sm leading-5 text-coral">A Supabase publikus környezeti változói még nincsenek beállítva.</p> : accessState === "access-denied" ? <div className="mt-4 space-y-3"><p className="rounded-xl bg-coral/10 p-3 text-sm leading-5 text-coral">Ehhez az útitervhez ez az e-mail-cím nem kapott hozzáférést.</p><button type="button" onClick={() => void signOut()} className="text-sm font-semibold text-turquoise-dark">Másik e-mail-cím használata</button></div> : accessState === "offline" ? <p className="mt-4 rounded-xl bg-coral/10 p-3 text-sm leading-5 text-coral">A hozzáférést első belépéskor internetkapcsolattal kell ellenőrizni.</p> : status === "sent" ? <p className="mt-4 rounded-xl bg-turquoise/10 p-3 text-sm leading-5 text-turquoise-dark">A belépési linket elküldtük. Nyisd meg ezen az iPhone-on.</p> : <form onSubmit={submit} className="mt-5 space-y-3"><label className="sr-only" htmlFor="email">E-mail-cím</label><input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="csalad@pelda.hu" disabled={configurationError || status === "sending"} className="h-12 w-full rounded-xl border border-deep-sea/15 bg-white px-4 text-[16px] outline-none placeholder:text-deep-sea/35 focus:border-turquoise" /><button type="submit" disabled={configurationError || status === "sending"} className="h-12 w-full rounded-xl bg-turquoise text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50">{status === "sending" ? "Küldés…" : "Belépési link kérése"}</button>{status === "error" && <p role="alert" className="text-sm text-coral">{message}</p>}</form>}</section>
    <p className="text-center text-xs leading-5 text-quartz/60">Privát családi útiterv · nincs publikus hozzáférés</p>
  </main>;
}
