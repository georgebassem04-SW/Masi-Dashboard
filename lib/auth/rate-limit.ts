/**
 * LOGIN ATTEMPT LIMIT — stops password guessing.
 * ------------------------------------------------------------------
 * Max MAX_ATTEMPTS failed logins per email + IP in WINDOW_MS. After that, login answers "too many attempts".
 * Kept in memory: fine for one server. If the dashboard ever runs on several servers,
 * move this to Redis (or let the real API do it — it should limit attempts too).
 */
import "server-only";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;
const failures = new Map<string, number[]>();

const recent = (key: string) => (failures.get(key) ?? []).filter((t) => Date.now() - t < WINDOW_MS);

export function isBlocked(key: string): boolean {
  return recent(key).length >= MAX_ATTEMPTS;
}

export function recordFailure(key: string) {
  failures.set(key, [...recent(key), Date.now()]);
}

export function clearFailures(key: string) {
  failures.delete(key);
}
