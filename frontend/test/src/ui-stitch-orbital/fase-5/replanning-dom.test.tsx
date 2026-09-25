// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { orbitalDemoSessionFixture } from "@/features/orbital/fixtures";
import { ReplanningProposal } from "@/features/learning-paths/components/ReplanningProposal";
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

beforeEach(() => {
  useAuthStore.setState({ user: orbitalDemoSessionFixture, hydrated: true });
});

afterEach(() => {
  document.body.replaceChildren();
  act(() => useAuthStore.setState({ user: null, hydrated: false }));
  vi.restoreAllMocks();
});

describe("literal replanning route", () => {
  it("renders five before/after nodes, reasons and local actions", () => {
    const fetchSpy = vi.fn();
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    vi.stubGlobal("fetch", fetchSpy);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<ReplanningProposal routeId="orbital-route-demo" />);
    });

    expect(container.querySelector("h2")?.textContent).toBe(
      "Propuesta de replanificación",
    );
    expect(container.querySelectorAll("[data-testid='timeline-node']")).toHaveLength(10);
    expect(container.textContent).toContain("Moví 'Docker' al final");
    expect(container.textContent).toContain("Reduje a 4h/semana");
    expect(container.textContent).toContain("Mantener mi ruta actual");
    expect(container.textContent).toContain("Aceptar nueva planificación");
    expect(container.textContent).toContain("No disponible");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
