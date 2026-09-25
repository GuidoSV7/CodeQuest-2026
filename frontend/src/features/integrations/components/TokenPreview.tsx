"use client";

import { useEffect, useState } from "react";
import { tokenPreviewFixture } from "@/features/orbital/fixtures";
import {
  getBrowserCapabilities,
  type BrowserCapabilities,
} from "../lib/browser-capabilities";
import { initialTokenState, tokenErrorState, transitionTokenState } from "../lib/token-state";
import type { TokenPreviewState } from "../types/token.types";
import styles from "./TokenPreview.module.css";

type TokenPreviewProps = {
  capabilities?: BrowserCapabilities;
};

export function TokenPreview({ capabilities }: TokenPreviewProps) {
  const [state, setState] = useState<TokenPreviewState>(() =>
    initialTokenState(tokenPreviewFixture.maskedToken),
  );
  const [revokePending, setRevokePending] = useState(false);
  const [openIde, setOpenIde] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [toast, setToast] = useState<string | null>(null);
  const browserCapabilities =
    capabilities ??
    getBrowserCapabilities(
      typeof navigator === "undefined"
        ? undefined
        : { clipboard: navigator.clipboard },
    );

  useEffect(() => {
    if (toast === null) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const copyMaskedValue = async () => {
    setCopyStatus("idle");
    if (state.maskedToken === null || browserCapabilities.clipboard === null) {
      setCopyStatus("error");
      return;
    }
    try {
      await browserCapabilities.clipboard.writeText(state.maskedToken);
      setCopyStatus("success");
      setState((current) => transitionTokenState(current, "copy"));
      setToast("✦ TOKEN COPIADO AL PORTAPAPELES");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <section className={styles.preview} aria-labelledby="token-preview-title">
      <header className={styles.pageHeader}>
        <h2 id="token-preview-title">Tokens de acceso</h2>
      </header>
      <section className={styles.tokenPanel} aria-label="Token de acceso enmascarado">
        <div className={styles.tokenIntro}>
          <span>Llave de enlace criptográfico para servicios de órbita y desarrollo local.</span>
          <button className={styles.generateAction} type="button" onClick={() => {
            setState((current) => transitionTokenState(current, "generate"));
            setToast("PREVIEW LOCAL: NO SE GENERÓ NINGÚN TOKEN REAL");
          }}>
            <span aria-hidden="true">⌁</span> Generar nuevo token
          </button>
        </div>
        <div className={styles.tokenRow}>
          <span className={styles.tokenDot} aria-hidden="true" />
          <code>{state.maskedToken ?? "dvt_ [REVOCADO]"}</code>
          <div className={styles.tokenActions}>
            <button
              aria-label="Copiar token enmascarado"
              className={styles.iconAction}
              disabled={state.maskedToken === null}
              title="Copiar token"
              type="button"
              onClick={() => void copyMaskedValue()}
            >
              ⧉
            </button>
            {revokePending ? (
              <button
                aria-label="Confirmar revocación local"
                className={styles.confirmAction}
                type="button"
                onClick={() => {
                  setState((current) => transitionTokenState(current, "revoke"));
                  setRevokePending(false);
                  setToast("TOKEN REVOCADO SOLO EN ESTA PREVIEW");
                }}
              >
                Confirmar
              </button>
            ) : (
              <button
                aria-label="Revocar token enmascarado"
                className={styles.iconActionDanger}
                disabled={state.maskedToken === null}
                title="Revocar token"
                type="button"
                onClick={() => setRevokePending(true)}
              >
                ⊘
              </button>
            )}
          </div>
        </div>
        <p className={styles.feedback} aria-live="polite">
          {toast}
          {copyStatus === "error" && "No se pudo copiar el valor enmascarado."}
          {state.message}
        </p>
      </section>
      <section className={styles.idePanel} aria-labelledby="ide-title">
        <h3 id="ide-title">⌘ Conectar tu IDE</h3>
        <div className={styles.accordion}>
          {[
            ["claude", "01", "Claude Code", "Activo", "~/.claude/devtalles.json", '{\n  "endpoint": "[endpoint no verificado]",\n  "authToken": "dvt_********************4f2a"\n}'],
            ["cursor", "02", "Cursor", "Disponible", ".cursor/settings.json", '{\n  "devtalles.orbital.auth": "dvt_********************4f2a",\n  "devtalles.telemetry.enabled": true\n}'],
            ["vscode", "03", "VS Code", "Disponible", "~/.vscode/extensions/devtalles.json", '{\n  "devtalles.token": "dvt_********************4f2a",\n  "devtalles.station": "orbital-primary"\n}'],
          ].map(([id, index, label, status, path, snippet]) => (
            <div className={styles.accordionItem} key={id}>
              <button
                aria-controls={`panel-${id}`}
                aria-expanded={openIde === id}
                className={styles.accordionButton}
                type="button"
                onClick={() => setOpenIde((current) => current === id ? null : id)}
              >
                <span><b>{index}</b>{label}<small>{status}</small></span>
                <span aria-hidden="true">{openIde === id ? "⌃" : "⌄"}</span>
              </button>
              {openIde === id ? (
                <div className={styles.ideInstructions} id={`panel-${id}`}>
                  <div><span>CONFIG JSON</span><small>{path}</small></div>
                  <pre><code>{snippet}</code></pre>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <p className={styles.disclaimer}>
        PREVIEW MOCK-ONLY: nunca crea, revela, revoca ni persiste credenciales reales.
      </p>
      {state.status === "error" ? (
        <button className={styles.secondaryAction} type="button" onClick={() => setState((current) => transitionTokenState(current, "retry"))}>
          Reintentar
        </button>
      ) : null}
      <button className={styles.localError} type="button" onClick={() => setState((current) => tokenErrorState(current))}>
        Simular error local
      </button>
    </section>
  );
}
