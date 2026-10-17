/**
 * EXPORT REPORT — GET /api/reports/export?period=…[&from=…&to=…][&type=products]
 *   (default)       one row per day (or month): sales, orders, gold grams
 *   type=products   best sellers of the period: product, pieces, sales
 * CSV that opens in Excel (Arabic shows correctly thanks to the BOM). Needs permission reports = view.
 */
import type { NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { parseReportQuery } from "@/lib/reports/period";
import { t } from "@/lib/format";

const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  const guard = await guardRoute("reports", "view");
  if (!guard.ok) return guard.response;

  const locale = await getLocale();
  const d = (await getDictionary(locale)).reports.csv;
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const report = await api.getSalesReport(parseReportQuery(params), guard.session.token);
  const products = params.type === "products";

  const rows: unknown[][] = products
    ? [[d.product, d.pieces, `${d.sales} (${report.currency})`], ...report.topProducts.map((p) => [t(p.name, locale), p.pieces, p.sales])]
    : [
        [d.period, `${d.sales} (${report.currency})`, d.orders, d.gold],
        ...report.series.map((s) => [s.key, s.sales, s.orders, s.goldGrams]),
        ["", report.totals.sales, report.totals.orders, report.totals.goldGrams],
      ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${products ? "best-sellers" : "sales"}-${report.from}_${report.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
