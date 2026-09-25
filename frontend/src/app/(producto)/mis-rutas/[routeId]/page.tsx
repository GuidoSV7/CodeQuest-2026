import type { Metadata } from "next";
import { RouteDetail } from "@/features/learning-paths/components/RouteDetail";
import { UserRouteDiagram } from "@/features/learning-paths/components/UserRouteDiagram";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Detalle de ruta",
  description: "Detalle mock de una ruta de aprendizaje.",
};

type RoutePageProps = {
  params: Promise<{ routeId: string }>;
};

export default async function RoutePage({ params }: RoutePageProps) {
  const { routeId } = await params;

  return (
    <main className={styles.main}>
      <a className={styles.skipLink} href="#route-content">
        Saltar al contenido
      </a>
      <div className={styles.shell} id="route-content">
        <UserRouteDiagram routeId={routeId} />
        <RouteDetail routeId={routeId} />
      </div>
    </main>
  );
}
