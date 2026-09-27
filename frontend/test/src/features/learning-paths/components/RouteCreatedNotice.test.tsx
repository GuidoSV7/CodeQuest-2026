// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MyRouteSummary } from "@/features/learning-paths/lib/load-my-routes";
import { RouteCreatedNotice } from "@/features/learning-paths/components/RouteCreatedNotice";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("RouteCreatedNotice", () => {
  it("tells this page once when another device generates or saves a route", () => {
    const onNotify = vi.fn();
    let created: ((route: MyRouteSummary) => void) | undefined;
    let live: ((message: { event?: string; data?: Record<string, unknown> }) => void) | undefined;
    const { root } = mount(
      <RouteCreatedNotice
        onNotify={onNotify}
        subscribeCreated={(callback) => {
          created = callback;
          return () => undefined;
        }}
        subscribeLive={(callback) => {
          live = callback;
          return () => undefined;
        }}
      />,
    );

    act(() => {
      live?.({ event: "path.generated", data: { title: "Ruta React" } });
    });
    act(() => {
      created?.({ id: "path-1", title: "Ruta Nest", itemCount: 1, completedCount: 0, progressRatio: 0 });
      created?.({ id: "path-1", title: "Ruta Nest", itemCount: 1, completedCount: 0, progressRatio: 0 });
    });
    act(() => {
      live?.({ event: "path.generated", data: { title: "Ruta React", replayed: true } });
    });

    expect(onNotify).toHaveBeenCalledTimes(2);
    expect(onNotify).toHaveBeenNthCalledWith(1, "Se armó la ruta Ruta React.");
    expect(onNotify).toHaveBeenNthCalledWith(2, "Se armó la ruta Ruta Nest.");
    act(() => root.unmount());
  });
});
