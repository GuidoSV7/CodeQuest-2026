// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MyRouteStatus } from "@/features/learning-paths/components/MyRouteStatus";

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

describe("MyRouteStatus", () => {
  it("shows an empty message when the account has no routes", async () => {
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Por el momento no hay ruta");
    act(() => root.unmount());
  });

  it("lists the route titles when the account has routes", async () => {
    const { container, root } = mount(
      <MyRouteStatus
        loadRoutes={async () => [{ id: "path-1", title: "Ruta de Nest" }]}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Ruta de Nest");
    expect(container.textContent).not.toContain("Por el momento no hay ruta");
    act(() => root.unmount());
  });

  it("adds a route when the live channel reports one", async () => {
    let notify: ((route: { id: string; title: string }) => void) | undefined;
    const { container, root } = mount(
      <MyRouteStatus
        loadRoutes={async () => []}
        subscribe={(onCreated) => {
          notify = onCreated;
          return () => undefined;
        }}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Por el momento no hay ruta");
    await act(async () => {
      notify?.({ id: "path-live", title: "Ruta desde Claude" });
    });
    expect(container.textContent).toContain("Ruta desde Claude");
    expect(container.textContent).not.toContain("Por el momento no hay ruta");
    act(() => root.unmount());
  });
});
