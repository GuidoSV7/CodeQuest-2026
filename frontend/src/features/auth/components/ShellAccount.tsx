"use client";

import { useState } from "react";
import Link from "next/link";
import { authEntryPath } from "@/features/auth/api/auth.service";
import { AvatarUploadModal } from "@/features/auth/components/AvatarUploadModal";
import { useAuthStore } from "@/stores/auth-session";
import styles from "@/features/orbital/components/MissionShell.module.css";

export function ShellAccount() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const [open, setOpen] = useState(false);

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
      <button
        className={user.avatarUrl ? `${styles.avatar} ${styles.avatarPhoto}` : styles.avatar}
        type="button"
        aria-label="Avatar"
        onClick={() => setOpen(true)}
      >
        {user.avatarUrl ? (
          <img alt="" src={user.avatarUrl} />
        ) : (
          user.displayName
        )}
      </button>
      {open ? (
        <AvatarUploadModal
          onClose={() => setOpen(false)}
          onUploaded={(avatarUrl) => setUser({ ...user, avatarUrl })}
        />
      ) : null}
    </>
  );
}
