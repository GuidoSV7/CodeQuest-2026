import { getPublicApiUrl } from "@/lib/api-url";
import type { MyRouteSummary } from "./load-my-routes";

type PathCreatedMessage = {
  type?: string;
  id?: string;
  title?: string;
};

export function subscribeLearningPathEvents(
  onCreated: (route: MyRouteSummary) => void,
): () => void {
  if (typeof WebSocket === "undefined") return () => undefined;
  const url = `${getPublicApiUrl().replace(/^http/, "ws")}/api/me/learning-paths/live`;
  let socket: WebSocket;
  try {
    socket = new WebSocket(url);
  } catch {
    return () => undefined;
  }
  socket.addEventListener("message", (event) => {
    const data = parseMessage(event.data);
    if (!data) return;
    onCreated({
      id: data.id,
      title: data.title,
      itemCount: 0,
      completedCount: 0,
      progressRatio: 0,
      sourceCatalogPathId: null,
    });
  });
  return () => socket.close();
}

function parseMessage(raw: unknown): { id: string; title: string } | null {
  try {
    const data = JSON.parse(String(raw)) as PathCreatedMessage;
    if (data.type !== "path_created" || !data.id || !data.title) return null;
    return { id: data.id, title: data.title };
  } catch {
    return null;
  }
}

export function subscribeLiveRouteEvents(
  onEvent: (message: { event?: string; data?: Record<string, unknown> }) => void,
): () => void {
  if (typeof EventSource === "undefined") return () => undefined;
  const source = new EventSource(`${getPublicApiUrl()}/api/me/learning-paths/events`, {
    withCredentials: true,
  });
  const receive = (event: Event) => {
    const message = event as MessageEvent;
    onEvent({ event: message.type, data: parseLiveData(message.data) });
  };
  source.addEventListener("path.generated", receive);
  return () => source.close();
}

function parseLiveData(raw: unknown): Record<string, unknown> | undefined {
  try {
    const data = JSON.parse(String(raw)) as unknown;
    if (data && typeof data === "object") return data as Record<string, unknown>;
    return undefined;
  } catch {
    return undefined;
  }
}
