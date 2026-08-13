"use client";

import type { ChangeEvent, ReactNode, TouchEvent, WheelEvent } from "react";
import { useEffect, useRef, useState } from "react";
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
  const [digits, setDigits] = useState([0, 0, 0, 0]);
  // The picker starts visually at 0000, but the native numeric field stays
  // empty so the first typed digit always replaces it on iPhone.
  const [typedPin, setTypedPin] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function setDigit(index: number, value: number) {
    setDigits((current) => {
      const next = current.map((digit, digitIndex) => digitIndex === index ? (value + 10) % 10 : digit);
      setTypedPin(next.join(""));
      return next;
    });
    setStatus("idle");
    setError("");
  }

  async function submit(pinDigits = digits) {
    if (configurationError || status === "submitting") return;
    setStatus("submitting");
    setError("");
    try {
      const response = await fetch("/api/access/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pinDigits.join("") }) });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? "Helytelen PIN.");
      }
      window.localStorage.setItem(OFFLINE_ACCESS_KEY, "1");
      onUnlocked();
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Helytelen PIN.");
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }

  function onPinInput(event: ChangeEvent<HTMLInputElement>) {
    const nextText = event.target.value.replace(/\D/g, "").slice(0, 4);
    const nextDigits = [0, 1, 2, 3].map((index) => Number(nextText[index] ?? 0));
    setTypedPin(nextText);
    setDigits(nextDigits);
    setStatus("idle");
    setError("");
    if (nextText.length === 4) void submit(nextDigits);
  }

  return <main className="relative flex min-h-dvh flex-col overflow-hidden bg-quartz px-5 pb-[calc(30px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-deep-sea">
    <img src="/images/utazasi-pin-logo.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -left-[31vw] top-[7dvh] h-[52vw] min-h-[220px] w-[52vw] min-w-[220px] max-h-[390px] max-w-[390px]" />
    <div className="flex flex-1 flex-col justify-end pb-[14dvh]">
      <label className="sr-only" htmlFor="utazasi-pin-input">Négyjegyű PIN-kód</label>
      <input ref={inputRef} id="utazasi-pin-input" autoFocus disabled={configurationError || status === "submitting"} value={typedPin} onChange={onPinInput} onFocus={(event) => event.currentTarget.select()} inputMode="numeric" type="tel" autoComplete="off" enterKeyHint="done" pattern="[0-9]*" maxLength={4} className="sr-only" />
      <div className={`mx-auto flex w-full max-w-[365px] gap-2 ${status === "error" ? "motion-safe:animate-[pin-shake_.3s_ease-in-out]" : ""}`} aria-label="Négyjegyű PIN választó">
        {digits.map((digit, index) => <PinColumn key={index} value={digit} index={index} onChange={setDigit} />)}
      </div>
      <button type="button" onClick={() => void submit()} disabled={typedPin.length !== 4 || status === "submitting" || configurationError} className="mx-auto mt-10 h-[52px] w-full max-w-[365px] rounded-ui-s border border-coral bg-coral/20 text-[15px] font-bold text-deep-sea shadow-card transition-transform active:scale-[.98] disabled:opacity-45">{status === "submitting" ? "…" : "Megnyitás"}</button>
      <p className="mx-auto mt-3 min-h-5 max-w-[365px] text-center text-sm leading-5 text-coral" role="status" aria-live="polite">{configurationError ? "A PIN hozzáférés még nincs beállítva." : error}</p>
    </div>
  </main>;
}

function PinColumn({ value, index, onChange }: { value: number; index: number; onChange: (index: number, value: number) => void }) {
  const touchStart = useRef<number | null>(null);
  const didSwipe = useRef(false);
  const before = (value + 9) % 10;
  const after = (value + 1) % 10;

  function moveBy(delta: number) {
    if (!delta) return;
    onChange(index, value + delta);
  }

  function onTouchStart(event: TouchEvent<HTMLButtonElement>) { touchStart.current = event.touches[0]?.clientY ?? null; }
  function onTouchEnd(event: TouchEvent<HTMLButtonElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (start === null) return;
    const distance = start - (event.changedTouches[0]?.clientY ?? start);
    if (Math.abs(distance) >= 14) {
      didSwipe.current = true;
      moveBy(Math.round(distance / 28));
    }
  }
  function onWheel(event: WheelEvent<HTMLButtonElement>) { event.preventDefault(); moveBy(event.deltaY > 0 ? 1 : -1); }

  function onClick() {
    // iOS sends a click after touchend. A vertical swipe must therefore not
    // also advance the number once more.
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    moveBy(1);
  }

  return <button type="button" aria-label={`${index + 1}. PIN számjegy: ${value}. Húzással választható.`} onClick={onClick} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onWheel={onWheel} className="relative h-[130px] flex-1 overflow-hidden rounded-[22px] border border-deep-sea/8 bg-white/55 text-center shadow-[0_8px_20px_rgba(24,50,59,.045)]">
    <span aria-hidden="true" className="absolute inset-x-0 top-[14px] text-lg font-semibold text-deep-sea/18 blur-[.65px]">{before}</span>
    <span aria-hidden="true" className="absolute inset-x-0 top-[45px] text-[47px] font-semibold leading-none tracking-[-.05em] text-deep-sea transition-transform duration-200">{value}</span>
    <span aria-hidden="true" className="absolute inset-x-0 bottom-[12px] text-lg font-semibold text-deep-sea/18 blur-[.65px]">{after}</span>
  </button>;
}
