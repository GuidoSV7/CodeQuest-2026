"use client";

import { useEffect } from "react";
import { fetchMe } from "@/features/auth/api/auth.service";
import { useAuthStore } from "@/stores/auth-session";

/** Loads cookie session once on mount. */
export function AuthSessionHydrator() {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const user = await fetchMe();
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
