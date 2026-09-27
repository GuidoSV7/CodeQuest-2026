"use client";

import { useEffect } from "react";
import { fetchMe } from "@/features/auth/api/auth.service";
import {
  clearSignedOut,
  readSignedOut,
  resolveOrbitalSession,
} from "@/features/auth/lib/demo-session";
import { useAuthStore } from "@/stores/auth-session";

/** Loads the Discord cookie session from GET /api/auth/me. */
export function AuthSessionHydrator() {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const environment = {
        nodeEnv: process.env.NODE_ENV,
        demoSession: process.env.NEXT_PUBLIC_ORBITAL_DEMO_SESSION,
      };
      const user = readSignedOut()
        ? await fetchMe()
        : await resolveOrbitalSession(environment, fetchMe);
      if (cancelled) return;
      if (user) clearSignedOut();
      setUser(readSignedOut() ? null : user);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, setHydrated]);

  return null;
}
