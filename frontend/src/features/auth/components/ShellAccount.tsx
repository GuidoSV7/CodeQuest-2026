"use client";

import { useState } from "react";
import Link from "next/link";
import { authEntryPath, logoutSession } from "@/features/auth/api/auth.service";
import { markSignedOut } from "@/features/auth/lib/demo-session";
import { AvatarUploadModal } from "@/features/auth/components/AvatarUploadModal";
import { useAuthStore } from "@/stores/auth-session";
import styles from "@/features/orbital/components/MissionShell.module.css";

export function ShellAccount() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const clear = useAuthStore((state) => state.clear);
  const [open, setOpen] = useState(false);

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
    <>
      <div className={styles.authActions}>
      <button
        className={`${styles.avatar} ${styles.avatarWithName}`}
        type="button"
        aria-label="Avatar"
        onClick={() => setOpen(true)}
      >
        {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : null}
        <span className={styles.avatarName}>{user.displayName}</span>
      </button>
      <button className={styles.authButton} type="button" onClick={() => void signOut()}>
        Salir
      </button>
      </div>
      {open ? (
        <AvatarUploadModal
          onClose={() => setOpen(false)}
          onUploaded={(avatarUrl) => setUser({ ...user, avatarUrl })}
        />
      ) : null}
    </>
  );
}
