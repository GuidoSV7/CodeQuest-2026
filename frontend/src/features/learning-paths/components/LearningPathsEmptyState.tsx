import Link from "next/link";
import { BRAND_ASSETS } from "@/config/brand-assets";
import styles from "./LearningPathsDashboard.module.css";
import emptyStyles from "./LearningPathsEmptyState.module.css";

export function LearningPathsEmptyState() {
  return (
    <section className={styles.empty} aria-labelledby="empty-title">
      <img className={emptyStyles.mascot} src={BRAND_ASSETS.deviHello} alt="" width={160} height={170} />
      <h2 id="empty-title">Todavía no tenés rutas</h2>
      <p>Elegí una ruta oficial o pedile a tu IA que arme una.</p>
      <Link className={styles.primaryAction} href="/configurador-de-ruta">
        Ir al configurador de ruta
      </Link>
    </section>
  );
}
