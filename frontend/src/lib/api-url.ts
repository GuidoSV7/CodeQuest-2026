/**
 * Public browser-facing API base URL.
 * Prefer absolute URL in env; fall back to same-origin `/api` proxy later if needed.
 */
export function getPublicApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
