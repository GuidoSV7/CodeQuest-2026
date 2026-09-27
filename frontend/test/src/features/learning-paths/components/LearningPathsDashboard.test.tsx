// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LearningPathsDashboard } from "@/features/learning-paths/components/LearningPathsDashboard";
import type { MyRouteSummary } from "@/features/learning-paths/lib/load-my-routes";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const saved: MyRouteSummary = {
  id: "path-1",
  title: "Ruta .NET / C#",
  itemCount: 3,
  completedCount: 1,
  progressRatio: 1 / 3,
};

function mount(load: () => Promise<MyRouteSummary[]>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<LearningPathsDashboard load={load} />);
  });
  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("LearningPathsDashboard", () => {
  it("shows the saved route title and progress instead of the demo card", async () => {
    const { container, root } = mount(async () => [saved]);
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Ruta .NET / C#");
    expect(container.textContent).toContain("33%");
    expect(container.textContent).toContain("1 de 3 cursos");
    expect(container.textContent).not.toContain("Backend con Nest");
    expect(container.textContent).not.toContain("Etapa 02");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/mis-rutas/path-1");

    act(() => root.unmount());
  });
});
