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
  const [logoutError, setLogoutError] = useState(false);

  if (!hydrated) {
    return (
      <section className={styles.panel} aria-busy="true" aria-labelledby="login-loading-title">
        <span className={styles.terminalLabel}>TERMINAL DE ACCESO // AUTH</span>
        <h1 className={styles.title} id="login-loading-title">
          Cargando sesión…
        </h1>
      </section>
    );
  }

  if (user) {
    return (
      <section className={styles.panel} aria-labelledby="session-title">
        <span className={styles.terminalLabel}>TERMINAL DE ACCESO // AUTH</span>
        <p className={styles.eyebrow}>Sesión activa</p>
        <h1 className={styles.title} id="session-title">
          {user.displayName}
        </h1>
        {user.email ? <p className={styles.muted}>{user.email}</p> : null}
        {logoutError ? (
          <p className={styles.error} role="alert">
            No pudimos cerrar la sesión. Intentá nuevamente.
          </p>
        ) : null}
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
                setLogoutError(false);
                try {
                  await logoutSession();
                  clear();
                  router.refresh();
                } catch {
                  setLogoutError(true);
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
    <section className={styles.panel} aria-labelledby="login-title">
      <span className={styles.terminalLabel}>TERMINAL DE ACCESO // AUTH</span>
      <h1 className={styles.title} id="login-title">
        Inicia sesión en tu misión
      </h1>
      <div className={styles.discordAction}>
        <a
          className={styles.discordButton}
          href={discordStartUrl(returnTo)}
          aria-label="Continuar con Discord para iniciar sesión"
        >
          <span className={styles.discordLogo} aria-hidden="true">
            LOGO
          </span>
          <span>Continuar con Discord</span>
        </a>
      </div>
      <div className={styles.divider} aria-hidden="true">
        <span>o</span>
      </div>
      <form
        className={styles.presentationForm}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className={styles.field}>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            placeholder="piloto@devtalles.com"
            required
            type="email"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            placeholder="••••••••••••"
            required
            type="password"
          />
        </div>
        <button className={styles.emailButton} type="submit">
          Entrar con correo
        </button>
      </form>
      <p className={styles.guestMode}>
        MODO INVITADO DISPONIBLE — tu ruta se guarda al iniciar sesión
      </p>
    </section>
  );
}
