/**
 * LOGIN FORM RULES — shared by the form (browser) and the API route (server),
 * so the same checks run in both places. Error texts are keys in the dictionary → "login".
 */
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("emailInvalid").max(200),
  password: z.string().min(1, "passwordRequired").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Only allow going back to our own pages after login (stops redirects to other websites) */
export function safeNext(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}
