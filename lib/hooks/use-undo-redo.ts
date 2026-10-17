/**
 * UNDO / REDO for any edit form — one hook, used by every editor in the dashboard.
 * ------------------------------------------------------------------
 * It WATCHES a form's values and remembers each change, so nothing in the form itself has to change:
 *
 *   const [form, setForm] = useState(initial);
 *   const history = useUndoRedo(form, setForm);          // 1) watch the form
 *   <UndoRedo history={history} />                       // 2) show the two buttons (components/common/UndoRedo.tsx)
 *
 * A form made of several separate values passes them together and puts them back together:
 *   const history = useUndoRedo({ name, email }, (v) => { setName(v.name); setEmail(v.email); });
 *
 * Rules:
 *   - Typing quickly counts as ONE step (changes less than GROUP_MS apart are grouped), so "undo" removes
 *     the whole word / sentence, not one letter.
 *   - Undo goes back to how the form was when the page opened; it never touches what is already saved.
 *     After undoing, press Save as usual.
 *   - `resetKey`: when it changes (e.g. another record is opened in the same form) the history starts again.
 *   - MAX_STEPS steps are kept.
 */
"use client";

import { useEffect, useRef, useState } from "react";

/** Changes closer together than this (milliseconds) are one step */
const GROUP_MS = 500;
/** How many steps back are remembered */
const MAX_STEPS = 100;

export interface UndoHistory {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndoRedo<T>(value: T, apply: (value: T) => void, resetKey: unknown = null): UndoHistory {
  // Values are compared and stored as text, so a form that is rebuilt on every draw still counts as "unchanged"
  const json = JSON.stringify(value);
  const store = useRef({ past: [] as string[], future: [] as string[], seen: json, changedAt: 0, appliedAt: 0, key: resetKey });
  const applyRef = useRef(apply);
  const [steps, setSteps] = useState({ undo: 0, redo: 0 });

  useEffect(() => {
    applyRef.current = apply;
  });

  useEffect(() => {
    const h = store.current;
    const now = Date.now();
    if (h.key !== resetKey) {
      // Another record was opened: forget the old one's steps
      Object.assign(h, { past: [], future: [], seen: json, changedAt: 0, key: resetKey });
      setSteps({ undo: 0, redo: 0 });
      return;
    }
    if (json === h.seen) return;
    if (now - h.appliedAt < 250) {
      // The form tidying itself right after an undo / redo is not a new change
      h.seen = json;
      return;
    }
    if (now - h.changedAt > GROUP_MS) {
      h.past.push(h.seen);
      if (h.past.length > MAX_STEPS) h.past.shift();
    }
    h.future = [];
    h.seen = json;
    h.changedAt = now;
    setSteps({ undo: h.past.length, redo: 0 });
  }, [json, resetKey]);

  function step(from: string[], to: string[]) {
    const h = store.current;
    const target = from.pop();
    if (target === undefined) return;
    to.push(h.seen);
    h.seen = target;
    h.changedAt = 0; // the next edit starts a new step
    h.appliedAt = Date.now();
    setSteps({ undo: h.past.length, redo: h.future.length });
    applyRef.current(JSON.parse(target) as T);
  }

  return {
    undo: () => step(store.current.past, store.current.future),
    redo: () => step(store.current.future, store.current.past),
    canUndo: steps.undo > 0,
    canRedo: steps.redo > 0,
  };
}
