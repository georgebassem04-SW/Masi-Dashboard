/**
 * "+ صفحة جديدة" — asks for the title (Arabic + English), the link and where it shows,
 * creates the page as a draft (POST /api/pages) and opens it in the editor.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { PageMenu } from "@/types";
import { slugify } from "@/lib/catalog/helpers";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type Labels = {
  newDialog: Record<string, string>;
  menu: Record<PageMenu, string>;
  errors: Record<string, string>;
};

const input = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function NewPageButton({ label, labels }: { label: string; labels: Labels }) {
  const router = useRouter();
  const D = labels.newDialog;
  const [open, setOpen] = useState(false);
  const [ar, setAr] = useState("");
  const [en, setEn] = useState("");
  const [slug, setSlug] = useState("");
  const [menu, setMenu] = useState<PageMenu>("footer");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setMessage(null);
    setErrors({});
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title: { ar, en }, menu }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) {
      router.push(`/pages/${encodeURIComponent(data.slug)}`);
      return;
    }
    if (Array.isArray(data.issues)) setErrors(Object.fromEntries(data.issues.map((i: { path: string; code: string }) => [i.path, i.code])));
    if (data.error === "slug_taken") setErrors({ slug: "slug_taken" });
    setMessage(labels.errors[data.error] ?? labels.errors.failed);
  }
  const err = (k: string) => (errors[k] ? (labels.errors[errors[k]] ?? labels.errors.required) : null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-gold-foreground hover:opacity-90">
        <Plus className="size-4" />
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={D.cancel}>
          <DialogTitle>{D.title}</DialogTitle>
          <DialogDescription className="sr-only">{D.title}</DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {D.titleAr}
              <input dir="rtl" className={cn(input, err("title.ar") && "border-destructive")} maxLength={150} value={ar} onChange={(e) => setAr(e.target.value)} />
              {err("title.ar") && <span className="text-xs font-normal text-destructive">{err("title.ar")}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {D.titleEn}
              <input
                dir="ltr"
                className={cn(input, err("title.en") && "border-destructive")}
                maxLength={150}
                value={en}
                onChange={(e) => {
                  // Suggest the link while the link box is still empty or was suggested before
                  if (!slug || slug === slugify(en)) setSlug(slugify(e.target.value));
                  setEn(e.target.value);
                }}
              />
              {err("title.en") && <span className="text-xs font-normal text-destructive">{err("title.en")}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {D.slug}
              <input dir="ltr" className={cn(input, "font-mono", err("slug") && "border-destructive")} maxLength={60} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
              <span className={cn("text-xs font-normal", err("slug") ? "text-destructive" : "text-muted-foreground")}>{err("slug") ?? fill(D.slugHint, { slug: slug || "…" })}</span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {D.menu}
              <select className={input} value={menu} onChange={(e) => setMenu(e.target.value as PageMenu)}>
                {(["header", "footer", "none"] as const).map((m) => (
                  <option key={m} value={m}>
                    {labels.menu[m]}
                  </option>
                ))}
              </select>
            </label>
            {message && (
              <p role="alert" className="rounded-lg bg-[#f6e0dc] px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
                {D.cancel}
              </button>
              <button type="submit" disabled={busy} className="h-11 rounded-lg bg-gold px-5 font-semibold text-gold-foreground disabled:opacity-60">
                {busy ? D.creating : D.create}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
