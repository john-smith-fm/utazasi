import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

process.env.UTAZASI_PIN_HASH = createHash("sha256").update("2468").digest("hex");
process.env.UTAZASI_SESSION_SECRET = "gate-one-local-test-secret";

const {
  ACCESS_MAX_AGE_SECONDS,
  createAccessSession,
  hasValidAccessSession,
  isAccessConfigured,
  isValidPin,
} = await import("../../src/lib/access.ts");

test("PIN access is configured only when both server secrets exist", () => {
  assert.equal(isAccessConfigured(), true);
});

test("PIN validation accepts only the configured four digits", () => {
  assert.equal(isValidPin("2468"), true);
  assert.equal(isValidPin("2467"), false);
  assert.equal(isValidPin("246"), false);
  assert.equal(isValidPin("24680"), false);
  assert.equal(isValidPin("abcd"), false);
});

test("a newly created access session is valid and has the intended expiry window", () => {
  const token = createAccessSession();
  assert.equal(hasValidAccessSession(token), true);
  const [body] = token.split(".");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  const remainingSeconds = payload.exp - Math.floor(Date.now() / 1000);
  assert.ok(remainingSeconds <= ACCESS_MAX_AGE_SECONDS && remainingSeconds >= ACCESS_MAX_AGE_SECONDS - 1);
});

test("tampered and expired sessions never unlock access", () => {
  const token = createAccessSession();
  const [body] = token.split(".");
  assert.equal(hasValidAccessSession(`${body}.tampered`), false);
  const expiredBody = Buffer.from(JSON.stringify({ exp: 1, version: 1 })).toString("base64url");
  assert.equal(hasValidAccessSession(`${expiredBody}.tampered`), false);
  assert.equal(hasValidAccessSession("not-a-session"), false);
});
