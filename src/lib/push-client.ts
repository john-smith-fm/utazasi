"use client";

function decodePublicKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function saveSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/watch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  if (!response.ok) throw new Error("Az értesítési feliratkozás mentése nem sikerült.");
}

/**
 * Repairs a previously created browser subscription after a temporary server
 * setup failure. It never requests permission or creates a new subscription.
 */
export async function syncExistingWatchSubscription() {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  await saveSubscription(subscription);
  return true;
}

/** Call only from an explicit user action; never on page load. */
export async function enableWatchNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return { status: "unsupported" as const };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" as const };
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { status: "unconfigured" as const };
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodePublicKey(key) });
  await saveSubscription(subscription);
  return { status: "enabled" as const };
}
