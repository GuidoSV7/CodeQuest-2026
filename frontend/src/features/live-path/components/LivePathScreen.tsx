"use client";

import { useEffect, useMemo, useState } from "react";
import "@xyflow/react/dist/style.css";
import { PathDiagram } from "path-diagram";
import { getPublicApiUrl } from "@/lib/api-url";
import {
  appearanceDelay,
  reduceLiveEvent,
  type LiveScreen,
} from "../live-path-state";
import { fixtureScreen } from "../live-path-fixtures";
import styles from "./LivePathScreen.module.css";

export function LivePathScreen({ fixture }: { fixture?: string }) {
  const [screen, setScreen] = useState<LiveScreen>(
    fixture ? fixtureScreen(fixture) : { kind: "esperando", connection: "conectado" },
  );
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (fixture) return;
    const source = new EventSource(`${getPublicApiUrl()}/api/me/learning-paths/events`, {
      withCredentials: true,
    });
    source.onopen = () => setScreen((current) => reduceLiveEvent(current, { event: "connection", data: { state: "conectado" } }));
    source.onerror = () => {
      setScreen((current) =>
        current.kind === "esperando" && source.readyState === EventSource.CLOSED
          ? { kind: "sin_sesion", connection: "conectado" }
          : reduceLiveEvent(current, { event: "connection", data: { state: "reconectando" } }),
      );
    };
    source.addEventListener("path.generated", (event) => apply(event));
    source.addEventListener("path.saved", (event) => apply(event));
    source.addEventListener("path.choice_required", (event) => apply(event));
    source.addEventListener("progress.updated", (event) => apply(event));
    return () => source.close();

    function apply(event: Event) {
      const raw = (event as MessageEvent).data;
      setScreen((current) =>
        reduceLiveEvent(current, {
          event: (event as MessageEvent).type || (event as Event).type,
          data: JSON.parse(String(raw)) as Record<string, unknown>,
        }),
      );
    }
  }, [fixture]);

  const label = screen.kind === "sin_sesion" ? "Sin sesión" : screen.connection === "reconectando" ? "Reconectando" : "En vivo";

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <p className={styles.kicker}>Ruta en vivo</p>
        <p className={styles.connection} data-state={screen.connection}>{label}</p>
      </header>
      {screen.kind === "sin_sesion" ? (
        <p className={styles.empty}>Entrá para ver tu ruta en vivo. <a href="/login">Entrar</a></p>
      ) : null}
      {screen.kind === "esperando" ? <p className={styles.empty}>Esperando que Claude arme la ruta.</p> : null}
      {screen.kind === "eleccion" ? (
        <section>
          <h1 className={styles.prompt}>{screen.prompt}</h1>
          <ul className={styles.options}>
            {screen.options.map((option) => (
              <li key={option.path_id}>{option.title}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {screen.kind === "ruta" ? <PathView screen={screen} reduced={reduced} /> : null}
    </main>
  );
}

function PathView({ screen, reduced }: { screen: Extract<LiveScreen, { kind: "ruta" }>; reduced: boolean }) {
  const order = useMemo(
    () => screen.model.items.map((item, index) => ({ id: item.courseId, delay: appearanceDelay(index, reduced || !screen.replay) })),
    [screen.model.items, reduced, screen.replay],
  );
  return (
    <section>
      <h1 className={styles.title}>{screen.model.title}</h1>
      <div className={styles.canvas}>
        <PathDiagram model={screen.model} mode="web" />
      </div>
      <ul className={styles.sr}>
        {order.map((item) => (
          <li key={item.id} style={{ animationDelay: `${item.delay}ms` }}>{item.id}</li>
        ))}
      </ul>
    </section>
  );
}
