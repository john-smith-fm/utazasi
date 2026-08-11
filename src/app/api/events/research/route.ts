import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { researchDailyEventProposal } from "@/lib/event-research-proposal";

export const dynamic = "force-dynamic";

/** PIN-protected and deliberately read-only: research never changes app data. */
export async function POST(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { seriesKey?: unknown; targetDate?: unknown } | null;
  if (typeof body?.seriesKey !== "string" || typeof body?.targetDate !== "string") return NextResponse.json({ error: "Érvénytelen kutatási kérés." }, { status: 400 });
  try {
    const proposal = await researchDailyEventProposal({ seriesKey: body.seriesKey, targetDate: body.targetDate });
    return NextResponse.json({ proposal }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "A kutatás most nem érhető el." }, { status: 503 });
  }
}
