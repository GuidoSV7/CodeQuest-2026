// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
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
        loadRoutes={async () => [
          { id: "path-1", title: "Ruta de Nest", itemCount: 2, completedCount: 0, progressRatio: 0 },
        ]}
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
    let notify: ((route: { id: string; title: string; itemCount: number; completedCount: number; progressRatio: number }) => void) | undefined;
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
      notify?.({ id: "path-live", title: "Ruta desde Claude", itemCount: 0, completedCount: 0, progressRatio: 0 });
    });
    expect(container.textContent).toContain("Ruta desde Claude");
    expect(container.textContent).not.toContain("Por el momento no hay ruta");
    act(() => root.unmount());
  });

  it("creates an official route from the form answers", async () => {
    const created = { id: "path-new", title: "Ruta React", itemCount: 4, completedCount: 0, progressRatio: 0 };
    const createOfficial = vi.fn(async () => created);
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} createOfficial={createOfficial} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const formButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Quiero hacerlo por un formulario"),
    );
    act(() => {
      formButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const form = container.querySelector("form");
    const opener = form?.querySelector("button[aria-haspopup='listbox']");
    act(() => {
      opener?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const react = Array.from(form?.querySelectorAll("[role='option']") ?? []).find((button) =>
      button.textContent === "React",
    );
    act(() => {
      react?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(createOfficial).toHaveBeenCalledWith({ catalogPathId: "programas-react", title: "Ruta React" });
    expect(container.textContent).toContain("Ruta React");
    expect(container.querySelector("select")).toBeNull();
    expect(container.textContent).not.toContain("Nombre de la ruta");
    act(() => root.unmount());
  });

  it("opens the MCP explanation with a docs link to copy and a video placeholder", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { container, root } = mount(<MyRouteStatus loadRoutes={async () => []} />);
    await act(async () => {
      await Promise.resolve();
    });

    const mcpButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Quiero hacerlo por MCP"),
    );
    vi.useFakeTimers();
    act(() => {
      mcpButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dialog = container.querySelector("[role='dialog']");
    expect(dialog?.getAttribute("data-motion")).toBe("closed");
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(container.querySelector("[role='dialog']")?.getAttribute("data-motion")).toBe("open");
    vi.useRealTimers();
    expect(dialog?.textContent).toContain("El video va acá");
    expect(dialog?.textContent).toContain("Copia y pega esto a tu IA para conectarte");
    expect(dialog?.textContent).toContain("get_documentation");
    expect(dialog?.textContent).toContain("/docs/mcp");
    const copy = dialog?.querySelector("button[aria-label='Copiar']");
    await act(async () => {
      copy?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("get_documentation"));
    act(() => root.unmount());
    vi.unstubAllGlobals();
  });
});
