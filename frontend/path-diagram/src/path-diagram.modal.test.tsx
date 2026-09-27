// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { DiagramModel } from "./model";
import { PathDiagram } from "./path-diagram";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

const model: DiagramModel = {
  title: "C#",
  pathId: "path-1",
  allowProgress: false,
  edges: [],
  items: [
    {
      courseId: "csharp",
      title: "C#: Empieza tu camino en el lenguaje",
      url: "https://cursos.devtalles.com/courses/csharp",
      bucket: "recommended",
      position: 0,
      alreadyKnown: false,
      partial: false,
      completed: false,
      category: null,
      lessonCount: 40,
      videoHours: 12,
      detail: {
        description: "Primeros pasos en el lenguaje",
        instructor: "Fernando Herrera",
        lessonCount: 40,
        videoHours: 12,
        previewYoutubeId: "abc123XYZ",
        prerequisites: ["Conocimientos básicos de programación"],
        tags: ["bases", "backend"],
        sections: [{ title: "Fundamentos", lessons: ["Variables"] }],
        url: "https://cursos.devtalles.com/courses/csharp",
      },
    },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("PathDiagram course modal", () => {
  it("opens topics, tags and the intro video when a card is clicked", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<PathDiagram model={model} mode="web" width={429} />);
    });

    const card = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("C#:"),
    );
    act(() => {
      card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dialog = container.querySelector("[role='dialog']");
    expect(dialog?.textContent).toContain("Fundamentos");
    expect(dialog?.textContent).toContain("Variables");
    expect(dialog?.textContent).toContain("bases");
    expect(dialog?.textContent).toContain("Video de introducción");
    const frame = dialog?.querySelector("iframe");
    expect(frame?.getAttribute("src")).toBe("https://www.youtube-nocookie.com/embed/abc123XYZ");
    expect(frame?.getAttribute("title")).toBe("Video de introducción");

    act(() => root.unmount());
  });
});
