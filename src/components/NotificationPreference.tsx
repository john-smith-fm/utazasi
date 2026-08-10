"use client";

import { useEffect, useState } from "react";
import { enableWatchNotifications, syncExistingWatchSubscription } from "@/lib/push-client";

type State = "ready" | "enabled" | "denied" | "unsupported" | "error";

/**
 * One global PWA permission preference. Watch eligibility is never selected
 * here: source-backed Timeline Events are evaluated automatically on the
 * server. This control only lets the family receive material changes.
 */
export function NotificationPreference() {
  const configured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const [state, setState] = useState<State>("ready");

  useEffect(() => {
    if (!configured || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    if (Notification.permission !== "granted") return;
    void syncExistingWatchSubscription()
      .then((synced) => setState(synced ? "enabled" : "ready"))
      .catch(() => setState("ready"));
  }, [configured]);

  if (!configured) return null;
  if (state === "unsupported") return <p className="mt-3 text-[12px] leading-[18px] text-deep-sea/50">Ezen a készüléken az értesítések nem támogatottak.</p>;
  // A successful preference is intentionally quiet on Home. The Watch remains
  // active, but it should not compete with the day's travel context.
  if (state === "enabled") return null;
  if (state === "denied") return <p className="mt-3 text-[12px] leading-[18px] text-deep-sea/55">Az értesítések a készülék beállításaiban kapcsolhatók vissza.</p>;

  async function enable() {
    try {
      const result = await enableWatchNotifications();
      if (result.status === "enabled") setState("enabled");
      else if (result.status === "denied") setState("denied");
      else if (result.status === "unsupported") setState("unsupported");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  return <section className="mt-5 border-t border-deep-sea/10 pt-5" aria-labelledby="notification-preference-heading">
    <h2 id="notification-preference-heading" className="text-[15px] font-semibold leading-5 text-deep-sea">Fontos utazási változások</h2>
    <p className="mt-1 text-[13px] leading-[19px] text-deep-sea/60">Csak ellenőrzött eseményváltozásokról küldünk értesítést, programemlékeztetőkről nem.</p>
    <button type="button" onClick={() => void enable()} className="mt-3 min-h-11 rounded-ui-s border border-turquoise bg-turquoise/10 px-3 text-[13px] font-semibold text-deep-sea transition-colors active:bg-turquoise/20">Értesítések engedélyezése</button>
    {state === "error" ? <p className="mt-2 text-[12px] leading-[18px] text-coral">Az értesítés bekapcsolása most nem sikerült. Próbáld újra a telepített appban.</p> : null}
  </section>;
}
