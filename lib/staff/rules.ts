/**
 * STAFF SAFETY RULES — who may add / change / remove whom. Used by the Staff page (to hide what isn't allowed)
 * and checked again by the API routes (never trust the browser).
 *
 *   1. Nobody can change their OWN role, permissions or on/off switch, or delete themselves
 *      (so the owner can't lock themselves out by mistake). Their own name is fine.
 *   2. Only an owner can add, change or remove an owner, or make someone an owner.
 *   3. A non-owner can't give anyone more than they have themselves
 *      (a manager with "view" on reports can't give "edit" on reports).
 *   4. There must always be at least one active owner (checked where the data is saved: mock-staff.ts / the real API).
 */
import type { StaffInput, StaffMember } from "@/types";
import { PERMISSION_KEYS, ROLE_PRESETS, type AccessLevel, type Permissions, type Role } from "@/lib/auth/permissions";

export type StaffRuleError = "self" | "owner_only" | "above_you";

/** The actor = the logged-in staff member doing the change */
export interface Actor {
  staffId: string;
  role: Role;
  permissions: Permissions;
}

const rank: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2 };

/** What someone can really do: their custom permissions, or their role's ready-made ones. Owners can do everything. */
export function effectivePermissions(member: { role: Role; permissions?: Permissions | null }): Permissions {
  if (member.role === "owner") return ROLE_PRESETS.owner;
  if (!member.permissions) return ROLE_PRESETS[member.role];
  // Custom permissions saved before a new section was added: the new section starts as "none"
  return { ...(Object.fromEntries(PERMISSION_KEYS.map((k) => [k, "none"])) as Permissions), ...member.permissions };
}

/** true when `p` is exactly the role's ready-made permissions (then nothing custom needs saving) */
export const matchesRole = (role: Role, p: Permissions) => PERMISSION_KEYS.every((k) => ROLE_PRESETS[role][k] === p[k]);

/** Sections where `wanted` is more than the actor has (rule 3) */
export function aboveActor(actor: Actor, wanted: Permissions) {
  if (actor.role === "owner") return [];
  return PERMISSION_KEYS.filter((k) => rank[wanted[k]] > rank[actor.permissions[k]]);
}

/** Roles the actor may give (rule 2 + 3) */
export function assignableRoles(actor: Actor, roles: Role[]): Role[] {
  return roles.filter((r) => (r === "owner" ? actor.role === "owner" : aboveActor(actor, ROLE_PRESETS[r]).length === 0));
}

/** Adding (target null) or changing a staff member */
export function staffEditProblem(actor: Actor, target: StaffMember | null, input: StaffInput): StaffRuleError | null {
  if (target && target.id === actor.staffId) {
    const same =
      input.role === target.role &&
      input.active === target.active &&
      PERMISSION_KEYS.every((k) => effectivePermissions(input)[k] === effectivePermissions(target)[k]);
    if (!same) return "self";
  }
  if ((input.role === "owner" || target?.role === "owner") && actor.role !== "owner") return "owner_only";
  if (aboveActor(actor, effectivePermissions(input)).length) return "above_you";
  return null;
}

export function staffDeleteProblem(actor: Actor, target: StaffMember): StaffRuleError | null {
  if (target.id === actor.staffId) return "self";
  if (target.role === "owner" && actor.role !== "owner") return "owner_only";
  // Removing someone who has more than you is the same as changing them
  if (aboveActor(actor, effectivePermissions(target)).length) return "above_you";
  return null;
}

/** Password rule for new / temporary passwords (same in the browser and the server) */
export const PASSWORD_MIN = 8;
export const passwordProblem = (p: string): "passwordShort" | "passwordWeak" | null =>
  p.length < PASSWORD_MIN ? "passwordShort" : !/[A-Za-z؀-ۿ]/.test(p) || !/\d/.test(p) ? "passwordWeak" : null;

/** A temporary password that is easy to read out: e.g. "Gold-4827-mx" */
export function makeTempPassword(): string {
  const words = ["Gold", "Ring", "Pearl", "Gem", "Karat", "Ruby", "Onyx", "Opal"];
  const buf = new Uint32Array(3);
  crypto.getRandomValues(buf);
  const letters = "abcdefghjkmnpqrstuvwxyz";
  return `${words[buf[0] % words.length]}-${String(1000 + (buf[1] % 9000))}-${letters[buf[2] % letters.length]}${letters[(buf[2] >>> 8) % letters.length]}`;
}
