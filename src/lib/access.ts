import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ACCESS_COOKIE_NAME = "utazasi_access";
export const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

type AccessPayload = { exp: number; version: 1 };

function sessionSecret() {
  const value = process.env.UTAZASI_SESSION_SECRET;
  if (!value) throw new Error("Missing UTAZASI_SESSION_SECRET.");
  return value;
}

function pinHash() {
  const value = process.env.UTAZASI_PIN_HASH;
  if (!value) throw new Error("Missing UTAZASI_PIN_HASH.");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function isAccessConfigured() {
  return Boolean(process.env.UTAZASI_PIN_HASH && process.env.UTAZASI_SESSION_SECRET);
}

export function isValidPin(pin: string) {
  if (!/^\d{4}$/.test(pin) || !isAccessConfigured()) return false;
  const expected = Buffer.from(pinHash(), "hex");
  const received = createHash("sha256").update(pin).digest();
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function createAccessSession() {
  const payload: AccessPayload = { exp: Math.floor(Date.now() / 1000) + ACCESS_MAX_AGE_SECONDS, version: 1 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function hasValidAccessSession(token?: string) {
  if (!token || !isAccessConfigured()) return false;
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length) return false;

  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AccessPayload;
    return payload.version === 1 && Number.isFinite(payload.exp) && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
