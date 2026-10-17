/**
 * EXPORT CUSTOMERS — GET /api/customers/export?<same filters as the list>
 * Downloads a CSV file that opens in Excel (e.g. the list of customers who accept offers, for a campaign).
 * Needs permission customers = view. Max 5,000 rows.
 */
import type { NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { parseCustomerQuery } from "@/lib/customers/query";

/** Quotes a CSV cell and stops Excel from running formulas typed by customers (=, +, -, @) */
const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  const guard = await guardRoute("customers", "view");
  if (!guard.ok) return guard.response;

  const d = (await getDictionary(await getLocale())).customers;
  const query = { ...parseCustomerQuery(Object.fromEntries(request.nextUrl.searchParams)), page: 1, pageSize: 5000 };
  const { items } = await api.listCustomers(query, guard.session.token);

  const header = [d.columns.name, d.columns.phone, d.columns.email, d.columns.city, d.columns.type, d.columns.orders, d.columns.spent, "Currency", d.columns.lastOrder, d.columns.since, d.columns.marketing, d.columns.state];
  const rows = items.map((c) => [
    c.name,
    c.phone,
    c.email ?? "",
    c.city ?? "",
    c.kind === "guest" ? d.kind.guest : d.kind.registered,
    c.ordersCount,
    c.totalSpent,
    c.currency,
    c.lastOrderAt?.slice(0, 10) ?? "",
    c.createdAt.slice(0, 10),
    c.marketingOptIn ? d.yes : d.no,
    c.disabled ? d.disabledBadge : "",
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
