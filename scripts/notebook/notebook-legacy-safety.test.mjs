import test from "node:test";
import assert from "node:assert/strict";
import { hasForeignNotebookRuntimeData } from "../../src/lib/notebook-legacy-safety.ts";

test("an empty Notebook can receive its first legacy import", () => {
  assert.equal(hasForeignNotebookRuntimeData("device-a", []), false);
});

test("a partial import from the same browser can be retried", () => {
  assert.equal(hasForeignNotebookRuntimeData("device-a", ["device-a:packing:0", "device-a:journal:1"]), false);
});

test("manually created server data blocks an automatic legacy merge", () => {
  assert.equal(hasForeignNotebookRuntimeData("device-a", [null, "device-a:packing:0"]), true);
});

test("another browser migration blocks an automatic legacy merge", () => {
  assert.equal(hasForeignNotebookRuntimeData("device-a", ["device-b:expense:0"]), true);
});
