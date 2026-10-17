/**
 * SHADCN SHEET — a panel that slides in from the side (mobile menu, filters on phones).
 * Built on Radix Dialog: closes with Esc or a tap outside, keeps keyboard focus inside, locks page scroll.
 * side="start" slides from the reading-start side (left in English, right in Arabic).
 */
"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  side = "start",
  closeLabel = "Close",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "start" | "end" | "bottom"; closeLabel?: string }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <SheetPrimitive.Content
        // Don't jump into the first text box when opening (it would pop up the phone keyboard)
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "fixed z-50 flex flex-col bg-background shadow-xl transition ease-in-out data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:duration-200",
          side === "start" && "inset-y-0 start-0 h-full w-[85%] max-w-sm border-e ltr:data-[state=open]:slide-in-from-left ltr:data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-right",
          side === "end" && "inset-y-0 end-0 h-full w-[85%] max-w-sm border-s ltr:data-[state=open]:slide-in-from-right ltr:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-left rtl:data-[state=closed]:slide-out-to-left",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute end-4 top-4 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-5" />
          <span className="sr-only">{closeLabel}</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("border-b p-4 pe-12", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
}

function SheetDescription(props: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
