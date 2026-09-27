import api from "@/lib/axios";
import { getPublicApiUrl } from "@/lib/api-url";
import { clearLocalSessionToken, loginReturnTarget } from "@/features/auth/lib/local-session";
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
  clearLocalSessionToken(typeof sessionStorage === "undefined" ? undefined : sessionStorage);
  await api.post("/api/auth/logout");
}

/** Browser redirect entry for Discord OAuth (absolute API origin). */
export function discordStartUrl(returnTo?: string, origin = typeof window === "undefined" ? "" : window.location.origin): string {
  const base = `${getPublicApiUrl()}/api/auth/discord/start`;
  const target = returnTo ? loginReturnTarget(origin, returnTo) : undefined;
  if (!target) return base;
  const q = new URLSearchParams({ returnTo: target });
  return `${base}?${q.toString()}`;
}

/** Same Discord OAuth for both screens. Register creates the user on first callback. */
export function authEntryPath(intent: "login" | "register"): string {
  return intent === "register" ? "/registro" : "/login";
}
