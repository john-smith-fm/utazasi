"use client";

import { useEffect, useState } from "react";
import { enableWatchNotifications } from "@/lib/push-client";

type State = "ready" | "enabled" | "denied" | "unsupported" | "error";

/**
 * Deliberate opt-in for important watched-event changes. It renders only when
 * the current day has a source-backed Event and the deployment has a public
 * VAPID key. Permission is never requested automatically.
 */
export function WatchNotificationControl({ eligible }: { eligible: boolean }) {
  const configured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const [state, setState] = useState<State>("ready");

  useEffect(() => {
    if (!eligible || !configured || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    if (Notification.permission !== "granted") return;
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? "enabled" : "ready"))
      .catch(() => setState("ready"));
  }, [configured, eligible]);

  if (!eligible || !configured) return null;
  if (state === "unsupported") return <p className="mt-3 text-[12px] leading-[18px] text-deep-sea/50">Ezen a készüléken az értesítések nem támogatottak.</p>;
  if (state === "enabled") return <p className="mt-3 text-[12px] leading-[18px] text-deep-sea/55">A fontos eseményváltozásokról értesítést küldünk.</p>;
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

  return <div className="mt-3">
    <button type="button" onClick={() => void enable()} className="min-h-11 rounded-ui-s border border-turquoise bg-turquoise/10 px-3 text-[13px] font-semibold text-deep-sea transition-colors active:bg-turquoise/20">Értesítést kérek a fontos változásokról</button>
    {state === "error" ? <p className="mt-2 text-[12px] leading-[18px] text-coral">Az értesítés bekapcsolása most nem sikerült. Próbáld újra a telepített appban.</p> : null}
  </div>;
}
