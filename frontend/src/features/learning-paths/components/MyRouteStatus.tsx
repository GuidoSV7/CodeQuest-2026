"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadMyRoutes, type MyRouteSummary } from "../lib/load-my-routes";
import { subscribeLearningPathEvents } from "../lib/subscribe-learning-paths";
import styles from "./MyRouteStatus.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; routes: MyRouteSummary[] }
  | { status: "error" };

export function MyRouteStatus({
  loadRoutes = loadMyRoutes,
  subscribe = subscribeLearningPathEvents,
}: {
  loadRoutes?: () => Promise<MyRouteSummary[]>;
  subscribe?: (onCreated: (route: MyRouteSummary) => void) => () => void;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadRoutes()
      .then((routes) => {
        if (!active) return;
        setState((current) => ({
          status: "ready",
          routes: mergeRoutes(current.status === "ready" ? current.routes : [], routes),
        }));
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [loadRoutes]);

  useEffect(() => {
    return subscribe((route) => {
      setState((current) => ({
        status: "ready",
        routes: mergeRoutes(current.status === "ready" ? current.routes : [], [route]),
      }));
    });
  }, [subscribe]);

  return (
    <section className={styles.panel} aria-labelledby="my-routes-title">
      <p className={styles.kicker}>Mis rutas</p>
      <h1 className={styles.title} id="my-routes-title">
        Tus rutas
      </h1>
      {state.status === "loading" ? <p className={styles.note}>Cargando tus rutas…</p> : null}
      {state.status === "error" ? (
        <p className={styles.note} role="alert">
          No pudimos cargar tus rutas
        </p>
      ) : null}
      {state.status === "ready" && state.routes.length === 0 ? (
        <p className={styles.empty}>Por el momento no hay ruta</p>
      ) : null}
      {state.status === "ready" && state.routes.length > 0 ? (
        <ul className={styles.list}>
          {state.routes.map((route) => (
            <li key={route.id}>
              <Link className={styles.route} href={`/mis-rutas/${route.id}`}>
                {route.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function mergeRoutes(current: MyRouteSummary[], incoming: MyRouteSummary[]): MyRouteSummary[] {
  const routes = new Map(current.map((route) => [route.id, route]));
  for (const route of incoming) routes.set(route.id, route);
  return [...routes.values()];
}
