import type { Metadata } from "next";
import { MyRouteStatus } from "@/features/learning-paths/components/MyRouteStatus";
import {
  parseConfiguratorDeepLink,
  type ConfiguratorSearchParams,
} from "@/features/learning-paths/lib/configurator-deep-link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Configurador de ruta",
  description: "Rutas de aprendizaje de tu cuenta.",
};

type RouteConfiguratorPageProps = {
  searchParams: Promise<ConfiguratorSearchParams>;
};

export default async function RouteConfiguratorPage({ searchParams }: RouteConfiguratorPageProps) {
  const { initialPanel, initialPathId } = parseConfiguratorDeepLink(await searchParams);

  return (
    <main className={styles.main}>
      <a className={styles.skipLink} href="#assessment-content">
        Saltar al contenido
      </a>
      <div className={styles.shell} id="assessment-content">
        <MyRouteStatus initialPanel={initialPanel} initialPathId={initialPathId} />
      </div>
    </main>
  );
}
