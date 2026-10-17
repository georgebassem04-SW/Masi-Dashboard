/**
 * TELL THE STOREFRONT TO REFRESH — after publishing, the website should show the change right away.
 * Calls the storefront's POST /api/revalidate with a tag (e.g. "theme").
 * Needs in .env.local:  STOREFRONT_URL=https://www.client.com   REVALIDATE_SECRET=<same as the storefront's>
 * If they're not set (e.g. in development with sample data) nothing happens — the storefront then
 * reads the theme fresh on every page load anyway.
 */
import "server-only";

export async function revalidateStorefront(tags: string[]): Promise<void> {
  const url = process.env.STOREFRONT_URL?.replace(/\/$/, "");
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;
  try {
    const res = await fetch(`${url}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
      cache: "no-store",
    });
    if (!res.ok) console.error(`[revalidate] storefront answered ${res.status}`);
  } catch (e) {
    console.error("[revalidate] could not reach the storefront", e);
  }
}
