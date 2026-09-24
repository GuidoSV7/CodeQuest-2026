import type { Metadata } from "next";
import { ReplanningProposal } from "@/features/learning-paths/components/ReplanningProposal";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Replanificación",
  description: "Preview local de una propuesta de replanificación.",
};

type ReplanningPageProps = {
  params: Promise<{ routeId: string }>;
};

export default async function ReplanningPage({ params }: ReplanningPageProps) {
  const { routeId } = await params;
  return (
    <main className={styles.main}>
      <a className={styles.skipLink} href="#replanning-content">
        Saltar al contenido
      </a>
      <div className={styles.shell} id="replanning-content">
        <ReplanningProposal routeId={routeId} />
      </div>
    </main>
  );
}
