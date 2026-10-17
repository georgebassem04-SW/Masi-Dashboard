/**
 * DISCOUNT CODES & SPECIAL OFFERS (design screen 13, bottom) — list + add / edit form in a pop-up.
 *   - Two ways to give a discount (first choice in the form):
 *       "Discount code"  -> the customer types the code at checkout
 *       "Special offer"  -> no code; the website shows the lower price on the product (old price crossed out)
 *   - "Which products?" -> all products, or only the ones you pick (search by name / code)
 *   - Types: % of making charge (default for gold) · % of the order · fixed amount · free delivery
 *   - Optional: max discount, minimum order, start / end date, number of uses
 *   - "Suggest text" writes the line the customer sees at checkout in both languages
 *   - Pause / activate, delete (orders that used a code keep it)
 * Saves to POST /api/coupons, PUT /api/coupons/<code>, DELETE /api/coupons/<code>. Rules: lib/validation/pricing.ts
 */
"use client";

import { useState } from "react";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Search, Tag, Trash2 } from "lucide-react";
import type { AdminCoupon, CouponInput, CouponStatus, Locale } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Toggle } from "@/components/theme/fields";

type L = Dictionary["pricing"];
type Kind = "percent_making" | "percent_subtotal" | "amount" | "free_shipping";
/** A product in the "chosen products" picker */
export interface CouponProduct {
  id: string;
  name: string;
  sku: string;
  /** Name in the other language too, so the search finds the product in Arabic or English */
  otherName?: string;
  imageUrl?: string;
}

const TONE: Record<CouponStatus, string> = {
  active: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
  scheduled: "bg-[var(--status-new-bg)] text-[var(--status-new-fg)]",
  paused: "bg-muted text-muted-foreground",
  used_up: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  expired: "bg-[var(--status-cancel-bg)] text-[var(--status-cancel-fg)]",
};

