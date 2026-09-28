"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import "@xyflow/react/dist/style.css";
import { PathDiagram } from "path-diagram";
import { CHROME_ICON_STROKE_WIDTH } from "@/config/chrome-icon";
import { loadCourseCard } from "@/lib/load-course-card";
import { appearanceDelay, type LiveScreen } from "../live-path-state";
import styles from "./LivePathScreen.module.css";

export function LivePathView({
  screen,
  reduced = false,
  onClose,
}: {
  screen: LiveScreen;
  reduced?: boolean;
  onClose?: () => void;
}) {
  const label = screen.kind === "sin_sesion" ? "Sin sesión" : screen.connection === "reconectando" ? "Reconectando" : "En vivo";

  return (
    <>
      <header className={styles.top}>
        <p className={styles.kicker}>Ruta en vivo</p>
        <div className={styles.topActions}>
          <p className={styles.connection} data-state={screen.connection}>{label}</p>
          {onClose ? (
            <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
              <X aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} />
            </button>
          ) : null}
        </div>
      </header>
      {screen.kind === "sin_sesion" ? (
        <p className={styles.empty}>Entrá para ver tu ruta en vivo. <a href="/login">Entrar</a></p>
      ) : null}
      {screen.kind === "esperando" ? <p className={styles.empty}>Esperando que tu IA arme la ruta.</p> : null}
      {screen.kind === "eleccion" ? (
        <section>
          <h1 className={styles.prompt} id="live-path-modal-title">{screen.prompt}</h1>
          <ul className={styles.options}>
            {screen.options.map((option) => (
              <li key={option.path_id}>{option.title}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {screen.kind === "ruta" ? <PathView screen={screen} reduced={reduced} /> : null}
    </>
  );
}

function PathView({ screen, reduced }: { screen: Extract<LiveScreen, { kind: "ruta" }>; reduced: boolean }) {
  const order = useMemo(
    () => screen.model.items.map((item, index) => ({ id: item.courseId, delay: appearanceDelay(index, reduced || !screen.replay) })),
    [screen.model.items, reduced, screen.replay],
  );
  return (
    <section>
      <h1 className={styles.title} id="live-path-modal-title">{screen.model.title}</h1>
      <div className={styles.canvas}>
        <PathDiagram model={screen.model} mode="web" loadCourse={loadCourseCard} />
      </div>
      {screen.instructors.length > 0 ? (
        <section className={styles.notes} aria-label="Instructores">
          <h2>Instructores</h2>
          <ul>
            {screen.instructors.map((person) => (
              <li key={person.courseId}>
                {person.title}: {person.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {screen.relatedPaths.length > 0 ? (
        <section className={styles.notes} aria-label="Otras rutas">
          <h2>También te puede interesar</h2>
          <ul>
            {screen.relatedPaths.map((path) => (
              <li key={path.pathId}>{path.title}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <ul className={styles.sr}>
        {order.map((item) => (
          <li key={item.id} style={{ animationDelay: `${item.delay}ms` }}>{item.id}</li>
        ))}
      </ul>
    </section>
  );
}
