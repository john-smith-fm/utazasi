import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { deleteTimelineActivity, updateTimelineActivity } from "@/lib/timeline-service";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  return hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { activity?: unknown } | null;

  try {
    const result = await updateTimelineActivity(params.id, body?.activity);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ activity: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A programpont mentése nem sikerült." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await deleteTimelineActivity(params.id);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ activity: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A programpont törlése nem sikerült." }, { status: 503 });
  }
}
