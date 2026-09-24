import type { Metadata } from "next";
import { GithubPreview } from "@/features/integrations/components/GithubPreview";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Preview GitHub",
  description: "Preview local y segura de una insignia.",
};

type GithubPageProps = {
  params: Promise<{ routeId: string }>;
};

export default async function GithubPreviewPage({ params }: GithubPageProps) {
  await params;
  return (
    <main className={styles.main}>
      <a className={styles.skipLink} href="#github-content">
        Saltar al contenido
      </a>
      <div className={styles.shell} id="github-content">
        <GithubPreview />
      </div>
    </main>
  );
}
