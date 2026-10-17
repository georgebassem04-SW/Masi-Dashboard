/**
 * PASSWORD HASHING (mock data only)
 * ------------------------------------------------------------------
 * Passwords are never stored as plain text. We store "scrypt$<salt>$<hash>".
 * When the real API is connected, the API checks passwords — this file is then only used by the mock.
 *
 * To make a hash for a new mock staff member, run in the dashboard folder:
 *   node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log('scrypt$'+s+'$'+c.scryptSync('THE-PASSWORD',s,64).toString('hex'))"
 */
import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}
