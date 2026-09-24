"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-session";
import { getLearningPaths } from "../lib/learning-paths-data";
import type { LearningPath } from "../types/learning-path.types";
import styles from "./RouteDetail.module.css";

type RouteDetailProps = {
  routeId: string;
};

function RouteState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className={styles.state} role={title.includes("cargar") ? "alert" : undefined}>
      <p className={styles.kicker}>Estado de ruta</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export function RouteDetail({ routeId }: RouteDetailProps) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completed, setCompleted] = useState<readonly string[]>([]);
  const [retrying, setRetrying] = useState(false);

  if (!hydrated) {
    return (
      <RouteState title="Cargando ruta" description="Preparando el detalle de tu misión…" />
    );
  }

  if (!user) {
    return (
      <RouteState
        title="Esta ruta requiere sesión"
        description="No mostramos contenido de una ruta antes de verificar tu sesión."
        action={
          <Link className={styles.primaryAction} href="/login">
            Entrar con Discord
          </Link>
        }
      />
    );
  }

  const result = getLearningPaths("authenticated");
  if (result.status === "error") {
    return (
      <RouteState
        title="No pudimos cargar la ruta"
        description="El estado mock no está disponible en este momento."
        action={
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
        }
      />
    );
  }

  if (result.status !== "ready" || result.data === null) {
    return (
      <RouteState
        title="Ruta no disponible"
        description="No encontramos una ruta mock con ese identificador."
      />
    );
  }

  const route = result.data.routes.find((candidate) => candidate.routeId === routeId);
  if (!route) {
    return (
      <RouteState
        title="Ruta no disponible"
        description="No encontramos una ruta mock con ese identificador."
      />
    );
  }

  return (
    <RouteContent
      route={route}
      expanded={expanded}
      completed={completed}
      onToggle={(sectionId) =>
        setExpanded((current) => (current === sectionId ? null : sectionId))
      }
      onComplete={(sectionId) =>
        setCompleted((current) =>
          current.includes(sectionId)
            ? current.filter((id) => id !== sectionId)
            : [...current, sectionId],
        )
      }
    />
  );
}

