"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BRAND_ASSETS } from "@/config/brand-assets";
import { SignInLink } from "@/features/auth/components/SignInLink";
import { sessionReturnTo } from "@/features/auth/lib/return-to";
import { useAuthStore } from "@/stores/auth-session";
import styles from "./RequireSession.module.css";

const TITLE_ID = "session-gate-title";

function Devi() {
  return <img className={styles.mascot} src={BRAND_ASSETS.deviLaptop} alt="" width={160} height={177} />;
}

function SessionChecking() {
  return (
    <div className={styles.gate}>
      <p role="status" className={styles.checking}>
        Verificando tu sesión…
      </p>
    </div>
  );
}

// Only rendered after hydration (status is "unknown" during SSR), so reading window is safe here.
function SignInGate({ pathname }: Readonly<{ pathname: string }>) {
  return (
    <section className={`${styles.gate} ${styles.panel}`} aria-labelledby={TITLE_ID}>
      <Devi />
      <h1 id={TITLE_ID} className={styles.title}>
        Iniciá sesión para ver y armar tus rutas
      </h1>
      <p className={styles.copy}>Tus rutas se guardan en tu cuenta de DevTalles. Entrá con Discord para seguir.</p>
      <div className={styles.actions}>
        <SignInLink returnTo={sessionReturnTo(pathname, window.location)} />
      </div>
    </section>
  );
}

function UnreachableGate({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <section className={`${styles.gate} ${styles.panel}`} role="alert" aria-labelledby={TITLE_ID}>
      <Devi />
      <h1 id={TITLE_ID} className={styles.title}>
        No pudimos conectar con el servidor
      </h1>
      <p className={styles.copy}>Probá de nuevo en unos segundos.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.retry} onClick={onRetry}>
          Reintentar
        </button>
      </div>
    </section>
  );
}

/** Mounts children only with an authenticated session; otherwise shows checking, sign-in or retry. */
export function RequireSession({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const sessionStatus = useAuthStore((s) => s.sessionStatus);
  const requestSessionRead = useAuthStore((s) => s.requestSessionRead);

  if (sessionStatus === "authenticated") return <>{children}</>;
  if (sessionStatus === "anonymous") return <SignInGate pathname={pathname} />;
  if (sessionStatus === "unreachable") return <UnreachableGate onRetry={requestSessionRead} />;
  return <SessionChecking />;
}
