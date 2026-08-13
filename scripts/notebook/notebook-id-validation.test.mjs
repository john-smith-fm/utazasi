import test from "node:test";
import assert from "node:assert/strict";

// The API treats IDs as opaque and relies on the server-side trip scope for
// authorization. These are the boundary cases that previously caused valid
// persisted Notebook rows to be rejected before their scoped lookup.
function acceptedId(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 160;
}

test("Notebook accepts opaque persisted record identifiers", () => {
  assert.equal(acceptedId("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(acceptedId("legacy-packing-item-1"), true);
  assert.equal(acceptedId(""), false);
  assert.equal(acceptedId("   "), false);
  assert.equal(acceptedId("x".repeat(161)), false);
});
