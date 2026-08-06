"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabBar } from "@/components/TabBar";

const ACTIVE_TRIP_SLUG = "sardinia-family-2026";
const ACCESS_CACHE_KEY = "utazasi-family-trip-user";

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
          window.localStorage.setItem(ACCESS_CACHE_KEY, session.user.id);
          setState("signed-in");
        } else {
          window.localStorage.removeItem(ACCESS_CACHE_KEY);
          setState("access-denied");
        }
      } catch {
        if (!active) return;
        const sessionIsCurrent = !session.expires_at || session.expires_at > Math.floor(Date.now() / 1000);
        if (sessionIsCurrent && window.localStorage.getItem(ACCESS_CACHE_KEY) === session.user.id) {
          setState("signed-in");
        } else {
          window.localStorage.removeItem(ACCESS_CACHE_KEY);
          setState(sessionIsCurrent ? "offline" : "signed-out");
        }
      }
    };

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        if (session) void authorize(session);
        else {
          window.localStorage.removeItem(ACCESS_CACHE_KEY);
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
  return <FamilyAccessScreen configurationError={state === "configuration-error"} accessState={state} />;
}

function AccessLoadingScreen() {
  return <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-deep-sea px-6 text-quartz">
    <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center opacity-45" style={{ backgroundImage: 'url("/images/hero.jpg")' }} />
    <span className="relative h-2 w-2 rounded-full bg-turquoise motion-safe:animate-pulse" aria-label="Belépés ellenőrzése" />
  </main>;
}

function FamilyAccessScreen({ configurationError, accessState }: { configurationError: boolean; accessState: AccessState }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying" | "error">("idle");
  const [message, setMessage] = useState("");

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setStep("code");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "A belépési kód küldése nem sikerült.");
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("verifying");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "A belépési kód érvénytelen vagy lejárt.");
    }
  }

  async function signOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The next app load returns to the signed-out state.
    }
  }

  const isBusy = status === "sending" || status === "verifying";

  return <main className="relative flex min-h-dvh flex-col overflow-hidden bg-quartz px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-deep-sea">
    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[43dvh] min-h-[330px] bg-[#2f6970]" />
    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[43dvh] min-h-[330px] bg-cover bg-[58%_52%]" style={{ backgroundImage: 'linear-gradient(180deg,rgba(11,42,47,.12)_0%,rgba(11,42,47,.68)_100%),url("/images/hero.jpg")' }} />
    <header className="relative flex min-h-[330px] flex-col justify-between pb-7 pt-6">
      <img src="/images/utazasi-logo-white.svg" alt="Utazási" className="h-[86px] w-[86px] object-contain" />
      <div className="max-w-[295px] text-white"><p className="font-mono text-[11px] font-medium uppercase tracking-[.15em] text-white/75">Villasimius · Szardínia</p><h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.04] tracking-[-.045em]">Üdv újra!</h1><p className="mt-2 text-[16px] leading-6 text-white/90">A családi utazásod egy helyen.</p></div>
    </header>

    <section className="relative -mt-1 rounded-l bg-quartz px-5 py-6 shadow-card sm:mx-auto sm:w-full sm:max-w-md" aria-labelledby="access-title">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[.15em] text-turquoise-dark">Privát családi útiterv</p>
      <h2 id="access-title" className="mt-2 font-display text-[27px] font-semibold tracking-[-.035em]">{step === "email" ? "Belépés" : "Írd be a kódot"}</h2>
      <p className="mt-2 text-sm leading-5 text-deep-sea/65">{step === "email" ? "A meghívott e-mail-címedre egyszer használatos belépési kódot küldünk." : `A kódot erre az e-mail-címre küldtük: ${email.trim()}`}</p>

      {configurationError ? <p className="mt-5 rounded-s bg-coral/10 p-3 text-sm leading-5 text-deep-sea">A belépés még nincs beállítva ezen a környezeten.</p> : accessState === "access-denied" ? <div className="mt-5 space-y-3"><p className="rounded-s bg-coral/10 p-3 text-sm leading-5 text-deep-sea">Ehhez az útitervhez ez az e-mail-cím nem kapott hozzáférést.</p><button type="button" onClick={() => void signOut()} className="text-sm font-semibold text-turquoise-dark">Másik e-mail-cím használata</button></div> : accessState === "offline" ? <p className="mt-5 rounded-s bg-coral/10 p-3 text-sm leading-5 text-deep-sea">Az első belépéshez internetkapcsolat szükséges.</p> : step === "email" ? <form onSubmit={requestCode} className="mt-6 space-y-3"><label className="sr-only" htmlFor="email">E-mail-cím</label><input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="csalad@pelda.hu" disabled={isBusy} className="h-[52px] w-full rounded-s border border-deep-sea/15 bg-white px-4 text-[16px] outline-none placeholder:text-deep-sea/35 focus:border-turquoise focus:ring-2 focus:ring-turquoise/20 disabled:opacity-60" /><button type="submit" disabled={isBusy} className="h-[52px] w-full rounded-s bg-turquoise text-[15px] font-bold text-white shadow-glass transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-55">{status === "sending" ? "Kód küldése…" : "Belépési kód küldése"}</button>{status === "error" && <p role="alert" className="text-sm leading-5 text-deep-sea">{message}</p>}</form> : <form onSubmit={verifyCode} className="mt-6 space-y-3"><label className="sr-only" htmlFor="otp">Egyszer használatos kód</label><input id="otp" type="text" autoComplete="one-time-code" inputMode="numeric" required maxLength={8} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\s/g, ""))} placeholder="000000" disabled={isBusy} className="h-[52px] w-full rounded-s border border-deep-sea/15 bg-white px-4 text-center font-mono text-xl tracking-[.28em] outline-none placeholder:tracking-normal placeholder:text-deep-sea/35 focus:border-turquoise focus:ring-2 focus:ring-turquoise/20 disabled:opacity-60" /><button type="submit" disabled={isBusy} className="h-[52px] w-full rounded-s bg-turquoise text-[15px] font-bold text-white shadow-glass transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-55">{status === "verifying" ? "Ellenőrzés…" : "Belépés"}</button><button type="button" onClick={() => { setStep("email"); setOtp(""); setStatus("idle"); setMessage(""); }} className="mx-auto block px-3 py-2 text-sm font-semibold text-turquoise-dark">Másik e-mail-cím használata</button>{status === "error" && <p role="alert" className="text-center text-sm leading-5 text-deep-sea">{message}</p>}</form>}
    </section>

    <p className="relative mt-auto pt-6 text-center text-xs leading-5 text-deep-sea/50">Privát családi útiterv · csak meghívottaknak</p>
  </main>;
}
