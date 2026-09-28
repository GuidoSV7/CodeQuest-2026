import { asApiError } from "@/lib/errors";
import type { SessionRead, SessionUser } from "@/features/auth/types/auth.types";

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function parseSessionUser(body: unknown): SessionUser | null {
  if (typeof body !== "object" || body === null) return null;
  if (!("id" in body) || !("displayName" in body) || !("avatarUrl" in body) || !("email" in body)) return null;
  const { id, displayName, avatarUrl, email } = body;
  if (typeof id !== "string" || id === "" || typeof displayName !== "string") return null;
  if (!isNullableString(avatarUrl) || !isNullableString(email)) return null;
  return { id, displayName, avatarUrl, email };
}

export function classifySessionReadError(error: unknown): SessionRead {
  const { statusCode } = asApiError(error);
  return statusCode === 401 || statusCode === 403 ? { status: "anonymous" } : { status: "unreachable" };
}
