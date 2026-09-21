import Link from "next/link";
import styles from "./page.module.css";
import { siteName } from "@/config/site";
import { HomeAuthStatus } from "@/features/auth/components/HomeAuthStatus";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <p className={styles.eyebrow}>{siteName}</p>
      <h1 className={styles.title}>Rutas de aprendizaje DevTalles</h1>
      <p className={styles.lede}>
        Armá tu ruta con el catálogo DevTalles. La sesión va por Discord vía el
        backend Nest.
      </p>
      <div className={styles.actions}>
        <Link className={styles.cta} href="/login">
          Entrar con Discord
        </Link>
        <HomeAuthStatus />
      </div>
    </main>
  );
}
