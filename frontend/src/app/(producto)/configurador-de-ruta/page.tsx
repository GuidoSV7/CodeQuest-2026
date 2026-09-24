import type { Metadata } from "next";
import { AssessmentWizard } from "@/features/assessment/components/AssessmentWizard";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Configurador de ruta",
  description: "Calibración local de una ruta de aprendizaje.",
};

export default function RouteConfiguratorPage() {
  return (
    <main className={styles.main}>
      <a className={styles.skipLink} href="#assessment-content">
        Saltar al contenido
      </a>
      <div className={styles.shell} id="assessment-content">
        <AssessmentWizard />
      </div>
    </main>
  );
}
