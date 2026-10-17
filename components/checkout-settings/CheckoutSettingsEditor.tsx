/**
 * SHIPPING & PAYMENT EDITOR (design screen 10) — everything is edited on the page, then saved with ONE "Save" button.
 *   1. Delivery areas: fee, free-delivery amount, delivery time, on/off, order (↑ ↓). Add / edit opens a small form.
 *   2. Branch pickup: on/off + the branches marked as pickup points (branches are managed in Settings → Branches)
 *   3. VAT & minimum order
 *   4. Payment methods: on/off, order, and details (names, description, bank-transfer details, largest order, delivery / pickup).
 *      "+ New payment method" adds one (e.g. a second bank account, InstaPay or a mobile wallet → kind "transfer");
 *      the kinds are fixed (PAYMENT_KINDS below) because orders, reports and the ERP know them. Only one card gateway.
 * Saves to PUT /api/checkout-settings. The same safety rules as the server (lib/checkout-settings/rules.ts)
 * are shown here before saving, e.g. "no payment method is on for delivery".
 * Texts: dictionaries → "checkoutSettings".
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import type { Branch, CheckoutSettings, Locale, LocalizedText, PaymentMethodOption, ShippingZone } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { checkoutProblem } from "@/lib/checkout-settings/rules";
import { slugify } from "@/lib/catalog/helpers";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type L = Dictionary["checkoutSettings"];
type Errors = Record<string, string>;

const box = "h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted";
const numOrUndef = (s: string) => (s.trim() === "" ? undefined : Number(s));
const emptyText = (): LocalizedText => ({ ar: "", en: "" });
/** Kinds a new payment method can be. Adding a NEW kind needs types/order.ts → PaymentMethod + the storefront + the real API */
const PAYMENT_KINDS = ["bank_transfer", "cash_on_delivery", "pay_in_store", "card"] as const;
const MAX_PAYMENT_METHODS = 10;
/** Where a new method works by default */
const defaultAvailability = (k: PaymentMethodOption["type"]): PaymentMethodOption["availableFor"] =>
  k === "cash_on_delivery" ? ["delivery"] : k === "pay_in_store" ? ["store_pickup"] : ["delivery", "store_pickup"];

