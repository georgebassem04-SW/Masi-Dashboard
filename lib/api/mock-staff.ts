/**
 * MOCK STAFF ACCOUNTS (development only)
 * ------------------------------------------------------------------
 * The first time, mock-data/staff.json is copied into .mock-db/db.json (demo password for all: Demo@12345).
 * After that, staff are added / changed / switched off in Settings → Staff & permissions.
 * Passwords are stored only as scrypt hashes (lib/auth/password.ts).
 * With the real API (DATA_SOURCE=http) none of this is used — the API does the same checks.
 */
import "server-only";
import type { LocalizedText, StaffAccess, StaffInput, StaffMember, StaffSaveResult, StaffUser } from "@/types";
import type { Role } from "@/lib/auth/permissions";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { toLocalized } from "@/lib/format";
import { matchesRole } from "@/lib/staff/rules";
import { mutate, read } from "./mock-db";
import staffJson from "@/mock-data/staff.json";

type Stored = StaffMember & { passwordHash: string };

function all(): Stored[] {
  const existing = read((db) => db.staff);
  if (existing) return existing;
  return mutate(
    (db) =>
      (db.staff ??= (staffJson as unknown as Stored[]).map((s) => ({ ...s, name: toLocalized(s.name), role: s.role as Role, createdAt: s.createdAt ?? new Date().toISOString() }))),
  );
}

const safe = ({ passwordHash: _h, ...s }: Stored): StaffMember => s;

/** Owners first, then by name */
export const listStaff = (): StaffMember[] => [...all()].sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner") || a.name.en.localeCompare(b.name.en)).map(safe);

export const findStaff = (id: string) => {
  const s = all().find((x) => x.id === id);
  return s ? safe(s) : null;
};

export function staffAccess(id: string): StaffAccess | null {
  const s = all().find((x) => x.id === id);
  return s ? { name: s.name, email: s.email, role: s.role, permissions: s.permissions, active: s.active, mustChangePassword: s.mustChangePassword } : null;
}

export function loginStaff(email: string, password: string): { ok: true; staff: StaffUser } | { ok: false; error: "invalid_credentials" | "inactive" } {
  const user = all().find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
  // Same error for "no such email" and "wrong password" so nobody can guess which emails exist
  if (!user || !verifyPassword(password, user.passwordHash)) return { ok: false, error: "invalid_credentials" };
  if (!user.active) return { ok: false, error: "inactive" };
  const now = new Date().toISOString();
  mutate((db) => {
    const s = db.staff?.find((x) => x.id === user.id);
    if (s) s.lastLoginAt = now;
  });
  return { ok: true, staff: { ...safe(user), lastLoginAt: now } };
}

/** At least one active owner must remain (checked after every change) */
const hasOwner = (list: Stored[]) => list.some((s) => s.role === "owner" && s.active);

/** Custom permissions are kept only when they differ from the role's ready-made ones (and never for owners) */
const cleanPermissions = (input: StaffInput) => (input.role === "owner" || !input.permissions || matchesRole(input.role, input.permissions) ? undefined : input.permissions);

export function createStaff(input: StaffInput, password: string, by: LocalizedText): StaffSaveResult {
  return mutate((db) => {
    const list = (db.staff ??= all());
    if (list.some((s) => s.email.toLowerCase() === input.email.toLowerCase())) return { ok: false as const, error: "email_taken" as const };
    const member: Stored = {
      id: `s${Date.now().toString(36)}`,
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      permissions: cleanPermissions(input),
      active: input.active,
      // The password was chosen by someone else: they must pick their own at first login
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      createdBy: by,
      passwordHash: hashPassword(password),
    };
    list.push(member);
    return { ok: true as const, staff: safe(member) };
  });
}

export function updateStaff(id: string, input: StaffInput): StaffSaveResult {
  return mutate((db) => {
    const list = (db.staff ??= all());
    const s = list.find((x) => x.id === id);
    if (!s) return { ok: false as const, error: "not_found" as const };
    if (list.some((x) => x.id !== id && x.email.toLowerCase() === input.email.toLowerCase())) return { ok: false as const, error: "email_taken" as const };
    const next: Stored = { ...s, name: input.name, email: input.email.toLowerCase(), role: input.role, permissions: cleanPermissions(input), active: input.active };
    if (!hasOwner(list.map((x) => (x.id === id ? next : x)))) return { ok: false as const, error: "last_owner" as const };
    Object.assign(s, next);
    if (!next.permissions) delete s.permissions;
    return { ok: true as const, staff: safe(s) };
  });
}

export function deleteStaff(id: string): StaffSaveResult {
  return mutate((db) => {
    const list = (db.staff ??= all());
    const s = list.find((x) => x.id === id);
    if (!s) return { ok: false as const, error: "not_found" as const };
    if (!hasOwner(list.filter((x) => x.id !== id))) return { ok: false as const, error: "last_owner" as const };
    db.staff = list.filter((x) => x.id !== id);
    return { ok: true as const, staff: safe(s) };
  });
}

/** The owner gives a temporary password → the person must change it at next login */
export function setTempPassword(id: string, password: string): StaffSaveResult {
  return mutate((db) => {
    const s = (db.staff ??= all()).find((x) => x.id === id);
    if (!s) return { ok: false as const, error: "not_found" as const };
    s.passwordHash = hashPassword(password);
    s.mustChangePassword = true;
    return { ok: true as const, staff: safe(s) };
  });
}

/** Anyone changes their own password (needs the current one) */
export function changeOwnPassword(id: string, current: string, next: string): StaffSaveResult {
  return mutate((db) => {
    const s = (db.staff ??= all()).find((x) => x.id === id);
    if (!s) return { ok: false as const, error: "not_found" as const };
    if (!verifyPassword(current, s.passwordHash)) return { ok: false as const, error: "wrong_password" as const };
    s.passwordHash = hashPassword(next);
    delete s.mustChangePassword;
    return { ok: true as const, staff: safe(s) };
  });
}
