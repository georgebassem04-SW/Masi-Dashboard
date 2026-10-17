/**
 * STORE DETAILS FORM — contact details (email, phone, WhatsApp, address, hours) + social media links
 * + website options (order without an account, show weight, gold prices block) + email for new-order alerts.
 * Saves to PUT /api/settings/store; the website shows them at once (footer, contact page, header, order emails).
 * The list of social networks: lib/settings/store.ts → SOCIAL_NETWORKS.
 */
"use client";

import { useMemo, useState } from "react";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { useRouter } from "next/navigation";
import type { SiteOptions, StoreContact, StoreSettings } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { SOCIAL_NETWORKS } from "@/lib/settings/store";
import { Card, Field, Message, Switch, TextBox, fieldErrors, send } from "./ui";

type L = Dictionary["settings"];
/** Every field present (empty text instead of missing) so the boxes always have a value */
type Filled = { contact: Required<StoreContact>; social: StoreSettings["social"]; options: SiteOptions; ordersNotifyEmail: string };
/** Used when nothing was saved yet (same defaults as the website) */
const DEFAULT_OPTIONS: SiteOptions = { guestCheckout: true, showWeight: true, showGoldPrices: true };
const fill0 = (x: StoreSettings): Filled => ({
  contact: { whatsapp: "", ...x.contact, address: x.contact.address ?? { ar: "", en: "" }, hours: x.contact.hours ?? { ar: "", en: "" } },
  social: x.social ?? {},
  options: { ...DEFAULT_OPTIONS, ...x.options },
  ordersNotifyEmail: x.ordersNotifyEmail ?? "",
});

export function StoreSettingsForm({ initial, canEdit, labels: L }: { initial: StoreSettings; canEdit: boolean; labels: L }) {
  const router = useRouter();
  const S = L.store;
  const [s, setS] = useState<Filled>(() => fill0(initial));
  const [saved, setSaved] = useState<Filled>(() => fill0(initial));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // UNDO / REDO for the store details
  const history = useUndoRedo(s, (v) => {
    setS(v);
    setErrors({});
  });
  const dirty = useMemo(() => JSON.stringify(s) !== JSON.stringify(saved), [s, saved]);
  const err = (k: string) => (errors[k] ? (L.errors[errors[k] as keyof L["errors"]] ?? L.errors.required) : null);
  const setContact = (patch: Partial<Filled["contact"]>) => {
    setS((x) => ({ ...x, contact: { ...x.contact, ...patch } }));
    setMessage(null);
  };

  async function save() {
    setBusy(true);
    setErrors({});
    const { res, data } = await send("/api/settings/store", "PUT", s);
    setBusy(false);
    if (res?.ok) {
      setSaved(s);
      setMessage({ tone: "ok", text: L.common.saved });
      router.refresh();
    } else {
      setErrors(fieldErrors(data));
      setMessage({ tone: "error", text: L.errors[data.error as keyof L["errors"]] ?? L.errors.failed });
    }
  }

  const c = s.contact;
  const d = !canEdit || busy;
  return (
    <div className="flex flex-col gap-5">
      <Card title={S.title} hint={S.hint}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={S.email} error={err("contact.email")}>
            <TextBox type="email" dir="ltr" disabled={d} value={c.email} maxLength={200} onChange={(e) => setContact({ email: e.target.value })} error={err("contact.email")} />
          </Field>
          <Field label={S.phone} error={err("contact.phone")}>
            <TextBox type="tel" dir="ltr" disabled={d} value={c.phone} maxLength={30} onChange={(e) => setContact({ phone: e.target.value })} error={err("contact.phone")} />
          </Field>
          <Field label={S.whatsapp} hint={S.whatsappHint} error={err("contact.whatsapp")}>
            <TextBox type="tel" dir="ltr" disabled={d} value={c.whatsapp} maxLength={30} onChange={(e) => setContact({ whatsapp: e.target.value })} error={err("contact.whatsapp")} />
          </Field>
          <div className="hidden sm:block" />
          <Field label={S.addressAr}>
            <TextBox dir="rtl" disabled={d} value={c.address.ar} maxLength={200} onChange={(e) => setContact({ address: { ...c.address, ar: e.target.value } })} />
          </Field>
          <Field label={S.addressEn}>
            <TextBox dir="ltr" disabled={d} value={c.address.en} maxLength={200} onChange={(e) => setContact({ address: { ...c.address, en: e.target.value } })} />
          </Field>
          <Field label={S.hoursAr}>
            <TextBox dir="rtl" disabled={d} value={c.hours.ar} maxLength={120} onChange={(e) => setContact({ hours: { ...c.hours, ar: e.target.value } })} />
          </Field>
          <Field label={S.hoursEn}>
            <TextBox dir="ltr" disabled={d} value={c.hours.en} maxLength={120} onChange={(e) => setContact({ hours: { ...c.hours, en: e.target.value } })} />
          </Field>
        </div>
      </Card>

      <Card title={S.socialTitle} hint={S.socialHint}>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_NETWORKS.map((n) => (
            <Field key={n} label={S.networks[n]} error={err(`social.${n}`)}>
              <TextBox
                type="url"
                dir="ltr"
                disabled={d}
                placeholder="https://"
                value={s.social[n] ?? ""}
                maxLength={300}
                onChange={(e) => {
                  setS((x) => ({ ...x, social: { ...x.social, [n]: e.target.value.trim() } }));
                  setMessage(null);
                }}
                error={err(`social.${n}`)}
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card title={S.optionsTitle} hint={S.optionsHint}>
        <ul className="flex flex-col divide-y">
          {(["guestCheckout", "showWeight", "showGoldPrices"] as const).map((k) => (
            <li key={k} className="flex items-center justify-between gap-4 py-3">
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{S[k]}</span>
                <span className="text-xs text-muted-foreground">{S[`${k}Hint`]}</span>
              </span>
              <Switch
                checked={s.options[k]}
                disabled={d}
                label={S[k]}
                onChange={(v) => {
                  setS((x) => ({ ...x, options: { ...x.options, [k]: v } }));
                  setMessage(null);
                }}
              />
            </li>
          ))}
        </ul>
        <Field label={S.ordersEmail} hint={S.ordersEmailHint} error={err("ordersNotifyEmail")} className="sm:max-w-md">
          <TextBox
            type="email"
            dir="ltr"
            disabled={d}
            placeholder="orders@store.com"
            value={s.ordersNotifyEmail}
            maxLength={200}
            onChange={(e) => {
              setS((x) => ({ ...x, ordersNotifyEmail: e.target.value.trim() }));
              setMessage(null);
            }}
            error={err("ordersNotifyEmail")}
          />
        </Field>
      </Card>

      {message && <Message tone={message.tone}>{message.text}</Message>}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {dirty && <span className="me-auto text-sm text-muted-foreground">{L.common.unsaved}</span>}
          <UndoRedo history={history} keyboard disabled={busy} />
          <button type="button" onClick={save} disabled={busy || !dirty} className="h-11 rounded-lg bg-gold px-6 text-sm font-semibold text-gold-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? L.common.saving : L.common.save}
          </button>
        </div>
      )}
    </div>
  );
}
