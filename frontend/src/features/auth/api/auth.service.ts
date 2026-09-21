import api from "@/lib/axios";
import { getPublicApiUrl } from "@/lib/api-url";
import type { SessionUser } from "@/features/auth/types/auth.types";

/** GET /api/auth/me — cookie session. */
export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const { data } = await api.get<SessionUser>("/api/auth/me");
    return data;
  } catch {
    return null;
  }
}

/** POST /api/auth/logout — clears cq_session cookie on API origin. */
export async function logoutSession(): Promise<void> {
  await api.post("/api/auth/logout");
}

/** Browser redirect entry for Discord OAuth (absolute API origin). */
export function discordStartUrl(returnTo?: string): string {
  const base = `${getPublicApiUrl()}/api/auth/discord/start`;
  if (!returnTo) return base;
  const q = new URLSearchParams({ returnTo });
  return `${base}?${q.toString()}`;
}
