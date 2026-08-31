import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { sanitizeEditorialCopyInput } from "@/lib/editorial-copy-contract";
import { createEditorialCopy } from "@/lib/editorial-copywriter";
import { checkEditorialCopyRateLimit } from "@/lib/question-ai-rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function POST(request: NextRequest) {
  const accessSession = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!hasValidAccessSession(accessSession)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await request.json().catch(() => null);
  const input = sanitizeEditorialCopyInput(raw);
  if (!input) return NextResponse.json({ error: "Érvénytelen napi szerkesztői kontextus." }, { status: 400 });
  const rateLimit = checkEditorialCopyRateLimit(accessSession!);
  if (!rateLimit.allowed) return NextResponse.json({ error: "A napi szerkesztői keret most betelt." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds), "Cache-Control": "no-store" } });
  try {
    const result = await createEditorialCopy(input);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Do not expose model response, raw facts, private context or credentials.
    const status = error instanceof Error && /\(4\d\d\)/.test(error.message) ? 503 : 503;
    return NextResponse.json({ error: "A napi szerkesztői szöveg most nem elérhető." }, { status });
  }
}
