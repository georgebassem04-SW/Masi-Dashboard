/**
 * SECTION FORMS — the fields shown on the right when a section is selected in the page editor.
 * One small form per section type (same types the storefront draws: storefront/components/sections/*).
 * The homepage blocks (slider, gold prices, product row…) are at the bottom; the product picker is ProductPicker.tsx.
 * Adding a new section type: add it to types/cms.ts (both projects), lib/pages/templates.ts,
 * lib/validation/pages.ts, lib/pages/content.ts (required fields) and a case below.
 */
"use client";

import type { CmsSection, FeatureIcon, Locale } from "@/types";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ImageField } from "@/components/theme/ImageField";
import type { FrameKey } from "@/config/image-frames";
import { HeroStyleEditor, HeroShowSwitches } from "./HeroStyleEditor";
import { Toggle } from "@/components/theme/fields";
import type { MediaLabels } from "@/components/media/MediaBrowser";
import { Choice, ItemList, LArea, LHtml, LinkEditor, LText, type EditorCtx } from "./fields";
import { ProductPicker } from "./ProductPicker";
import { toEmbedUrl } from "@/lib/pages/video";

const ICONS: FeatureIcon[] = ["gem", "shield", "scale", "sparkles", "award", "heart", "truck", "coins", "wrench", "badge"];
const E = { ar: "", en: "" };

