import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { latestWatchChange, savePushSubscription } from "@/lib/event-watch-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = request.nextUrl.searchParams.get("date");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Érvénytelen nap." }, { status: 400 });
  try {
    return NextResponse.json({ change: await latestWatchChange(date ?? undefined) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Migration/setup can temporarily lag a deploy. The normal Home state remains usable.
    return NextResponse.json({ change: null }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { subscription?: unknown } | null;
  try {
    const result = await savePushSubscription(body?.subscription, request.headers.get("user-agent"));
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Az értesítési feliratkozás mentése nem sikerült." }, { status: 503 });
  }
}
