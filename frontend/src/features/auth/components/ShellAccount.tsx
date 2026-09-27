"use client";

import Link from "next/link";
import { authEntryPath, logoutSession } from "@/features/auth/api/auth.service";
import { markSignedOut } from "@/features/auth/lib/demo-session";
import { useAuthStore } from "@/stores/auth-session";
import styles from "@/features/orbital/components/MissionShell.module.css";

export function ShellAccount() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const clear = useAuthStore((state) => state.clear);

  async function signOut() {
    try {
      await logoutSession();
    } finally {
      markSignedOut();
      clear();
    }
  }

  if (!hydrated || !user) {
    return (
      <div className={styles.authActions}>
        <Link className={styles.authButton} href={authEntryPath("login")}>
          Login
        </Link>
        <Link
          className={`${styles.authButton} ${styles.authButtonPrimary}`}
          href={authEntryPath("register")}
        >
          Register
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.authActions}>
      <span className={`${styles.avatar} ${styles.avatarWithName}`}>
        {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : null}
        <span className={styles.avatarName}>{user.displayName}</span>
      </span>
      <button className={styles.authButton} type="button" onClick={() => void signOut()}>
        Salir
      </button>
    </div>
  );
}
