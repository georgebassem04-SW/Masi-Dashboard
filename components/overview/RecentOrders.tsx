/**
 * LATEST ORDERS — table on large screens, stacked cards on phones.
 * Each order number links to /orders/<id> (the order page is built in the Orders step).
 */
import Link from "next/link";
import type { Locale, OrderStatus, OrderSummary } from "@/types";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Card } from "@/components/common/Card";
import { StatusBadge } from "@/components/common/StatusBadge";

type Labels = { recentOrders: string; allOrders: string; noOrders: string; orderNo: string; customer: string; date: string; total: string; status: string };

export function RecentOrders({
  orders,
  locale,
  labels,
  statusLabels,
  canOpen,
}: {
  orders: OrderSummary[];
  locale: Locale;
  labels: Labels;
  statusLabels: Record<OrderStatus, string>;
  canOpen: boolean;
}) {
  const number = (o: OrderSummary) =>
    canOpen ? (
      <Link href={`/orders/${o.id}`} className="font-bold hover:text-gold" dir="ltr">
        {o.number}
      </Link>
    ) : (
      <span className="font-bold" dir="ltr">
        {o.number}
      </span>
    );

  return (
    <Card
      title={labels.recentOrders}
      className="overflow-hidden"
      action={
        canOpen && (
          <Link href="/orders" className="text-sm font-semibold text-gold hover:underline">
            {labels.allOrders}
          </Link>
        )
      }
    >
      {orders.length === 0 ? (
        <p className="px-5 pb-6 text-muted-foreground">{labels.noOrders}</p>
      ) : (
        <>
          {/* Large screens: table */}
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-muted text-muted-foreground">
              <tr className="border-y">
                {[labels.orderNo, labels.customer, labels.date, labels.total, labels.status].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-start font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-[#fcfaf6]">
                  <td className="px-4 py-3">{number(o)}</td>
                  <td className="px-4 py-3">{o.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(o.createdAt, locale)}</td>
                  <td className="px-4 py-3 font-semibold">{formatMoney(o.total, o.currency, locale)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} label={statusLabels[o.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Phones: cards */}
          <ul className="flex flex-col md:hidden">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-col gap-1 border-t px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  {number(o)}
                  <StatusBadge status={o.status} label={statusLabels[o.status]} />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>
                    {o.customerName} · {formatDateTime(o.createdAt, locale)}
                  </span>
                  <span className="font-bold text-foreground">{formatMoney(o.total, o.currency, locale)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
