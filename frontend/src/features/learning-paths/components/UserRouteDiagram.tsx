"use client";

import { modelFromUserPath, PathDiagram } from "path-diagram";
import { useEffect, useState } from "react";
import { loadCourseCard } from "@/lib/load-course-card";
import { loadPathDetail, type PathDetailResponse } from "../lib/load-path-detail";
import { saveCourseProgress } from "../lib/save-course-progress";
import "@xyflow/react/dist/style.css";
import styles from "./UserRouteDiagram.module.css";

export function UserRouteDiagram({
  routeId,
  load = loadPathDetail,
  saveProgress = saveCourseProgress,
}: {
  routeId: string;
  load?: (routeId: string) => Promise<PathDetailResponse | null>;
  saveProgress?: (courseId: string, status: "completed" | "not_started") => Promise<void>;
}) {
  const [detail, setDetail] = useState<PathDetailResponse | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    load(routeId)
      .then((next) => {
        if (active) setDetail(next);
      })
      .catch(() => {
        if (active) setDetail(null);
      });
    return () => {
      active = false;
    };
  }, [load, routeId]);

  if (detail === undefined) return <p>Cargando diagrama…</p>;
  if (!detail) return <p role="alert">No pudimos cargar el diagrama</p>;

  return (
    <div className={styles.route}>
      <h1 className={styles.title}>{detail.title}</h1>
      <PathDiagram
        model={modelFromUserPath(detail)}
        mode="web"
        loadCourse={loadCourseCard}
        onProgress={async (courseId, status) => {
          try {
            await saveProgress(courseId, status);
            return { ok: true };
          } catch {
            return { ok: false, message: "No se pudo guardar el progreso" };
          }
        }}
      />
    </div>
  );
}
