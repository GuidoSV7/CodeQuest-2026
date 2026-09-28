"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authEntryPath, logoutSession } from "@/features/auth/api/auth.service";
import { markSignedOut } from "@/features/auth/lib/demo-session";
import { useAuthStore } from "@/stores/auth-session";
import styles from "@/features/orbital/components/MissionShell.module.css";

export function ShellAccount() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const clear = useAuthStore((state) => state.clear);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
      <Link
        className={`${styles.authButton} ${styles.authButtonPrimary}`}
        href={authEntryPath("login")}
      >
        Entrar
      </Link>
    );
  }

  return (
    <div className={styles.accountMenu} ref={menuRef}>
      <button
        className={`${styles.avatar} ${styles.avatarWithName}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : null}
        <span className={styles.avatarName}>{user.displayName}</span>
      </button>
      {open ? (
        <div className={styles.accountPanel} role="menu">
          <button className={styles.authButton} type="button" role="menuitem" onClick={() => void signOut()}>
            Salir
          </button>
        </div>
      ) : null}
    </div>
  );
}
