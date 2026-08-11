import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, hasValidAccessSession } from "@/lib/access";
import { createNotebookEntry, createPackingItem, deleteNotebookRecord, readNotebook, updateNotebookEntry, updatePackingItem } from "@/lib/notebook-service";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  return hasValidAccessSession(request.cookies.get(ACCESS_COOKIE_NAME)?.value);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await readNotebook();
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A Jegyzetfüzet most nem érhető el." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { resource?: unknown; data?: unknown } | null;
  try {
    const result = body?.resource === "packing" ? await createPackingItem(body.data) : body?.resource === "entry" ? await createNotebookEntry(body.data) : { error: "Érvénytelen Jegyzetfüzet-kérés.", status: 400 };
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A mentés nem sikerült." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { resource?: unknown; id?: unknown; data?: unknown } | null;
  try {
    const result = body?.resource === "packing" ? await updatePackingItem(body.id, body.data) : body?.resource === "entry" ? await updateNotebookEntry(body.id, body.data) : { error: "Érvénytelen Jegyzetfüzet-kérés.", status: 400 };
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A mentés nem sikerült." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { resource?: unknown; id?: unknown } | null;
  try {
    const result = await deleteNotebookRecord(body?.resource, body?.id);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "A törlés nem sikerült." }, { status: 503 });
  }
}
