/**
 * SMALL FORM PIECES for the theme editor: colour picker, slider, choice buttons, on/off switch.
 * Each shows its label on top and (optionally) a short hint under it.
 */
"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { contrastRatio, MIN_CONTRAST } from "@/lib/color";
import { fill } from "@/lib/format";

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-[#4a443b]">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Colour swatch + #hex box. `against` = the colour this one sits on/under, to check readability. */
export function ColorField({
  label,
  value,
  onChange,
  against,
  labels,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  against?: string;
  labels: { contrastLow: string; contrastOk: string };
  disabled?: boolean;
}) {
  const id = useId();
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  const ratio = against ? contrastRatio(value, against) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-[#4a443b]">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={valid ? value : "#000000"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-input bg-card p-1 disabled:cursor-not-allowed"
        />
        <input
          id={id}
          dir="ltr"
          value={value}
          disabled={disabled}
          maxLength={7}
          onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value.toUpperCase() : `#${e.target.value.toUpperCase()}`)}
          aria-invalid={!valid}
          className={cn(
            "h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 font-mono text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            !valid && "border-destructive",
          )}
        />
      </div>
      {ratio !== null && (
        <span className={cn("text-xs", ratio < MIN_CONTRAST ? "text-[var(--status-progress-fg)]" : "text-muted-foreground")}>
          {fill(ratio < MIN_CONTRAST ? labels.contrastLow : labels.contrastOk, { ratio })}
        </span>
      )}
    </div>
  );
}

export function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 flex-1 accent-[var(--gold)]"
        />
        <span dir="ltr" className="w-16 rounded-md bg-muted px-2 py-1 text-center font-mono text-sm">
          {value}
          {unit}
        </span>
      </div>
    </Field>
  );
}

/** Row of buttons where exactly one is selected (radio group) */
export function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-semibold text-[#4a443b]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-11 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-60",
              o.value === value ? "border-gold bg-accent font-semibold" : "border-input bg-card hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="text-sm font-semibold text-[#4a443b]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-gold" : "bg-input")}
      >
        <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", checked ? "start-6" : "start-1")} />
      </button>
    </label>
  );
}

/** Plain text box for bilingual text (Arabic box is right-to-left, English box left-to-right) */
export function TextInput({
  label,
  value,
  onChange,
  dir,
  disabled,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir: "rtl" | "ltr";
  disabled?: boolean;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        dir={dir}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </Field>
  );
}
