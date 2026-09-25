// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { UserRouteDiagram } from "@/features/learning-paths/components/UserRouteDiagram";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

function mount(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("UserRouteDiagram", () => {
  it("renders the courses from the route detail endpoint", async () => {
    const { container, root } = mount(
      <UserRouteDiagram
        routeId="path-1"
        load={async () => ({
          id: "path-1",
          title: "Backend con Nest",
          items: [
            {
              courseId: "100",
              courseTitle: "Nest desde cero",
              bucket: "required",
              position: 0,
              progress: { status: "completed" },
            },
          ],
        })}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Nest desde cero");
    expect(container.textContent).toContain("Completado");
    act(() => root.unmount());
  });
});
