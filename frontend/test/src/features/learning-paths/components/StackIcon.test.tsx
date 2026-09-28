// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { StackIcon } from "@/features/learning-paths/components/StackIcon";

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

describe("StackIcon", () => {
  it("renders the vendored stack logo as a decorative image", () => {
    const { container, root } = mount(<StackIcon pathId="ruta-c" size="sm" />);

    const img = container.querySelector("img[src='/devtalles-tech/csharp.svg']");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("width")).toBe("24");
    expect(img?.getAttribute("height")).toBe("24");
    act(() => root.unmount());
  });

  it("uses the standalone label as alt text when the icon goes alone", () => {
    const { container, root } = mount(<StackIcon pathId="ruta-go" size="md" standaloneLabel="Go" />);

    const img = container.querySelector("img[src='/devtalles-tech/go.svg']");
    expect(img?.getAttribute("alt")).toBe("Go");
    expect(img?.getAttribute("width")).toBe("40");
    act(() => root.unmount());
  });

  it("renders nothing without an official path", () => {
    const { container, root } = mount(<StackIcon pathId={null} size="sm" />);

    expect(container.innerHTML).toBe("");
    act(() => root.unmount());
  });
});
