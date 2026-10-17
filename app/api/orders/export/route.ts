/**
 * EXPORT ORDERS — GET /api/orders/export?<same filters as the list>
 * Downloads a CSV file that opens in Excel (Arabic shows correctly thanks to the BOM at the start).
 * Needs permission orders = view. Max 5,000 rows.
 */
import type { NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { parseOrderQuery } from "@/lib/orders/query";

/** Quotes a CSV cell and stops Excel from running formulas typed by customers (=, +, -, @) */
const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  const guard = await guardRoute("orders", "view");
  if (!guard.ok) return guard.response;

  const locale = await getLocale();
  const d = (await getDictionary(locale)).orders;
  const status = (await getDictionary(locale)).status;
  const query = { ...parseOrderQuery(Object.fromEntries(request.nextUrl.searchParams)), page: 1, pageSize: 5000 };
  const { items } = await api.listOrders(query, guard.session.token);

  const header = [d.columns.number, d.columns.date, d.columns.customer, "Phone", d.columns.city, d.columns.items, d.columns.total, "Currency", d.columns.status, d.columns.payment];
  const rows = items.map((o) => [
    o.number,
    o.createdAt.slice(0, 16).replace("T", " "),
    o.customerName,
    o.phone ?? "",
    o.deliveryMethod === "store_pickup" ? d.pickup : (o.city ?? ""),
    o.itemsCount,
    o.total,
    o.currency,
    status[o.status],
    o.paymentStatus ? d.paymentStatus[o.paymentStatus] : "",
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
