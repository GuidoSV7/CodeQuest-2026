import { apiErrorCode, asApiError } from "@/lib/errors";

export type RouteLoadFailure = "unauthorized" | "failed";
export type RouteCreateFailure = "unauthorized" | "catalog-unavailable" | "failed";

export function classifyRouteLoadError(error: unknown): RouteLoadFailure {
  return asApiError(error).statusCode === 401 ? "unauthorized" : "failed";
}

export function classifyRouteCreateError(error: unknown): RouteCreateFailure {
  const api = asApiError(error);
  if (api.statusCode === 401) return "unauthorized";
  if (api.statusCode === 503 && apiErrorCode(api) === "CATALOG_UNAVAILABLE") {
    return "catalog-unavailable";
  }
  return "failed";
}
