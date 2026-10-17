/**
 * GOLD PRICES CARD (design screen 13, top) — today's price per gram for each karat.
 *   - Source: "Automatic from ERP" (prices read-only, "Sync now") or "Manual" (type and save)
 *   - Saving a price that moved more than 10% asks for confirmation (catches typos like 48000 instead of 4800)
 *   - "Recent changes" lists the last price moves
 * Saves to PUT /api/pricing/settings (source), PUT /api/pricing/prices, POST /api/pricing/sync.
 */
"use client";

import { useEffect, useState } from "react";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { useRouter } from "next/navigation";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import type { Locale, PricingState } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** A change bigger than this asks "are you sure?" */
const BIG_CHANGE_PCT = 10;

type L = Dictionary["pricing"];

export function GoldPricesCard({ state, canEdit, locale, labels: L }: { state: PricingState; canEdit: boolean; locale: Locale; labels: L }) {
  const G = L.gold;
  const router = useRouter();
  const [values, setValues] = useState<Record<number, string>>(Object.fromEntries(state.prices.map((p) => [p.karat, String(p.pricePerGram)])));
  const [busy, setBusy] = useState<null | "save" | "sync" | "source">(null);
  // UNDO / REDO for the typed prices
  const history = useUndoRedo(values, setValues);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<{ karat: number; pct: number } | null>(null);
  const manual = state.source === "manual";
  // New prices from the server (after save / sync / ERP) refill the boxes
  const serverPrices = state.prices.map((p) => `${p.karat}:${p.pricePerGram}`).join();
  useEffect(() => {
    setValues(Object.fromEntries(state.prices.map((p) => [p.karat, String(p.pricePerGram)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPrices]);
  const intl = locale === "ar" ? "ar-EG" : "en-US";
  const money = (n: number) => new Intl.NumberFormat(intl, { style: "currency", currency: state.currency, maximumFractionDigits: 0 }).format(n);
  const num = (n: number) => new Intl.NumberFormat(intl, { maximumFractionDigits: 1 }).format(n);
  const when = (iso?: string) => (iso ? new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—");
  const karatName = (k: number) => fill(G.karatN, { k: num(k) });

  async function call(path: string, method: string, body?: unknown) {
    const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null);
    return { res, data: res ? await res.json().catch(() => ({})) : {} };
  }

  async function setSource(source: "erp" | "manual") {
    if (source === state.source) return;
    setBusy("source");
    setMessage(null);
    const { res, data } = await call("/api/pricing/settings", "PUT", { source, priceLockMinutes: state.priceLockMinutes, priceChangeTolerancePct: state.priceChangeTolerancePct });
    setBusy(null);
    if (res?.ok) router.refresh();
    else setMessage({ tone: "error", text: L.errors[data.error as keyof L["errors"]] ?? L.errors.failed });
  }

  async function save(skipCheck = false) {
    const prices = state.prices.map((p) => ({ karat: p.karat, pricePerGram: Number(values[p.karat]) }));
    if (prices.some((p) => !(p.pricePerGram > 0))) return setMessage({ tone: "error", text: L.errors.validation });
    if (!skipCheck) {
      const big = prices
        .map((p) => {
          const before = state.prices.find((x) => x.karat === p.karat)!.pricePerGram;
          return { karat: p.karat, pct: before ? ((p.pricePerGram - before) / before) * 100 : 0 };
        })
        .find((x) => Math.abs(x.pct) > BIG_CHANGE_PCT);
      if (big) return setConfirm(big);
    }
    setConfirm(null);
    setBusy("save");
    setMessage(null);
    const { res, data } = await call("/api/pricing/prices", "PUT", { prices });
    setBusy(null);
    if (res?.ok) {
      setMessage({ tone: "ok", text: data.changed ? G.saved : G.noChange });
      router.refresh();
    } else setMessage({ tone: "error", text: L.errors[data.error as keyof L["errors"]] ?? L.errors.failed });
  }

  async function sync() {
    setBusy("sync");
    setMessage(null);
    const { res, data } = await call("/api/pricing/sync", "POST");
    setBusy(null);
    if (res?.ok) {
      setMessage({ tone: "ok", text: data.changed ? fill(G.synced, { n: num(data.changed) }) : G.noChange });
      router.refresh();
    } else setMessage({ tone: "error", text: L.errors.failed });
  }

  // Change of each karat = its latest move in the history
  const lastMove = (k: number) => state.history.find((h) => h.karat === k);
  const k21 = state.prices.find((p) => p.karat === 21) ?? state.prices[0];

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{G.title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{G.source}</span>
          <div role="radiogroup" aria-label={G.source} className="flex gap-1 rounded-lg bg-muted p-1">
            {(["erp", "manual"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={state.source === s}
                disabled={!canEdit || busy !== null}
                onClick={() => setSource(s)}
                className={cn("h-8 rounded-md px-3 text-sm font-semibold", state.source === s ? "bg-card shadow-sm" : "text-muted-foreground")}
              >
                {s === "erp" ? G.erp : G.manual}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {manual ? G.manualHint : G.erpHint}
        {!manual && state.lastSyncAt && <span className="block text-xs">{fill(G.lastSync, { when: when(state.lastSyncAt) })}</span>}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 text-start font-semibold">{G.karat}</th>
              <th className="py-2 text-start font-semibold">{fill(G.price, { currency: state.currency })}</th>
              <th className="py-2 text-start font-semibold">{G.change}</th>
              <th className="py-2 text-start font-semibold">{G.updated}</th>
            </tr>
          </thead>
          <tbody>
            {state.prices.map((p) => {
              const move = lastMove(p.karat);
              const pct = move && move.from ? ((move.to - move.from) / move.from) * 100 : null;
              return (
                <tr key={p.karat} className="border-b last:border-0">
                  <td className="py-2.5 font-semibold">{karatName(p.karat)}</td>
                  <td className="py-2.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      dir="ltr"
                      aria-label={`${fill(G.price, { currency: state.currency })} — ${karatName(p.karat)}`}
                      disabled={!manual || !canEdit}
                      value={values[p.karat] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [p.karat]: e.target.value }))}
                      className="h-10 w-36 rounded-lg border border-input bg-card px-3 text-sm font-semibold disabled:bg-muted disabled:text-muted-foreground"
                    />
                  </td>
                  <td className="py-2.5">
                    {pct === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", pct >= 0 ? "text-[var(--status-done-fg)]" : "text-[var(--status-cancel-fg)]")}>
                        {pct >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                        {pct >= 0 ? "+" : "−"}
                        {num(Math.abs(pct))}%
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">{when(p.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {k21 && <p className="text-xs text-muted-foreground">{fill(G.example, { karat: karatName(k21.karat), price: money(k21.pricePerGram * 10) })}</p>}

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={cn("rounded-lg px-3 py-2 text-sm font-semibold", message.tone === "error" ? "bg-[#f6e0dc] text-destructive" : "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]")}>
          {message.text}
        </p>
      )}
      {canEdit && (
        <div className="flex justify-end gap-2">
          {manual && <UndoRedo history={history} disabled={busy !== null} />}
          {manual ? (
            <button type="button" onClick={() => save()} disabled={busy !== null} className="h-11 rounded-lg bg-gold px-5 text-sm font-semibold text-gold-foreground hover:opacity-90 disabled:opacity-60">
              {busy === "save" ? G.saving : G.save}
            </button>
          ) : (
            <button type="button" onClick={sync} disabled={busy !== null} className="inline-flex h-11 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60">
              <RefreshCw className={cn("size-4", busy === "sync" && "animate-spin")} />
              {busy === "sync" ? G.syncing : G.sync}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t pt-4">
        <h3 className="text-sm font-bold">{G.history}</h3>
        {state.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{G.noHistory}</p>
        ) : (
          <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto text-sm">
            {state.history.slice(0, 20).map((h, i) => (
              <li key={`${h.at}-${h.karat}-${i}`} className="flex flex-wrap justify-between gap-2">
                <span>
                  <b>{karatName(h.karat)}</b>: <span dir="ltr">{money(h.from)} → {money(h.to)}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {when(h.at)} · {h.by ? fill(G.by, { name: locale === "ar" ? h.by.ar : h.by.en }) : G.fromErp}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent closeLabel={G.cancel}>
          <DialogTitle>{G.bigTitle}</DialogTitle>
          <DialogDescription>{confirm ? fill(G.bigText, { karat: karatName(confirm.karat), pct: `${confirm.pct >= 0 ? "+" : "−"}${num(Math.abs(confirm.pct))}%` }) : ""}</DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
              {G.cancel}
            </button>
            <button type="button" onClick={() => save(true)} className="h-11 rounded-lg bg-gold px-5 font-semibold text-gold-foreground">
              {G.confirm}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