export function SectionForm({
  section: s,
  onChange,
  ctx,
  locale,
  storefrontUrl,
  imageLabels,
  mediaLabels,
}: {
  section: CmsSection;
  onChange: (s: CmsSection) => void;
  ctx: EditorCtx;
  locale: Locale;
  storefrontUrl: string;
  imageLabels: { choose: string; change: string; remove: string; or: string; none: string };
  mediaLabels: MediaLabels;
}) {
  const F = ctx.labels.fields;
  // Update part of this section's data
  const set = (patch: Record<string, unknown>) => onChange({ ...s, data: { ...s.data, ...patch } } as CmsSection);
  // A list of ticks (categories, collections, karats): empty list = "all"
  const ticks = <T extends string | number>(label: string, hint: string, options: { value: T; label: string }[], chosen: T[], onPick: (v: T[]) => void, invalid?: boolean) => (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={cn("mb-1.5 text-sm font-semibold", invalid && "text-destructive")}>{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = chosen.includes(o.value);
          return (
            <label key={String(o.value)} className={cn("flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm", on ? "border-gold bg-accent font-semibold" : "border-input bg-card")}>
              <input type="checkbox" className="accent-[var(--gold)]" disabled={ctx.disabled} checked={on} onChange={(e) => onPick(e.target.checked ? [...chosen, o.value] : chosen.filter((x) => x !== o.value))} />
              {o.label}
            </label>
          );
        })}
      </div>
      <span className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>{hint}</span>
    </fieldset>
  );
  // `frame` = the fixed shape of this picture on the website (config/image-frames.ts): the cropper opens with it
  const image = (frame: FrameKey, label: string, value: string | undefined, onPick: (url: string) => void, name?: string) => (
    <div className={name && ctx.missing.has(name) && !value ? "rounded-xl ring-2 ring-destructive" : undefined}>
      <ImageField frame={frame} label={label} value={value ?? ""} onChange={onPick} storefrontUrl={storefrontUrl} labels={imageLabels} mediaLabels={mediaLabels} locale={locale} disabled={ctx.disabled} />
    </div>
  );

  switch (s.type) {
    case "page_hero":
      return (
        <>
          {/* What shows: title · text · each button — switch any of them on or off */}
          <HeroShowSwitches ctx={ctx} value={s.data.style} onChange={(style) => set({ style })} />
          <LText ctx={ctx} name="title" label={s.data.style?.showTitle === false ? `${F.title} — ${F.hero.hiddenTitleNote}` : F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          {s.data.style?.showText !== false && <LArea ctx={ctx} label={F.subtitle} value={s.data.subtitle} onChange={(v) => set({ subtitle: v })} max={300} />}
          {image("pageHero", F.backgroundImage, s.data.image?.url, (url) => set({ image: url ? { url } : undefined }))}
          {s.data.style?.showButton1 !== false && <LinkEditor ctx={ctx} label={F.button} optional invalid={ctx.missing.has("buttons")} value={s.data.cta} onChange={(v) => set({ cta: v })} />}
          {s.data.style?.showButton2 !== false && <LinkEditor ctx={ctx} label={F.button2} optional invalid={ctx.missing.has("buttons")} value={s.data.cta2} onChange={(v) => set({ cta2: v })} />}
          <Choice ctx={ctx} label={F.hero.height} value={s.data.height ?? "md"} options={(["sm", "md", "lg"] as const).map((v) => ({ value: v, label: F.hero.sizes[v] }))} onChange={(v) => set({ height: v })} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="size-4 accent-[var(--gold)]" disabled={ctx.disabled} checked={s.data.breadcrumb !== false} onChange={(e) => set({ breadcrumb: e.target.checked })} />
            {F.hero.breadcrumb}
          </label>
          {!s.data.image?.url && (
            <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="size-4 accent-[var(--gold)]" disabled={ctx.disabled} checked={!!s.data.background} onChange={(e) => set({ background: e.target.checked ? "#f4f1ea" : "" })} />
              {F.hero.backgroundColor}
              {s.data.background ? <input type="color" aria-label={F.hero.backgroundColor} value={s.data.background} disabled={ctx.disabled} onChange={(e) => set({ background: e.target.value })} className="size-8 cursor-pointer rounded border border-input bg-card p-0.5" /> : <span className="text-xs font-normal text-muted-foreground">{F.hero.auto}</span>}
            </label>
          )}
          <HeroStyleEditor
            ctx={ctx}
            kind="page"
            value={s.data.style}
            onChange={(style) => set({ style })}
            hasImage={!!s.data.image?.url}
            buttonNames={[s.data.style?.showButton1 === false ? undefined : s.data.cta, s.data.style?.showButton2 === false ? undefined : s.data.cta2].map((b) => b?.label[ctx.lang] ?? "").filter(Boolean)}
          />
        </>
      );

    case "rich_text":
      return (
        <>
          <LText ctx={ctx} label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <LHtml ctx={ctx} name="body" label={F.body} value={s.data.body} onChange={(v) => set({ body: v })} editorKey={`${s.id}-body`} />
          <Choice ctx={ctx} label={F.width} value={s.data.width} options={[{ value: "narrow", label: F.narrow }, { value: "wide", label: F.wide }]} onChange={(v) => set({ width: v })} />
        </>
      );

    case "image_text":
      return (
        <>
          <LText ctx={ctx} label={F.eyebrow} value={s.data.eyebrow} onChange={(v) => set({ eyebrow: v })} max={80} />
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <LHtml ctx={ctx} name="body" label={F.body} value={s.data.body} onChange={(v) => set({ body: v })} editorKey={`${s.id}-body`} />
          {image("imageText", F.image, s.data.image?.url, (url) => set({ image: { url } }), "image")}
          <Choice ctx={ctx} label={F.imagePosition} value={s.data.imagePosition} options={[{ value: "start", label: F.imageStart }, { value: "end", label: F.imageEnd }]} onChange={(v) => set({ imagePosition: v })} />
          {/* card = gap between picture and text (original) · split = touching, framed text panel, centred */}
          {/* editorial = tall picture + quiet text, big light title, underlined link */}
          <Choice ctx={ctx} label={F.k.look} value={s.data.layout ?? "card"} options={(["card", "split", "editorial"] as const).map((v) => ({ value: v, label: F.k.imageTextLayouts[v] }))} onChange={(v) => set({ layout: v })} />
          <p className="-mt-2 text-xs text-muted-foreground">{F.k.accentHint}</p>
          <LinkEditor ctx={ctx} label={F.button} optional value={s.data.cta} onChange={(v) => set({ cta: v })} />
        </>
      );

    case "stats":
      return (
        <>
          <LText ctx={ctx} label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <ItemList
            ctx={ctx}
            label={F.items}
            invalid={ctx.missing.has("items")}
            items={s.data.items}
            max={8}
            onChange={(items) => set({ items })}
            make={() => ({ value: E, label: E })}
            render={(item, update) => (
              <div className="grid gap-3 sm:grid-cols-[0.6fr_1fr]">
                <LText ctx={ctx} label={F.value} value={item.value} onChange={(v) => update({ ...item, value: v })} max={20} />
                <LText ctx={ctx} label={F.label} value={item.label} onChange={(v) => update({ ...item, label: v })} max={80} />
              </div>
            )}
          />
        </>
      );

    case "features":
      return (
        <>
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <LArea ctx={ctx} label={F.subtitle} value={s.data.subtitle} onChange={(v) => set({ subtitle: v })} max={300} />
          <Choice ctx={ctx} label={F.columns} value={s.data.columns} options={[2, 3, 4].map((n) => ({ value: n as 2 | 3 | 4, label: String(n) }))} onChange={(v) => set({ columns: v })} />
          <ItemList
            ctx={ctx}
            label={F.items}
            invalid={ctx.missing.has("items")}
            items={s.data.items}
            max={12}
            onChange={(items) => set({ items })}
            make={() => ({ icon: "gem" as FeatureIcon, title: E, text: E })}
            render={(item, update) => (
              <>
                <div className="grid gap-3 sm:grid-cols-[0.7fr_1fr]">
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">
                    {F.icon}
                    <select disabled={ctx.disabled} value={item.icon} onChange={(e) => update({ ...item, icon: e.target.value as FeatureIcon })} className="h-11 rounded-lg border border-input bg-card px-3 font-normal">
                      {ICONS.map((i) => (
                        <option key={i} value={i}>
                          {F.icons[i]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <LText ctx={ctx} label={F.title} value={item.title} onChange={(v) => update({ ...item, title: v })} max={80} />
                </div>
                <LArea ctx={ctx} label={F.text} value={item.text} onChange={(v) => update({ ...item, text: v })} />
              </>
            )}
          />
        </>
      );

    case "timeline":
      return (
        <>
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <ItemList
            ctx={ctx}
            label={F.items}
            invalid={ctx.missing.has("items")}
            items={s.data.items}
            max={30}
            onChange={(items) => set({ items })}
            make={() => ({ year: "", title: E, text: E })}
            render={(item, update) => (
              <>
                <div className="grid gap-3 sm:grid-cols-[0.4fr_1fr]">
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">
                    {F.year}
                    <input dir="ltr" disabled={ctx.disabled} maxLength={12} value={item.year} onChange={(e) => update({ ...item, year: e.target.value })} className="h-11 rounded-lg border border-input bg-card px-3 font-normal" />
                  </label>
                  <LText ctx={ctx} label={F.title} value={item.title} onChange={(v) => update({ ...item, title: v })} max={100} />
                </div>
                <LArea ctx={ctx} label={F.text} value={item.text} onChange={(v) => update({ ...item, text: v })} max={500} />
              </>
            )}
          />
        </>
      );

    case "faq":
      return (
        <>
          <LText ctx={ctx} label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <ItemList
            ctx={ctx}
            label={F.items}
            invalid={ctx.missing.has("items")}
            items={s.data.items}
            max={60}
            onChange={(items) => set({ items })}
            make={() => ({ question: E, answer: E })}
            render={(item, update, i) => (
              <>
                <LText ctx={ctx} label={F.question} value={item.question} onChange={(v) => update({ ...item, question: v })} max={300} />
                {/* key includes the question so a moved item reloads its own answer */}
                <LHtml ctx={ctx} label={F.answer} value={item.answer} onChange={(v) => update({ ...item, answer: v })} editorKey={`${s.id}-a${i}-${item.question.ar}${item.question.en}`} />
              </>
            )}
          />
        </>
      );

    case "branches":
      return (
        <>
          <p className="rounded-lg bg-accent px-3 py-2 text-sm">{F.branchesNote}</p>
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <LArea ctx={ctx} label={F.subtitle} value={s.data.subtitle} onChange={(v) => set({ subtitle: v })} max={300} />
          {/* Where the branch cards sit when they don't fill the row */}
          <Choice ctx={ctx} label={F.branchesAlign} value={s.data.align ?? "start"} options={(["start", "center", "end"] as const).map((v) => ({ value: v, label: F.aligns[v] }))} onChange={(v) => set({ align: v })} />
          <p className="-mt-2 text-xs text-muted-foreground">{F.branchesAlignHint}</p>
        </>
      );

    case "cta":
      return (
        <>
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <LArea ctx={ctx} label={F.text} value={s.data.text} onChange={(v) => set({ text: v })} />
          <LinkEditor ctx={ctx} label={F.primary} value={s.data.primary} onChange={(v) => set({ primary: v })} invalid={ctx.missing.has("primary")} />
          <LinkEditor ctx={ctx} label={F.secondary} optional value={s.data.secondary} onChange={(v) => set({ secondary: v })} invalid={ctx.missing.has("secondary")} />
          <LText ctx={ctx} label={F.eyebrow} value={s.data.eyebrow} onChange={(v) => set({ eyebrow: v })} max={80} />
          <Choice
            ctx={ctx}
            label={F.background}
            value={s.data.background}
            options={(["primary", "secondary", "image", "video"] as const).map((v) => ({ value: v, label: v === "video" ? F.k.bgVideo : F.bg[v] }))}
            onChange={(v) => set({ background: v })}
          />
          {s.data.background === "image" && image("cta", F.image, s.data.image?.url, (url) => set({ image: url ? { url } : undefined }), "image")}
          {/* Video behind the words: an .mp4 link (plays silently, on repeat) + an optional still picture shown while it loads */}
          {s.data.background === "video" && (
            <>
              <label className={cn("flex flex-col gap-1.5 text-sm font-semibold", ctx.missing.has("video") && !s.data.video?.url && "text-destructive")}>
                {F.videoUrl}
                <input
                  dir="ltr"
                  disabled={ctx.disabled}
                  maxLength={600}
                  value={s.data.video?.url ?? ""}
                  placeholder="https://…/video.mp4"
                  onChange={(e) => set({ video: { provider: "file", url: e.target.value.trim(), posterUrl: s.data.video?.posterUrl } })}
                  className={cn("h-11 rounded-lg border bg-card px-3 font-normal text-foreground", ctx.missing.has("video") && !s.data.video?.url ? "border-destructive" : "border-input")}
                />
                <span className="text-xs font-normal text-muted-foreground">{F.k.videoFileHint}</span>
              </label>
              {image("cta", F.poster, s.data.video?.posterUrl, (url) => set({ video: { provider: "file", url: s.data.video?.url ?? "", posterUrl: url || undefined } }))}
            </>
          )}
          <Choice ctx={ctx} label={F.k.textPosition} value={s.data.align ?? "center"} options={(["start", "center"] as const).map((v) => ({ value: v, label: F.aligns[v] }))} onChange={(v) => set({ align: v })} />
          {(s.data.background === "image" || s.data.background === "video") && (
            <Choice ctx={ctx} label={F.hero.height} value={s.data.height ?? "md"} options={(["sm", "md", "lg"] as const).map((v) => ({ value: v, label: F.hero.sizes[v] }))} onChange={(v) => set({ height: v })} />
          )}
        </>
      );

    case "social_feed":
      return (
        <>
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <LText ctx={ctx} label={F.subtitle} value={s.data.subtitle} onChange={(v) => set({ subtitle: v })} max={300} />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {F.k.handle}
            <input dir="ltr" disabled={ctx.disabled} maxLength={60} value={s.data.handle} placeholder="kinggoldeg" onChange={(e) => set({ handle: e.target.value.replace(/^@/, "") })} className="h-11 rounded-lg border border-input bg-card px-3 font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {F.k.profileUrl}
            <input dir="ltr" disabled={ctx.disabled} maxLength={300} value={s.data.profileUrl} placeholder="https://www.instagram.com/…" onChange={(e) => set({ profileUrl: e.target.value.trim() })} className="h-11 rounded-lg border border-input bg-card px-3 font-normal" />
          </label>
          <ItemList
            ctx={ctx}
            label={F.k.posts}
            invalid={ctx.missing.has("items")}
            items={s.data.items}
            max={16}
            onChange={(items) => set({ items })}
            make={() => ({ image: { url: "" }, href: "" })}
            render={(item, update) => (
              <>
                {image(s.data.look === "gallery" ? "galleryPost" : "socialPost", F.image, item.image?.url, (url) => update({ ...item, image: { url } }))}
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  {F.k.postLink}
                  <input dir="ltr" disabled={ctx.disabled} maxLength={300} value={item.href ?? ""} placeholder="https://www.instagram.com/p/…" onChange={(e) => update({ ...item, href: e.target.value.trim() })} className="h-11 rounded-lg border border-input bg-card px-3 font-normal" />
                </label>
              </>
            )}
          />
          <LinkEditor ctx={ctx} label={F.button} optional value={s.data.button} onChange={(v) => set({ button: v })} />
          {/* posts = tall posts with the account name · gallery = plain pictures edge to edge */}
          <Choice ctx={ctx} label={F.k.look} value={s.data.look ?? "posts"} options={(["posts", "gallery"] as const).map((v) => ({ value: v, label: F.k.socialLooks[v] }))} onChange={(v) => set({ look: v })} />
        </>
      );

    /* ----- Spotlight: big picture with words + 2 or 4 product cards ----- */
    case "product_spotlight": {
      const d = s.data;
      return (
        <>
          {image("spotlight", F.image, d.image?.url, (url) => set({ image: { url } }), "image")}
          <Choice ctx={ctx} label={F.imagePosition} value={d.imagePosition} options={[{ value: "start", label: F.imageStart }, { value: "end", label: F.imageEnd }]} onChange={(v) => set({ imagePosition: v })} />
          <LText ctx={ctx} label={F.eyebrow} value={d.eyebrow} onChange={(v) => set({ eyebrow: v })} max={80} />
          <LText ctx={ctx} name="title" label={F.title} value={d.title} onChange={(v) => set({ title: v })} />
          <p className="-mt-2 text-xs text-muted-foreground">{F.k.accentHint}</p>
          <LArea ctx={ctx} label={F.text} value={d.text} onChange={(v) => set({ text: v })} max={400} />
          <LinkEditor ctx={ctx} label={F.button} optional value={d.cta} onChange={(v) => set({ cta: v })} />
          <Choice ctx={ctx} label={F.source} value={d.source} options={(["featured", "new", "category", "manual"] as const).map((v) => ({ value: v, label: F.sources[v] }))} onChange={(v) => set({ source: v })} />
          {d.source === "category" && (
            <label className={cn("flex flex-col gap-1.5 text-sm font-semibold", ctx.missing.has("category") && !d.categoryId && "text-destructive")}>
              {F.category}
              <select disabled={ctx.disabled} value={d.categoryId ?? ""} onChange={(e) => set({ categoryId: e.target.value || undefined })} className="h-11 rounded-lg border border-input bg-card px-3 font-normal text-foreground">
                <option value="">—</option>
                {ctx.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {d.source === "manual" && <ProductPicker ctx={ctx} value={d.productIds ?? []} onChange={(productIds) => set({ productIds: productIds.slice(0, 4) })} invalid={ctx.missing.has("products")} />}
          <Choice ctx={ctx} label={F.k.spotlightCount} value={String(d.limit) as "2" | "4"} options={(["2", "4"] as const).map((v) => ({ value: v, label: v }))} onChange={(v) => set({ limit: Number(v) })} />
        </>
      );
    }

    /* ----- Places on a picture ("Visit us *in Cairo*") ----- */
    case "locations": {
      const d = s.data;
      return (
        <>
          {image("locations", F.image, d.image?.url, (url) => set({ image: { url } }), "image")}
          <LText ctx={ctx} label={F.eyebrow} value={d.eyebrow} onChange={(v) => set({ eyebrow: v })} max={80} />
          <LText ctx={ctx} name="title" label={F.title} value={d.title} onChange={(v) => set({ title: v })} />
          <p className="-mt-2 text-xs text-muted-foreground">{F.k.accentHint}</p>
          <ItemList
            ctx={ctx}
            label={F.k.places}
            invalid={ctx.missing.has("items")}
            items={d.items}
            max={4}
            onChange={(items) => set({ items })}
            make={() => ({ title: E, text: E })}
            render={(item, update) => (
              <>
                <LText ctx={ctx} label={F.k.placeName} value={item.title} onChange={(v) => update({ ...item, title: v })} max={80} />
                <LArea ctx={ctx} label={F.text} value={item.text} onChange={(v) => update({ ...item, text: v })} max={200} />
                <LinkEditor ctx={ctx} label={F.button} optional value={item.link} onChange={(v) => update({ ...item, link: v })} />
              </>
            )}
          />
          <Choice ctx={ctx} label={F.hero.height} value={d.height ?? "md"} options={(["md", "lg"] as const).map((v) => ({ value: v, label: F.k.heroHeights[v] }))} onChange={(v) => set({ height: v })} />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {F.k.shade} ({d.overlay ?? 25}%)
            <input type="range" min={0} max={80} step={5} disabled={ctx.disabled} value={d.overlay ?? 25} onChange={(e) => set({ overlay: Number(e.target.value) })} className="accent-[var(--gold)]" />
          </label>
        </>
      );
    }

    case "contact":
      return (
        <>
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <LArea ctx={ctx} label={F.subtitle} value={s.data.subtitle} onChange={(v) => set({ subtitle: v })} max={300} />
          <ItemList
            ctx={ctx}
            label={F.subjects}
            invalid={ctx.missing.has("subjects")}
            items={s.data.subjects}
            onChange={(subjects) => set({ subjects })}
            make={() => ({ value: `subject_${s.data.subjects.length + 1}`, label: E })}
            render={(item, update) => (
              <div className="grid gap-3 sm:grid-cols-[1fr_0.6fr]">
                <LText ctx={ctx} label={F.label} value={item.label} onChange={(v) => update({ ...item, label: v })} max={80} />
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  {F.subjectId}
                  <input
                    dir="ltr"
                    disabled={ctx.disabled}
                    maxLength={40}
                    value={item.value}
                    onChange={(e) => update({ ...item, value: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                    className="h-11 rounded-lg border border-input bg-card px-3 font-mono text-xs font-normal"
                  />
                </label>
              </div>
            )}
          />
          <LArea ctx={ctx} name="successMessage" label={F.successMessage} value={s.data.successMessage} onChange={(v) => set({ successMessage: v })} max={300} />
          <Toggle label={F.showContactInfo} checked={s.data.showContactInfo} disabled={ctx.disabled} onChange={(v) => set({ showContactInfo: v })} />
          <Toggle label={F.showBranchSelect} checked={s.data.showBranchSelect} disabled={ctx.disabled} onChange={(v) => set({ showBranchSelect: v })} />
        </>
      );

    case "custom_order":
      return (
        <>
          <p className="text-xs text-muted-foreground">{F.customOrderNote}</p>
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <LArea ctx={ctx} label={F.subtitle} value={s.data.subtitle} onChange={(v) => set({ subtitle: v })} max={300} />
          <ItemList
            ctx={ctx}
            label={F.steps}
            invalid={ctx.missing.has("steps")}
            items={s.data.steps}
            max={6}
            onChange={(steps) => set({ steps })}
            make={() => ({ ...E })}
            render={(step, update) => <LText ctx={ctx} name="steps" label={F.step} value={step} onChange={update} max={120} />}
          />
          <LArea ctx={ctx} name="successMessage" label={F.successMessage} value={s.data.successMessage} onChange={(v) => set({ successMessage: v })} max={300} />
          <Toggle label={F.showKarat} checked={s.data.showKarat} disabled={ctx.disabled} onChange={(v) => set({ showKarat: v })} />
          <Toggle label={F.showBudget} checked={s.data.showBudget} disabled={ctx.disabled} onChange={(v) => set({ showBudget: v })} />
        </>
      );

    /* ===================== HOMEPAGE BLOCKS ===================== */
    case "hero":
      return (
        <>
          {/* How tall the slider is: original · taller · the whole screen */}
          <Choice ctx={ctx} label={F.k.heroHeight} value={s.data.height ?? "md"} options={(["md", "lg", "full"] as const).map((v) => ({ value: v, label: F.k.heroHeights[v] }))} onChange={(v) => set({ height: v })} />
          {/* classic = big title + buttons · editorial = quiet small words at the bottom centre + "DISCOVER" with a thin line */}
          <Choice ctx={ctx} label={F.k.look} value={s.data.look ?? "classic"} options={(["classic", "editorial"] as const).map((v) => ({ value: v, label: F.k.heroLooks[v] }))} onChange={(v) => set({ look: v })} />
          {s.data.look === "editorial" && <p className="-mt-2 text-xs text-muted-foreground">{F.k.heroEditorialHint}</p>}
          <p className="text-xs text-muted-foreground">{F.slidesNote}</p>
          <ItemList
            ctx={ctx}
            label={F.slides}
            invalid={ctx.missing.has("slides")}
            items={s.data.slides}
            max={8}
            onChange={(slides) => set({ slides })}
            make={() => ({ image: { url: "" }, title: E, subtitle: E })}
            render={(slide, update) => (
              <>
                {image("heroSlide", F.slideImage, slide.image?.url, (url) => update({ ...slide, image: { url } }), ctx.missing.has("slides") ? "slides" : undefined)}
                {image("heroSlideMobile", F.mobileImage, slide.mobileImage?.url, (url) => update({ ...slide, mobileImage: url ? { url } : undefined }))}
                {/* What shows on this slide: title · text · each button — switch any of them on or off */}
                <HeroShowSwitches ctx={ctx} value={slide.style} onChange={(style) => update({ ...slide, style })} />
                {slide.style?.showTitle !== false && <LText ctx={ctx} name="slides" label={F.title} value={slide.title} onChange={(v) => update({ ...slide, title: v })} />}
                {slide.style?.showText !== false && <LArea ctx={ctx} label={F.subtitle} value={slide.subtitle} onChange={(v) => update({ ...slide, subtitle: v })} max={300} />}
                {slide.style?.showButton1 !== false && <LinkEditor ctx={ctx} label={F.button} optional value={slide.cta} onChange={(v) => update({ ...slide, cta: v })} />}
                {/* Second button next to the first (e.g. "Design your piece" → /custom-order) */}
                {slide.style?.showButton2 !== false && <LinkEditor ctx={ctx} label={F.button2} optional value={slide.cta2} onChange={(v) => update({ ...slide, cta2: v })} />}
                {/* Where the words and buttons sit on this slide, and their colours */}
                <HeroStyleEditor ctx={ctx} kind="slide" value={slide.style} onChange={(style) => update({ ...slide, style })} buttonNames={[slide.style?.showButton1 === false ? undefined : slide.cta, slide.style?.showButton2 === false ? undefined : slide.cta2].map((b) => b?.label[ctx.lang] ?? "").filter(Boolean)} />
              </>
            )}
          />
        </>
      );

    case "banner":
      return (
        <>
          {image("banner", F.image, s.data.image?.url, (url) => set({ image: { url } }), "image")}
          <LText ctx={ctx} label={F.bannerTitle} value={s.data.title} onChange={(v) => set({ title: v })} />
          <LinkEditor ctx={ctx} label={F.button} optional value={s.data.cta} onChange={(v) => set({ cta: v })} />
        </>
      );

    case "featured_products": {
      const d = s.data;
      return (
        <>
          <LText ctx={ctx} name="title" label={F.title} value={d.title} onChange={(v) => set({ title: v })} />
          <Choice ctx={ctx} label={F.source} value={d.source} options={(["featured", "new", "category", "manual"] as const).map((v) => ({ value: v, label: F.sources[v] }))} onChange={(v) => set({ source: v })} />
          <p className="-mt-2 text-xs text-muted-foreground">{F.sourceHints[d.source]}</p>
          {d.source === "category" && (
            <label className={cn("flex flex-col gap-1.5 text-sm font-semibold", ctx.missing.has("category") && !d.categoryId && "text-destructive")}>
              {F.category}
              <select disabled={ctx.disabled} value={d.categoryId ?? ""} onChange={(e) => set({ categoryId: e.target.value || undefined })} className="h-11 rounded-lg border border-input bg-card px-3 font-normal text-foreground">
                <option value="">—</option>
                {ctx.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {d.source === "manual" ? (
            <ProductPicker ctx={ctx} value={d.productIds ?? []} onChange={(productIds) => set({ productIds, limit: Math.max(productIds.length, 1) })} invalid={ctx.missing.has("products")} />
          ) : (
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {F.limit}
              <input type="number" min={1} max={24} dir="ltr" disabled={ctx.disabled} value={d.limit} onChange={(e) => set({ limit: Math.min(24, Math.max(1, Number(e.target.value) || 1)) })} className="h-11 w-28 rounded-lg border border-input bg-card px-3 font-normal" />
            </label>
          )}
          {/* grid = rows of cards · carousel = one sideways row with ← →, a progress line and tabs */}
          <Choice ctx={ctx} label={F.k.look} value={d.layout ?? "grid"} options={(["grid", "carousel"] as const).map((v) => ({ value: v, label: F.k.productLayouts[v] }))} onChange={(v) => set({ layout: v })} />
          <Choice ctx={ctx} label={F.k.titleStyle} value={d.titleStyle ?? (d.layout === "carousel" ? "centered" : "classic")} options={(["classic", "centered"] as const).map((v) => ({ value: v, label: F.k.titleStyles[v] }))} onChange={(v) => set({ titleStyle: v })} />
          {d.layout === "carousel" && (
            <>
              <LText ctx={ctx} label={F.k.allLabel} value={d.allLabel} onChange={(v) => set({ allLabel: v })} max={40} />
              <ItemList
                ctx={ctx}
                label={F.k.tabs}
                items={d.tabs ?? []}
                max={8}
                onChange={(tabs) => set({ tabs })}
                make={(): { label: typeof E; categoryId?: string; tag?: string } => ({ label: E })}
                render={(tab, update) => (
                  <>
                    <LText ctx={ctx} label={F.k.tabLabel} value={tab.label} onChange={(v) => update({ ...tab, label: v })} max={40} />
                    <label className="flex flex-col gap-1.5 text-sm font-semibold">
                      {F.category}
                      <select disabled={ctx.disabled} value={tab.categoryId ?? ""} onChange={(e) => update({ ...tab, categoryId: e.target.value || undefined })} className="h-11 rounded-lg border border-input bg-card px-3 font-normal text-foreground">
                        <option value="">—</option>
                        {ctx.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-semibold">
                      {F.k.tabTag}
                      <input dir="ltr" disabled={ctx.disabled} maxLength={40} value={tab.tag ?? ""} placeholder="gold" onChange={(e) => update({ ...tab, tag: e.target.value.trim() || undefined })} className="h-11 rounded-lg border border-input bg-card px-3 font-normal" />
                      <span className="text-xs font-normal text-muted-foreground">{F.k.tabTagHint}</span>
                    </label>
                  </>
                )}
              />
            </>
          )}
        </>
      );
    }

    case "categories":
      return (
        <>
          <LText ctx={ctx} label={F.eyebrow} value={s.data.eyebrow} onChange={(v) => set({ eyebrow: v })} max={80} />
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          {/* Look: round pictures with the name under them, or square tiles with the name on the picture */}
          <Choice ctx={ctx} label={F.k.look} value={s.data.style ?? "circles"} options={(["circles", "tiles"] as const).map((v) => ({ value: v, label: F.k.categoryStyles[v] }))} onChange={(v) => set({ style: v })} />
          {s.data.style === "tiles" && <Toggle label={F.k.fullWidth} checked={!!s.data.fullWidth} disabled={ctx.disabled} onChange={(v) => set({ fullWidth: v })} />}
          {ticks(
            F.showCategories,
            F.allCategoriesHint,
            ctx.categories.map((c) => ({ value: c.id, label: c.name })),
            s.data.categoryIds ?? [],
            (ids) => set({ categoryIds: ids.length ? ids : undefined }),
          )}
          {/* Two separate positions: the title, and the circles (pictures) */}
          <Choice ctx={ctx} label={F.categoriesTitleAlign} value={s.data.titleAlign ?? s.data.align ?? "start"} options={(["start", "center", "end"] as const).map((v) => ({ value: v, label: F.aligns[v] }))} onChange={(v) => set({ titleAlign: v })} />
          <Choice ctx={ctx} label={F.categoriesAlign} value={s.data.align ?? "start"} options={(["start", "center", "end"] as const).map((v) => ({ value: v, label: F.aligns[v] }))} onChange={(v) => set({ align: v, titleAlign: s.data.titleAlign ?? s.data.align ?? "start" })} />
          <p className="-mt-2 text-xs text-muted-foreground">{F.categoriesAlignHint}</p>
        </>
      );

    case "brands":
      return (
        <>
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          {ticks(
            F.showBrands,
            F.allBrandsHint,
            (ctx.brands ?? []).map((b) => ({ value: b.id, label: b.name })),
            s.data.brandIds ?? [],
            (ids) => set({ brandIds: ids.length ? ids : undefined }),
          )}
          {/* Two separate positions: the title, and the collections. Names and pictures: dashboard → Collections */}
          <Choice ctx={ctx} label={F.categoriesTitleAlign} value={s.data.titleAlign ?? s.data.align ?? "start"} options={(["start", "center", "end"] as const).map((v) => ({ value: v, label: F.aligns[v] }))} onChange={(v) => set({ titleAlign: v })} />
          <Choice ctx={ctx} label={F.brandsAlign} value={s.data.align ?? "start"} options={(["start", "center", "end"] as const).map((v) => ({ value: v, label: F.aligns[v] }))} onChange={(v) => set({ align: v, titleAlign: s.data.titleAlign ?? s.data.align ?? "start" })} />
          <p className="-mt-2 text-xs text-muted-foreground">{F.brandsAlignHint}</p>
        </>
      );

    case "video": {
      const v = s.data.video;
      const bad = ctx.missing.has("video") && !v.url.trim();
      return (
        <>
          <LText ctx={ctx} label={F.title} value={s.data.title} onChange={(t) => set({ title: t })} />
          <Choice ctx={ctx} label={F.videoProvider} value={v.provider} options={(["youtube", "vimeo", "file"] as const).map((p) => ({ value: p, label: F.providers[p] }))} onChange={(provider) => set({ video: { ...v, provider, url: toEmbedUrl(provider, v.url) } })} />
          <label className={cn("flex flex-col gap-1.5 text-sm font-semibold", bad && "text-destructive")}>
            {F.videoUrl}
            <input
              dir="ltr"
              disabled={ctx.disabled}
              maxLength={600}
              value={v.url}
              placeholder={v.provider === "file" ? "https://…/video.mp4" : v.provider === "vimeo" ? "https://vimeo.com/123456789" : "https://www.youtube.com/watch?v=…"}
              onChange={(e) => set({ video: { ...v, url: e.target.value.trim() } })}
              onBlur={() => set({ video: { ...v, url: toEmbedUrl(v.provider, v.url) } })}
              className={cn("h-11 rounded-lg border bg-card px-3 font-normal text-foreground", bad ? "border-destructive" : "border-input")}
            />
            {v.provider !== "file" && <span className="text-xs font-normal text-muted-foreground">{F.videoHint}</span>}
          </label>
          {v.provider === "file" && image("videoPoster", F.poster, v.posterUrl, (url) => set({ video: { ...v, posterUrl: url || undefined } }))}
        </>
      );
    }

    case "promotion":
      return (
        <>
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          <LArea ctx={ctx} label={F.description} value={s.data.description} onChange={(v) => set({ description: v })} max={400} />
          {image("promotion", F.image, s.data.image?.url, (url) => set({ image: url ? { url } : undefined }))}
          <LinkEditor ctx={ctx} label={F.button} optional value={s.data.cta} onChange={(v) => set({ cta: v })} />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {F.endsAt}
            <input
              type="date"
              dir="ltr"
              disabled={ctx.disabled}
              // Saved as the end of that day, in the browser's time zone
              value={s.data.endsAt ? toDateInput(s.data.endsAt) : ""}
              onChange={(e) => set({ endsAt: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : undefined })}
              className="h-11 w-48 rounded-lg border border-input bg-card px-3 font-normal"
            />
            <span className="text-xs font-normal text-muted-foreground">{F.endsAtHint}</span>
          </label>
        </>
      );

    case "gold_prices": {
      const karats = (ctx.karats?.length ? ctx.karats : [24, 21, 18]) as (24 | 22 | 21 | 18 | 14)[];
      return (
        <>
          <LText ctx={ctx} name="title" label={F.title} value={s.data.title} onChange={(v) => set({ title: v })} />
          {ticks(
            F.karats,
            F.karatsHint,
            karats.map((k) => ({ value: k, label: fill(F.karatN, { k: new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(k) }) })),
            s.data.karats.filter((k) => karats.includes(k)),
            (list) => set({ karats: karats.filter((k) => list.includes(k)) }),
            ctx.missing.has("karats") && !s.data.karats.length,
          )}
        </>
      );
    }

    // Blocks only pages have (title banner, contact form) are handled above
    default:
      return null;
  }
}

/** ISO date -> "YYYY-MM-DD" in the browser's time zone (for the date box) */
function toDateInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
