import { describe, expect, it } from "vitest";
import {
  appearanceDelay,
  reduceLiveEvent,
  reduceLiveModal,
  type LiveScreen,
} from "@/features/live-path/live-path-state";

const generated = {
  type: "path.generated",
  strategy: "official_path",
  source_path_id: "programas-react",
  items: [
    {
      course_id: "3395229",
      title: "React: de cero a experto",
      url: "https://cursos.devtalles.com/courses/react-de-cero",
      bucket: "required",
      position: 1,
      already_known: false,
      partial: false,
    },
  ],
  edges: [],
};

describe("live path screen", () => {
  it("starts waiting once the stream is open", () => {
    const screen = reduceLiveEvent(
      { kind: "esperando", connection: "conectado" },
      { event: "heartbeat", data: { type: "heartbeat" } },
    );
    expect(screen.kind).toBe("esperando");
    expect(screen.connection).toBe("conectado");
  });

  it("draws a generated path and replaces it when another path arrives", () => {
    const first = reduceLiveEvent(
      { kind: "esperando", connection: "conectado" },
      { event: "path.generated", data: generated },
    );
    expect(first.kind).toBe("ruta");
    if (first.kind !== "ruta") return;
    expect(first.model.items[0]?.title).toBe("React: de cero a experto");
    const next = reduceLiveEvent(first, {
      event: "path.generated",
      data: { ...generated, source_path_id: "ruta-dart", items: [{ ...generated.items[0], course_id: "1", title: "Dart" }] },
    });
    expect(next.kind).toBe("ruta");
    if (next.kind !== "ruta") return;
    expect(next.model.items[0]?.title).toBe("Dart");
    expect(next.replay).toBe(true);
  });

  it("updates only the matching course on progress", () => {
    const drawn = reduceLiveEvent(
      { kind: "esperando", connection: "conectado" },
      { event: "path.generated", data: generated },
    ) as Extract<LiveScreen, { kind: "ruta" }>;
    const updated = reduceLiveEvent(drawn, {
      event: "progress.updated",
      data: { type: "progress.updated", course_id: "3395229", status: "completed" },
    });
    expect(updated.kind).toBe("ruta");
    if (updated.kind !== "ruta") return;
    expect(updated.model.items[0]?.completed).toBe(true);
    expect(updated.replay).toBe(false);
  });

  it("shows the choice copy and keeps options non interactive in the model", () => {
    const screen = reduceLiveEvent(
      { kind: "esperando", connection: "conectado" },
      {
        event: "path.choice_required",
        data: {
          type: "path.choice_required",
          goal: "frontend",
          options: [{ path_id: "programas-react", title: "Ruta React", alias: "react" }],
        },
      },
    );
    expect(screen.kind).toBe("eleccion");
    if (screen.kind !== "eleccion") return;
    expect(screen.prompt).toBe("Decile a Claude cuál preferís");
    expect(screen.options[0]?.title).toBe("Ruta React");
  });

  it("marks reconnecting without dropping the drawn path", () => {
    const drawn = reduceLiveEvent(
      { kind: "esperando", connection: "conectado" },
      { event: "path.generated", data: generated },
    );
    const again = reduceLiveEvent(drawn, { event: "connection", data: { state: "reconectando" } });
    expect(again.kind).toBe("ruta");
    expect(again.connection).toBe("reconectando");
  });
});

describe("live path modal", () => {
  const waiting = { screen: { kind: "esperando" as const, connection: "conectado" as const }, open: false };

  it("stays closed while waiting or without a session", () => {
    const heartbeat = reduceLiveModal(waiting, { event: "heartbeat", data: { type: "heartbeat" } });
    expect(heartbeat.open).toBe(false);
    const signedOut = reduceLiveModal(waiting, { event: "session" });
    expect(signedOut.open).toBe(false);
    expect(signedOut.screen.kind).toBe("sin_sesion");
  });

  it("opens over the current page when Claude generates, saves, or asks for a choice", () => {
    const generatedModal = reduceLiveModal(waiting, { event: "path.generated", data: generated });
    expect(generatedModal.open).toBe(true);
    expect(generatedModal.screen.kind).toBe("ruta");

    const saved = reduceLiveModal(waiting, {
      event: "path.saved",
      data: { ...generated, path_id: "path-1", title: "Mi ruta" },
    });
    expect(saved.open).toBe(true);

    const choice = reduceLiveModal(waiting, {
      event: "path.choice_required",
      data: {
        type: "path.choice_required",
        options: [{ path_id: "programas-react", title: "Ruta React", alias: "react" }],
      },
    });
    expect(choice.open).toBe(true);
    expect(choice.screen.kind).toBe("eleccion");
  });

  it("closes without losing the path and opens again on the next route", () => {
    const open = reduceLiveModal(waiting, { event: "path.generated", data: generated });
    const closed = reduceLiveModal(open, { event: "dismiss" });
    expect(closed.open).toBe(false);
    expect(closed.screen.kind).toBe("ruta");

    const progress = reduceLiveModal(closed, {
      event: "progress.updated",
      data: { course_id: "3395229", status: "completed" },
    });
    expect(progress.open).toBe(false);
    if (progress.screen.kind === "ruta") {
      expect(progress.screen.model.items[0]?.completed).toBe(true);
    }

    const again = reduceLiveModal(closed, {
      event: "path.generated",
      data: { ...generated, source_path_id: "ruta-dart" },
    });
    expect(again.open).toBe(true);
  });
});

describe("appearance delay", () => {
  it("is zero when motion is reduced", () => {
    expect(appearanceDelay(4, true)).toBe(0);
    expect(appearanceDelay(4, false)).toBe(360);
  });
});
