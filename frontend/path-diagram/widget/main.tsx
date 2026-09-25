import { App } from "@modelcontextprotocol/ext-apps";
import { createRoot } from "react-dom/client";
import { modelFromToolResult, modelFromUserPath, PathDiagram, type DiagramModel } from "../src/index";

const app = new App({ name: "codequest-path-diagram", version: "1.0.0" }, { autoResize: true });
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

app.ontoolresult = (result) => {
  const structured = result.structuredContent as Record<string, unknown> | undefined;
  const text = result.content?.find((item) => item.type === "text" && "text" in item)?.text;
  const payload = structured ?? parseText(typeof text === "string" ? text : "");
  if (!payload) {
    root.render(<p>Esperando la ruta…</p>);
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
