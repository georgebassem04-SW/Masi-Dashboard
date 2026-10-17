/**
 * Picks the data source. Pages always write:  import { api } from "@/lib/api";
 *   DATA_SOURCE=mock  -> sample files (default)
 *   DATA_SOURCE=http  -> the real API
 */
import "server-only";
import type { AdminApi } from "./types";
import { mockApi } from "./mock";
import { httpApi } from "./http";

export const api: AdminApi = process.env.DATA_SOURCE === "http" ? httpApi : mockApi;
