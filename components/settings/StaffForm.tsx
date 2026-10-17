/**
 * STAFF FORM (design screen 14) — add a staff member, or change one.
 *   Details: name (Arabic / English), email, temporary password (new only), can log in (on / off)
 *   What can they do?
 *     - Simple:   pick a ready-made role (Owner, Store manager, Orders staff…) — ROLE_PRESETS in lib/auth/permissions.ts
 *     - Advanced: for each section choose No access / View / Edit (starts from the role; "Back to the role's permissions")
 * Safety rules (lib/staff/rules.ts) are shown here and checked again by the server:
 *   your own role / permissions / on-off can't be changed · only owners manage owners · nobody gives more than they have.
 * Saves to POST /api/staff (new) or PUT /api/staff/<id>.
 */
"use client";

import { useMemo, useState } from "react";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, ShieldCheck } from "lucide-react";
import type { Locale, StaffInput, StaffMember } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { PERMISSION_KEYS, ROLE_PRESETS, type AccessLevel, type Permissions, type Role } from "@/lib/auth/permissions";
import { aboveActor, assignableRoles, effectivePermissions, makeTempPassword, matchesRole, passwordProblem, type Actor } from "@/lib/staff/rules";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, Field, Message, Switch, TextBox, fieldErrors, send } from "./ui";

type L = Dictionary["settings"];
/** Order of the role cards */
export const ROLES: Role[] = ["owner", "manager", "orders", "content", "designer", "viewer"];
const LEVELS: AccessLevel[] = ["none", "view", "edit"];
const rank: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2 };

