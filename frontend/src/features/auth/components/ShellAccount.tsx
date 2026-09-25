"use client";

import Link from "next/link";
import { authEntryPath } from "@/features/auth/api/auth.service";
import { useAuthStore } from "@/stores/auth-session";
import styles from "@/features/orbital/components/MissionShell.module.css";

export function ShellAccount() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  if (hydrated && user) {
    return (
      <span className={styles.avatar} aria-label="Avatar">
        {user.displayName}
      </span>
    );
  }

  return (
    <Link
      className={styles.avatar}
      href={authEntryPath("login")}
      aria-label="Avatar"
    >
      AVATAR
    </Link>
  );
}
