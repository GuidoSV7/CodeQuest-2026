"use client";

import Link from "next/link";
import { useState } from "react";
import { getLearningPaths } from "../lib/learning-paths-data";
import { LearningPathsEmptyState } from "./LearningPathsEmptyState";
import styles from "./LearningPathsDashboard.module.css";

export function LearningPathsDashboard() {
  const [retrying, setRetrying] = useState(false);
  const result = getLearningPaths("authenticated");

  if (result.status === "error") {
    return (
      <section className={styles.state} role="alert">
        <h2>No pudimos cargar tus rutas</h2>
        <button
          className={styles.secondaryAction}
          type="button"
          disabled={retrying}
          onClick={() => {
            setRetrying(true);
            setRetrying(false);
          }}
        >
          {retrying ? "Reintentando…" : "Reintentar"}
        </button>
      </section>
    );
  }

  if (result.status === "empty" || result.data === null) {
    return <LearningPathsEmptyState />;
  }

  const routes = result.data.routes;
  return (
    <section className={styles.dashboard} aria-label="Rutas activas">
      <div className={styles.routeGrid}>
        {routes.map((route) => {
          const isIdle = route.progressPercent === 0;
          return (
            <article
              className={isIdle ? styles.routeCardIdle : styles.routeCard}
              key={route.routeId}
            >
              <div className={styles.cardBody}>
                <div className={styles.cardStatus}>
                  <span>{route.statusLabel ?? "Trayectoria"}</span>
                  <span
                    className={
                      isIdle ? styles.stageBadgeIdle : styles.stageBadge
                    }
                  >
                    <i aria-hidden="true" />
                    {route.stageLabel ??
                      (isIdle ? "Sin empezar" : "Etapa 02")}
                  </span>
                </div>
                <div className={styles.cardTitleRow}>
                  <div>
                    {isIdle ? (
                      <>
                        <h2>{route.title}</h2>
                        <span className={styles.routeContext}>
                          {route.summary ?? "Ecosistema cliente"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.routeLabel}>
                          TRAYECTORIA PRINCIPAL
                        </span>
                        <h2>{route.title}</h2>
                      </>
                    )}
                  </div>
                  <RouteGauge
                    label={route.title}
                    progress={route.progressPercent}
                    showOrbit={!isIdle}
                  />
                </div>
                {!isIdle && route.nextActionLabel ? (
                  <div className={styles.nextAction}>
                    <div className={styles.nextActionHeader}>
                      <span>Siguiente maniobra</span>
                      <span>✦ Listo</span>
                    </div>
                    <p>{route.nextActionLabel}</p>
                  </div>
                ) : null}
              </div>
              <div
                className={
                  isIdle ? styles.cardFooterIdle : styles.cardFooter
                }
              >
                {!isIdle ? (
                  <div className={styles.telemetry}>
                    <span>
                      {route.hoursTelemetry ?? "HORAS: no disponible"}
                    </span>
                    <span aria-hidden="true">✦</span>
                    <span>
                      {route.blocksTelemetry ?? "BLOQUES: no disponible"}
                    </span>
                  </div>
                ) : null}
                {route.nextActionLabel ? (
                  <Link
                    className={styles.primaryAction}
                    href={`/mis-rutas/${route.routeId}`}
                  >
                    Continuar donde quedé
                  </Link>
                ) : (
                  <Link
                    className={styles.secondaryAction}
                    href={`/mis-rutas/${route.routeId}`}
                  >
                    Ver ruta
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RouteGauge({
  label,
  progress,
  showOrbit,
}: {
  label: string;
  progress: number | null;
  showOrbit: boolean;
}) {
  const value = progress ?? 0;
  const circumference = 251.32;
  const dashOffset = circumference - (circumference * value) / 100;

  return (
    <div className={styles.gauge}>
      <svg
        className={styles.gaugeSvg}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Progreso de ${label}: ${
          progress === null ? "no disponible" : `${progress}%`
        }`}
      >
        <circle className={styles.gaugeTrack} cx="50" cy="50" r="40" />
        <circle
          className={styles.gaugeValue}
          cx="50"
          cy="50"
          r="40"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className={styles.gaugeLabel}>
        <span>{progress === null ? "—" : `${progress}%`}</span>
        {showOrbit && progress !== null ? (
          <span className={styles.gaugeOrbit}>ORBIT</span>
        ) : null}
      </div>
    </div>
  );
}
