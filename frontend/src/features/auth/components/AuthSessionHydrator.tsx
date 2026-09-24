"use client";

import { useEffect } from "react";
import { orbitalDemoSessionFixture } from "@/../test/fixtures/ui-stitch-orbital";
import { useAuthStore } from "@/stores/auth-session";

/**
 * Hydrates a local fixture session without network.
 * Backend auth helpers stay unused until an API exists.
 */
export function AuthSessionHydrator() {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    setUser(orbitalDemoSessionFixture);
    setHydrated(true);
  }, [setUser, setHydrated]);

  return null;
}
