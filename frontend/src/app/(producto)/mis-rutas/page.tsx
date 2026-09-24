import type { Metadata } from "next";
import { LearningPathsDashboard } from "@/features/learning-paths/components/LearningPathsDashboard";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Mis rutas",
  description: "Panel local de rutas de aprendizaje.",
};

export default function LearningPathsPage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <header className={styles.heading}>
          <h1>mis rutas</h1>
          <p>
            Registros de trayectoria de vuelo técnico y módulos de instrucción
            programados en estación orbital.
          </p>
        </header>
        <LearningPathsDashboard />
      </div>
    </main>
  );
}
