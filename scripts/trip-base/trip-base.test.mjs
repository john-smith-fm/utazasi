import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

process.env.UTAZASI_PIN_HASH = createHash("sha256").update("2468").digest("hex");
process.env.UTAZASI_SESSION_SECRET = "trip-base-route-test-secret";
const [{ createAccessSession, hasValidAccessSession }, { privateTripBaseDetails }] = await Promise.all([
  import("../../src/lib/access.ts"),
  import("../../src/lib/trip-base.ts"),
]);

test("an absent private origin cannot produce an address payload", () => {
  assert.equal(privateTripBaseDetails(undefined), null);
  assert.equal(privateTripBaseDetails("   "), null);
});

test("a valid PIN session can receive a runtime-only address and navigation payload", () => {
  const token = createAccessSession();
  assert.equal(hasValidAccessSession(token), true);
  const details = privateTripBaseDetails("Teszt utca 1, Villasimius");
  assert.equal(details?.address, "Teszt utca 1, Villasimius");
  assert.match(details?.mapUrl ?? "", /destination=Teszt%20utca%201%2C%20Villasimius/);
});
