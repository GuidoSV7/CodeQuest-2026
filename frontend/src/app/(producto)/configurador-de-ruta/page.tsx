import type { Metadata } from "next";
import { MyRouteStatus } from "@/features/learning-paths/components/MyRouteStatus";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Configurador de ruta",
  description: "Rutas de aprendizaje de tu cuenta.",
};

export default function RouteConfiguratorPage() {
  return (
    <main className={styles.main}>
      <a className={styles.skipLink} href="#assessment-content">
        Saltar al contenido
      </a>
      <div className={styles.shell} id="assessment-content">
        <MyRouteStatus />
      </div>
    </main>
  );
}
