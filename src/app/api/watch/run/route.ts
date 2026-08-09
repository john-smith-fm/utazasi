import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runEventWatchPass } from "@/lib/event-watch-runner";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.WATCH_RUNNER_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !token) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runEventWatchPass(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A Watch futtatása nem sikerült." }, { status: 503 });
  }
}
