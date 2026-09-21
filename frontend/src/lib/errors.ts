export type ApiErrorBody = {
  message?: string;
  error?: string;
  statusCode?: number;
};

export class ApiError extends Error {
  statusCode: number;
  body: unknown;

  constructor(message: string, statusCode: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) {
    const ext = error as Error & { codigoEstado?: number; cuerpo?: unknown };
    return new ApiError(
      error.message,
      ext.codigoEstado ?? 0,
      ext.cuerpo ?? null,
    );
  }
  return new ApiError(String(error), 0, null);
}
