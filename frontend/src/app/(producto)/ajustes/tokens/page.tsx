import type { Metadata } from "next";
import { TokenPreview } from "@/features/integrations/components/TokenPreview";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Tokens de acceso",
  description: "Preview mock-only de estados de tokens.",
};

export default function TokensPage() {
  return (
    <main className={styles.main}>
      <a className={styles.skipLink} href="#tokens-content">
        Saltar al contenido
      </a>
      <div className={styles.shell} id="tokens-content">
        <TokenPreview />
      </div>
    </main>
  );
}
