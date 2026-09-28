"use client";

import { useEffect } from "react";
import { fetchMeStatus } from "@/features/auth/api/auth.service";
import { captureLocalSessionFromLocation } from "@/features/auth/lib/local-session";
import {
  clearSignedOut,
  readSignedOut,
  resolveOrbitalSessionRead,
} from "@/features/auth/lib/demo-session";
import { useAuthStore } from "@/stores/auth-session";

/** Loads the Discord cookie session from GET /api/auth/me; re-reads on every requestSessionRead. */
export function AuthSessionHydrator() {
  const sessionReadRequest = useAuthStore((s) => s.sessionReadRequest);
  const applySessionRead = useAuthStore((s) => s.applySessionRead);

  useEffect(() => {
    captureLocalSessionFromLocation(window.location, sessionStorage, (url) => {
      window.history.replaceState(null, "", url);
    });
    let cancelled = false;
    void (async () => {
      const environment = {
        nodeEnv: process.env.NODE_ENV,
        demoSession: process.env.NEXT_PUBLIC_ORBITAL_DEMO_SESSION,
      };
      const read = readSignedOut()
        ? await fetchMeStatus()
        : await resolveOrbitalSessionRead(environment, fetchMeStatus);
      if (cancelled) return;
      if (read.status === "authenticated") clearSignedOut();
      applySessionRead(read, sessionReadRequest);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionReadRequest, applySessionRead]);

  return null;
}
