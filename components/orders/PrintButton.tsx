/** "Print" button on the invoice page (hidden on paper). Opens the browser's print window. */
"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground print:hidden">
      {label}
    </button>
  );
}
