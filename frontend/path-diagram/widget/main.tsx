import { App } from "@modelcontextprotocol/ext-apps";
import { createRoot } from "react-dom/client";
import { modelFromToolResult, modelFromUserPath, PathDiagram, type DiagramModel } from "../src/index";
import { WIDGET_RESULT_TIMEOUT_MS, widgetView } from "../src/widget-status";

const app = new App(
  { name: "codequest-path-diagram", version: "1.0.0" },
  {},
  { autoResize: true },
);
const root = createRoot(document.getElementById("root")!);
let current: DiagramModel | null = null;

function render(model: DiagramModel) {
  current = model;
  root.render(
    <PathDiagram
      model={model}
      mode="mcp"
      openUrl={(url) => {
        void app.openLink({ url });
      }}
      onProgress={
        model.allowProgress && model.pathId
          ? async (courseId, status) => {
              const result = await app.callServerTool({
                name: "update_course_progress",
                arguments: { path_id: model.pathId, course_id: courseId, status },
              });
              if (result.isError) return { ok: false, message: "No se pudo guardar el progreso" };
              return { ok: true };
            }
          : undefined
      }
    />,
  );
}

const startedAt = Date.now();
const timeout = setTimeout(() => {
  if (current) return;
  const view = widgetView({ text: null, isError: false, elapsedMs: Date.now() - startedAt });
  root.render(<p>{view.message}</p>);
}, WIDGET_RESULT_TIMEOUT_MS);

app.ontoolresult = (result) => {
  clearTimeout(timeout);
  const structured = result.structuredContent as Record<string, unknown> | undefined;
  const text = result.content?.find((item) => item.type === "text" && "text" in item)?.text;
  const received = typeof text === "string" ? text : null;
  const view = widgetView({
    text: received,
    isError: result.isError === true,
    elapsedMs: Date.now() - startedAt,
  });
  if (view.kind === "error") {
    root.render(<p>{view.message}</p>);
    return;
  }
  const payload = structured ?? parseText(received ?? "");
  if (!payload) {
    root.render(<p>{view.message}</p>);
    return;
  }
  const userItems = Array.isArray(payload.items) && payload.items[0] && "courseId" in (payload.items[0] as object);
  render(userItems ? modelFromUserPath(payload as never) : modelFromToolResult(payload as never));
};

app.connect();

function parseText(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

void current;