const kindOf = (c: Pick<CouponInput, "type" | "appliesTo">): Kind => (c.type === "percent" ? (c.appliesTo === "subtotal" ? "percent_subtotal" : "percent_making") : c.type);
const input = "h-11 w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function CouponsManager({ coupons, products, currency, canEdit, locale, labels: L }: { coupons: AdminCoupon[]; products: CouponProduct[]; currency: string; canEdit: boolean; locale: Locale; labels: L }) {
  const C = L.coupons;
  const router = useRouter();
  const [editing, setEditing] = useState<AdminCoupon | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const intl = locale === "ar" ? "ar-EG" : "en-US";
  const money = (n: number) => new Intl.NumberFormat(intl, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const num = (n: number) => new Intl.NumberFormat(intl).format(n);
  const date = (iso: string) => new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

  const describe = (c: AdminCoupon) => {
    const k = kindOf(c);
    const main = k === "percent_making" ? fill(C.percentMaking, { v: num(c.value) }) : k === "percent_subtotal" ? fill(C.percentSubtotal, { v: num(c.value) }) : k === "amount" ? fill(C.amount, { amount: money(c.value) }) : C.freeShipping;
    return c.maxDiscount && c.type === "percent" ? `${main} · ${fill(C.upTo, { amount: money(c.maxDiscount) })}` : main;
  };
  /** "All products" or the names of the chosen ones (first two, then "+N") */
  const scope = (c: AdminCoupon) => {
    const ids = c.productIds ?? [];
    if (!ids.length) return C.allProducts;
    const names = ids.map((id) => products.find((p) => p.id === id)?.name).filter(Boolean) as string[];
    return names.length && names.length <= 2 ? names.join(" · ") : fill(C.someProducts, { n: num(ids.length) });
  };
  const validity = (c: AdminCoupon) =>
    [c.startsAt && fill(C.from, { date: date(c.startsAt) }), c.endsAt && fill(C.until, { date: date(c.endsAt) })].filter(Boolean).join(" · ") || C.always;

  async function send(path: string, method: string, body?: unknown) {
    setMessage(null);
    const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) router.refresh();
    else setMessage(L.errors[data.error as keyof L["errors"]] ?? L.errors.failed);
    return res?.ok ?? false;
  }
  const toInput = (c: AdminCoupon): CouponInput => {
    const { usedCount: _u, discountGiven: _d, status: _s, createdAt: _c, ...rest } = c;
    return rest;
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{C.title}</h2>
        {canEdit && (
          <button type="button" onClick={() => setEditing("new")} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gold px-4 text-sm font-semibold text-gold-foreground hover:opacity-90">
            <Plus className="size-4" />
            {C.new}
          </button>
        )}
      </div>
      {message && (
        <p role="alert" className="rounded-lg bg-[#f6e0dc] px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      )}

      {coupons.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{C.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {coupons.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              {c.automatic ? (
                <span className="inline-flex min-w-28 items-center justify-center gap-1 rounded bg-gold px-2 py-1 text-sm font-bold text-gold-foreground">
                  <Tag className="size-3.5" />
                  {C.offerBadge}
                </span>
              ) : (
                <span dir="ltr" className="min-w-28 rounded bg-accent px-2 py-1 text-center font-mono text-sm font-bold">
                  {c.code}
                </span>
              )}
              <div className="flex min-w-48 flex-1 flex-col gap-0.5 text-sm">
                <span className="font-semibold">
                  {describe(c)}
                  {(c.automatic || !!c.productIds?.length) && c.type === "amount" ? ` ${C.perPiece}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {scope(c)} · {c.automatic ? "" : `${C.columns.min}: ${c.minSubtotal ? money(c.minSubtotal) : "—"} · `}
                  {validity(c)}
                </span>
              </div>
              {/* An offer has no code to count, so "used" is only shown for codes */}
              <div className={cn("flex flex-col items-start gap-0.5 text-sm", c.automatic && "invisible")}>
                <span>
                  {C.columns.usage}: <b>{num(c.usedCount)}</b> / {c.usageLimit ? num(c.usageLimit) : C.unlimited}
                </span>
                {c.discountGiven > 0 && <span className="text-xs text-muted-foreground">{fill(C.given, { amount: money(c.discountGiven) })}</span>}
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", TONE[c.status])}>{C.status[c.status]}</span>
              {canEdit && (
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => send(`/api/coupons/${encodeURIComponent(c.code)}`, "PUT", { ...toInput(c), isActive: !c.isActive })} className="h-9 rounded-lg px-2 text-sm font-semibold hover:bg-muted">
                    {c.isActive ? C.pause : C.activate}
                  </button>
                  <button type="button" aria-label={`${C.edit} ${c.automatic ? c.label[locale] : c.code}`} title={C.edit} onClick={() => setEditing(c)} className="rounded-lg p-2 hover:bg-muted">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" aria-label={`${C.delete} ${c.automatic ? c.label[locale] : c.code}`} title={C.delete} onClick={() => setDeleting(c)} className="rounded-lg p-2 text-destructive hover:bg-[#f6e0dc]">
                    <Trash2 className="size-4" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{C.note}</p>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent closeLabel={C.form.cancel} className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          {editing && <CouponForm key={editing === "new" ? "new" : editing.code} coupon={editing === "new" ? null : toInput(editing)} products={products} currency={currency} labels={L} money={money} onDone={() => (setEditing(null), router.refresh())} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent closeLabel={C.form.cancel}>
          <DialogTitle>{C.delete}</DialogTitle>
          <DialogDescription>{deleting ? fill(C.deleteConfirm, { code: deleting.automatic ? deleting.label[locale] : deleting.code }) : ""}</DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleting(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
              {C.form.cancel}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (deleting) await send(`/api/coupons/${encodeURIComponent(deleting.code)}`, "DELETE");
                setDeleting(null);
              }}
              className="h-11 rounded-lg bg-destructive px-5 font-semibold text-white"
            >
              {C.delete}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Date box value <-> ISO time: a start date means 00:00 that day, an end date means the end of that day (local time) */
const toDay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-CA") : "");
const fromDay = (day: string, end: boolean) => (day ? new Date(`${day}T${end ? "23:59:59" : "00:00:00"}`).toISOString() : undefined);

/** Internal name of a special offer (the customer never sees it) */
const randomCode = (prefix = "") => prefix + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

function CouponForm({
  coupon,
  products,
  currency,
  labels: L,
  money,
  onDone,
  onCancel,
}: {
  coupon: CouponInput | null;
  products: CouponProduct[];
  currency: string;
  labels: L;
  money: (n: number) => string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const F = L.coupons.form;
  // "offer" = special offer with no code · "code" = the customer types a code
  const [mode, setMode] = useState<"code" | "offer">(coupon?.automatic ? "offer" : "code");
  const offer = mode === "offer";
  // Which products: all, or only the chosen ones
  const [limited, setLimited] = useState(!!coupon?.productIds?.length);
  const [productIds, setProductIds] = useState<string[]>(coupon?.productIds ?? []);
  const [search, setSearch] = useState("");
  const [code, setCode] = useState(coupon?.code ?? "");
  const [kind, setKind] = useState<Kind>(coupon ? kindOf(coupon) : "percent_making");
  const [value, setValue] = useState(coupon ? String(coupon.value) : "10");
  const [maxDiscount, setMaxDiscount] = useState(coupon?.maxDiscount ? String(coupon.maxDiscount) : "");
  const [minSubtotal, setMinSubtotal] = useState(coupon ? String(coupon.minSubtotal) : "0");
  const [startsAt, setStartsAt] = useState(toDay(coupon?.startsAt));
  const [endsAt, setEndsAt] = useState(toDay(coupon?.endsAt));
  const [usageLimit, setUsageLimit] = useState(coupon?.usageLimit ? String(coupon.usageLimit) : "");
  const [labelAr, setLabelAr] = useState(coupon?.label.ar ?? "");
  const [labelEn, setLabelEn] = useState(coupon?.label.en ?? "");
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // UNDO / REDO: every field of the coupon / offer form
  const history = useUndoRedo({ mode, limited, productIds, code, kind, value, maxDiscount, minSubtotal, startsAt, endsAt, usageLimit, labelAr, labelEn, isActive }, (v) => {
    setMode(v.mode);
    setLimited(v.limited);
    setProductIds(v.productIds);
    setCode(v.code);
    setKind(v.kind);
    setValue(v.value);
    setMaxDiscount(v.maxDiscount);
    setMinSubtotal(v.minSubtotal);
    setStartsAt(v.startsAt);
    setEndsAt(v.endsAt);
    setUsageLimit(v.usageLimit);
    setLabelAr(v.labelAr);
    setLabelEn(v.labelEn);
    setIsActive(v.isActive);
    setErrors({});
  });
  const percent = kind === "percent_making" || kind === "percent_subtotal";

  const suggest = () => {
    const v = Number(value) || 0;
    const min = Number(minSubtotal) || 0;
    const vAr = new Intl.NumberFormat("ar-EG").format(v);
    const moneyAr = (n: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
    const moneyEn = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
    // For an offer or chosen products "off your order" would be wrong — the discount is on the piece
    const piece = offer || limited;
    const ar = { percent_making: `خصم ${vAr}٪ على المصنعية`, percent_subtotal: piece ? `خصم ${vAr}٪` : `خصم ${vAr}٪ على الطلب`, amount: `خصم ${moneyAr(v)}`, free_shipping: "شحن مجاني" }[kind];
    const en = { percent_making: `${v}% off making charges`, percent_subtotal: piece ? `${v}% off` : `${v}% off your order`, amount: `${moneyEn(v)} off`, free_shipping: "Free delivery" }[kind];
    // An offer has no minimum order, so its text is just the discount
    setLabelAr(min && !offer ? `${ar} للطلبات فوق ${moneyAr(min)}` : ar);
    setLabelEn(min && !offer ? `${en} on orders over ${moneyEn(min)}` : en);
  };

  async function submit() {
    setBusy(true);
    setMessage(null);
    setErrors({});
    if (limited && productIds.length === 0) {
      setBusy(false);
      setErrors({ productIds: "productsRequired" });
      return setMessage(L.errors.validation);
    }
    const body: CouponInput = {
      // An offer keeps its internal name when edited; a new one gets one made for it
      code: offer ? (coupon?.automatic ? coupon.code : randomCode("OFFER-")) : code.trim().toUpperCase(),
      type: percent ? "percent" : kind === "amount" ? "amount" : "free_shipping",
      appliesTo: kind === "percent_making" ? "making_charge" : "subtotal",
      value: kind === "free_shipping" ? 0 : Number(value) || 0,
      maxDiscount: percent && Number(maxDiscount) > 0 ? Number(maxDiscount) : undefined,
      minSubtotal: offer ? 0 : Number(minSubtotal) || 0,
      startsAt: fromDay(startsAt, false),
      endsAt: fromDay(endsAt, true),
      usageLimit: !offer && Number(usageLimit) > 0 ? Math.floor(Number(usageLimit)) : undefined,
      productIds: limited ? productIds : undefined,
      automatic: offer || undefined,
      label: { ar: labelAr.trim(), en: labelEn.trim() },
      isActive,
    };
    const res = await fetch(coupon ? `/api/coupons/${encodeURIComponent(coupon.code)}` : "/api/coupons", {
      method: coupon ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) return onDone();
    if (Array.isArray(data.issues)) setErrors(Object.fromEntries(data.issues.map((i: { path: string; code: string }) => [i.path, i.code])));
    if (data.error === "code_taken") setErrors({ code: "code_taken" });
    setMessage(L.errors[data.error as keyof L["errors"]] ?? L.errors.failed);
  }
  const err = (k: string) => (errors[k] ? L.errors[errors[k] as keyof L["errors"]] ?? L.errors.required : null);
  const field = (label: string, key: string, el: React.ReactNode, hint?: string) => (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
      {label}
      <span className={cn("contents", err(key) && "[&_input]:border-destructive")}>{el}</span>
      {(err(key) || hint) && <span className={cn("text-xs font-normal", err(key) ? "text-destructive" : "text-muted-foreground")}>{err(key) ?? hint}</span>}
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4"
    >
      <DialogTitle>{offer ? (coupon ? F.editOfferTitle : F.newOfferTitle) : coupon ? fill(F.editTitle, { code: coupon.code }) : F.newTitle}</DialogTitle>
      <DialogDescription className="sr-only">{F.newTitle}</DialogDescription>

      {/* 1) Code or special offer */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{F.mode}</span>
        <div role="radiogroup" aria-label={F.mode} className="grid grid-cols-2 gap-1.5">
          {(["code", "offer"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m);
                // Free delivery isn't a product price, so an offer can't be that
                if (m === "offer" && kind === "free_shipping") setKind("percent_making");
              }}
              className={cn("min-h-10 rounded-lg border px-3 py-2 text-sm", mode === m ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted")}
            >
              {F.modes[m]}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{F.modeHints[mode]}</span>
      </div>

      {!offer && field(
        F.code,
        "code",
        <div className="flex gap-2">
          <input dir="ltr" className={cn(input, "border-input font-mono uppercase")} maxLength={30} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} />
          <button type="button" onClick={() => setCode(randomCode())} className="h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-gold hover:bg-muted">
            {F.generate}
          </button>
        </div>,
        F.codeHint,
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{F.kind}</span>
        <div role="radiogroup" aria-label={F.kind} className="grid grid-cols-2 gap-1.5">
          {(["percent_making", "percent_subtotal", "amount", "free_shipping"] as Kind[]).filter((k) => !offer || k !== "free_shipping").map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cn("min-h-10 rounded-lg border px-3 py-2 text-sm", kind === k ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted")}>
              {F.kinds[k]}
            </button>
          ))}
        </div>
        {err("type") && <span className="text-xs text-destructive">{err("type")}</span>}
      </div>

      {/* 2) Which products get it */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{F.scope}</span>
        <div role="radiogroup" aria-label={F.scope} className="grid grid-cols-2 gap-1.5">
          {([false, true] as const).map((some) => (
            <button key={String(some)} type="button" role="radio" aria-checked={limited === some} onClick={() => setLimited(some)} className={cn("min-h-10 rounded-lg border px-3 py-2 text-sm", limited === some ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted")}>
              {F.scopes[some ? "some" : "all"]}
            </button>
          ))}
        </div>
        {limited && <ProductPicker products={products} value={productIds} onChange={(ids) => (setProductIds(ids), setErrors(({ productIds: _p, ...rest }) => rest))} search={search} onSearch={setSearch} labels={F} error={err("productIds")} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {kind !== "free_shipping" &&
          field(percent ? F.percent : fill(F.amountValue, { currency }), "value", <input type="number" min={0} step="any" dir="ltr" className={cn(input, "border-input")} value={value} onChange={(e) => setValue(e.target.value)} />)}
        {percent && field(fill(offer || limited ? F.maxDiscountPiece : F.maxDiscount, { currency }), "maxDiscount", <input type="number" min={0} dir="ltr" className={cn(input, "border-input")} value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} />)}
        {!offer && field(fill(F.minSubtotal, { currency }), "minSubtotal", <input type="number" min={0} dir="ltr" className={cn(input, "border-input")} value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} />, Number(minSubtotal) > 0 ? money(Number(minSubtotal)) : F.minHint)}
        {!offer && field(F.usageLimit, "usageLimit", <input type="number" min={1} dir="ltr" className={cn(input, "border-input")} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />, F.usageHint)}
        {field(F.startsAt, "startsAt", <input type="date" className={cn(input, "border-input")} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />)}
        {field(F.endsAt, "endsAt", <input type="date" min={startsAt || undefined} className={cn(input, "border-input")} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />)}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <button type="button" onClick={suggest} className="self-start text-sm font-semibold text-gold hover:underline">
          {F.suggest}
        </button>
        {field(F.labelAr, "label.ar", <input dir="rtl" className={cn(input, "border-input")} maxLength={120} value={labelAr} onChange={(e) => setLabelAr(e.target.value)} />)}
        {field(F.labelEn, "label.en", <input dir="ltr" className={cn(input, "border-input")} maxLength={120} value={labelEn} onChange={(e) => setLabelEn(e.target.value)} />)}
      </div>

      <Toggle label={F.active} checked={isActive} onChange={setIsActive} />

      {message && (
        <p role="alert" className="rounded-lg bg-[#f6e0dc] px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <UndoRedo history={history} disabled={busy} className="me-auto" />
        <button type="button" onClick={onCancel} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
          {F.cancel}
        </button>
        <button type="submit" disabled={busy} className="h-11 rounded-lg bg-gold px-5 font-semibold text-gold-foreground disabled:opacity-60">
          {busy ? F.saving : coupon ? F.save : offer ? F.createOffer : F.create}
        </button>
      </div>
    </form>
  );
}

/** Tick the products that get the discount. Search matches the name (Arabic or English) or the code (SKU). */
function ProductPicker({
  products,
  value,
  onChange,
  search,
  onSearch,
  labels: F,
  error,
}: {
  products: CouponProduct[];
  value: string[];
  onChange: (ids: string[]) => void;
  search: string;
  onSearch: (q: string) => void;
  labels: L["coupons"]["form"];
  error: string | null;
}) {
  const q = search.trim().toLowerCase();
  const chosen = new Set(value);
  // Chosen products first, so they stay in view while searching for more
  const shown = products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || !!p.otherName?.toLowerCase().includes(q)).sort((a, b) => Number(chosen.has(b.id)) - Number(chosen.has(a.id)));
  const toggle = (id: string) => onChange(chosen.has(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border p-2", error && "border-destructive")}>
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" aria-label={F.productSearch} placeholder={F.productSearch} className={cn(input, "h-10 border-input ps-9")} value={search} onChange={(e) => onSearch(e.target.value)} />
        </label>
        <span className="shrink-0 text-xs font-semibold">{fill(F.productsChosen, { n: value.length })}</span>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="shrink-0 rounded px-1.5 text-xs font-semibold text-destructive hover:underline">
            {F.clearProducts}
          </button>
        )}
      </div>
      <ul className="flex max-h-56 flex-col overflow-y-auto">
        {shown.length === 0 && <li className="px-2 py-3 text-center text-sm text-muted-foreground">{F.productsNone}</li>}
        {shown.slice(0, 200).map((p) => {
          const on = chosen.has(p.id);
          return (
            <li key={p.id}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(p.id)} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-muted", on && "bg-accent")}>
                <span className={cn("flex size-5 shrink-0 items-center justify-center rounded border", on ? "border-gold bg-gold text-gold-foreground" : "border-input bg-card")}>{on && <Check className="size-3.5" />}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.imageUrl ? <img src={p.imageUrl} alt="" className="size-9 shrink-0 rounded object-cover" /> : <span className="size-9 shrink-0 rounded bg-muted" />}
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span dir="ltr" className="shrink-0 font-mono text-xs text-muted-foreground">
                  {p.sku}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <span className={cn("px-1 text-xs", error ? "text-destructive" : "text-muted-foreground")}>{error ?? F.productsHint}</span>
    </div>
  );
}
