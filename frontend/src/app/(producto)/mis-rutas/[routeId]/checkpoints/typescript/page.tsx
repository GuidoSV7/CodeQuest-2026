import type { Metadata } from "next";
import { TypescriptCheckpoint } from "@/features/assessment/components/TypescriptCheckpoint";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Checkpoint TypeScript",
  description: "Checkpoint mock-only de TypeScript.",
};

type CheckpointPageProps = {
  params: Promise<{ routeId: string }>;
};

export default async function TypescriptCheckpointPage({
  params,
}: CheckpointPageProps) {
  await params;
  return (
    <main className={styles.main}>
      <a className={styles.skipLink} href="#checkpoint-content">
        Saltar al contenido
      </a>
      <div className={styles.shell} id="checkpoint-content">
        <TypescriptCheckpoint />
      </div>
    </main>
  );
}
