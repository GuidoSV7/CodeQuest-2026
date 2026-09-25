"use client";

import { useState } from "react";
import { replanningFixture } from "@/features/orbital/fixtures";
import {
  initialReplanningState,
  isActionDisabled,
  transitionReplanning,
} from "../lib/replanning-state";
import styles from "./ReplanningProposal.module.css";

type ReplanningProposalProps = {
  routeId: string;
};

export function ReplanningProposal({ routeId }: ReplanningProposalProps) {
  const [state, setState] = useState(initialReplanningState);
  const [pendingAction, setPendingAction] = useState<"keep" | "accept" | null>(
    null,
  );

  const beginAction = (action: "keep" | "accept") => {
    setPendingAction(action);
    setState({ status: "loading", message: null });
  };

  if (state.status === "loading" && pendingAction !== null) {
    return (
      <section className={styles.state} aria-busy="true">
        <p className={styles.kicker}>Preview / {routeId}</p>
        <h2>Preparando cambio local</h2>
        <p>Esta acción solo actualiza el estado de la pantalla.</p>
        <button
          className={styles.primaryAction}
          type="button"
          onClick={() => setState(transitionReplanning(pendingAction))}
        >
          Mostrar resultado
        </button>
      </section>
    );
  }

  if (state.status === "success" || state.status === "error") {
    return (
      <section className={styles.state} role={state.status === "error" ? "alert" : undefined}>
        <p className={styles.kicker}>Resultado local</p>
        <h2>{state.status === "success" ? "Propuesta procesada" : "No se aplicó"}</h2>
        <p aria-live="polite">{state.message}</p>
        <div className={styles.actions}>
          <button
            className={styles.secondaryAction}
            type="button"
            onClick={() => {
              setState(transitionReplanning("retry"));
              setPendingAction(null);
            }}
          >
            Reintentar
          </button>
          <button
            className={styles.secondaryAction}
            type="button"
            onClick={() => setState(transitionReplanning("simulate-error"))}
          >
            Simular error
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.proposal} aria-labelledby="replanning-title">
      <header className={styles.proposalHeader}>
        <p className={styles.kicker}>✦ DIFF GENERADO POR EL MOTOR — determinista y explicable</p>
        <h2 id="replanning-title">Propuesta de replanificación</h2>
        <p>Ajuste de trayectoria según nuevos parámetros de misión y disponibilidad técnica.</p>
      </header>
      <div className={styles.comparison}>
        <TimelineColumn title="Antes" label="LINEAL // BASELINE" sections={replanningFixture.before.sections} />
        <TimelineColumn
          title="Después"
          label="AJUSTE PROPUESTO"
          sections={replanningFixture.after.sections}
          proposed
        />
      </div>
      <section className={styles.reasonsPanel} aria-labelledby="reasons-title">
        <h3 id="reasons-title">CRITERIOS DE OPTIMIZACIÓN</h3>
        <div className={styles.reasons}>
          {replanningFixture.reasons.map((reason) => (
            <p key={reason}>
              <span aria-hidden="true">→</span>
              {reason}
            </p>
          ))}
        </div>
      </section>
      <div className={styles.actions}>
        <button
          className={styles.secondaryAction}
          type="button"
          disabled={isActionDisabled(state)}
          onClick={() => beginAction("keep")}
        >
          Mantener mi ruta actual
        </button>
        <button
          className={styles.primaryAction}
          type="button"
          disabled={isActionDisabled(state)}
          onClick={() => beginAction("accept")}
        >
          Aceptar nueva planificación
        </button>
      </div>
      <p className={styles.date} aria-live="polite">
        {state.message ??
          `Fecha propuesta: ${replanningFixture.proposedDate ?? "No disponible"}`}
      </p>
    </section>
  );
}

function TimelineColumn({
  title,
  label,
  sections,
  proposed = false,
}: {
  title: string;
  label: string;
  sections: readonly string[];
  proposed?: boolean;
}) {
  return (
    <div className={`${styles.timelineColumn} ${proposed ? styles.proposed : ""}`}>
      <div className={styles.columnHeader}>
        <div>
          <h3>{title}</h3>
          <span>{label}</span>
        </div>
        <span>SYS.V1</span>
      </div>
      <div className={styles.timelineNodes}>
        {sections.map((section, index) => (
          <div
            className={`${styles.timelineNode} ${proposed && index === 4 ? styles.highlighted : ""}`}
            data-testid="timeline-node"
            key={`${title}-${section}`}
          >
            <span className={styles.nodeNumber}>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{section}</strong>
              <span>{proposed && index === 4 ? "MOD // POST-DESPLIEGUE" : "MOD // CORE VINCULANTE"}</span>
            </div>
            <time>{`{fecha}`}</time>
          </div>
        ))}
      </div>
      <div className={styles.regimen}>
        <span>Régimen semanal</span>
        <strong>{proposed ? "4h/semana" : "8h/semana"} <small>✦ {"{fecha}"}</small></strong>
      </div>
    </div>
  );
}
