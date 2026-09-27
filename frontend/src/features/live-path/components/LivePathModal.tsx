"use client";

import { useEffect, useState } from "react";
import { getPublicApiUrl } from "@/lib/api-url";
import { reduceLiveModal, type LiveModalState } from "../live-path-state";
import { LivePathView } from "./LivePathScreen";
import styles from "./LivePathScreen.module.css";

const initial: LiveModalState = {
  screen: { kind: "esperando", connection: "conectado" },
  open: false,
};

const EXIT_MS = 280;

export function LivePathModal() {
  const [state, setState] = useState<LiveModalState>(initial);
  const [reduced, setReduced] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const shown = state.open && (state.screen.kind === "ruta" || state.screen.kind === "eleccion");

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!shown) return;
    setMounted(true);
  }, [shown]);

  useEffect(() => {
    if (!mounted || !shown) return;
    if (reduced) {
      setEntered(true);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [mounted, shown, reduced]);

  useEffect(() => {
    if (shown || !mounted) return;
    setEntered(false);
    if (reduced) {
      setMounted(false);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [shown, mounted, reduced]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource(`${getPublicApiUrl()}/api/me/learning-paths/events`, {
      withCredentials: true,
    });
    const receive = (event: Event) => {
      const message = event as MessageEvent;
      const data = message.data ? (JSON.parse(String(message.data)) as Record<string, unknown>) : undefined;
      setState((current) => reduceLiveModal(current, { event: message.type, data }));
    };
    source.onopen = () => {
      setState((current) => reduceLiveModal(current, { event: "connection", data: { state: "conectado" } }));
    };
    source.onerror = () => {
      setState((current) =>
        current.screen.kind === "esperando" && source.readyState === EventSource.CLOSED
          ? reduceLiveModal(current, { event: "session" })
          : reduceLiveModal(current, { event: "connection", data: { state: "reconectando" } }),
      );
    };
    source.addEventListener("path.generated", receive);
    source.addEventListener("path.saved", receive);
    source.addEventListener("path.choice_required", receive);
    source.addEventListener("progress.updated", receive);
    return () => source.close();
  }, []);

  useEffect(() => {
    if (!state.open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setState((current) => reduceLiveModal(current, { event: "dismiss" }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.open]);

  if (!mounted || (state.screen.kind !== "ruta" && state.screen.kind !== "eleccion")) return null;

  return (
    <div className={entered ? `${styles.backdrop} ${styles.backdropOpen}` : styles.backdrop}>
      <div
        className={entered ? `${styles.dialog} ${styles.dialogOpen}` : styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-path-modal-title"
      >
        <LivePathView
          screen={state.screen}
          reduced={reduced}
          onClose={() => setState((current) => reduceLiveModal(current, { event: "dismiss" }))}
        />
      </div>
    </div>
  );
}
