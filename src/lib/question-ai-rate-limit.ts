import "server-only";

type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const WINDOW_MS = 60 * 60 * 1000;
const requestsBySession = new Map<string, number[]>();

function configuredLimit() {
  const value = Number.parseInt(process.env.QUESTION_AI_RATE_LIMIT_PER_HOUR ?? "20", 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 100) : 20;
}

/**
 * A small, deliberately conservative in-memory guard for the private 1.0 app.
 * Vercel instances do not share memory, so this is a best-effort abuse guard,
 * not an account-wide billing system.
 */
export function checkQuestionAIRateLimit(sessionId: string, now = Date.now()): RateLimitResult {
  const earliest = now - WINDOW_MS;
  const recent = (requestsBySession.get(sessionId) ?? []).filter((timestamp) => timestamp > earliest);
  const limit = configuredLimit();

  if (recent.length >= limit) {
    requestsBySession.set(sessionId, recent);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000)) };
  }

  recent.push(now);
  requestsBySession.set(sessionId, recent);
  return { allowed: true };
}

export function resetQuestionAIRateLimitForTests() {
  requestsBySession.clear();
}
