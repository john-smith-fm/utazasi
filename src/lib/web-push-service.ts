import "server-only";

import webpush from "web-push";
import { timelineServerClient } from "@/lib/timeline-service";

type PendingChange = { id: string; change_kind: "status_changed" | "start_time_changed" | "venue_changed"; events: { title: string } | { title: string }[] | null };

function configured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function notificationBody(change: PendingChange) {
  const event = Array.isArray(change.events) ? change.events[0] : change.events;
  const name = event?.title ?? "Egy figyelt program";
  if (change.change_kind === "status_changed") return `${name}: az esemény állapota megváltozott.`;
  if (change.change_kind === "start_time_changed") return `${name}: az indulási idő módosult.`;
  return `${name}: a helyszín módosult.`;
}

/**
 * Delivers only material, already-recorded changes. A failed endpoint is
 * revoked; the Timeline and canonical knowledge are never touched.
 */
export async function dispatchPendingWatchNotifications() {
  if (!configured()) return { sent: 0, pending: 0, configured: false };
  const supabase = timelineServerClient();
  const { data: changes, error: changesError } = await supabase
    .from("event_change_log")
    .select("id, change_kind, events!inner(title)")
    .is("notified_at", null)
    .order("observed_at", { ascending: true })
    .limit(5);
  if (changesError) throw changesError;
  let sent = 0;
  for (const change of (changes ?? []) as PendingChange[]) {
    const { data: event, error: eventError } = await supabase.from("event_change_log").select("events!inner(trip_id)").eq("id", change.id).maybeSingle();
    if (eventError) throw eventError;
    const joined = event?.events;
    const tripId = (Array.isArray(joined) ? joined[0] : joined)?.trip_id;
    if (!tripId) continue;
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, subscription")
      .eq("trip_id", tripId)
      .is("revoked_at", null);
    if (subscriptionsError) throw subscriptionsError;

    let delivered = false;
    const payload = JSON.stringify({ title: "Utazási", body: notificationBody(change), url: "/" });
    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification(subscription.subscription as unknown as webpush.PushSubscription, payload, { TTL: 60 * 60 * 6, urgency: "high" });
        delivered = true;
        sent += 1;
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          const { error: revokeError } = await supabase.from("push_subscriptions").update({ revoked_at: new Date().toISOString() }).eq("id", subscription.id);
          if (revokeError) throw revokeError;
        }
      }
    }
    if (delivered) {
      const { error } = await supabase.from("event_change_log").update({ notified_at: new Date().toISOString() }).eq("id", change.id);
      if (error) throw error;
    }
  }
  return { sent, pending: changes?.length ?? 0, configured: true };
}
