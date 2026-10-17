/**
 * PAGE EDITOR (design screen 16) — /pages/<slug>
 * ------------------------------------------------------------------
 *   [← Pages   title   status        Editing: العربية | English    Preview    Publish]
 *   [sections list: page settings · sections (↑ ↓, hide, delete) · + Add section]   [form of the chosen section]
 * - Every change is saved automatically as a DRAFT after a short pause (PUT /api/pages/<slug>/draft).
 *   Visitors don't see drafts.
 * - "Preview" opens the draft on the storefront with a 30-minute preview link (GET /api/pages/<slug>/preview).
 * - "Publish" checks that required texts are filled in BOTH languages, then makes the draft live.
 * - Page settings: title, link (custom pages), menu placement (live right away), Google & sharing, delete.
 * Section fields: components/pages/SectionForm.tsx. Texts: dictionaries → "sitePages".
 *
 * The HOMEPAGE (/home-builder) uses this same editor with `home`: its own blocks (slider, gold prices,
 * product rows…), no page settings, always live (no "take off the website"), API /api/home/*.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, Eye, EyeOff, ExternalLink, Plus, Settings2, Trash2 } from "lucide-react";
import type { AdminPage, CmsSection, HomeSectionType, Locale, PageContent, PageMenu } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { HOME_SECTION_TYPES, newSection, SECTION_TYPES } from "@/lib/pages/templates";
import { publishProblems, type PublishProblem } from "@/lib/pages/content";
import { isShopPage, pagePath } from "@/lib/pages/paths";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ImageField } from "@/components/theme/ImageField";
import type { MediaLabels } from "@/components/media/MediaBrowser";
import type { EditorCtx } from "./fields";
import { LArea, LText } from "./fields";
import { SectionForm } from "./SectionForm";

type L = Dictionary["sitePages"];
/** A page's content, or the homepage's (its sections can be any block) */
type Content = Omit<PageContent, "sections"> & { sections: CmsSection[] };
/** Blocks that can be added only once */
const ONLY_ONCE: HomeSectionType[] = ["page_hero", "contact", "hero", "gold_prices"];

