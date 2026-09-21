import styles from "./page.module.css";
import { siteName } from "@/config/site";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <p className={styles.eyebrow}>{siteName}</p>
      <h1 className={styles.title}>Rutas de aprendizaje DevTalles</h1>
      <p className={styles.lede}>
        Scaffold Next.js listo. Auth Discord, catálogo y learning paths se
        cablean contra el backend Nest.
      </p>
    </main>
  );
}
