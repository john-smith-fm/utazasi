import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, ACCESS_MAX_AGE_SECONDS, createAccessSession, isAccessConfigured, isValidPin } from "@/lib/access";

export const dynamic = "force-dynamic";

type Attempt = { failed: number; resetAt: number; blockedUntil: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function requestKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function canAttempt(key: string) {
  const item = attempts.get(key);
  if (!item) return true;
  if (item.blockedUntil > Date.now()) return false;
  if (item.resetAt <= Date.now()) attempts.delete(key);
  return true;
}

function recordFailure(key: string) {
  const now = Date.now();
  const prior = attempts.get(key);
  const item = !prior || prior.resetAt <= now ? { failed: 1, resetAt: now + WINDOW_MS, blockedUntil: 0 } : { ...prior, failed: prior.failed + 1 };
  if (item.failed >= MAX_FAILURES) item.blockedUntil = now + WINDOW_MS;
  attempts.set(key, item);
}

export async function POST(request: NextRequest) {
  if (!isAccessConfigured()) return NextResponse.json({ error: "A PIN belépés még nincs beállítva." }, { status: 503 });

  const key = requestKey(request);
  if (!canAttempt(key)) return NextResponse.json({ error: "Próbáld meg később újra." }, { status: 429 });

  const body = await request.json().catch(() => null) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!isValidPin(pin)) {
    recordFailure(key);
    return NextResponse.json({ error: "Helytelen PIN." }, { status: 401 });
  }

  attempts.delete(key);
  const response = NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set({ name: ACCESS_COOKIE_NAME, value: createAccessSession(), httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ACCESS_MAX_AGE_SECONDS });
  return response;
}
