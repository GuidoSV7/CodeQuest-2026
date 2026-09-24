"use client";

import { useEffect, useState } from "react";
import { githubPreviewFixture } from "@/../test/fixtures/ui-stitch-orbital";
import {
  getBrowserCapabilities,
  type BrowserCapabilities,
} from "../lib/browser-capabilities";
import styles from "./GithubPreview.module.css";

type GithubPreviewProps = {
  capabilities?: BrowserCapabilities;
};

type ActionStatus = "idle" | "loading" | "success" | "error";

export function GithubPreview({ capabilities }: GithubPreviewProps) {
  const [copyStatus, setCopyStatus] = useState<ActionStatus>("idle");
  const [shareStatus, setShareStatus] = useState<ActionStatus>("idle");
  const [toast, setToast] = useState<string | null>(null);
  const browserCapabilities =
    capabilities ??
    getBrowserCapabilities(
      typeof navigator === "undefined"
        ? undefined
        : {
            clipboard: navigator.clipboard,
            share: navigator.share
              ? (payload) => navigator.share(payload)
              : undefined,
          },
    );

  useEffect(() => {
    if (toast === null) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const copySnippet = async () => {
    setCopyStatus("loading");
    if (browserCapabilities.clipboard === null) {
      setCopyStatus("error");
      return;
    }
    try {
      await browserCapabilities.clipboard.writeText(githubPreviewFixture.snippet);
      setCopyStatus("success");
      setToast("MARKDOWN COPIADO AL PORTAPAPELES");
    } catch {
      setCopyStatus("error");
    }
  };

  const shareSnippet = async () => {
    setShareStatus("loading");
    try {
      if (browserCapabilities.share !== null) {
        await browserCapabilities.share.share({
          title: "DevTalles",
          text: "Estoy construyendo mi vector espacial de desarrollo en @DevTalles.",
        });
      } else if (browserCapabilities.clipboard !== null) {
        await browserCapabilities.clipboard.writeText(
          "Estoy construyendo mi vector espacial de desarrollo en @DevTalles.",
        );
      } else {
        setShareStatus("error");
        return;
      }
      setShareStatus("success");
      setToast("MENSAJE PARA DISCORD COPIADO // LISTO PARA PEGAR");
    } catch {
      setShareStatus("error");
    }
  };

  return (
    <section className={styles.preview} aria-labelledby="github-preview-title">
      <header className={styles.hero}>
        <h2 id="github-preview-title">Tu ruta en tu GitHub</h2>
        <p>
          Proyecta tu vector orbital de aprendizaje directamente en el archivo
          principal de tu perfil. Sincronización milimétrica con cada lección
          completada.
        </p>
        <span>✦ SE ACTUALIZA SOLO CON TU PROGRESO ✦</span>
      </header>
      <div className={styles.dossier}>
        <div className={styles.fileBar}>
          <span>● ● ●</span>
          <code>github.com/developer/README.md</code>
          <small>RAW PREVIEW ✦ UTF-8</small>
        </div>
        <div className={styles.dossierBody}>
          <div className={styles.badgeHeader}>
            <span>RENDER VISUAL DE LA INSIGNIA</span>
            <strong>STATUS: 34% COMPLETADO</strong>
          </div>
          <div className={styles.badgeCanvas}>
            <svg aria-label="Insignia dinámica DevTalles" role="img" viewBox="0 0 320 40">
              <rect className={styles.badgeOuter} height="39" rx="19.5" width="319" x=".5" y=".5" />
              <rect className={styles.badgeEmblem} height="32" rx="16" width="32" x="4" y="4" />
              <path className={styles.badgeHex} d="m20 10 7.79 4.5v9L20 28l-7.79-4.5v-9L20 10Z" />
              <circle className={styles.badgeDot} cx="20" cy="19" r="2.5" />
              <text className={styles.badgeText} x="44" y="24">Backend con Nest</text>
              <line className={styles.badgeDivider} x1="184" x2="184" y1="11" y2="29" />
              <rect className={styles.badgeTrack} height="7" rx="3.5" width="65" x="196" y="16.5" />
              <rect className={styles.badgeProgress} height="7" rx="3.5" width="22.1" x="196" y="16.5" />
              <text className={styles.badgePercent} x="270" y="24">34%</text>
            </svg>
            <span>VISTA PREVIA EN ESCALA 1:1 // INYECCIÓN VECTORIAL</span>
          </div>
          <div className={styles.snippetHeader}>
            <span>CÓDIGO FUENTE DE INCRUSTACIÓN (MARKDOWN)</span>
            <strong>FORMATO ESTÁNDAR</strong>
          </div>
          <div className={styles.snippetBox}>
            <pre className={styles.snippet} id="markdownSnippet"><code>{githubPreviewFixture.snippet}</code></pre>
            <button
              aria-label="Copiar código Markdown"
              className={styles.iconButton}
              title="Copiar código al portapapeles"
              type="button"
              onClick={() => void copySnippet()}
            >
              {copyStatus === "success" ? "✓" : "⧉"}
            </button>
          </div>
          <div className={styles.actions}>
        <button
          className={styles.primaryAction}
          type="button"
          disabled={copyStatus === "loading"}
          onClick={() => void copySnippet()}
        >
          {copyStatus === "loading" ? "Copiando…" : copyStatus === "success" ? "¡Copiado con éxito!" : "Copiar markdown para tu README"}
        </button>
        <button
          className={styles.secondaryAction}
          type="button"
          disabled={shareStatus === "loading"}
          onClick={() => void shareSnippet()}
        >
          {shareStatus === "loading" ? "Compartiendo…" : "Compartir en Discord"}
        </button>
          </div>
        </div>
      </div>
      <p className={styles.feedback} aria-live="polite">
        {toast}
        {copyStatus === "success" && !toast && "Snippet copiado localmente."}
        {copyStatus === "error" &&
          "No se pudo copiar; seleccioná visualmente el snippet."}
        {shareStatus === "success" && "Vista compartida localmente."}
        {shareStatus === "error" &&
          "Compartir no está disponible; usá la alternativa visual."}
      </p>
    </section>
  );
}
