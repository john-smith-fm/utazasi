import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { serverDatabaseClient } from "@/lib/server-database";
import { requestedTripSlug } from "@/lib/trip-service";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function proposalItems(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) return null;
  const result: Array<Record<string, unknown>> = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const candidate = raw as Record<string, unknown>;
    const activity = candidate.activity;
    if (!UUID_PATTERN.test(String(candidate.id ?? "")) || !activity || typeof activity !== "object" || Array.isArray(activity)) return null;
    const item = activity as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const startTime = typeof item.startTime === "string" ? item.startTime : "";
    const durationMinutes = Number(item.durationMinutes);
    const locationName = typeof item.locationName === "string" ? item.locationName.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    if (!title || title.length > 120 || !TIME_PATTERN.test(startTime) || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440 || locationName.length > 160 || description.length > 1000) return null;
    result.push({ id: candidate.id, title, startTime, durationMinutes, locationName, description });
  }
  return result;
}

export async function POST(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { tripSlug?: unknown; proposal?: unknown } | null;
  const trip = requestedTripSlug(body?.tripSlug);
  if ("error" in trip) return NextResponse.json({ error: trip.error }, { status: trip.status });
  if (!body?.proposal || typeof body.proposal !== "object" || Array.isArray(body.proposal)) return NextResponse.json({ error: "Érvénytelen Timeline-javaslat." }, { status: 400 });
  const proposal = body.proposal as Record<string, unknown>;
  const targetDate = typeof proposal.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(proposal.targetDate) ? proposal.targetDate : null;
  const targetVersion = Number(proposal.targetVersion);
  const items = proposalItems(proposal.items);
  if (!targetDate || !Number.isInteger(targetVersion) || targetVersion < 1 || !items) return NextResponse.json({ error: "A Timeline-javaslat már nem alkalmazható." }, { status: 400 });

  const proposalId = randomUUID();
  const { data, error } = await serverDatabaseClient().rpc("apply_timeline_proposal", {
    p_trip_slug: trip.data,
    p_day_date: targetDate,
    p_expected_version: targetVersion,
    p_proposal_id: proposalId,
    p_items: items,
  });
  if (error) {
    if (error.code === "40001" || error.message.includes("timeline_version_conflict")) {
      return NextResponse.json({ error: "A Timeline időközben megváltozott. Frissítsd a napot, majd készíts új javaslatot.", conflict: true }, { status: 409 });
    }
    if (error.code === "P0002") return NextResponse.json({ error: "A célnap nem található." }, { status: 404 });
    return NextResponse.json({ error: "A Timeline-javaslat alkalmazása nem sikerült." }, { status: 503 });
  }
  const activityIds = (data ?? []).map((item) => item.activity_id);
  if (activityIds.length !== items.length) return NextResponse.json({ error: "A Timeline-javaslat nem teljes egészében került alkalmazásra." }, { status: 503 });
  return NextResponse.json({ proposalId, activityIds, dayVersion: data?.[0]?.day_version ?? targetVersion }, { headers: { "Cache-Control": "no-store" } });
}
