// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    expect(container.querySelector("h1")?.textContent).toBe("Backend con Nest");
    expect(container.textContent).toContain("Nest desde cero");
    expect(container.textContent).toContain("Completado");
    act(() => root.unmount());
  });

  it("saves the course and confirms it in the modal", async () => {
    const saveProgress = vi.fn(async () => undefined);
    const { container, root } = mount(
      <UserRouteDiagram
        routeId="path-1"
        saveProgress={saveProgress}
        load={async () => ({
          id: "path-1",
          title: "Backend con Nest",
          items: [
            {
              courseId: "100",
              courseTitle: "Nest desde cero",
              bucket: "required",
              position: 0,
              progress: { status: "not_started" },
            },
          ],
        })}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const card = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Nest desde cero"),
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
    expect(saveProgress).toHaveBeenCalledWith("100", "completed");
    expect(container.textContent).toContain("Curso marcado como completado.");
    expect(container.textContent).toContain("Marcar sin empezar");
    act(() => root.unmount());
  });
});
