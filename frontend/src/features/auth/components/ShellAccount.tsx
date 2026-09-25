"use client";

import Link from "next/link";
import { authEntryPath } from "@/features/auth/api/auth.service";
import { useAuthStore } from "@/stores/auth-session";
import styles from "./ShellAccount.module.css";

export function ShellAccount() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  return (
    <div className={styles.account} aria-label="Avatar">
      {hydrated && user ? (
        <span className={styles.name}>{user.displayName}</span>
      ) : (
        <>
          <Link href={authEntryPath("login")}>Entrar</Link>
          <Link href={authEntryPath("register")}>Crear cuenta</Link>
        </>
      )}
    </div>
  );
}
