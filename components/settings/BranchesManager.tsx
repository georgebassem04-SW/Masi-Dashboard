/**
 * BRANCHES — list (↑ ↓ order, pickup point, edit, delete) + add / edit form in a window.
 * Saves right away: POST /api/branches, PUT /api/branches/<id>, DELETE /api/branches/<id>, PUT /api/branches/order.
 * The website shows them on the contact page and in "pick up from branch" at checkout (only pickup points).
 */
"use client";

import { useEffect, useState } from "react";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, MapPin, Pencil, Phone, Plus, Store, Trash2 } from "lucide-react";
import type { Branch, BranchInput, Locale, LocalizedText } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { MediaLabels } from "@/components/media/MediaBrowser";
import { ImageField } from "@/components/theme/ImageField";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Card, Field, Message, Switch, TextBox, fieldErrors, send } from "./ui";

type L = Dictionary["settings"];
const empty = (): LocalizedText => ({ ar: "", en: "" });
const blank = (): BranchInput => ({ name: empty(), city: empty(), address: empty(), phone: "", whatsapp: "", hours: empty(), mapUrl: "", isPickupPoint: true });

export function BranchesManager({
  branches,
  canEdit,
  locale,
  storefrontUrl,
  labels: L,
  imageLabels,
  mediaLabels,
}: {
  branches: Branch[];
  canEdit: boolean;
  locale: Locale;
  storefrontUrl: string;
  labels: L;
  imageLabels: { choose: string; change: string; remove: string; or: string; none: string };
  mediaLabels: MediaLabels;
}) {
  const router = useRouter();
  const B = L.branches;
  const F = B.form;
  const [list, setList] = useState(branches);
  const [form, setForm] = useState<{ id: string | null; data: BranchInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formRound, setFormRound] = useState(0);
  // UNDO / REDO for the branch pop-up (starts again every time it opens: formRound)
  const history = useUndoRedo(form?.data ?? null, (v) => setForm((f) => (f && v ? { ...f, data: v } : f)), form ? formRound : -1);
  const [confirm, setConfirm] = useState<Branch | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const t = (x: LocalizedText) => x[locale] || x.ar || x.en;
  const errText = (code?: string) => (code ? (L.errors[code as keyof L["errors"]] ?? L.errors.required) : null);
  const err = (k: string) => errText(errors[k]);
  const fail = (data: { error?: string }) => setMessage({ tone: "error", text: L.errors[data.error as keyof L["errors"]] ?? L.errors.failed });
  // New list from the server after each change (router.refresh)
  useEffect(() => setList(branches), [branches]);

  async function saveForm() {
    if (!form) return;
    setBusy(true);
    setErrors({});
    const { res, data } = await send(form.id ? `/api/branches/${encodeURIComponent(form.id)}` : "/api/branches", form.id ? "PUT" : "POST", form.data);
    setBusy(false);
    if (res?.ok) {
      setForm(null);
      setMessage({ tone: "ok", text: L.common.saved });
      router.refresh();
    } else if (res?.status === 422) setErrors(fieldErrors(data));
    else {
      setForm(null);
      fail(data);
    }
  }

  async function move(i: number, by: number) {
    const next = [...list];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    setList(next);
    setBusy(true);
    const { res, data } = await send("/api/branches/order", "PUT", { ids: next.map((b) => b.id) });
    setBusy(false);
    if (!res?.ok) fail(data);
    router.refresh();
  }

  async function togglePickup(b: Branch, isPickupPoint: boolean) {
    const { id: _id, sortOrder: _s, ...rest } = b;
    setList((l) => l.map((x) => (x.id === b.id ? { ...x, isPickupPoint } : x)));
    const { res, data } = await send(`/api/branches/${encodeURIComponent(b.id)}`, "PUT", { ...rest, isPickupPoint });
    if (!res?.ok) fail(data);
    router.refresh();
  }

  async function remove(b: Branch) {
    setConfirm(null);
    setBusy(true);
    const { res, data } = await send(`/api/branches/${encodeURIComponent(b.id)}`, "DELETE");
    setBusy(false);
    if (res?.ok) setMessage({ tone: "ok", text: L.common.saved });
    else fail(data);
    router.refresh();
  }

  const d = form?.data;
  const setD = (patch: Partial<BranchInput>) => form && setForm({ ...form, data: { ...form.data, ...patch } });
  const lt = (key: "name" | "city" | "address" | "hours", labelAr: string, labelEn: string, max: number) => (
    <>
      <Field label={labelAr} error={err(`${key}.ar`)}>
        <TextBox dir="rtl" maxLength={max} value={d![key].ar} onChange={(e) => setD({ [key]: { ...d![key], ar: e.target.value } })} error={err(`${key}.ar`)} />
      </Field>
      <Field label={labelEn} error={err(`${key}.en`)}>
        <TextBox dir="ltr" maxLength={max} value={d![key].en} onChange={(e) => setD({ [key]: { ...d![key], en: e.target.value } })} error={err(`${key}.en`)} />
      </Field>
    </>
  );

  return (
    <Card
      title={B.title}
      hint={B.hint}
      action={
        canEdit && (
          <button
            type="button"
            onClick={() => {
              setErrors({});
              setFormRound((n) => n + 1);
              setForm({ id: null, data: blank() });
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted"
          >
            <Plus className="size-4" />
            {B.add}
          </button>
        )
      }
    >
      {list.length > 0 && !list.some((b) => b.isPickupPoint) && <Message tone="error">{B.noPickupWarning}</Message>}
      {message && <Message tone={message.tone}>{message.text}</Message>}
      {list.length === 0 ? (
        <p className="rounded-lg bg-muted px-4 py-8 text-center text-sm text-muted-foreground">{B.empty}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {list.map((b, i) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-gold">
                <Store className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
                <span className="font-semibold">
                  {t(b.name)} <span className="text-sm font-normal text-muted-foreground">· {t(b.city)}</span>
                </span>
                <span className="text-xs text-muted-foreground">{t(b.address)}</span>
                <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1" dir="ltr">
                    <Phone className="size-3" />
                    {b.phone}
                  </span>
                  <span>{t(b.hours)}</span>
                  {b.mapUrl && (
                    <a href={b.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold hover:underline">
                      <MapPin className="size-3" />
                      {B.map}
                    </a>
                  )}
                </span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={b.isPickupPoint} disabled={!canEdit || busy} label={`${B.pickup} — ${t(b.name)}`} onChange={(v) => togglePickup(b, v)} />
                <span className={cn(!b.isPickupPoint && "text-muted-foreground")}>{b.isPickupPoint ? B.pickup : B.notPickup}</span>
              </label>
              {canEdit && (
                <div className="flex">
                  <button type="button" aria-label={`${L.common.moveUp} — ${t(b.name)}`} disabled={busy || i === 0} onClick={() => move(i, -1)} className="rounded-md p-2 hover:bg-muted disabled:opacity-30">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" aria-label={`${L.common.moveDown} — ${t(b.name)}`} disabled={busy || i === list.length - 1} onClick={() => move(i, 1)} className="rounded-md p-2 hover:bg-muted disabled:opacity-30">
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${L.common.edit} — ${t(b.name)}`}
                    onClick={() => {
                      const { id, sortOrder: _s, ...rest } = b;
                      setErrors({});
                      setFormRound((n) => n + 1);
                      setForm({ id, data: { ...blank(), ...structuredClone(rest) } });
                    }}
                    className="rounded-md p-2 hover:bg-muted"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" aria-label={`${L.common.delete} — ${t(b.name)}`} onClick={() => setConfirm(b)} className="rounded-md p-2 text-destructive hover:bg-[#f6e0dc]">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {/* Add / edit */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent closeLabel={F.cancel} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>{form?.id ? fill(F.editTitle, { name: t(form.data.name) }) : F.newTitle}</DialogTitle>
          <DialogDescription className="sr-only">{B.hint}</DialogDescription>
          {d && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveForm();
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {lt("name", F.nameAr, F.nameEn, 80)}
                {lt("city", F.cityAr, F.cityEn, 60)}
                {lt("address", F.addressAr, F.addressEn, 200)}
                <Field label={F.phone} error={err("phone")}>
                  <TextBox type="tel" dir="ltr" maxLength={30} value={d.phone} onChange={(e) => setD({ phone: e.target.value })} error={err("phone")} />
                </Field>
                <Field label={F.whatsapp} error={err("whatsapp")}>
                  <TextBox type="tel" dir="ltr" maxLength={30} value={d.whatsapp ?? ""} onChange={(e) => setD({ whatsapp: e.target.value })} error={err("whatsapp")} />
                </Field>
                {lt("hours", F.hoursAr, F.hoursEn, 120)}
                <Field label={F.mapUrl} hint={F.mapHint} error={err("mapUrl")} className="sm:col-span-2">
                  <TextBox type="url" dir="ltr" maxLength={300} placeholder="https://maps.app.goo.gl/…" value={d.mapUrl ?? ""} onChange={(e) => setD({ mapUrl: e.target.value.trim() })} error={err("mapUrl")} />
                </Field>
              </div>
              <ImageField frame="branch" label={F.image} value={d.image?.url ?? ""} onChange={(url) => setD({ image: url ? { url } : undefined })} storefrontUrl={storefrontUrl} labels={imageLabels} mediaLabels={mediaLabels} locale={locale} />
              <label className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm font-semibold">{F.pickup}</span>
                <Switch checked={d.isPickupPoint} label={F.pickup} onChange={(v) => setD({ isPickupPoint: v })} />
              </label>
              <div className="flex justify-end gap-2">
                <UndoRedo history={history} disabled={busy} className="me-auto" />
                <button type="button" onClick={() => setForm(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
                  {F.cancel}
                </button>
                <button type="submit" disabled={busy} className="h-11 rounded-lg bg-gold px-5 font-semibold text-gold-foreground disabled:opacity-60">
                  {busy ? L.common.saving : F.done}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent closeLabel={L.common.cancel}>
          <DialogTitle>{L.common.delete}</DialogTitle>
          <DialogDescription>{confirm ? fill(B.deleteConfirm, { name: t(confirm.name) }) : ""}</DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
              {L.common.cancel}
            </button>
            <button type="button" onClick={() => confirm && remove(confirm)} className="h-11 rounded-lg bg-destructive px-5 font-semibold text-white">
              {L.common.delete}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
