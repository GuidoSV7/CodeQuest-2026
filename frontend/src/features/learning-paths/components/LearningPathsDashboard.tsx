"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-session";
import { getLearningPaths } from "../lib/learning-paths-data";
import { LearningPathsEmptyState } from "./LearningPathsEmptyState";
import styles from "./LearningPathsDashboard.module.css";

export function LearningPathsDashboard() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [retrying, setRetrying] = useState(false);

  if (!hydrated) {
    return (
      <section className={styles.state} aria-busy="true">
        <p>Cargando el estado de tu misión…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className={styles.state} aria-labelledby="anonymous-title">
        <h2 id="anonymous-title">Iniciá sesión para ver tus rutas</h2>
        <p>El contenido de una ruta solo está disponible para su propietario.</p>
        <Link className={styles.primaryAction} href="/login">
          Entrar con Discord
        </Link>
      </section>
    );
  }

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
        {routes.map((route) => (
          <article className={styles.routeCard} key={route.routeId}>
            <div className={styles.cardBody}>
              <div className={styles.cardStatus}>
                <span>{route.statusLabel ?? "Trayectoria"}</span>
                <span className={styles.stageBadge}>
                  <i aria-hidden="true" />
                  {route.progressPercent === 0 ? "Sin empezar" : "Etapa 02"}
                </span>
              </div>
              <div className={styles.cardTitleRow}>
                <div>
                  <span className={styles.routeLabel}>
                    {route.progressPercent === 0
                      ? "Ecosistema cliente"
                      : "TRAYECTORIA PRINCIPAL"}
                  </span>
                  <h2>{route.title}</h2>
                </div>
                <RouteGauge
                  label={route.title}
                  progress={route.progressPercent}
                />
              </div>
              {route.nextActionLabel ? (
                <div className={styles.nextAction}>
                  <div className={styles.nextActionHeader}>
                    <span>Siguiente maniobra</span>
                    <span>✦ Listo</span>
                  </div>
                  <p>{route.nextActionLabel}</p>
                </div>
              ) : null}
            </div>
            <div className={styles.cardFooter}>
              <div className={styles.telemetry}>
                <span>{route.hoursTelemetry ?? "HORAS: no disponible"}</span>
                <span aria-hidden="true">✦</span>
                <span>{route.blocksTelemetry ?? "BLOQUES: no disponible"}</span>
              </div>
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
        ))}
      </div>
    </section>
  );
}

function RouteGauge({
  label,
  progress,
}: {
  label: string;
  progress: number | null;
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
        <circle
          className={styles.gaugeTrack}
          cx="50"
          cy="50"
          r="40"
        />
        <circle
          className={styles.gaugeValue}
          cx="50"
          cy="50"
          r="40"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className={styles.gaugeLabel}>
        {progress === null ? "—" : `${progress}%`}
      </span>
    </div>
  );
}