function RouteContent({
  route,
  expanded,
  completed,
  onToggle,
  onComplete,
}: {
  route: LearningPath;
  expanded: string | null;
  completed: readonly string[];
  onToggle: (sectionId: string) => void;
  onComplete: (sectionId: string) => void;
}) {
  const [telemetryStatus, setTelemetryStatus] = useState<"idle" | "registering" | "confirmed">("idle");

  useEffect(() => {
    if (telemetryStatus !== "registering") return;
    const timer = window.setTimeout(() => setTelemetryStatus("confirmed"), 800);
    return () => window.clearTimeout(timer);
  }, [telemetryStatus]);

  const timeline = route.courseTimeline ?? [];
  return (
    <section className={styles.detail} aria-labelledby="route-detail-title">
      {route.delayDays ? (
        <div className={styles.alert} role="status">
          <span className={styles.alertIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3 2.8 20h18.4L12 3Zm0 6v5m0 3h.01" />
            </svg>
          </span>
          <strong>Te atrasaste {route.delayDays} días</strong>
          <Link className={styles.secondaryAction} href={`/mis-rutas/${route.routeId}/replanificacion`}>
            Replanificar ruta
          </Link>
      </div>
      ) : null}
      <div className={styles.missionGrid}>
        <div className={styles.missionHeader}>
          <div className={styles.classification}>
            <span>SYS.REG // DOSSIER 01</span>
            <b>✦</b>
            <span>MISSION FILE // RUTA 01</span>
            <em>✦</em>
            <span>SEC: NEST-BACKEND-V4</span>
          </div>
          <h2 id="route-detail-title">backend con nest</h2>
          <p>{route.detailSummary}</p>
          <div className={styles.summaryGrid}>
            <div>
              <span>Horas totales</span>
              <strong>142 <small>HRS FLIGHT</small></strong>
              <span>86h completadas</span>
            </div>
            <div>
              <span>Finalización proyectada</span>
              <strong>No disponible</strong>
              <span>T+104 DÍAS RESTANTES</span>
            </div>
            <div>
              <span>Estado de la misión</span>
              <strong className={styles.activeState}>● ACTIVA (60%)</strong>
              <span>ORBITAL STAGE 02/04</span>
            </div>
          </div>
        </div>
        <aside className={styles.progressPanel}>
          <div className={styles.progressLabel}>
            <span>PROGRESIÓN GENERAL</span>
            <strong>{route.overallProgress}% DE LA RUTA</strong>
          </div>
          <div className={styles.progressTrack}>
            <span className={styles.progressValue} />
          </div>
          <div className={styles.progressEnds}>
            <span>START // BASELINE</span>
            <span>END // DEPLOY</span>
          </div>
          <div className={styles.nextSection}>
            <span>SIGUIENTE ACCIÓN</span>
            <strong>{route.nextSectionLabel}</strong>
          </div>
          <button
            className={styles.primaryAction}
            type="button"
            onClick={() => setTelemetryStatus("registering")}
            disabled={telemetryStatus === "registering"}
            aria-live="polite"
          >
            {telemetryStatus === "idle"
              ? "Marcar sección completada"
              : telemetryStatus === "registering"
                ? "REGISTRANDO TELEMETRÍA…"
                : "SECCIÓN CONFIRMADA ✓"}
          </button>
        </aside>
      </div>
      <div className={styles.timeline}>
        <div className={styles.timelineHeader}>
          <span>✦ TRAYECTORIA DE APRENDIZAJE // 4 HITOS SECUENCIALES</span>
          <span>STATUS: SYNCHRONIZED</span>
        </div>
        <div className={styles.courseList}>
          {timeline.map((course) => (
            <article className={`${styles.course} ${styles[`course_${course.status}`]}`} key={course.title}>
              <span className={styles.courseIcon} aria-hidden="true">
                {course.status === "completed" ? "✓" : course.status === "locked" ? "⌑" : course.status === "active" ? "▣" : "○"}
              </span>
              <h3>{course.title}</h3>
              <span>{course.status === "completed" ? "COMPLETADO" : course.status === "active" ? "CURSO 02 // NODO EN EJECUCIÓN" : course.status === "locked" ? "BLOQUEADO" : "EN ESPERA"}</span>
            </article>
          ))}
          <div className={styles.activeCourse}>
            <div className={styles.activeCourseHeader}>
              <div>
                <span>● CURSO 02 // NODO EN EJECUCIÓN ✦ TELEMETRÍA 60%</span>
                <h3>typescript</h3>
              </div>
              <strong>60% <small>FASE 03 EN VUELO</small></strong>
            </div>
            <div className={styles.subsections}>
              <div className={styles.subsectionHeader}>
                <span>✦ PRÓXIMAS 3 SECCIONES OPERATIVAS</span>
                <span>VENTANA TEMPORAL ESTIMADA</span>
              </div>
              {route.sections.map((section, index) => {
                const isExpanded = expanded === section.id;
                const isCompleted = completed.includes(section.id);
                return (
                  <div className={styles.subsection} key={section.id}>
                    <button
                      type="button"
                      aria-label={`Marcar sección ${index + 1}`}
                      aria-expanded={isExpanded}
                      aria-controls={`${section.id}-content`}
                      aria-pressed={isCompleted}
                      onClick={() => onToggle(section.id)}
                    >
                      {isCompleted ? "✓" : "□"}
                    </button>
                    <div className={styles.skeleton} id={`${section.id}-content`}>
                      <span />
                      <span />
                      {isExpanded ? <p>{section.description}</p> : null}
                    </div>
                    <span className={styles.eta}>{section.etaLabel ?? "ETA: no disponible"}</span>
                    {isExpanded ? (
                      <button
                        type="button"
                        className={styles.completeButton}
                        onClick={() => onComplete(section.id)}
                      >
                        {isCompleted ? "Sección completada" : "Marcar como completada"}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
