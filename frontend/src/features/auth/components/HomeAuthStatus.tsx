"use client";

import { useAuthStore } from "@/stores/auth-session";
import styles from "./HomeAuthStatus.module.css";

export function HomeAuthStatus() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated || !user) return null;

  return (
    <p className={styles.status}>
      Sesión: <strong>{user.displayName}</strong>
    </p>
  );
}
