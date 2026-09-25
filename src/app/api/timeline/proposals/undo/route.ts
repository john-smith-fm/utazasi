import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { serverDatabaseClient } from "@/lib/server-database";
import { requestedTripSlug } from "@/lib/trip-service";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { tripSlug?: unknown; proposalId?: unknown } | null;
  const trip = requestedTripSlug(body?.tripSlug);
  if ("error" in trip) return NextResponse.json({ error: trip.error }, { status: trip.status });
  const proposalId = typeof body?.proposalId === "string" && UUID_PATTERN.test(body.proposalId) ? body.proposalId : null;
  if (!proposalId) return NextResponse.json({ error: "Érvénytelen AI-javaslat." }, { status: 400 });
  const { data, error } = await serverDatabaseClient().rpc("undo_timeline_proposal_changes", { p_trip_slug: trip.data, p_proposal_id: proposalId });
  if (error) return NextResponse.json({ error: "Az AI-javaslat visszavonása nem sikerült." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "A visszavonható AI-javaslat nem található." }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
