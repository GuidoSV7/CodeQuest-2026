"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadMyRoutes, type MyRouteSummary } from "../lib/load-my-routes";
import { classifyRouteLoadError } from "../lib/route-errors";
import { LearningPathsEmptyState } from "./LearningPathsEmptyState";
import { SignInLink } from "@/features/auth/components/SignInLink";
import { StackIcon } from "./StackIcon";
import styles from "./LearningPathsDashboard.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; routes: MyRouteSummary[] }
  | { status: "unauthorized" }
  | { status: "error" };

export function LearningPathsDashboard({
  load = loadMyRoutes,
}: {
  load?: () => Promise<MyRouteSummary[]>;
}) {
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    load()
      .then((routes) => {
        if (active) setResult({ status: "ready", routes });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult(
          classifyRouteLoadError(error) === "unauthorized"
            ? { status: "unauthorized" }
            : { status: "error" },
        );
      })
      .finally(() => {
        if (active) setRetrying(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, load]);

  if (result.status === "loading") {
    return <p className={styles.state}>Cargando tus rutas…</p>;
  }

  if (result.status === "unauthorized") {
    return (
      <section className={styles.state} aria-labelledby="session-required-title">
        <h2 id="session-required-title">Entrá para ver tus rutas</h2>
        <p>Iniciá sesión con Discord y volvés directo a esta pantalla.</p>
        <SignInLink returnTo="/mis-rutas" />
      </section>
    );
  }

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
            setResult({ status: "loading" });
            setAttempt((current) => current + 1);
          }}
        >
          {retrying ? "Reintentando…" : "Reintentar"}
        </button>
      </section>
    );
  }

  if (result.routes.length === 0) {
    return <LearningPathsEmptyState />;
  }

  const routes = result.routes;
  return (
    <section className={styles.dashboard} aria-label="Rutas activas">
      <div className={styles.routeGrid}>
        {routes.map((route) => {
          const percent = Math.round(route.progressRatio * 100);
          const isIdle = percent === 0;
          const status = percent >= 100 ? "Completada" : isIdle ? "Sin empezar" : "En progreso";
          return (
            <article
              className={isIdle ? styles.routeCardIdle : styles.routeCard}
              key={route.id}
            >
              <div className={styles.cardBody}>
                <div className={styles.cardStatus}>
                  <span>{status}</span>
                  <span className={isIdle ? styles.stageBadgeIdle : styles.stageBadge}>
                    <i aria-hidden="true" />
                    {route.completedCount} de {route.itemCount} cursos
                  </span>
                </div>
                <div className={styles.cardTitleRow}>
                  <div className={styles.cardTitleLead}>
                    <StackIcon pathId={route.sourceCatalogPathId} size="md" />
                    <h2>{route.title}</h2>
                  </div>
                  <RouteGauge label={route.title} progress={percent} />
                </div>
              </div>
              <div className={isIdle ? styles.cardFooterIdle : styles.cardFooter}>
                {percent < 100 ? (
                  <Link className={styles.primaryAction} href={`/mis-rutas/${route.id}`}>
                    Continuar donde quedé
                  </Link>
                ) : (
                  <Link className={styles.secondaryAction} href={`/mis-rutas/${route.id}`}>
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
      </div>
    </div>
  );
}
