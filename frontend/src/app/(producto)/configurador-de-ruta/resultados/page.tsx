import type { Metadata } from "next";
import { AssessmentResults } from "@/features/assessment/components/AssessmentResults";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Resultados de calibración",
  description: "Resultado mock de la calibración Orbital.",
};

export default function AssessmentResultsPage() {
  return (
    <main className={styles.main}>
      <a className={styles.skipLink} href="#results-content">
        Saltar al contenido
      </a>
      <div className={styles.shell} id="results-content">
        <AssessmentResults />
      </div>
    </main>
  );
}
