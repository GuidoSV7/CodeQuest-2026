import api from "@/lib/axios";
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

/** Browser redirect entry for Discord OAuth. */
export function discordStartUrl(returnTo?: string): string {
  const base = "/api/auth/discord/start";
  if (!returnTo) return base;
  const q = new URLSearchParams({ returnTo });
  return `${base}?${q.toString()}`;
}
