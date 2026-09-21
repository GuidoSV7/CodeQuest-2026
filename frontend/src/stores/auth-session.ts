import { create } from "zustand";
import type { SessionUser } from "@/features/auth/types/auth.types";

type AuthState = {
  user: SessionUser | null;
  hydrated: boolean;
  setUser: (user: SessionUser | null) => void;
  setHydrated: (value: boolean) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  setHydrated: (hydrated) => set({ hydrated }),
  clear: () => set({ user: null }),
}));
