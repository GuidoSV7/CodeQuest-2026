import type { InternalAxiosRequestConfig } from "axios";
import { captureLocalSessionFromLocation, readLocalSessionToken } from "@/features/auth/lib/local-session";

/**
 * Cookie session stays on production. Localhost sends the same JWT as Bearer
 * because the browser does not attach the API cookie across sites.
 */
export function applyRequestAuthPolicy(
  config: InternalAxiosRequestConfig,
  token = currentLocalSessionToken(),
): void {
  if (!token) return;
  config.headers.set("Authorization", `Bearer ${token}`);
}

function currentLocalSessionToken(): string | null {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return null;
  captureLocalSessionFromLocation(window.location, sessionStorage, (url) => {
    window.history.replaceState(null, "", url);
  });
  return readLocalSessionToken(sessionStorage);
}

export function mapApiResponseError(error: unknown): Error {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { data?: { message?: string }; status?: number } })
      .response
  ) {
    const res = (
      error as { response: { data?: { message?: string }; status: number } }
    ).response;
    const message =
      res.data?.message ??
      (error as { message?: string }).message ??
      "API error";
    const err = new Error(message) as Error & {
      codigoEstado?: number;
      cuerpo?: unknown;
    };
    err.codigoEstado = res.status;
    err.cuerpo = res.data;
    return err;
  }
  return error instanceof Error ? error : new Error(String(error));
}
