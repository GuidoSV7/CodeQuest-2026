// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LivePathView } from "@/features/live-path/components/LivePathScreen";

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

describe("LivePathView", () => {
  it("closes through an accessible icon button", () => {
    const onClose = vi.fn();
    const { container, root } = mount(
      <LivePathView screen={{ kind: "esperando", connection: "conectado" }} onClose={onClose} />,
    );

    const close = container.querySelector("button[aria-label='Cerrar']");
    expect(close).not.toBeNull();
    expect(close?.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(close?.textContent).not.toContain("×");

    act(() => close?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it("waits for any AI client, not only Claude", () => {
    const { container, root } = mount(
      <LivePathView screen={{ kind: "esperando", connection: "conectado" }} />,
    );

    expect(container.textContent).toContain("Esperando que tu IA arme la ruta.");
    expect(container.textContent).not.toContain("Claude");
    act(() => root.unmount());
  });
});
