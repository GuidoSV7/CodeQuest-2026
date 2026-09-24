import Link from "next/link";
import styles from "./LearningPathsDashboard.module.css";

export function LearningPathsEmptyState() {
  return (
    <section className={styles.empty} aria-labelledby="empty-title">
      <div className={styles.emptyRadar} aria-hidden="true">
        <svg viewBox="0 0 320 240">
          <ellipse cx="160" cy="120" rx="140" ry="70" />
          <ellipse cx="160" cy="120" rx="90" ry="110" transform="rotate(35 160 120)" />
          <circle cx="160" cy="120" r="50" />
          <path d="m80 70 80 50 80-30m-80 30 30 70m-30-70-60 55" />
          <circle className={styles.emptyCore} cx="160" cy="120" r="7" />
          <circle className={styles.emptyNode} cx="80" cy="70" r="5" />
          <circle className={styles.emptyNode} cx="240" cy="90" r="5" />
          <circle className={styles.emptyNode} cx="190" cy="190" r="4" />
          <circle className={styles.emptyNode} cx="100" cy="175" r="4" />
        </svg>
      </div>
      <h2 id="empty-title">Aún no tienes rutas</h2>
      <p>Responde el cuestionario y descubre tu Dev DNA</p>
      <Link className={styles.primaryAction} href="/configurador-de-ruta">
        Descubre tu ruta
      </Link>
    </section>
  );
}
