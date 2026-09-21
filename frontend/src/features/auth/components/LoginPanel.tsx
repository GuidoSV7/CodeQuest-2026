"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  discordStartUrl,
  logoutSession,
} from "@/features/auth/api/auth.service";
import { useAuthStore } from "@/stores/auth-session";
import styles from "./LoginPanel.module.css";

type LoginPanelProps = {
  returnTo?: string;
};

export function LoginPanel({ returnTo = "/" }: LoginPanelProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const clear = useAuthStore((s) => s.clear);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!hydrated) {
    return (
      <section className={styles.panel} aria-busy="true">
        <p className={styles.muted}>Cargando sesión…</p>
      </section>
    );
  }

  if (user) {
    return (
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Sesión activa</p>
        <h1 className={styles.title}>{user.displayName}</h1>
        {user.email ? <p className={styles.muted}>{user.email}</p> : null}
        <div className={styles.actions}>
          <Link className={styles.secondary} href="/">
            Ir al inicio
          </Link>
          <button
            type="button"
            className={styles.primary}
            disabled={loggingOut}
            onClick={() => {
              void (async () => {
                setLoggingOut(true);
                try {
                  await logoutSession();
                  clear();
                  router.refresh();
                } finally {
                  setLoggingOut(false);
                }
              })();
            }}
          >
            {loggingOut ? "Cerrando…" : "Cerrar sesión"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <p className={styles.eyebrow}>CodeQuest</p>
      <h1 className={styles.title}>Entrar con Discord</h1>
      <p className={styles.lede}>
        Usamos Discord solo para identificarte. No guardamos tokens OAuth.
      </p>
      <div className={styles.actions}>
        <a className={styles.primary} href={discordStartUrl(returnTo)}>
          Continuar con Discord
        </a>
      </div>
    </section>
  );
}
