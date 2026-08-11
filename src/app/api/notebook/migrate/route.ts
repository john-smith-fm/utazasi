import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { importLegacyNotebook } from "@/lib/notebook-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { migrationKey?: unknown; snapshot?: unknown } | null;
  try {
    const result = await importLegacyNotebook(body?.migrationKey, body?.snapshot);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A régi Jegyzetfüzet-adatok átemelése nem sikerült." }, { status: 503 });
  }
}
