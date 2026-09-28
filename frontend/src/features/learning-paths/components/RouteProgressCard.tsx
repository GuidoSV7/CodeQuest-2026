"use client";

import Link from "next/link";
import { useState } from "react";
import { StackIcon } from "./StackIcon";
import { loadPathDetail, type PathDetailResponse } from "../lib/load-path-detail";
import type { MyRouteSummary } from "../lib/load-my-routes";
import { saveCourseProgress } from "../lib/save-course-progress";
import styles from "./MyRouteStatus.module.css";

type CourseRow = {
  courseId: string;
  courseTitle: string;
  completed: boolean;
};

export function RouteProgressCard({
  route,
  loadDetail = loadPathDetail,
  saveProgress = saveCourseProgress,
}: {
  route: MyRouteSummary;
  loadDetail?: (routeId: string) => Promise<PathDetailResponse | null>;
  saveProgress?: (courseId: string, status: "completed" | "not_started") => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [completedCount, setCompletedCount] = useState(route.completedCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const total = route.itemCount;
  const ratio = total === 0 ? 0 : Math.min(1, completedCount / total);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && courses === null) void loadCourses();
  };

  return (
    <li className={styles.routeCard}>
      <div className={styles.routeHead}>
        <Link className={styles.route} href={`/mis-rutas/${route.id}`}>
          <StackIcon pathId={route.sourceCatalogPathId} size="sm" />
          <span>{route.title}</span>
        </Link>
        <button
          type="button"
          className={styles.coursesToggle}
          aria-expanded={open}
          aria-label={open ? `Ocultar cursos de ${route.title}` : `Ver cursos de ${route.title}`}
          onClick={toggleOpen}
        >
          {open ? "Ocultar" : "Cursos"}
        </button>
      </div>
      <p className={styles.progressLabel}>
        {total === 0 ? "Sin cursos todavía" : `${completedCount} de ${total} cursos`}
      </p>
      <div
        className={styles.meter}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completedCount}
        aria-label={`${completedCount} de ${total} cursos`}
      >
        <span className={styles.meterFill} style={{ width: `${ratio * 100}%` }} />
      </div>
      {open && loading ? <p className={styles.note}>Cargando cursos…</p> : null}
      {open && error ? <p role="alert">{error}</p> : null}
      {open && courses ? (
        <ul className={styles.courseList}>
          {courses.map((course) => (
            <li key={course.courseId}>
              <button
                type="button"
                className={styles.course}
                aria-pressed={course.completed}
                onClick={() => void toggleCourse(course)}
              >
                <span className={styles.check} data-done={course.completed ? "yes" : "no"} aria-hidden="true" />
                <span className={styles.courseTitle}>{course.courseTitle}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );

  async function loadCourses() {
    setLoading(true);
    setError("");
    try {
      const detail = await loadDetail(route.id);
      if (!detail) {
        setError("No pudimos cargar los cursos");
        return;
      }
      const rows = detail.items.map((item) => ({
        courseId: item.courseId,
        courseTitle: item.courseTitle,
        completed: item.progress?.status === "completed",
      }));
      setCourses(rows);
      setCompletedCount(rows.filter((row) => row.completed).length);
    } catch {
      setError("No pudimos cargar los cursos");
    } finally {
      setLoading(false);
    }
  }

  async function toggleCourse(course: CourseRow) {
    const next = !course.completed;
    setCourses((current) =>
      current?.map((row) => (row.courseId === course.courseId ? { ...row, completed: next } : row)) ?? current,
    );
    setCompletedCount((current) => current + (next ? 1 : -1));
    setError("");
    try {
      await saveProgress(course.courseId, next ? "completed" : "not_started");
    } catch {
      setCourses((current) =>
        current?.map((row) =>
          row.courseId === course.courseId ? { ...row, completed: course.completed } : row,
        ) ?? current,
      );
      setCompletedCount((current) => current + (next ? -1 : 1));
      setError("No se pudo guardar el progreso");
    }
  }
}
