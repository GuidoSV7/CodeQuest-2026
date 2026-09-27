import { modelFromUserPath, type DiagramModel } from "path-diagram";

export type LiveConnection = "conectado" | "reconectando";

export type LiveChoice = { path_id: string; title: string; alias: string };

export type LiveScreen =
  | { kind: "sin_sesion"; connection: LiveConnection }
  | { kind: "esperando"; connection: LiveConnection }
  | { kind: "eleccion"; connection: LiveConnection; prompt: string; options: LiveChoice[] }
  | {
      kind: "ruta";
      connection: LiveConnection;
      model: DiagramModel;
      replay: boolean;
      instructors: Array<{ courseId: string; title: string; name: string }>;
      relatedPaths: Array<{ pathId: string; title: string }>;
    };

type LiveRecord = { event?: string; data?: Record<string, unknown> };

export function reduceLiveEvent(screen: LiveScreen, message: LiveRecord): LiveScreen {
  if (message.event === "connection") {
    const state = message.data?.state === "reconectando" ? "reconectando" : "conectado";
    return { ...screen, connection: state };
  }
  if (message.event === "session") return { kind: "sin_sesion", connection: "conectado" };
  if (message.event === "path.choice_required") {
    const options = Array.isArray(message.data?.options) ? (message.data.options as LiveChoice[]) : [];
    return {
      kind: "eleccion",
      connection: screen.connection,
      prompt: "Decile a Claude cuál preferís",
      options,
    };
  }
  if (message.event === "path.generated" || message.event === "path.saved") {
    const previousId = screen.kind === "ruta" ? screen.model.pathId : null;
    const data = message.data ?? {};
    const model = modelFromLive(data);
    return {
      kind: "ruta",
      connection: screen.connection,
      model,
      replay: previousId !== model.pathId,
      instructors: instructorsFrom(data),
      relatedPaths: relatedFrom(data),
    };
  }
  if (message.event === "progress.updated" && screen.kind === "ruta") {
    const courseId = String(message.data?.course_id ?? "");
    const completed = message.data?.status === "completed";
    return {
      ...screen,
      replay: false,
      model: {
        ...screen.model,
        items: screen.model.items.map((item) =>
          item.courseId === courseId ? { ...item, completed } : item,
        ),
      },
    };
  }
  return screen;
}

export type LiveModalState = {
  screen: LiveScreen;
  open: boolean;
};

const MODAL_EVENTS = new Set(["path.generated", "path.saved", "path.choice_required"]);

export function reduceLiveModal(
  state: LiveModalState,
  message: { event?: string; data?: Record<string, unknown> },
): LiveModalState {
  if (message.event === "dismiss") return { ...state, open: false };
  const screen = reduceLiveEvent(state.screen, message);
  const announced = MODAL_EVENTS.has(message.event ?? "") && message.data?.replayed !== true;
  return { screen, open: announced || (state.open && screen.kind !== "sin_sesion") };
}

export function appearanceDelay(index: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return index * 90;
}

function instructorsFrom(data: Record<string, unknown>) {
  const items = Array.isArray(data.items) ? data.items : [];
  return items.flatMap((raw) => {
    const item = raw as Record<string, unknown>;
    const detail = item.detail as { instructor?: unknown } | undefined;
    const name = typeof item.instructor === "string" ? item.instructor : detail?.instructor;
    if (typeof name !== "string" || name.length === 0) return [];
    return [{
      courseId: String(item.course_id ?? item.courseId ?? ""),
      title: String(item.title ?? item.courseTitle ?? ""),
      name,
    }];
  });
}

function relatedFrom(data: Record<string, unknown>) {
  const rows = Array.isArray(data.related_paths) ? data.related_paths : [];
  return rows.flatMap((raw) => {
    const row = raw as { path_id?: unknown; title?: unknown };
    if (typeof row.path_id !== "string" || typeof row.title !== "string") return [];
    return [{ pathId: row.path_id, title: row.title }];
  });
}

function modelFromLive(data: Record<string, unknown>): DiagramModel {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const model = modelFromUserPath({
    id: String(data.path_id ?? data.source_path_id ?? "generated"),
    title: String(data.title ?? data.source_path_id ?? "Tu ruta"),
    items: rawItems.map((raw) => {
      const item = raw as Record<string, unknown>;
      const completed = item.progress === "completed" || item.status === "completed";
      return {
        courseId: String(item.course_id ?? item.courseId ?? ""),
        courseTitle: String(item.title ?? item.courseTitle ?? ""),
        bucket: (item.bucket ?? null) as DiagramModel["items"][number]["bucket"],
        position: Number(item.position ?? 0),
        progress: completed ? { status: "completed" as const } : undefined,
      };
    }),
  });
  return { ...model, allowProgress: false };
}
