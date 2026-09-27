// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PathCard } from "./path-card";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
}

const base = {
  title: "React desde cero",
  bucketLabel: "Requerido",
  iconLabel: "Curso",
  alreadyKnown: false,
  partial: false,
  completed: false,
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("PathCard", () => {
  it("shows the title, the bucket badge and an icon", () => {
    const { container, root } = mount(<PathCard {...base} onOpen={() => undefined} />);
    expect(container.textContent).toContain("React desde cero");
    expect(container.textContent).toContain("Requerido");
    expect(container.querySelector("[role='img']")?.getAttribute("aria-label")).toBe("Curso");
    act(() => root.unmount());
  });

  it("names already known, partial and completed in text", () => {
    const known = mount(<PathCard {...base} alreadyKnown onOpen={() => undefined} />);
    expect(known.container.textContent).toContain("Ya visto");
    act(() => known.root.unmount());

    const partial = mount(<PathCard {...base} partial onOpen={() => undefined} />);
    expect(partial.container.textContent).toContain("Incompleto");
    act(() => partial.root.unmount());

    const done = mount(<PathCard {...base} alreadyKnown completed onOpen={() => undefined} />);
    expect(done.container.textContent).toContain("Completado");
    expect(done.container.textContent).not.toContain("Ya visto");
    act(() => done.root.unmount());
  });

  it("opens the detail with click and with the keyboard", () => {
    const onOpen = vi.fn();
    const { container, root } = mount(<PathCard {...base} onOpen={onOpen} />);
    const button = container.querySelector("button");
    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const enter = container.querySelector("button");
    act(() => {
      enter?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    act(() => {
      enter?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    });
    expect(onOpen).toHaveBeenCalledTimes(3);
    act(() => root.unmount());
  });

  it("shows the step and marks the first one as the start", () => {
    const start = mount(<PathCard {...base} step={1} onOpen={() => undefined} />);
    expect(start.container.textContent).toContain("1");
    expect(start.container.textContent).toContain("Empieza aquí");
    act(() => start.root.unmount());

    const next = mount(<PathCard {...base} step={2} onOpen={() => undefined} />);
    expect(next.container.textContent).toContain("2");
    expect(next.container.textContent).not.toContain("Empieza aquí");
    act(() => next.root.unmount());
  });

  it("wraps the title on two lines", () => {
    const css = readFileSync(path.resolve("src/path-card.module.css"), "utf8");
    expect(css).toMatch(/-webkit-line-clamp:\s*2/);
    expect(css).not.toMatch(/white-space:\s*nowrap/);
  });
});
