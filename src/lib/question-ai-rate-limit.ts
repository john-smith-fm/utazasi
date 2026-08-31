import "server-only";

type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const WINDOW_MS = 60 * 60 * 1000;
const requestsBySession = new Map<string, number[]>();

function configuredLimit() {
  const value = Number.parseInt(process.env.QUESTION_AI_RATE_LIMIT_PER_HOUR ?? "20", 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 100) : 20;
}

function configuredResearchLimit() {
  const value = Number.parseInt(process.env.QUESTION_RESEARCH_RATE_LIMIT_PER_HOUR ?? "8", 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 30) : 8;
}

function configuredEditorialLimit() {
  const value = Number.parseInt(process.env.EDITORIAL_COPY_RATE_LIMIT_PER_HOUR ?? "16", 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 30) : 16;
}

function checkRateLimit(bucket: string, limit: number, now = Date.now()): RateLimitResult {
  const earliest = now - WINDOW_MS;
  const recent = (requestsBySession.get(bucket) ?? []).filter((timestamp) => timestamp > earliest);
  if (recent.length >= limit) {
    requestsBySession.set(bucket, recent);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000)) };
  }
  recent.push(now);
  requestsBySession.set(bucket, recent);
  return { allowed: true };
}

/**
 * A small, deliberately conservative in-memory guard for the private 1.0 app.
 * Vercel instances do not share memory, so this is a best-effort abuse guard,
 * not an account-wide billing system.
 */
export function checkQuestionAIRateLimit(sessionId: string, now = Date.now()): RateLimitResult {
  return checkRateLimit(`summary:${sessionId}`, configuredLimit(), now);
}

/** Web research costs more than a context-only summary, so it has its own
 * deliberately smaller per-session budget. */
export function checkQuestionResearchRateLimit(sessionId: string, now = Date.now()): RateLimitResult {
  return checkRateLimit(`research:${sessionId}`, configuredResearchLimit(), now);
}

/** Daily header copy is useful but never essential. Keep a smaller, separate
 * best-effort budget so it cannot consume the question/research allowance. */
export function checkEditorialCopyRateLimit(sessionId: string, now = Date.now()): RateLimitResult {
  return checkRateLimit(`editorial:${sessionId}`, configuredEditorialLimit(), now);
}

export function resetQuestionAIRateLimitForTests() {
  requestsBySession.clear();
}
