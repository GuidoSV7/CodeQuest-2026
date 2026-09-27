"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginPanel } from "@/features/auth/components/LoginPanel";
import { useAuthStore } from "@/stores/auth-session";

type AuthenticatedEntryProps = {
  returnTo: string;
  intent?: "login" | "register";
};

export function AuthenticatedEntry({
  returnTo,
  intent = "login",
}: AuthenticatedEntryProps) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && user) {
      router.replace(returnTo);
    }
  }, [hydrated, user, returnTo, router]);

  if (!hydrated || user) return null;

  return <LoginPanel returnTo={returnTo} intent={intent} />;
}
