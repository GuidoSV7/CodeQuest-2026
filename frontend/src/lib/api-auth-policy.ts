import type { InternalAxiosRequestConfig } from "axios";

/**
 * Cookie session (`cq_session`) is sent via `withCredentials`.
 * Keep this hook for future Authorization headers if needed.
 */
export function applyRequestAuthPolicy(
  _config: InternalAxiosRequestConfig,
): void {
  // no-op: backend auth is httpOnly cookie based
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