export function StaffForm({
  member,
  actor,
  labels: L,
  roleNames,
}: {
  /** null = adding someone new */
  member: StaffMember | null;
  actor: Actor;
  locale: Locale;
  labels: L;
  roleNames: Record<Role, string>;
}) {
  const router = useRouter();
  const F = L.form;
  const isSelf = member?.id === actor.staffId;
  const [name, setName] = useState(member?.name ?? { ar: "", en: "" });
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState<Role>(member?.role ?? "orders");
  const [custom, setCustom] = useState<Permissions | null>(member?.permissions && member.role !== "owner" ? member.permissions : null);
  const [advanced, setAdvanced] = useState(!!custom);
  const [active, setActive] = useState(member?.active ?? true);
  const [password, setPassword] = useState(member ? "" : makeTempPassword());
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [created, setCreated] = useState<{ id: string; password: string } | null>(null);
  // UNDO / REDO: name, email, role, permissions, active (not the password)
  const history = useUndoRedo({ name, email, role, custom, advanced, active }, (v) => {
    setName(v.name);
    setEmail(v.email);
    setRole(v.role);
    setCustom(v.custom);
    setAdvanced(v.advanced);
    setActive(v.active);
    setErrors({});
  });

  const allowedRoles = useMemo(() => assignableRoles(actor, ROLES), [actor]);
  // Only an owner can change an owner (rule 2); your own access is locked (rule 1)
  const accessLocked = isSelf || (member?.role === "owner" && actor.role !== "owner");
  const perms: Permissions = role === "owner" ? ROLE_PRESETS.owner : (custom ?? ROLE_PRESETS[role]);
  const tooMuch = aboveActor(actor, perms);
  const errText = (code?: string) => (code ? (L.errors[code as keyof L["errors"]] ?? L.errors.required) : null);
  const err = (k: string) => errText(errors[k]);

  // Choosing a role (also "Start from" in advanced mode) starts from that role's permissions
  const pickRole = (r: Role) => {
    setRole(r);
    setCustom(null);
  };
  const setLevel = (k: (typeof PERMISSION_KEYS)[number], level: AccessLevel) => {
    const next = { ...perms, [k]: level };
    setCustom(matchesRole(role, next) ? null : next);
  };

  async function save() {
    const pw = !member ? passwordProblem(password) : null;
    if (pw) return setErrors({ password: pw });
    const input: StaffInput = { name, email, role, permissions: role === "owner" || !advanced ? null : (custom ?? null), active };
    setBusy(true);
    setErrors({});
    setMessage(null);
    const { res, data } = member ? await send(`/api/staff/${encodeURIComponent(member.id)}`, "PUT", input) : await send("/api/staff", "POST", { ...input, password });
    setBusy(false);
    if (res?.ok) {
      if (member) {
        setMessage({ tone: "ok", text: F.saved });
        router.refresh();
      } else setCreated({ id: data.id, password });
      return;
    }
    setErrors(fieldErrors(data));
    setMessage({ tone: "error", text: L.errors[data.error as keyof L["errors"]] ?? L.errors.failed });
  }

  async function copy(text: string) {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  /* ---------- after adding: show the temporary password once ---------- */
  if (created) {
    return (
      <Card>
        <div className="flex flex-col items-start gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--status-done-bg)] text-[var(--status-done-fg)]">
            <Check className="size-6" />
          </span>
          <p className="font-semibold">{F.created}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code dir="ltr" className="rounded-lg bg-muted px-4 py-2.5 font-mono text-lg font-bold tracking-wide">
              {created.password}
            </code>
            <button type="button" onClick={() => copy(created.password)} className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? F.copied : F.copy}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings/staff" className="inline-flex h-11 items-center rounded-lg bg-gold px-5 text-sm font-semibold text-gold-foreground">
              {F.back}
            </Link>
            <Link href={`/settings/staff/${encodeURIComponent(created.id)}`} className="inline-flex h-11 items-center rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted">
              {name.ar || name.en}
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {isSelf && <Message tone="info">{F.selfNote}</Message>}

      {/* ===== Details ===== */}
      <Card title={F.details}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={F.nameAr} error={err("name.ar")}>
            <TextBox dir="rtl" maxLength={60} value={name.ar} onChange={(e) => setName({ ...name, ar: e.target.value })} error={err("name.ar")} />
          </Field>
          <Field label={F.nameEn} error={err("name.en")}>
            <TextBox dir="ltr" maxLength={60} value={name.en} onChange={(e) => setName({ ...name, en: e.target.value })} error={err("name.en")} />
          </Field>
          <Field label={F.email} hint={F.emailHint} error={err("email")}>
            <TextBox type="email" dir="ltr" autoComplete="off" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value.trim())} error={err("email")} />
          </Field>
          {!member && (
            <Field label={F.password} hint={F.passwordHint} error={err("password")}>
              <div className="flex gap-2">
                <TextBox dir="ltr" autoComplete="new-password" maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} error={err("password")} className="font-mono" />
                <button type="button" onClick={() => setPassword(makeTempPassword())} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted">
                  <KeyRound className="size-4" />
                  {F.generate}
                </button>
              </div>
            </Field>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-3 py-2.5">
          <span className="flex flex-col">
            <span className="text-sm font-semibold">{F.active}</span>
            <span className="text-xs text-muted-foreground">{F.activeHint}</span>
          </span>
          <Switch checked={active} disabled={accessLocked} label={F.active} onChange={setActive} />
        </div>
      </Card>

      {/* ===== What can they do? ===== */}
      <Card
        title={F.access}
        hint={role === "owner" ? F.ownerNote : advanced ? F.advancedHint : F.simpleHint}
        action={
          role !== "owner" && (
            <div role="radiogroup" aria-label={F.access} className="flex gap-1 rounded-lg bg-muted p-1">
              {([false, true] as const).map((a) => (
                <button
                  key={String(a)}
                  type="button"
                  role="radio"
                  aria-checked={advanced === a}
                  disabled={accessLocked}
                  onClick={() => {
                    setAdvanced(a);
                    if (!a) setCustom(null); // back to simple = the role's permissions
                  }}
                  className={cn("h-9 rounded-md px-4 text-sm font-semibold", advanced === a ? "bg-card shadow-sm" : "text-muted-foreground")}
                >
                  {a ? F.advanced : F.simple}
                </button>
              ))}
            </div>
          )
        }
      >
        {/* Role cards (simple) / "start from" (advanced) */}
        <div className={cn("grid gap-2", advanced && role !== "owner" ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-3")} role="radiogroup" aria-label={advanced ? F.startFrom : F.access}>
          {ROLES.filter((r) => r !== "owner" || actor.role === "owner" || role === "owner").map((r) => {
            const allowed = allowedRoles.includes(r);
            const on = role === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={accessLocked || !allowed}
                onClick={() => pickRole(r)}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border p-3 text-start transition-colors disabled:cursor-not-allowed",
                  on ? "border-gold bg-accent" : "border-input hover:bg-muted/60",
                  !allowed && !on && "opacity-50",
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  {r === "owner" && <ShieldCheck className="size-4 text-gold" />}
                  {roleNames[r]}
                </span>
                {!(advanced && role !== "owner") && <span className="text-xs leading-relaxed text-muted-foreground">{allowed ? L.roleDesc[r] : F.roleNotAllowed}</span>}
              </button>
            );
          })}
        </div>

        {/* Permission grid (advanced) — in simple mode it shows read-only what the role can do */}
        {role !== "owner" && (
          <div className="flex flex-col gap-2">
            {advanced && custom && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2 text-sm">
                <span className="font-semibold">{fill(F.customNote, { role: roleNames[role] })}</span>
                {!accessLocked && (
                  <button type="button" onClick={() => setCustom(null)} className="font-semibold text-gold hover:underline">
                    {F.resetToRole}
                  </button>
                )}
              </div>
            )}
            <ul className="divide-y rounded-lg border">
              {PERMISSION_KEYS.map((k) => {
                const P = L.permissions[k];
                const changed = custom && custom[k] !== ROLE_PRESETS[role][k];
                return (
                  <li key={k} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5", changed && "bg-accent/50")}>
                    <span className="flex min-w-0 flex-1 basis-48 flex-col">
                      <span className="text-sm font-semibold">{P.name}</span>
                      <span className="text-xs text-muted-foreground">{P.desc}</span>
                    </span>
                    <div role="radiogroup" aria-label={P.name} className="flex gap-1 rounded-lg bg-muted p-1">
                      {LEVELS.map((level) => {
                        const on = perms[k] === level;
                        const overActor = actor.role !== "owner" && rank[level] > rank[actor.permissions[k]];
                        return (
                          <button
                            key={level}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={!advanced || accessLocked || overActor}
                            onClick={() => setLevel(k, level)}
                            className={cn(
                              "h-8 min-w-16 rounded-md px-2.5 text-xs font-semibold disabled:cursor-not-allowed",
                              on ? (level === "edit" ? "bg-gold text-gold-foreground" : level === "view" ? "bg-card shadow-sm" : "bg-card text-muted-foreground shadow-sm") : "text-muted-foreground",
                              !on && overActor && "opacity-40",
                            )}
                          >
                            {F.levels[level]}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {tooMuch.length > 0 && !accessLocked && <Message tone="error">{L.errors.above_you}</Message>}
      </Card>

      {message && <Message tone={message.tone}>{message.text}</Message>}
      <div className="flex flex-wrap justify-end gap-2">
        <UndoRedo history={history} keyboard disabled={busy} />
        <Link href="/settings/staff" className="inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold hover:bg-muted">
          {L.common.cancel}
        </Link>
        <button type="button" onClick={save} disabled={busy || (!accessLocked && tooMuch.length > 0)} className="h-11 rounded-lg bg-gold px-6 text-sm font-semibold text-gold-foreground hover:opacity-90 disabled:opacity-50">
          {busy ? L.common.saving : member ? F.save : F.create}
        </button>
      </div>
    </div>
  );
}

/** What someone can do, as { key: level } — used by the list and My account */
export const permissionsOf = (m: { role: Role; permissions?: Permissions | null }) => effectivePermissions(m);
