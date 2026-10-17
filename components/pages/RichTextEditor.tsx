/**
 * RICH TEXT EDITOR — the formatted-text box in the page editor (bold, headings, lists, links).
 * Built on the browser's own editing (contentEditable), so no extra package is needed.
 *   - Output: simple HTML (<p>, <h2>, <h3>, <strong>, <em>, <ul>/<ol>, <a>)
 *   - Pasting from Word / websites pastes PLAIN text (no hidden fonts or colours)
 *   - The website cleans the HTML again before showing it (storefront: components/common/RichText.tsx)
 * Remount it (key=…) when switching language or item, so it loads the new text.
 */
"use client";

import { useEffect, useRef } from "react";
import { Bold, Heading2, Heading3, Italic, Link2, Link2Off, List, ListOrdered, RemoveFormatting } from "lucide-react";
import { cn } from "@/lib/utils";

type Labels = { bold: string; italic: string; h2: string; h3: string; ul: string; ol: string; link: string; unlink: string; linkPrompt: string; clear: string };

export function RichTextEditor({
  value,
  onChange,
  dir,
  label,
  labels,
  disabled,
  invalid,
  minHeight = 140,
}: {
  value: string;
  onChange: (html: string) => void;
  dir: "rtl" | "ltr";
  label: string;
  labels: Labels;
  disabled?: boolean;
  invalid?: boolean;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Load the starting text once (the box then keeps its own content while typing)
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || "<p><br></p>";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    const html = ref.current?.innerHTML ?? "";
    onChange(html === "<p><br></p>" || html === "<br>" ? "" : html);
  };
  const run = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };
  const addLink = () => {
    const url = window.prompt(labels.linkPrompt, "https://")?.trim();
    if (!url || !/^(https?:\/\/|\/|mailto:|tel:)/.test(url)) return;
    run("createLink", url);
  };

  const tools: { icon: React.ElementType; label: string; action: () => void }[] = [
    { icon: Bold, label: labels.bold, action: () => run("bold") },
    { icon: Italic, label: labels.italic, action: () => run("italic") },
    { icon: Heading2, label: labels.h2, action: () => run("formatBlock", "<h2>") },
    { icon: Heading3, label: labels.h3, action: () => run("formatBlock", "<h3>") },
    { icon: List, label: labels.ul, action: () => run("insertUnorderedList") },
    { icon: ListOrdered, label: labels.ol, action: () => run("insertOrderedList") },
    { icon: Link2, label: labels.link, action: addLink },
    { icon: Link2Off, label: labels.unlink, action: () => run("unlink") },
    { icon: RemoveFormatting, label: labels.clear, action: () => { run("removeFormat"); run("formatBlock", "<p>"); } },
  ];

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card focus-within:ring-2 focus-within:ring-ring/40", invalid ? "border-destructive" : "border-input")}>
      {!disabled && (
        <div role="toolbar" aria-label={label} className="flex flex-wrap gap-0.5 border-b bg-muted/60 p-1">
          {tools.map(({ icon: Icon, label: l, action }) => (
            <button
              key={l}
              type="button"
              title={l}
              aria-label={l}
              // Keep the text selection when clicking a button
              onMouseDown={(e) => e.preventDefault()}
              onClick={action}
              className="rounded-md p-2 hover:bg-card"
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      )}
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        dir={dir}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        style={{ minHeight }}
        className="prose-editor max-w-none px-3 py-2 text-sm leading-relaxed outline-none [&_a]:text-gold [&_a]:underline [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:ps-5"
      />
    </div>
  );
}
