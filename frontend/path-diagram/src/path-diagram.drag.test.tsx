// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { modelFromUserPath } from "./model";
import { PathDiagram } from "./path-diagram";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

function renderFork() {
  const model = modelFromUserPath({
    id: "ruta-c",
    title: "C#",
    items: [
      { courseId: "csharp", courseTitle: "C#: Empieza tu camino en el lenguaje", bucket: "recommended", position: 0 },
      { courseId: "dotnet", courseTitle: ".NET Backend: .NET Core, SQL Server y seguridad JWT", bucket: "recommended", position: 1 },
      { courseId: "blazor", courseTitle: "Blazor: Desde cero con arquitectura limpia", bucket: "recommended", position: 2 },
    ],
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<PathDiagram model={model} mode="web" width={429} />);
  });
  return { container, root };
}

function drag(target: Element) {
  const rect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON() {
      return {};
    },
  };
  const view = target.ownerDocument.defaultView ?? window;
  view.HTMLElement.prototype.getBoundingClientRect = () => rect;
  const mouseAt = (clientX: number, clientY: number, type: string) => {
    const event = new view.MouseEvent(type, { clientX, clientY, bubbles: true, button: 0 });
    Object.defineProperty(event, "view", { value: view });
    return event;
  };
  const pointerAt = (clientX: number, clientY: number, type: string) =>
    new view.PointerEvent(type, { clientX, clientY, bubbles: true, button: 0, pointerId: 1 });
  act(() => {
    target.dispatchEvent(pointerAt(40, 40, "pointerdown"));
    target.dispatchEvent(mouseAt(40, 40, "mousedown"));
    view.dispatchEvent(pointerAt(48, 48, "pointermove"));
    view.dispatchEvent(mouseAt(48, 48, "mousemove"));
    view.dispatchEvent(pointerAt(180, 110, "pointermove"));
    view.dispatchEvent(mouseAt(180, 110, "mousemove"));
    view.dispatchEvent(pointerAt(180, 110, "pointerup"));
    view.dispatchEvent(mouseAt(180, 110, "mouseup"));
    target.dispatchEvent(new view.MouseEvent("click", { bubbles: true }));
  });
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("PathDiagram card drag", () => {
  it("moves a course card when it is dragged and keeps the course closed", () => {
    const { container, root } = renderFork();
    const node = container.querySelector("[data-testid='rf__node-csharp']");
    const card = node?.querySelector("button");
    expect(node?.classList.contains("draggable")).toBe(true);

    if (card) drag(card);

    expect(node?.getAttribute("style")).not.toContain("translate(24px");
    expect(container.querySelector("[role='dialog']")).toBeNull();
    expect(container.querySelector("[role='dialog']")).toBeNull();
    act(() => root.unmount());
  });
});
