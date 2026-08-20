"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { TabBar } from "@/components/TabBar";

const OFFLINE_ACCESS_KEY = "utazasi-pin-access";
type AccessState = "loading" | "locked" | "unlocked" | "configuration-error";

export function AppAccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessState>("loading");

  useEffect(() => {
    let active = true;
    void fetch("/api/access/status", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { authenticated?: boolean; configured?: boolean };
        if (!active) return;
        if (!data.configured) setState("configuration-error");
        else if (data.authenticated) {
          window.localStorage.setItem(OFFLINE_ACCESS_KEY, "1");
          setState("unlocked");
        } else setState("locked");
      })
      .catch(() => {
        if (!active) return;
        setState(window.localStorage.getItem(OFFLINE_ACCESS_KEY) === "1" ? "unlocked" : "locked");
      });
    return () => { active = false; };
  }, []);

  if (state === "loading") return <AccessLoadingScreen />;
  if (state === "unlocked") return <>{children}<TabBar /></>;
  return <PinAccessScreen configurationError={state === "configuration-error"} onUnlocked={() => setState("unlocked")} />;
}

function AccessLoadingScreen() {
  return <main className="grid min-h-dvh place-items-center bg-quartz"><span className="h-2 w-2 rounded-full bg-coral motion-safe:animate-pulse" aria-label="Belépés ellenőrzése" /></main>;
}

function PinAccessScreen({ configurationError, onUnlocked }: { configurationError: boolean; onUnlocked: () => void }) {
  const [typedPin, setTypedPin] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(pin = typedPin) {
    if (configurationError || status === "submitting") return;
    setStatus("submitting");
    setError("");
    try {
      const response = await fetch("/api/access/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? "Helytelen PIN.");
      }
      window.localStorage.setItem(OFFLINE_ACCESS_KEY, "1");
      onUnlocked();
    } catch (caught) {
      // A failed attempt should leave the keypad ready for a complete new PIN.
      // Keeping four rejected digits visible made the recovery path unclear on mobile.
      setTypedPin("");
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Helytelen PIN.");
    }
  }

  function addDigit(digit: string) {
    if (configurationError || status === "submitting" || typedPin.length === 4) return;
    const nextPin = `${typedPin}${digit}`;
    setTypedPin(nextPin);
    setStatus("idle");
    setError("");
    // A phone keypad already makes the fourth digit an intentional action.
    // Do not make the family perform a second, redundant tap to continue.
    if (nextPin.length === 4) void submit(nextPin);
  }

  function removeDigit() {
    if (configurationError || status === "submitting") return;
    setTypedPin((current) => current.slice(0, -1));
    setStatus("idle");
    setError("");
  }

  return <main className="relative flex min-h-dvh flex-col overflow-hidden bg-quartz px-5 pb-[calc(30px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-deep-sea">
    <img src="/images/utazasi-pin-logo.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -left-[31vw] top-[7dvh] h-[52vw] min-h-[220px] w-[52vw] min-w-[220px] max-h-[390px] max-w-[390px]" />
    <div className="relative flex flex-1 flex-col justify-end pb-[max(26px,7dvh)]">
      <div className="mx-auto w-full max-w-[365px] pb-9 text-center">
        <p className="text-[12px] font-bold uppercase tracking-[.18em] text-turquoise">Utazási</p>
        <h1 className="mt-3 text-[31px] font-bold tracking-[-.045em] text-deep-sea">Villasimius</h1>
        <p className="mt-1 text-[15px] text-deep-sea/55">2026. szeptember 2–13.</p>
      </div>
      <div className={`mx-auto flex w-full max-w-[365px] justify-center gap-4 ${status === "error" ? "motion-safe:animate-[pin-shake_.3s_ease-in-out]" : ""}`} aria-label="Négyjegyű PIN-kód">
        {[0, 1, 2, 3].map((index) => <span key={index} aria-hidden="true" className={`h-3 w-3 rounded-full border border-deep-sea/25 transition-colors ${typedPin[index] ? "bg-deep-sea" : "bg-white/55"}`} />)}
      </div>
      <p className="mx-auto mt-3 max-w-[365px] text-center text-sm leading-5 text-deep-sea/55">Add meg a négyjegyű PIN-kódot. A negyedik szám után megnyitjuk az utazást.</p>
      <div className="mx-auto mt-7 grid w-full max-w-[365px] grid-cols-3 gap-2" aria-label="PIN számbillentyűzet">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0"].map((digit, index) => digit ? <button key={digit} type="button" onClick={() => addDigit(digit)} disabled={configurationError || status === "submitting"} className="h-[58px] rounded-full text-[24px] font-semibold text-deep-sea transition-colors active:bg-turquoise/15 disabled:opacity-45">{digit}</button> : <span key={`space-${index}`} />)}
        <button type="button" onClick={removeDigit} disabled={!typedPin.length || configurationError || status === "submitting"} aria-label="Utolsó számjegy törlése" className="h-[58px] rounded-full text-[17px] font-semibold text-deep-sea/70 transition-colors active:bg-turquoise/15 disabled:opacity-30">Törlés</button>
      </div>
      <button type="button" onClick={() => void submit()} disabled={typedPin.length !== 4 || status === "submitting" || configurationError} className="mx-auto mt-4 h-[52px] w-full max-w-[365px] rounded-full bg-coral px-5 text-[15px] font-bold text-white shadow-card transition-transform active:scale-[.98] disabled:opacity-45">{status === "submitting" ? "Megnyitás…" : "Megnyitás"}</button>
      <p className="mx-auto mt-3 min-h-5 max-w-[365px] text-center text-sm leading-5 text-coral" role="status" aria-live="polite">{configurationError ? "A PIN hozzáférés még nincs beállítva." : error}</p>
    </div>
  </main>;
}
