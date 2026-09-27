import type { DiagramModel } from "path-diagram";

export type LiveConnection = "conectado" | "reconectando";

export type LiveChoice = { path_id: string; title: string; alias: string };

export type LiveScreen =
  | { kind: "sin_sesion"; connection: LiveConnection }
  | { kind: "esperando"; connection: LiveConnection }
  | { kind: "eleccion"; connection: LiveConnection; prompt: string; options: LiveChoice[] }
  | { kind: "ruta"; connection: LiveConnection; model: DiagramModel; replay: boolean };

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
    const model = modelFromLive(message.data ?? {});
    return {
      kind: "ruta",
      connection: screen.connection,
      model,
      replay: previousId !== model.pathId,
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
  const announced = MODAL_EVENTS.has(message.event ?? "");
  return { screen, open: announced || (state.open && screen.kind !== "sin_sesion") };
}

export function appearanceDelay(index: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return index * 90;
}

function modelFromLive(data: Record<string, unknown>): DiagramModel {
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    title: String(data.title ?? data.source_path_id ?? "Tu ruta"),
    pathId: String(data.path_id ?? data.source_path_id ?? "generated"),
    allowProgress: false,
    edges: Array.isArray(data.edges)
      ? data.edges.map((edge) => {
          const row = edge as { from_course_id?: string; to_course_id?: string };
          return { fromCourseId: String(row.from_course_id ?? ""), toCourseId: String(row.to_course_id ?? "") };
        })
      : [],
    items: items.map((raw) => {
      const item = raw as Record<string, unknown>;
      return {
        courseId: String(item.course_id ?? item.courseId ?? ""),
        title: String(item.title ?? item.courseTitle ?? ""),
        url: String(item.url ?? ""),
        bucket: (item.bucket ?? null) as DiagramModel["items"][number]["bucket"],
        position: Number(item.position ?? 0),
        alreadyKnown: Boolean(item.already_known),
        partial: Boolean(item.partial),
        completed: item.progress === "completed" || item.status === "completed",
        category: null,
        lessonCount: null,
        videoHours: null,
      };
    }),
  };
}
