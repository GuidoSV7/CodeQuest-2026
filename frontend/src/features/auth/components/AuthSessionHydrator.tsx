"use client";

import { useEffect } from "react";
import { fetchMe } from "@/features/auth/api/auth.service";
import { useAuthStore } from "@/stores/auth-session";
import { resolveOrbitalSession } from "../lib/demo-session";

/** Loads cookie session once on mount. */
export function AuthSessionHydrator() {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;
    const readSession = () => fetchMe();
    void (async () => {
      const user = await resolveOrbitalSession(
        {
          nodeEnv: process.env.NODE_ENV,
          demoSession: process.env.NEXT_PUBLIC_ORBITAL_DEMO_SESSION,
        },
        readSession,
      );
      if (cancelled) return;
      setUser(user);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, setHydrated]);

  return null;
}
