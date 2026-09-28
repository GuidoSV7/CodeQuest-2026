"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CHROME_ICON_STROKE_WIDTH } from "@/config/chrome-icon";
import { getAssessment } from "../lib/assessment-data";
import styles from "./TypescriptCheckpoint.module.css";

type CheckpointStatus = "idle" | "loading" | "success" | "error";

export function TypescriptCheckpoint() {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<CheckpointStatus>("idle");
  const result = getAssessment("anonymous");

  if (result.status !== "ready" || result.data === null) {
    return <p className={styles.state}>Checkpoint no disponible.</p>;
  }

  const checkpoint = result.data.checkpoint;
  if (status === "loading") {
    return (
      <section className={styles.state} aria-busy="true">
        <h2>Guardando tu respuesta…</h2>
        <p>Este paso no registra progreso real.</p>
        <button
          className={styles.primaryAction}
          type="button"
          onClick={() => setStatus("success")}
        >
          Ver confirmación
        </button>
      </section>
    );
  }
  if (status === "success" || status === "error") {
    const passed = status === "success";
    return (
      <section className={styles.state} role={passed ? undefined : "alert"}>
        <p className={styles.kicker}>Feedback local</p>
        <h2>{passed ? "Respuesta registrada" : "Todavía no encaja"}</h2>
        <p aria-live="polite">
          {passed
            ? "La selección queda confirmada únicamente en esta preview."
            : "Podés revisar tu elección y reintentar."}
        </p>
        <div className={styles.actions}>
          <button
            className={styles.secondaryAction}
            type="button"
            onClick={() => setStatus("idle")}
          >
            Reintentar
          </button>
          {passed ? (
            <button className={styles.primaryAction} type="button" onClick={() => setStatus("idle")}>
              Continuar
            </button>
          ) : (
            <button className={styles.secondaryAction} type="button" onClick={() => setStatus("error")}>
              Simular error
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.checkpoint} aria-labelledby="checkpoint-title">
      <div className={styles.dossierFrame}>
        <div className={styles.checkpointHeader}>
          <p className={styles.kicker}>Chequeo de TypeScript</p>
          <h2 id="checkpoint-title">{checkpoint.prompt}</h2>
        </div>
        <div className={styles.options}>
          {checkpoint.options.map((option, index) => (
            <label
              className={selected === option.id ? styles.optionSelected : styles.option}
              key={option.id}
            >
              <input
                type="radio"
                name="typescript-checkpoint"
                value={option.id}
                checked={selected === option.id}
                onChange={() => setSelected(option.id)}
              />
              <span className={styles.optionNumber}>{`0${index + 1}`}</span>
              <span>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </span>
              <em>Elegir</em>
            </label>
          ))}
        </div>
        <div className={styles.actionFooter}>
          <span className={selected ? styles.selectedStatus : styles.selectionStatus} aria-live="polite">
            {selected
              ? `Elegiste la opción ${checkpoint.options.findIndex((option) => option.id === selected) + 1}`
              : "Todavía no elegiste una opción"}
          </span>
          <button
            className={styles.primaryAction}
            type="button"
            disabled={selected === null}
            onClick={() => setStatus("loading")}
          >
            Confirmar respuesta <ArrowRight aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} />
          </button>
        </div>
      </div>
      <p className={styles.disclaimer} aria-live="polite">
        Preview mock-only: no se registra tu progreso.
      </p>
    </section>
  );
}
