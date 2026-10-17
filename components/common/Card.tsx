/**
 * CARD — the white box with a thin border used for every block on the dashboard.
 *   <Card>…</Card>                       plain box
 *   <Card title="أحدث الطلبات" action={<Link…/>}>…</Card>   box with a heading row
 */
import { cn } from "@/lib/utils";

export function Card({
  title,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
