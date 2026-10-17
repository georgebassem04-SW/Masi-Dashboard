/**
 * NOTE: these shared types are a COPY of storefront/types. Keep both folders the same
 * (see README → "Shared types"). Dashboard-only types live in types/admin.ts.
 *
 * Re-exports all types so other files can write:  import type { Product } from "@/types";
 */
export * from "./common";
export * from "./product";
export * from "./cms";
export * from "./order";
export * from "./client";
export * from "./checkout";
export * from "./admin";
export * from "./theme";
