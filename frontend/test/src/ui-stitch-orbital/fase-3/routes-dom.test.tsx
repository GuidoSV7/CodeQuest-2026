// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { orbitalDemoSessionFixture } from "@/features/orbital/fixtures";
import { LearningPathsDashboard } from "@/features/learning-paths/components/LearningPathsDashboard";
import { LearningPathsEmptyState } from "@/features/learning-paths/components/LearningPathsEmptyState";
import { RouteDetail } from "@/features/learning-paths/components/RouteDetail";
import { useAuthStore } from "@/stores/auth-session";

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

function mount(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, root };
}

beforeEach(() => {
  useAuthStore.setState({ user: orbitalDemoSessionFixture, hydrated: true });
});

afterEach(() => {
  document.body.replaceChildren();
  act(() => useAuthStore.setState({ user: null, hydrated: false }));
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("literal learning-path routes", () => {
  it("renders the two source dashboard cards and telemetry without side effects", async () => {
    const fetchSpy = vi.fn();
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    vi.stubGlobal("fetch", fetchSpy);
    const { container, root } = mount(
      <LearningPathsDashboard
        load={async () => [
          { id: "nest", title: "Backend con Nest", itemCount: 10, completedCount: 3, progressRatio: 0.34, sourceCatalogPathId: null },
          { id: "react", title: "Frontend con React", itemCount: 4, completedCount: 0, progressRatio: 0, sourceCatalogPathId: null },
        ]}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelectorAll("article")).toHaveLength(2);
    expect(container.textContent).toContain("Backend con Nest");
    expect(container.textContent).toContain("34%");
    expect(container.textContent).toContain("3 de 10 cursos");
    expect(container.textContent).toContain("Frontend con React");
    expect(container.textContent).toContain("0 de 4 cursos");
    expect(container.textContent).toContain("Continuar donde quedé");
    expect(container.textContent).not.toContain("Etapa 02");
    expect(container.textContent).not.toContain("HORAS:");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it("renders the source empty state from the same route surface", () => {
    const { container, root } = mount(<LearningPathsEmptyState />);

    expect(container.querySelector("h2")?.textContent).toBe("Todavía no tenés rutas");
    const mascot = container.querySelector('img[src$="devi-hello.svg"]');
    expect(mascot).not.toBeNull();
    expect(mascot?.getAttribute("alt")).toBe("");
    expect(mascot?.getAttribute("width")).not.toBeNull();
    expect(mascot?.getAttribute("height")).not.toBeNull();
    expect(container.querySelector("a[href='/configurador-de-ruta']")).not.toBeNull();
    expect(container.textContent).toContain("Elegí una ruta oficial o pedile a tu IA que arme una.");

    act(() => root.unmount());
  });

  it("renders route detail alert, timeline and local telemetry transition", () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { container, root } = mount(<RouteDetail routeId="orbital-route-demo" />);

    expect(container.textContent).toContain("Te atrasaste 4 días");
    expect(container.textContent).toContain("backend con nest");
    expect(container.textContent).toContain("Horas totales");
    expect(container.textContent).toContain("git y github desde cero");
    expect(container.textContent).toContain("typescript");

    const completeButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Marcar sección completada"),
    );
    expect(completeButton).not.toBeUndefined();
    act(() => completeButton?.click());
    expect(container.textContent).toContain("REGISTRANDO TELEMETRÍA");
    act(() => vi.advanceTimersByTime(800));
    expect(container.textContent).toContain("SECCIÓN CONFIRMADA ✓");
    expect(fetchSpy).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
