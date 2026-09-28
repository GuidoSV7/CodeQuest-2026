import { create } from "zustand";
import type { SessionRead, SessionStatus, SessionUser } from "@/features/auth/types/auth.types";

type AuthState = {
  user: SessionUser | null;
  hydrated: boolean;
  sessionStatus: SessionStatus;
  sessionReadRequest: number;
  setUser: (user: SessionUser | null) => void;
  setHydrated: (value: boolean) => void;
  clear: () => void;
  applySessionRead: (read: SessionRead, request: number) => void;
  requestSessionRead: () => void;
};

// Each action writes user + hydrated + sessionStatus in a single set so the invariants
// (authenticated ⇔ user, hydrated ⇔ not unknown) never expose an intermediate state.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  sessionStatus: "unknown",
  sessionReadRequest: 0,
  setUser: (user) =>
    set(
      user
        ? { user, sessionStatus: "authenticated", hydrated: true }
        : { user: null, sessionStatus: "anonymous", hydrated: true },
    ),
  setHydrated: (value) =>
    set((state) => {
      if (!value) return { hydrated: false, user: null, sessionStatus: "unknown" };
      if (state.sessionStatus === "unknown") return { hydrated: true, sessionStatus: "anonymous" };
      return {};
    }),
  clear: () => set({ user: null, sessionStatus: "anonymous", hydrated: true }),
  applySessionRead: (read, request) =>
    set((state) => {
      if (request !== state.sessionReadRequest) return {};
      return read.status === "authenticated"
        ? { user: read.user, sessionStatus: "authenticated", hydrated: true }
        : { user: null, sessionStatus: read.status, hydrated: true };
    }),
  requestSessionRead: () =>
    set((state) => ({
      user: null,
      hydrated: false,
      sessionStatus: "unknown",
      sessionReadRequest: state.sessionReadRequest + 1,
    })),
}));
