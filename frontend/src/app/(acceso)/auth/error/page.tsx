import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Error de autenticación",
};

const REASONS: Record<string, string> = {
  access_denied: "Cancelaste el acceso en Discord.",
  invalid_state: "La sesión de login expiró o es inválida. Probá de nuevo.",
  token_exchange_failed: "No pudimos intercambiar el código con Discord.",
  profile_failed: "No pudimos leer tu perfil de Discord.",
  persist_failed: "No pudimos guardar tu usuario. Intentá más tarde.",
};

type AuthErrorPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const { reason } = await searchParams;
  const message =
    (reason && REASONS[reason]) ||
    "No se pudo completar el inicio de sesión con Discord.";

  return (
    <main className={styles.main}>
      <a className={styles.skipLink} href="#auth-error-content">
        Saltar al contenido
      </a>
      <section className={styles.panel} id="auth-error-content">
        <p className={styles.eyebrow}>Orbital / autenticación</p>
        <h1 className={styles.title}>No se pudo completar la misión</h1>
        <p className={styles.lede} role="alert">
          {message}
        </p>
        <Link className={styles.link} href="/login">
          Volver a intentar con Discord
        </Link>
      </section>
    </main>
  );
}
