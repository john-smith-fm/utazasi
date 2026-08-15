import type { NotebookEntryKind } from "@/lib/notebook-types";

export type NotebookServiceResult<T> = { data: T } | { error: string; status: number };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type NotebookEntryInput = {
  kind: NotebookEntryKind;
  content: string;
  amountEur: number | null;
  occurredOn: string;
  rating: number | null;
};

export type PackingItemInput = { title: string; isPacked: boolean; position: number };
export type PackingItemPatch = Partial<PackingItemInput>;

/**
 * Record ids are opaque at the API boundary. Ownership is enforced by the
 * server-side trip scope, so a legacy id must reach that scoped lookup.
 */
export function validNotebookRecordId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 160;
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validDate(value: unknown) {
  return typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

export function notebookEntryInput(raw: unknown): NotebookServiceResult<NotebookEntryInput> {
  if (!raw || typeof raw !== "object") return { error: "Érvénytelen bejegyzés.", status: 400 };
  const input = raw as Record<string, unknown>;
  const kind = input.kind;
  const content = text(input.content, 2000);
  const occurredOn = input.occurredOn;
  const amount = input.amountEur === null || input.amountEur === undefined || input.amountEur === "" ? null : Number(input.amountEur);
  const rating = input.rating === null || input.rating === undefined || input.rating === "" ? null : Number(input.rating);
  if (kind !== "expense" && kind !== "note" && kind !== "journal") return { error: "Érvénytelen bejegyzéstípus.", status: 400 };
  if (!content) return { error: "Adj meg tartalmat.", status: 400 };
  if (!validDate(occurredOn)) return { error: "Adj meg érvényes dátumot.", status: 400 };
  if (kind === "expense" && (!Number.isFinite(amount) || amount === null || amount < 0)) return { error: "Adj meg érvényes összeget.", status: 400 };
  if (kind !== "expense" && amount !== null) return { error: "Az összeg csak kiadásnál használható.", status: 400 };
  if (kind !== "journal" && rating !== null) return { error: "Értékelés csak naplónál használható.", status: 400 };
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return { error: "Az értékelés 1 és 5 között lehet.", status: 400 };
  return { data: { kind, content, amountEur: kind === "expense" ? amount : null, occurredOn: occurredOn as string, rating } };
}

export function packingItemInput(raw: unknown): NotebookServiceResult<PackingItemInput> {
  if (!raw || typeof raw !== "object") return { error: "Érvénytelen pakolási tétel.", status: 400 };
  const input = raw as Record<string, unknown>;
  const title = text(input.title, 160);
  const isPacked = typeof input.isPacked === "boolean" ? input.isPacked : false;
  const position = Number(input.position ?? 0);
  if (!title) return { error: "Adj meg tételnevet.", status: 400 };
  if (!Number.isInteger(position) || position < 0) return { error: "Érvénytelen listahely.", status: 400 };
  return { data: { title, isPacked, position } };
}

/** Allows old browser caches to omit fields that have not changed. */
export function packingItemPatchInput(raw: unknown): NotebookServiceResult<PackingItemPatch> {
  if (!raw || typeof raw !== "object") return { error: "Érvénytelen pakolási tétel.", status: 400 };
  const input = raw as Record<string, unknown>;
  const patch: PackingItemPatch = {};
  if ("title" in input) {
    const title = text(input.title, 160);
    if (!title) return { error: "Adj meg tételnevet.", status: 400 };
    patch.title = title;
  }
  if ("isPacked" in input) {
    if (typeof input.isPacked !== "boolean") return { error: "Érvénytelen pakolási állapot.", status: 400 };
    patch.isPacked = input.isPacked;
  }
  if ("position" in input) {
    const position = Number(input.position);
    if (!Number.isInteger(position) || position < 0) return { error: "Érvénytelen listahely.", status: 400 };
    patch.position = position;
  }
  if (!Object.keys(patch).length) return { error: "Nincs módosítandó adat.", status: 400 };
  return { data: patch };
}

export function validNotebookDeleteRequest(resource: unknown, id: unknown) {
  return (resource === "entry" || resource === "packing") && validNotebookRecordId(id);
}
