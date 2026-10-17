/**
 * PREVIEW LINK TOKEN — lets the storefront show an unpublished draft to staff only.
 *   createPreviewToken("about") -> signed token, valid 30 minutes, for that one page
 *   checkPreviewToken(token, "about") -> true / false
 * Signed with AUTH_SECRET (same key as the staff login), so nobody can make one without logging in.
 * The storefront never checks it itself: it passes it back to /api/public/pages/<slug>?preview=… here.
 * The homepage uses the name HOME_PREVIEW (no page can have that link, so the tokens can't be mixed up).
 */
import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { secretKey } from "@/lib/auth/session";

/** Preview token name for the homepage (/api/public/home?preview=…) */
export const HOME_PREVIEW = "__home";

export async function createPreviewToken(slug: string): Promise<string> {
  return new SignJWT({ slug, purpose: "page-preview" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30m").sign(secretKey());
}

export async function checkPreviewToken(token: string | null | undefined, slug: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.purpose === "page-preview" && payload.slug === slug;
  } catch {
    return false;
  }
}
