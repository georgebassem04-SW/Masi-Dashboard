/**
 * SYNC WITH ERP — POST /api/products/sync
 * Pulls weight, stock and new products from the ERP now. Needs permission products = edit.
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function POST() {
  const guard = await guardRoute("products", "edit");
  if (!guard.ok) return guard.response;
  const result = await api.syncProducts(guard.session.token);
  await revalidateStorefront(["products"]);
  return NextResponse.json({ ok: true, ...result });
}