export function PageEditor({
  page,
  canEdit,
  locale,
  storefrontUrl,
  categories,
  otherPages,
  labels: L,
  imageLabels,
  mediaLabels,
  initialSection,
  justPublished,
  home = false,
  choices,
  linkProducts,
}: {
  page: AdminPage;
  /** Editing the homepage instead of a page */
  home?: boolean;
  /** Lists for the homepage blocks (product picker, collections, karats) */
  choices?: Pick<EditorCtx, "products" | "brands" | "karats">;
  /** Products a button can open (button editor → "Opens a product") */
  linkProducts?: EditorCtx["linkProducts"];
  /** Section to open first (kept in the address as ?s=… so it survives a reload) */
  initialSection?: string;
  /** Came back here right after "Publish" */
  justPublished?: boolean;
  canEdit: boolean;
  locale: Locale;
  storefrontUrl: string;
  categories: EditorCtx["categories"];
  otherPages: { path: string; name: string }[];
  labels: L;
  imageLabels: { choose: string; change: string; remove: string; or: string; none: string };
  mediaLabels: MediaLabels;
}) {
  const router = useRouter();
  const E = L.editor;
  const [content, setContent] = useState<Content>(page.draft ?? page.published ?? { title: { ar: "", en: "" }, sections: [] });
  // Where this editor saves / publishes, and its own address
  const apiBase = home ? "/api/home" : `/api/pages/${encodeURIComponent(page.slug)}`;
  const editorPath = home ? "/home-builder" : `/pages/${encodeURIComponent(page.slug)}`;
  const [lang, setLang] = useState<Locale>(locale);
  const [selected, setSelected] = useState<string>(
    initialSection && ((!home && initialSection === "settings") || content.sections.some((s) => s.id === initialSection)) ? initialSection : (content.sections[0]?.id ?? (home ? "" : "settings")),
  );
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "error"; at?: string }>({ state: "idle", at: page.draftSavedAt });
  const [hasDraft, setHasDraft] = useState(!!page.draft);
  const [problems, setProblems] = useState<PublishProblem[]>([]);
  const [busy, setBusy] = useState<null | "publish" | "preview">(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(justPublished ? { tone: "ok", text: L.editor.published } : null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "discard" | "unpublish" | "deletePage" | { section: string }>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Content | null>(null);
  const live = !!page.published;
  // The homepage has no title / page settings: only its blocks are checked
  const problemsOf = (c: Content) => publishProblems(home ? { sections: c.sections } : c);

  /* ----- auto-save ----- */
  const saveNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const body = pending.current;
    if (!body) return true;
    pending.current = null;
    setSave({ state: "saving" });
    const res = await fetch(`${apiBase}/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(home ? { sections: body.sections } : body),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setSave({ state: "saved", at: data.savedAt });
      setHasDraft(true);
      return true;
    }
    pending.current = pending.current ?? body; // try again with the next change
    setSave({ state: "error" });
    return false;
  }, [apiBase, home]);

  const update = (next: Content) => {
    setContent(next);
    if (!canEdit) return;
    pending.current = next;
    setMessage(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(), 1200);
  };  // UNDO / REDO for the page (title and every section)
  const history = useUndoRedo(content, update);


  // Once missing fields were shown, update the list while the user fills them in
  useEffect(() => {
    if (problems.length) setProblems(problemsOf(content));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Save before leaving the page; warn if a save is still waiting
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const setSection = (s: CmsSection) => update({ ...content, sections: content.sections.map((x) => (x.id === s.id ? s : x)) });
  const move = (i: number, by: number) => {
    const list = [...content.sections];
    const [x] = list.splice(i, 1);
    list.splice(i + by, 0, x);
    update({ ...content, sections: list.map((s, k) => ({ ...s, sortOrder: k + 1 })) });
  };
  const addSection = (type: HomeSectionType) => {
    const s = newSection(type, content.sections.length + 1);
    update({ ...content, sections: [...content.sections, s] });
    setSelected(s.id);
    setAddOpen(false);
  };

  /* ----- actions ----- */
  async function publish() {
    const found = problemsOf(content);
    setProblems(found);
    if (found.length) {
      setMessage({ tone: "error", text: E.incomplete });
      setSelected(found[0].section === "page" ? "settings" : found[0].section);
      return;
    }
    setBusy("publish");
    const saved = await saveNow();
    const res = saved ? await fetch(`${apiBase}/publish`, { method: "POST" }).catch(() => null) : null;
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (res?.ok) {
      setHasDraft(false);
      // Reload the page data; the address keeps the open section and the "Published" message
      router.replace(`${editorPath}?published=1&s=${encodeURIComponent(selected)}`);
      router.refresh();
    } else {
      if (data.problems) setProblems(data.problems);
      setMessage({ tone: "error", text: L.errors[data.error as keyof L["errors"]] ?? L.errors.failed });
    }
  }

  async function preview() {
    // Open the tab first (browsers block tabs opened after waiting), then send it to the preview link
    const tab = window.open("about:blank", "_blank");
    setBusy("preview");
    await saveNow();
    const res = await fetch(`${apiBase}/preview?locale=${lang}`).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (res?.ok && data.url) {
      if (tab) tab.location.href = data.url;
      else window.open(data.url, "_blank");
    } else tab?.close();
  }

  async function simple(path: string, method: string, after: () => void) {
    const res = await fetch(path, { method }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setConfirm(null);
    if (res?.ok) after();
    else setMessage({ tone: "error", text: L.errors[data.error as keyof L["errors"]] ?? L.errors.failed });
  }

  /* ----- helpers ----- */
  const ctx: EditorCtx = useMemo(
    () => ({
      lang,
      disabled: !canEdit,
      missing: new Set(problems.filter((p) => p.section === selected).map((p) => p.field)),
      labels: { fields: L.fields, rte: L.rte, otherLang: lang === "ar" ? E.en : E.ar },
      categories,
      pages: otherPages,
      linkProducts,
      ...choices,
    }),
    [lang, canEdit, problems, selected, L, E, categories, otherPages, choices, linkProducts],
  );
  const typeName = (t: HomeSectionType) => L.types[t].name;
  const sectionTitle = (s: CmsSection) => {
    // The slider has no title of its own: show its first slide's
    const d = s.data as { title?: { ar: string; en: string }; slides?: { title?: { ar: string; en: string } }[] };
    const title = d.title ?? d.slides?.[0]?.title;
    return title?.[lang] || title?.ar || "";
  };
  const current = content.sections.find((s) => s.id === selected);
  const statusKey = !live && !home ? "draft" : hasDraft ? "changed" : "published";
  const statusTone = {
    published: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
    changed: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
    draft: "bg-muted text-muted-foreground",
  }[statusKey];
  const liveUrl = home ? `${storefrontUrl}/${locale}` : `${storefrontUrl}/${locale}${pagePath(page.slug)}`;
  const time = (iso?: string) => (iso ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "");
  const problemSections = [...new Set(problems.map((p) => p.section))];

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-7">
      {/* ===== Top bar ===== */}
      {/* "Top of: All products / Categories" — explain where these sections show */}
      {!home && isShopPage(page.slug) && <p className="rounded-lg bg-accent px-4 py-3 text-sm">{fill(L.shopTopNote, { path: pagePath(page.slug) })}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {!home && (
          <Link href="/pages" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted">
            <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
            {E.back}
          </Link>
        )}
        <h2 className="text-2xl font-bold">{home ? L.home.title : content.title[lang] || content.title.ar || page.slug}</h2>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", statusTone)}>{L.status[statusKey]}</span>
        <div className="flex-1" />
        <div role="radiogroup" aria-label={E.editing} className="flex items-center gap-1 rounded-lg bg-muted p-1 text-sm">
          <span className="px-2 text-xs text-muted-foreground">{E.editing}</span>
          {(["ar", "en"] as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={lang === l}
              onClick={() => setLang(l)}
              className={cn("h-8 rounded-md px-3 font-semibold", lang === l ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              {l === "ar" ? E.ar : E.en}
            </button>
          ))}
        </div>
        {live && (
          <a href={liveUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-muted">
            <ExternalLink className="size-4" />
            {E.viewLive}
          </a>
        )}
        {/* Undo / redo: goes through update(), so the draft is saved again like any other change */}
        {canEdit && <UndoRedo history={history} keyboard disabled={busy !== null} />}
        <button type="button" onClick={preview} disabled={busy !== null} className="h-11 rounded-lg border border-input bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60">
          {E.preview}
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={publish}
            disabled={busy !== null || (live && !hasDraft && !pending.current)}
            className="h-11 rounded-lg bg-gold px-5 text-sm font-semibold text-gold-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy === "publish" ? E.publishing : E.publish}
          </button>
        )}
      </div>

      {/* Save state + draft actions */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {canEdit ? (
          <span role="status" className={cn(save.state === "error" && "font-semibold text-destructive")}>
            {save.state === "saving" ? E.saving : save.state === "error" ? E.saveFailed : hasDraft && save.at ? fill(E.savedAt, { time: time(save.at) }) : E.upToDate}
          </span>
        ) : (
          <span>{E.viewOnly}</span>
        )}
        {canEdit && <span>{E.autosaveNote}</span>}
        {canEdit && live && hasDraft && (
          <button type="button" onClick={() => setConfirm("discard")} className="font-semibold text-destructive hover:underline">
            {E.discard}
          </button>
        )}
        {canEdit && live && !home && (
          <button type="button" onClick={() => setConfirm("unpublish")} className="font-semibold hover:underline">
            {E.unpublish}
          </button>
        )}
      </div>
      {message && (
        <div
          role={message.tone === "error" ? "alert" : "status"}
          className={cn("rounded-lg px-4 py-3 text-sm", message.tone === "error" ? "bg-[#f6e0dc] text-destructive" : "bg-[var(--status-done-bg)] font-semibold text-[var(--status-done-fg)]")}
        >
          <p className="font-semibold">{message.text}</p>
          {message.tone === "error" && problemSections.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-2">
              {problemSections.map((id) => {
                const s = content.sections.find((x) => x.id === id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setSelected(id === "page" ? "settings" : id)}
                      className="rounded-full bg-card px-3 py-1 text-xs font-semibold underline-offset-2 hover:underline"
                    >
                      {id === "page" ? E.settings : s ? `${typeName(s.type)}${sectionTitle(s) ? ` — ${sectionTitle(s)}` : ""}` : id}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        {/* ===== Sections list ===== */}
        <section className="flex flex-col gap-2 rounded-xl border bg-card p-3 lg:sticky lg:top-24">
          {home ? (
            <p className="px-1 pb-1 text-xs leading-relaxed text-muted-foreground">{L.home.hint}</p>
          ) : (
            <button
              type="button"
              onClick={() => setSelected("settings")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-start text-sm font-semibold",
                selected === "settings" ? "border-[#c9a961] bg-[#faf3e4]" : "border-transparent hover:bg-muted/60",
                problemSections.includes("page") && "text-destructive",
              )}
            >
              <Settings2 className="size-4" />
              {E.settings}
            </button>
          )}
          <span className="px-1 pt-2 text-xs font-semibold text-muted-foreground">{E.sections}</span>
          <ol className="flex flex-col gap-1">
            {content.sections.map((s, i) => (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-2 py-1.5",
                  s.id === selected ? "border-[#c9a961] bg-[#faf3e4]" : "border-transparent hover:bg-muted/60",
                  !s.isActive && "opacity-60",
                )}
              >
                <button type="button" onClick={() => setSelected(s.id)} className="flex min-w-0 flex-1 flex-col text-start">
                  <span className={cn("truncate text-sm font-semibold", problemSections.includes(s.id) && "text-destructive")}>{typeName(s.type)}</span>
                  <span className="truncate text-xs text-muted-foreground">{!s.isActive ? E.hidden : sectionTitle(s) || L.types[s.type].desc}</span>
                </button>
                {canEdit && (
                  <span className="flex shrink-0">
                    <IconBtn label={`${E.moveUp}: ${typeName(s.type)}`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="size-4" />
                    </IconBtn>
                    <IconBtn label={`${E.moveDown}: ${typeName(s.type)}`} disabled={i === content.sections.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="size-4" />
                    </IconBtn>
                    <IconBtn label={`${s.isActive ? E.hide : E.show}: ${typeName(s.type)}`} onClick={() => setSection({ ...s, isActive: !s.isActive })}>
                      {s.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </IconBtn>
                  </span>
                )}
              </li>
            ))}
          </ol>
          {canEdit && (
            <div className="flex flex-col gap-1 pt-1">
              <button
                type="button"
                onClick={() => setAddOpen((o) => !o)}
                aria-expanded={addOpen}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#c9a961] text-sm font-semibold text-gold hover:bg-[#faf3e4]"
              >
                <Plus className="size-4" />
                {E.addSection}
              </button>
              {addOpen && (
                <ul className="grid gap-1 rounded-lg border p-1">
                  {(home ? HOME_SECTION_TYPES : SECTION_TYPES)
                    .filter((t) => !(ONLY_ONCE.includes(t) && content.sections.some((s) => s.type === t)))
                    .map((t) => (
                      <li key={t}>
                        <button type="button" onClick={() => addSection(t)} className="flex w-full flex-col rounded-md px-3 py-2 text-start hover:bg-muted">
                          <span className="text-sm font-semibold">{L.types[t].name}</span>
                          <span className="text-xs text-muted-foreground">{L.types[t].desc}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* ===== Form ===== */}
        <section className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
          {selected === "settings" && !home ? (
            <PageSettings
              page={page}
              content={content}
              onChange={update}
              ctx={{ ...ctx, missing: new Set(problems.filter((p) => p.section === "page").map((p) => p.field)) }}
              canEdit={canEdit}
              locale={locale}
              storefrontUrl={storefrontUrl}
              labels={L}
              imageLabels={imageLabels}
              mediaLabels={mediaLabels}
              onDelete={() => setConfirm("deletePage")}
            />
          ) : current ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold">
                  {typeName(current.type)} <span className="text-sm font-normal text-muted-foreground">· {lang === "ar" ? E.ar : E.en}</span>
                </h3>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setConfirm({ section: current.id })}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-destructive hover:bg-[#f6e0dc]"
                  >
                    <Trash2 className="size-4" />
                    {E.deleteSection}
                  </button>
                )}
              </div>
              <SectionForm key={current.id} section={current} onChange={setSection} ctx={ctx} locale={locale} storefrontUrl={storefrontUrl} imageLabels={imageLabels} mediaLabels={mediaLabels} />
            </>
          ) : (
            <p className="py-10 text-center text-muted-foreground">{E.pick}</p>
          )}
        </section>
      </div>

      {/* ===== Confirmations ===== */}
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent closeLabel={E.cancel}>
          <DialogTitle>{confirm === "discard" ? E.discard : confirm === "unpublish" ? E.unpublish : confirm === "deletePage" ? L.settings.delete : E.deleteSection}</DialogTitle>
          <DialogDescription>
            {confirm === "discard"
              ? E.discardConfirm
              : confirm === "unpublish"
                ? E.unpublishConfirm
                : confirm === "deletePage"
                  ? fill(L.settings.deleteConfirm, { name: content.title[locale] || page.slug })
                  : typeof confirm === "object" && confirm
                    ? fill(E.deleteSectionConfirm, { name: typeName(content.sections.find((s) => s.id === confirm.section)?.type ?? "rich_text") })
                    : ""}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
              {E.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                const here = `${editorPath}?s=${encodeURIComponent(selected)}`;
                // "v" makes the editor start again from the live version (see the page's `key`)
                if (confirm === "discard") return simple(`${apiBase}/draft`, "DELETE", () => (router.replace(`${here}&v=${Date.now()}`), router.refresh()));
                if (confirm === "unpublish") return simple(`/api/pages/${encodeURIComponent(page.slug)}/unpublish`, "POST", () => (router.replace(here), router.refresh()));
                if (confirm === "deletePage") return simple(`/api/pages/${encodeURIComponent(page.slug)}`, "DELETE", () => router.replace("/pages"));
                if (typeof confirm === "object" && confirm) {
                  const rest = content.sections.filter((s) => s.id !== confirm.section);
                  update({ ...content, sections: rest });
                  setSelected(rest[0]?.id ?? (home ? "" : "settings"));
                  setConfirm(null);
                }
              }}
              className="h-11 rounded-lg bg-destructive px-5 font-semibold text-white"
            >
              {E.confirm}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="rounded-md p-1.5 hover:bg-card disabled:opacity-30">
      {children}
    </button>
  );
}

/** Page settings: title (part of the draft), link + menu (saved right away), Google & sharing (draft), delete */
function PageSettings({
  page,
  content,
  onChange,
  ctx,
  canEdit,
  locale,
  storefrontUrl,
  labels: L,
  imageLabels,
  mediaLabels,
  onDelete,
}: {
  page: AdminPage;
  content: Content;
  onChange: (c: Content) => void;
  ctx: EditorCtx;
  canEdit: boolean;
  locale: Locale;
  storefrontUrl: string;
  labels: L;
  imageLabels: { choose: string; change: string; remove: string; or: string; none: string };
  mediaLabels: MediaLabels;
  onDelete: () => void;
}) {
  const router = useRouter();
  const S = L.settings;
  const [menu, setMenu] = useState<PageMenu>(page.menu);
  const [slug, setSlug] = useState(page.slug);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function saveSettings(next: { menu: PageMenu; slug?: string }) {
    setMsg(null);
    const res = await fetch(`/api/pages/${encodeURIComponent(page.slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setMsg({ tone: "ok", text: S.saved });
      if (data.slug && data.slug !== page.slug) router.replace(`/pages/${encodeURIComponent(data.slug)}`);
      else router.refresh();
    } else setMsg({ tone: "error", text: L.errors[data.error as keyof L["errors"]] ?? L.errors.failed });
  }
  const seo = content.seo ?? {};

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-lg font-bold">{L.editor.settings}</h3>
      <LText ctx={ctx} name="title" label={S.title} value={content.title} onChange={(v) => onChange({ ...content, title: v })} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{S.link}</span>
          {page.system ? (
            <>
              <span dir="ltr" className="flex h-11 items-center rounded-lg bg-muted px-3 font-mono text-sm">
                {pagePath(page.slug)}
              </span>
              <span className="text-xs text-muted-foreground">{S.linkFixed}</span>
            </>
          ) : (
            <div className="flex gap-2">
              <span dir="ltr" className="flex h-11 min-w-0 flex-1 items-center rounded-lg border border-input bg-card ps-3 text-sm">
                <span className="shrink-0 text-muted-foreground">/pages/</span>
                <input
                  aria-label={S.link}
                  disabled={!canEdit}
                  value={slug}
                  maxLength={60}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  className="h-full min-w-0 flex-1 bg-transparent pe-3 font-mono outline-none"
                />
              </span>
              {canEdit && slug !== page.slug && (
                <button type="button" onClick={() => saveSettings({ menu, slug })} className="h-11 shrink-0 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted">
                  {S.changeLink}
                </button>
              )}
            </div>
          )}
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {S.menu}
          <select
            disabled={!canEdit}
            value={menu}
            onChange={(e) => {
              const m = e.target.value as PageMenu;
              setMenu(m);
              void saveSettings({ menu: m });
            }}
            className="h-11 rounded-lg border border-input bg-card px-3 font-normal"
          >
            {(["header", "footer", "none"] as const).map((m) => (
              <option key={m} value={m}>
                {L.menu[m]}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-muted-foreground">{S.menuHint}</span>
        </label>
      </div>
      {msg && (
        <p role={msg.tone === "error" ? "alert" : "status"} className={cn("text-sm font-semibold", msg.tone === "error" ? "text-destructive" : "text-[var(--status-done-fg)]")}>
          {msg.text}
        </p>
      )}

      <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-bold">{S.seo}</legend>
        <p className="text-xs text-muted-foreground">{S.seoHint}</p>
        <LText ctx={ctx} label={S.seoTitle} value={seo.title} onChange={(v) => onChange({ ...content, seo: { ...seo, title: v } })} />
        <LArea ctx={ctx} label={S.seoDescription} value={seo.description} onChange={(v) => onChange({ ...content, seo: { ...seo, description: v } })} max={300} />
        <ImageField
          frame="share"
          label={S.seoImage}
          value={seo.image?.url ?? ""}
          onChange={(url) => onChange({ ...content, seo: { ...seo, image: url ? { url } : undefined } })}
          storefrontUrl={storefrontUrl}
          labels={imageLabels}
          mediaLabels={mediaLabels}
          locale={locale}
          disabled={!canEdit}
        />
      </fieldset>

      {canEdit && (
        <div className="flex flex-col gap-2 border-t pt-4">
          <span className="text-sm font-bold">{S.danger}</span>
          {page.system ? (
            <p className="text-sm text-muted-foreground">{S.systemNoDelete}</p>
          ) : (
            <button type="button" onClick={onDelete} className="inline-flex h-10 items-center gap-2 self-start rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-[#f6e0dc]">
              <Trash2 className="size-4" />
              {S.delete}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
