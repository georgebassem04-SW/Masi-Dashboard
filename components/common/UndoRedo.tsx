/**
 * UNDO / REDO BUTTONS — the two arrows shown in every edit form.
 * ------------------------------------------------------------------
 * Use:  const history = useUndoRedo(form, setForm);   (lib/hooks/use-undo-redo.ts)
 *       <UndoRedo history={history} />
 *   - `keyboard`: also listen for Ctrl+Z / Ctrl+Y (⌘Z / ⇧⌘Z on Mac). Give it to ONE form per page only.
 *     While the cursor is inside a text box the browser's own undo keeps working, as usual.
 *   - Texts ("Undo" / "Redo"): dictionaries → "history". They reach this component through
 *     <UndoLabels> in app/(admin)/layout.tsx, so forms don't have to pass them.
 *   - Look of the buttons: the classes at the bottom of this file.
 */
"use client";

import { createContext, useContext, useEffect } from "react";
import { Redo2, Undo2 } from "lucide-react";
import type { UndoHistory } from "@/lib/hooks/use-undo-redo";
import { cn } from "@/lib/utils";

type Labels = { undo: string; redo: string };
const LabelsContext = createContext<Labels>({ undo: "Undo", redo: "Redo" });

/** Put once around the dashboard (app/(admin)/layout.tsx) with the texts of the current language */
export function UndoLabels({ labels, children }: { labels: Labels; children: React.ReactNode }) {
  return <LabelsContext.Provider value={labels}>{children}</LabelsContext.Provider>;
}

export function UndoRedo({ history, keyboard, disabled, className }: { history: UndoHistory; keyboard?: boolean; disabled?: boolean; className?: string }) {
  const labels = useContext(LabelsContext);
  const { undo, redo, canUndo, canRedo } = history;

  useEffect(() => {
    if (!keyboard || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      // Inside a text box the browser undoes the typing itself
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      e.preventDefault();
      if (key === "y" || e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const button = "flex size-10 items-center justify-center rounded-lg border border-input bg-card hover:bg-muted disabled:opacity-35 disabled:hover:bg-card";
  return (
    // dir="ltr": "back" is always the left arrow, in Arabic too
    <div dir="ltr" className={cn("inline-flex shrink-0 gap-1", className)}>
      <button type="button" onClick={undo} disabled={disabled || !canUndo} aria-label={labels.undo} title={labels.undo} className={button}>
        <Undo2 className="size-4" />
      </button>
      <button type="button" onClick={redo} disabled={disabled || !canRedo} aria-label={labels.redo} title={labels.redo} className={button}>
        <Redo2 className="size-4" />
      </button>
    </div>
  );
}
