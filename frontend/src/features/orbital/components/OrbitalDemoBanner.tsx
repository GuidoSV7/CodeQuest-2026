import { isOrbitalDemoSessionEnabled } from "@/features/auth/lib/demo-session";
import styles from "./OrbitalDemoBanner.module.css";

export function OrbitalDemoBanner() {
  if (!isOrbitalDemoSessionEnabled()) return null;

  return (
    <aside className={styles.banner} aria-label="Modo demo">
      <strong>Modo demo local</strong>
      <span>Sesión fixture activa. No se realizan requests de autenticación.</span>
    </aside>
  );
}