const move = <T,>(list: T[], i: number, by: number) => {
  const next = [...list];
  const [x] = next.splice(i, 1);
  next.splice(i + by, 0, x);
  return next;
};

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60", checked ? "bg-gold" : "bg-input")}
    >
      <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", checked ? "start-6" : "start-1")} />
    </button>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
      <span className={cn(error && "text-destructive")}>{label}</span>
      {children}
      {(error || hint) && <span className={cn("text-xs font-normal", error ? "text-destructive" : "text-muted-foreground")}>{error ?? hint}</span>}
    </label>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5", className)}>
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function CheckoutSettingsEditor({
  initial,
  branches,
  currency,
  canEdit,
  locale,
  labels: L,
}: {
  initial: CheckoutSettings;
  branches: Branch[];
  currency: string;
  canEdit: boolean;
  locale: Locale;
  labels: L;
}) {
  const router = useRouter();
  const [s, setS] = useState<CheckoutSettings>(initial);
  const [saved, setSaved] = useState<CheckoutSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  // UNDO / REDO: delivery areas, payment methods, VAT, pickup — everything on this page
  const history = useUndoRedo(s, (v) => {
    setS(v);
    setErrors({});
  });
  const [zoneForm, setZoneForm] = useState<{ index: number | null; zone: ShippingZone } | null>(null);
  const [zoneDelete, setZoneDelete] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [payForm, setPayForm] = useState<{ type: PaymentMethodOption["type"]; label: LocalizedText; tried: boolean } | null>(null);
  const [payDelete, setPayDelete] = useState<number | null>(null);

  const dirty = useMemo(() => JSON.stringify(s) !== JSON.stringify(saved), [s, saved]);
  const problem = checkoutProblem(s);
  const disabled = !canEdit || busy;

  // Warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const intl = locale === "ar" ? "ar-EG" : "en-US";
  const money = (n: number) => new Intl.NumberFormat(intl, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const t = (x?: LocalizedText) => (x ? x[locale] || x[locale === "ar" ? "en" : "ar"] : "");
  const err = (k: string) => (errors[k] ? (L.errors[errors[k] as keyof L["errors"]] ?? L.errors.required) : null);

  const edit = (patch: Partial<CheckoutSettings>) => {
    setS((x) => ({ ...x, ...patch }));
    setMessage(null);
  };
  const setZones = (shippingZones: ShippingZone[]) => edit({ shippingZones });
  const setPay = (i: number, patch: Partial<PaymentMethodOption>) => edit({ paymentMethods: s.paymentMethods.map((p, k) => (k === i ? { ...p, ...patch } : p)) });

  async function save() {
    if (problem) return setMessage({ tone: "error", text: L.errors[problem] });
    setBusy(true);
    setMessage(null);
    setErrors({});
    const res = await fetch("/api/checkout-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) {
      setSaved(s);
      setMessage({ tone: "ok", text: L.saved });
      router.refresh();
      return;
    }
    if (Array.isArray(data.issues)) {
      setErrors(Object.fromEntries(data.issues.map((i: { path: string; code: string }) => [i.path, i.code])));
      // Open the payment method that has the problem
      const bad = data.issues.find((i: { path: string }) => i.path.startsWith("paymentMethods."));
      if (bad) setOpen(s.paymentMethods[Number(bad.path.split(".")[1])]?.id ?? null);
    }
    setMessage({ tone: "error", text: res?.status === 403 ? L.errors.forbidden : (L.errors[data.error as keyof L["errors"]] ?? L.errors.failed) });
  }

  /* ---------- delivery area form ---------- */
  function newZone() {
    setZoneForm({ index: null, zone: { id: "", name: emptyText(), fee: 0, deliveryTime: emptyText(), isActive: true } });
  }
  function zoneFormProblems(z: ShippingZone): Errors {
    const e: Errors = {};
    for (const k of ["ar", "en"] as const) {
      if (!z.name[k].trim()) e[`name.${k}`] = "required";
      if (!z.deliveryTime[k].trim()) e[`deliveryTime.${k}`] = "required";
    }
    if (!(z.fee >= 0) || Number.isNaN(z.fee)) e.fee = "required";
    return e;
  }
  const [zoneErrors, setZoneErrors] = useState<Errors>({});
  function saveZone() {
    if (!zoneForm) return;
    const z = { ...zoneForm.zone, name: { ar: zoneForm.zone.name.ar.trim(), en: zoneForm.zone.name.en.trim() } };
    const e = zoneFormProblems(z);
    setZoneErrors(e);
    if (Object.keys(e).length) return;
    if (zoneForm.index === null) {
      // New id from the English name (e.g. "new-cairo"); made unique if taken
      const base = slugify(z.name.en).slice(0, 30) || "area";
      let id = base;
      for (let n = 2; s.shippingZones.some((x) => x.id === id); n++) id = `${base}-${n}`;
      setZones([...s.shippingZones, { ...z, id }]);
    } else setZones(s.shippingZones.map((x, k) => (k === zoneForm.index ? z : x)));
    setZoneForm(null);
  }
  const zf = zoneForm?.zone;
  const setZf = (patch: Partial<ShippingZone>) => zoneForm && setZoneForm({ ...zoneForm, zone: { ...zoneForm.zone, ...patch } });
  const zErr = (k: string) => (zoneErrors[k] ? L.errors.required : null);

  // VAT example: 10 g of gold + making charge
  const exGold = 60000;
  const exMaking = 6000;
  const exVat = s.vatBase === "none" ? 0 : ((s.vatBase === "total" ? exGold + exMaking : exMaking) * (s.vatPercent || 0)) / 100;
  const pickupBranches = branches.filter((b) => b.isPickupPoint).sort((a, b) => a.sortOrder - b.sortOrder);
  const P = L.payments;
  const Z = L.zones;

  return (
    <div className="flex flex-col gap-5 pb-24">
      {problem && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-[#f6e0dc] px-4 py-3 text-sm font-semibold text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {L.errors[problem]}
        </p>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* 1. Delivery areas */}
        <Card title={Z.title}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{Z.note}</p>
            {canEdit && (
              <button type="button" onClick={newZone} disabled={disabled} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60">
                <Plus className="size-4" />
                {Z.add}
              </button>
            )}
          </div>
          {err("shippingZones") && <p className="text-sm font-semibold text-destructive">{err("shippingZones")}</p>}
          {s.shippingZones.length === 0 ? (
            <p className="rounded-lg bg-muted px-4 py-6 text-center text-sm text-muted-foreground">{Z.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 text-start font-semibold">{Z.columns.area}</th>
                    <th className="py-2 text-start font-semibold">{Z.columns.fee}</th>
                    <th className="py-2 text-start font-semibold">{Z.columns.freeOver}</th>
                    <th className="py-2 text-start font-semibold">{Z.columns.time}</th>
                    <th className="py-2 text-start font-semibold">{Z.columns.active}</th>
                    {canEdit && <th className="w-px py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {s.shippingZones.map((z, i) => {
                    const bad = Object.keys(errors).some((k) => k.startsWith(`shippingZones.${i}.`));
                    return (
                      <tr key={z.id} className={cn("border-b last:border-0", !z.isActive && "text-muted-foreground", bad && "bg-[#f6e0dc]")}>
                        <td className="py-2.5 font-semibold">{t(z.name)}</td>
                        <td className="py-2.5">{z.fee ? money(z.fee) : Z.free}</td>
                        <td className="py-2.5">{z.freeOver !== undefined ? money(z.freeOver) : Z.none}</td>
                        <td className="py-2.5">{t(z.deliveryTime)}</td>
                        <td className="py-2.5">
                          <Switch checked={z.isActive} disabled={disabled} label={`${Z.columns.active} — ${t(z.name)}`} onChange={(v) => setZones(s.shippingZones.map((x, k) => (k === i ? { ...x, isActive: v } : x)))} />
                        </td>
                        {canEdit && (
                          <td className="py-2.5">
                            <div className="flex">
                              <button type="button" aria-label={`${Z.moveUp} — ${t(z.name)}`} disabled={disabled || i === 0} onClick={() => setZones(move(s.shippingZones, i, -1))} className="rounded-md p-2 hover:bg-muted disabled:opacity-30">
                                <ArrowUp className="size-4" />
                              </button>
                              <button type="button" aria-label={`${Z.moveDown} — ${t(z.name)}`} disabled={disabled || i === s.shippingZones.length - 1} onClick={() => setZones(move(s.shippingZones, i, 1))} className="rounded-md p-2 hover:bg-muted disabled:opacity-30">
                                <ArrowDown className="size-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={`${Z.edit} — ${t(z.name)}`}
                                disabled={disabled}
                                onClick={() => {
                                  setZoneErrors({});
                                  setZoneForm({ index: i, zone: structuredClone(z) });
                                }}
                                className="rounded-md p-2 hover:bg-muted"
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button type="button" aria-label={`${Z.delete} — ${t(z.name)}`} disabled={disabled} onClick={() => setZoneDelete(i)} className="rounded-md p-2 text-destructive hover:bg-[#f6e0dc]">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          {/* 2. Branch pickup */}
          <Card title={L.pickup.title}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold">{L.pickup.toggle}</span>
              <Switch checked={s.storePickup !== false} disabled={disabled} label={L.pickup.toggle} onChange={(v) => edit({ storePickup: v })} />
            </div>
            {s.storePickup !== false && (
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold">{L.pickup.branches}</span>
                {pickupBranches.length === 0 ? (
                  <p className="text-destructive">{L.pickup.noBranches}</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {pickupBranches.map((b) => (
                      <li key={b.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted px-3 py-2">
                        <span className="font-semibold">{t(b.name)}</span>
                        <span className="text-muted-foreground">{t(b.city)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">{L.pickup.manage}</p>
              </div>
            )}
          </Card>

          {/* 3. VAT & minimum order */}
          <Card title={L.tax.title}>
            <Field label={L.tax.vatPercent} error={err("vatPercent")}>
              <input type="number" min={0} max={100} step="any" dir="ltr" disabled={disabled} value={Number.isNaN(s.vatPercent) ? "" : s.vatPercent} onChange={(e) => edit({ vatPercent: e.target.value === "" ? NaN : Number(e.target.value) })} className={cn(box, "w-32", err("vatPercent") ? "border-destructive" : "border-input")} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{L.tax.vatBase}</span>
              <div role="radiogroup" aria-label={L.tax.vatBase} className="flex flex-wrap gap-1.5">
                {(["making_charge", "total", "none"] as const).map((b) => (
                  <button key={b} type="button" role="radio" aria-checked={s.vatBase === b} disabled={disabled} onClick={() => edit({ vatBase: b })} className={cn("h-9 rounded-full border px-3 text-sm", s.vatBase === b ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted")}>
                    {L.tax.bases[b]}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{fill(L.tax.example, { gold: money(exGold), making: money(exMaking), vat: money(exVat) })}</span>
            </div>
            <Field label={fill(L.tax.minOrder, { currency })} hint={L.tax.minOrderHint} error={err("minOrderTotal")}>
              <input type="number" min={0} dir="ltr" disabled={disabled} value={s.minOrderTotal ?? ""} onChange={(e) => edit({ minOrderTotal: numOrUndef(e.target.value) })} className={cn(box, "w-44", err("minOrderTotal") ? "border-destructive" : "border-input")} />
            </Field>
          </Card>
        </div>
      </div>

      {/* 4. Payment methods */}
      <Card title={P.title}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{P.hint}</p>
          {canEdit && s.paymentMethods.length < MAX_PAYMENT_METHODS && (
            <button type="button" onClick={() => setPayForm({ type: "bank_transfer", label: emptyText(), tried: false })} disabled={disabled} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60">
              <Plus className="size-4" />
              {P.add}
            </button>
          )}
        </div>
        <ol className="flex flex-col gap-2">
          {s.paymentMethods.map((p, i) => {
            const isOpen = open === p.id;
            const bad = Object.keys(errors).some((k) => k.startsWith(`paymentMethods.${i}.`));
            const pe = (k: string) => err(`paymentMethods.${i}.${k}`);
            const setText = (key: "label" | "description" | "instructions", lang: Locale, v: string) => setPay(i, { [key]: { ...(p[key] ?? emptyText()), [lang]: v } });
            return (
              <li key={p.id} className={cn("rounded-lg border", bad ? "border-destructive" : "border-border", !p.isActive && "bg-muted/40")}>
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <Switch checked={p.isActive} disabled={disabled} label={t(p.label)} onChange={(v) => setPay(i, { isActive: v })} />
                  <div className="flex min-w-0 flex-1 basis-40 flex-col">
                    <span className={cn("font-semibold", !p.isActive && "text-muted-foreground")}>{t(p.label)}</span>
                    <span className="text-xs text-muted-foreground">
                      {P.types[p.type]} · {p.availableFor.map((d) => (d === "delivery" ? P.delivery : P.pickup)).join(" + ") || "—"}
                      {p.maxOrderTotal !== undefined && ` · ${fill(P.upTo, { amount: money(p.maxOrderTotal) })}`}
                    </span>
                  </div>
                  <div className="ms-auto flex items-center">
                    {canEdit && (
                      <>
                        <button type="button" aria-label={`${P.moveUp} — ${t(p.label)}`} disabled={disabled || i === 0} onClick={() => edit({ paymentMethods: move(s.paymentMethods, i, -1) })} className="rounded-md p-2 hover:bg-muted disabled:opacity-30">
                          <ArrowUp className="size-4" />
                        </button>
                        <button type="button" aria-label={`${P.moveDown} — ${t(p.label)}`} disabled={disabled || i === s.paymentMethods.length - 1} onClick={() => edit({ paymentMethods: move(s.paymentMethods, i, 1) })} className="rounded-md p-2 hover:bg-muted disabled:opacity-30">
                          <ArrowDown className="size-4" />
                        </button>
                        <button type="button" aria-label={`${P.delete} — ${t(p.label)}`} disabled={disabled || s.paymentMethods.length === 1} onClick={() => setPayDelete(i)} className="rounded-md p-2 text-destructive hover:bg-[#f6e0dc] disabled:opacity-30">
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.id)} className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-semibold hover:bg-muted">
                      {isOpen ? P.hideDetails : P.details}
                      <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                    <Field label={P.labelAr} error={pe("label.ar")}>
                      <input dir="rtl" maxLength={60} disabled={disabled} value={p.label.ar} onChange={(e) => setText("label", "ar", e.target.value)} className={cn(box, pe("label.ar") ? "border-destructive" : "border-input")} />
                    </Field>
                    <Field label={P.labelEn} error={pe("label.en")}>
                      <input dir="ltr" maxLength={60} disabled={disabled} value={p.label.en} onChange={(e) => setText("label", "en", e.target.value)} className={cn(box, pe("label.en") ? "border-destructive" : "border-input")} />
                    </Field>
                    <Field label={P.descAr}>
                      <input dir="rtl" maxLength={200} disabled={disabled} value={p.description?.ar ?? ""} onChange={(e) => setText("description", "ar", e.target.value)} className={cn(box, "border-input")} />
                    </Field>
                    <Field label={P.descEn}>
                      <input dir="ltr" maxLength={200} disabled={disabled} value={p.description?.en ?? ""} onChange={(e) => setText("description", "en", e.target.value)} className={cn(box, "border-input")} />
                    </Field>
                    {p.type === "bank_transfer" && (
                      <>
                        <Field label={P.instructionsAr} hint={P.instructionsHint}>
                          <textarea dir="rtl" rows={4} maxLength={1000} disabled={disabled} value={p.instructions?.ar ?? ""} onChange={(e) => setText("instructions", "ar", e.target.value)} className={cn(box, "h-auto border-input py-2 leading-relaxed font-normal")} />
                        </Field>
                        <Field label={P.instructionsEn} hint={P.instructionsHint}>
                          <textarea dir="ltr" rows={4} maxLength={1000} disabled={disabled} value={p.instructions?.en ?? ""} onChange={(e) => setText("instructions", "en", e.target.value)} className={cn(box, "h-auto border-input py-2 leading-relaxed font-normal")} />
                        </Field>
                      </>
                    )}
                    <Field label={fill(P.maxTotal, { currency })} hint={P.maxTotalHint} error={pe("maxOrderTotal")}>
                      <input type="number" min={0} dir="ltr" disabled={disabled} value={p.maxOrderTotal ?? ""} onChange={(e) => setPay(i, { maxOrderTotal: numOrUndef(e.target.value) })} className={cn(box, "w-44", pe("maxOrderTotal") ? "border-destructive" : "border-input")} />
                    </Field>
                    <fieldset className="flex flex-col gap-1.5">
                      <legend className={cn("mb-1.5 text-sm font-semibold", pe("availableFor") && "text-destructive")}>{P.availableFor}</legend>
                      {(["delivery", "store_pickup"] as const).map((d) => (
                        <label key={d} className="flex min-h-9 items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--gold)]"
                            disabled={disabled}
                            checked={p.availableFor.includes(d)}
                            onChange={(e) => setPay(i, { availableFor: e.target.checked ? [...p.availableFor, d] : p.availableFor.filter((x) => x !== d) })}
                          />
                          {d === "delivery" ? P.delivery : P.pickup}
                        </label>
                      ))}
                      {(pe("availableFor") || p.availableFor.length === 0) && <span className="text-xs text-destructive">{L.errors.chooseOne}</span>}
                    </fieldset>
                    {p.type === "card" && <p className="rounded-lg bg-accent px-3 py-2 text-xs sm:col-span-2">{P.cardNote}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </Card>

      {/* Save bar — sticks to the bottom of the screen */}
      {canEdit && (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-7 lg:px-7">
          {message ? (
            <p role={message.tone === "error" ? "alert" : "status"} className={cn("me-auto text-sm font-semibold", message.tone === "error" ? "text-destructive" : "text-[var(--status-done-fg)]")}>
              {message.text}
            </p>
          ) : (
            dirty && <p className="me-auto text-sm font-semibold text-muted-foreground">{L.unsaved}</p>
          )}
          {dirty && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setS(saved);
                setErrors({});
                setMessage(null);
              }}
              className="h-11 rounded-lg px-4 text-sm font-semibold hover:bg-muted"
            >
              {L.discard}
            </button>
          )}
          <UndoRedo history={history} keyboard disabled={busy} />
          <button type="button" onClick={save} disabled={busy || !dirty} className="h-11 rounded-lg bg-gold px-6 text-sm font-semibold text-gold-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? L.saving : L.save}
          </button>
        </div>
      )}

      {/* Add / edit delivery area */}
      <Dialog open={!!zoneForm} onOpenChange={(o) => !o && setZoneForm(null)}>
        <DialogContent closeLabel={Z.form.cancel}>
          <DialogTitle>{zoneForm?.index === null ? Z.form.newTitle : fill(Z.form.editTitle, { name: t(zf?.name) })}</DialogTitle>
          <DialogDescription className="sr-only">{Z.note}</DialogDescription>
          {zf && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveZone();
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={Z.form.nameAr} error={zErr("name.ar")}>
                  <input dir="rtl" maxLength={60} value={zf.name.ar} placeholder="القاهرة" onChange={(e) => setZf({ name: { ...zf.name, ar: e.target.value } })} className={cn(box, zErr("name.ar") ? "border-destructive" : "border-input")} />
                </Field>
                <Field label={Z.form.nameEn} error={zErr("name.en")}>
                  <input dir="ltr" maxLength={60} value={zf.name.en} placeholder="Cairo" onChange={(e) => setZf({ name: { ...zf.name, en: e.target.value } })} className={cn(box, zErr("name.en") ? "border-destructive" : "border-input")} />
                </Field>
                <Field label={fill(Z.form.fee, { currency })} error={zErr("fee")}>
                  <input type="number" min={0} dir="ltr" value={Number.isNaN(zf.fee) ? "" : zf.fee} onChange={(e) => setZf({ fee: e.target.value === "" ? NaN : Number(e.target.value) })} className={cn(box, zErr("fee") ? "border-destructive" : "border-input")} />
                </Field>
                <Field label={fill(Z.form.freeOver, { currency })} hint={Z.form.freeOverHint}>
                  <input type="number" min={0} dir="ltr" value={zf.freeOver ?? ""} onChange={(e) => setZf({ freeOver: numOrUndef(e.target.value) })} className={cn(box, "border-input")} />
                </Field>
                <Field label={Z.form.timeAr} error={zErr("deliveryTime.ar")}>
                  <input dir="rtl" maxLength={40} value={zf.deliveryTime.ar} placeholder="١–٢ يوم" onChange={(e) => setZf({ deliveryTime: { ...zf.deliveryTime, ar: e.target.value } })} className={cn(box, zErr("deliveryTime.ar") ? "border-destructive" : "border-input")} />
                </Field>
                <Field label={Z.form.timeEn} error={zErr("deliveryTime.en")}>
                  <input dir="ltr" maxLength={40} value={zf.deliveryTime.en} placeholder={Z.form.timePlaceholder} onChange={(e) => setZf({ deliveryTime: { ...zf.deliveryTime, en: e.target.value } })} className={cn(box, zErr("deliveryTime.en") ? "border-destructive" : "border-input")} />
                </Field>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold">{Z.form.active}</span>
                <Switch checked={zf.isActive} label={Z.form.active} onChange={(v) => setZf({ isActive: v })} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setZoneForm(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
                  {Z.form.cancel}
                </button>
                <button type="submit" className="h-11 rounded-lg bg-gold px-5 font-semibold text-gold-foreground">
                  {Z.form.done}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* New payment method */}
      <Dialog open={!!payForm} onOpenChange={(o) => !o && setPayForm(null)}>
        <DialogContent closeLabel={Z.form.cancel}>
          <DialogTitle>{P.addTitle}</DialogTitle>
          <DialogDescription>{P.addHint}</DialogDescription>
          {payForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const label = { ar: payForm.label.ar.trim(), en: payForm.label.en.trim() };
                if (!label.ar || !label.en) return setPayForm({ ...payForm, tried: true });
                // id from the English name (e.g. "instapay"), made unique if taken
                const base = slugify(label.en).slice(0, 30) || payForm.type.replace(/_/g, "-");
                let id = base;
                for (let n = 2; s.paymentMethods.some((x) => x.id === id); n++) id = `${base}-${n}`;
                edit({ paymentMethods: [...s.paymentMethods, { id, type: payForm.type, label, availableFor: defaultAvailability(payForm.type), isActive: true }] });
                setOpen(id); // show its details right away (description, transfer details…)
                setPayForm(null);
              }}
              className="flex flex-col gap-4"
            >
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-sm font-semibold">{P.kind}</legend>
                {PAYMENT_KINDS.map((k) => {
                  const taken = k === "card" && s.paymentMethods.some((x) => x.type === "card");
                  return (
                    <label key={k} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3", payForm.type === k ? "border-gold bg-accent" : "border-input", taken && "cursor-not-allowed opacity-50")}>
                      <input type="radio" name="kind" className="mt-1 accent-[var(--gold)]" disabled={taken} checked={payForm.type === k} onChange={() => setPayForm({ ...payForm, type: k })} />
                      <span className="flex flex-col">
                        <span className="text-sm font-semibold">{P.types[k]}</span>
                        <span className="text-xs text-muted-foreground">{taken ? P.cardExists : P.kindHints[k]}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={P.labelAr} error={payForm.tried && !payForm.label.ar.trim() ? L.errors.required : null}>
                  <input dir="rtl" maxLength={60} placeholder="إنستاباي" value={payForm.label.ar} onChange={(e) => setPayForm({ ...payForm, label: { ...payForm.label, ar: e.target.value } })} className={cn(box, payForm.tried && !payForm.label.ar.trim() ? "border-destructive" : "border-input")} />
                </Field>
                <Field label={P.labelEn} error={payForm.tried && !payForm.label.en.trim() ? L.errors.required : null}>
                  <input dir="ltr" maxLength={60} placeholder="InstaPay" value={payForm.label.en} onChange={(e) => setPayForm({ ...payForm, label: { ...payForm.label, en: e.target.value } })} className={cn(box, payForm.tried && !payForm.label.en.trim() ? "border-destructive" : "border-input")} />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPayForm(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
                  {Z.form.cancel}
                </button>
                <button type="submit" className="h-11 rounded-lg bg-gold px-5 font-semibold text-gold-foreground">
                  {P.addButton}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete payment method */}
      <Dialog open={payDelete !== null} onOpenChange={(o) => !o && setPayDelete(null)}>
        <DialogContent closeLabel={Z.form.cancel}>
          <DialogTitle>{P.delete}</DialogTitle>
          <DialogDescription>{payDelete !== null ? fill(P.deleteConfirm, { name: t(s.paymentMethods[payDelete]?.label) }) : ""}</DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPayDelete(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
              {Z.form.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                edit({ paymentMethods: s.paymentMethods.filter((_, k) => k !== payDelete) });
                setPayDelete(null);
              }}
              className="h-11 rounded-lg bg-destructive px-5 font-semibold text-white"
            >
              {P.delete}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete delivery area */}
      <Dialog open={zoneDelete !== null} onOpenChange={(o) => !o && setZoneDelete(null)}>
        <DialogContent closeLabel={Z.form.cancel}>
          <DialogTitle>{Z.delete}</DialogTitle>
          <DialogDescription>{zoneDelete !== null ? fill(Z.deleteConfirm, { name: t(s.shippingZones[zoneDelete]?.name) }) : ""}</DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setZoneDelete(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
              {Z.form.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                setZones(s.shippingZones.filter((_, k) => k !== zoneDelete));
                setZoneDelete(null);
              }}
              className="h-11 rounded-lg bg-destructive px-5 font-semibold text-white"
            >
              {Z.delete}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
