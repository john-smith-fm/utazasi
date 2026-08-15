import test from "node:test";
import assert from "node:assert/strict";
import {
  notebookEntryInput,
  packingItemInput,
  packingItemPatchInput,
  validNotebookDeleteRequest,
  validNotebookRecordId,
} from "../../src/lib/notebook-contract.ts";

test("Notebook accepts opaque persisted record identifiers", () => {
  assert.equal(validNotebookRecordId("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(validNotebookRecordId("legacy-packing-item-1"), true);
  assert.equal(validNotebookRecordId(""), false);
  assert.equal(validNotebookRecordId("   "), false);
  assert.equal(validNotebookRecordId("x".repeat(161)), false);
});

test("Packing supports creation and a checkbox-only patch", () => {
  assert.deepEqual(packingItemInput({ title: " Naptej ", position: 2 }), { data: { title: "Naptej", isPacked: false, position: 2 } });
  assert.deepEqual(packingItemPatchInput({ isPacked: true }), { data: { isPacked: true } });
  assert.deepEqual(packingItemPatchInput({}), { error: "Nincs módosítandó adat.", status: 400 });
});

test("Notebook validates each entry type without rejecting valid persisted operations", () => {
  assert.deepEqual(notebookEntryInput({ kind: "note", content: "Foglalás ellenőrzése", occurredOn: "2026-09-02" }), {
    data: { kind: "note", content: "Foglalás ellenőrzése", amountEur: null, occurredOn: "2026-09-02", rating: null },
  });
  assert.deepEqual(notebookEntryInput({ kind: "expense", content: "Vacsora", amountEur: "35.5", occurredOn: "2026-09-03" }), {
    data: { kind: "expense", content: "Vacsora", amountEur: 35.5, occurredOn: "2026-09-03", rating: null },
  });
  assert.deepEqual(notebookEntryInput({ kind: "journal", content: "Jó nap volt", occurredOn: "2026-09-03", rating: 4 }), {
    data: { kind: "journal", content: "Jó nap volt", amountEur: null, occurredOn: "2026-09-03", rating: 4 },
  });
});

test("Notebook deletion accepts opaque ids only for supported resources", () => {
  assert.equal(validNotebookDeleteRequest("entry", "legacy-note-42"), true);
  assert.equal(validNotebookDeleteRequest("packing", "legacy-packing-42"), true);
  assert.equal(validNotebookDeleteRequest("other", "legacy-note-42"), false);
  assert.equal(validNotebookDeleteRequest("entry", ""), false);
});
