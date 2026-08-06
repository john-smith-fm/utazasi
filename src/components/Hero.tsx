"use client";

import { SessionLogoutButton } from "@/components/SessionLogoutButton";

export function Hero() {
  return <header className="relative overflow-hidden bg-[#2f6970] pt-[env(safe-area-inset-top)] text-white" style={{ height: "calc(204px + env(safe-area-inset-top))", marginTop: "calc(-1 * env(safe-area-inset-top))" }}>
    <div aria-hidden="true" className="absolute inset-0 scale-[1.02] bg-cover" style={{ backgroundImage: 'linear-gradient(135deg,rgba(29,93,101,.08),rgba(255,138,91,.04)),url("/images/hero.jpg")', backgroundPosition: "58% 52%" }} />
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,42,47,.06)_0%,rgba(11,42,47,.12)_45%,rgba(11,42,47,.64)_100%)]" />
    <div className="relative flex h-full items-center justify-between gap-6 px-5">
      <SessionLogoutButton />
      <img src="/images/utazasi-logo-white.svg" alt="Utazási" className="h-[116px] w-[116px] shrink-0 object-contain" />
      <div className="min-w-0"><p className="text-sm font-bold leading-[19px] text-white/95">Szardínia</p><p className="text-sm font-medium leading-[19px] text-white/95">2026. szept. 2–11.</p></div>
    </div>
  </header>;
}
