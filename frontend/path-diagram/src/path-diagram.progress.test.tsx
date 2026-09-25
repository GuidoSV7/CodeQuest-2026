// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PathDiagram } from "./path-diagram";
import type { DiagramModel } from "./model";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

const model: DiagramModel = {
  title: "React",
  pathId: "path-1",
  allowProgress: true,
  edges: [],
  items: [
    {
      courseId: "100",
      title: "React desde cero",
      url: "https://cursos.devtalles.com/courses/react",
      bucket: "required",
      position: 0,
      alreadyKnown: false,
      partial: false,
      completed: false,
      category: null,
      lessonCount: null,
      videoHours: null,
    },
  ],
};

function mount(onProgress: DiagramProgress) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<PathDiagram model={model} mode="mcp" openUrl={() => undefined} onProgress={onProgress} />);
  });
  return { container, root };
}

type DiagramProgress = (courseId: string, status: "completed" | "not_started") => Promise<{ ok: boolean; message?: string }>;

afterEach(() => {
  document.body.replaceChildren();
});

describe("PathDiagram progress", () => {
  it("keeps the previous state and shows the error when the tool fails", async () => {
    const onProgress = vi.fn<DiagramProgress>(async () => ({
      ok: false,
      message: "No se pudo guardar el progreso",
    }));
    const { container, root } = mount(onProgress);
    const card = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("React desde cero"),
    );
    act(() => {
      card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const mark = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Marcar completado"),
    );
    await act(async () => {
      mark?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(onProgress).toHaveBeenCalledWith("100", "completed");
    expect(container.textContent).toContain("No se pudo guardar el progreso");
    expect(container.textContent).not.toContain("Completado");
    act(() => root.unmount());
  });
});
