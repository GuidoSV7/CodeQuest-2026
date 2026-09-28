// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BRAND_ASSETS } from "@/config/brand-assets";
import { orbitalDemoSessionFixture } from "@/features/orbital/fixtures";
import { useAuthStore } from "@/stores/auth-session";

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

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { LearningPathsDashboard } from "@/features/learning-paths/components/LearningPathsDashboard";
import { MissionShell } from "@/features/orbital/components/MissionShell";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(element: React.ReactNode): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  const root = createRoot(container);
  document.body.appendChild(container);

  act(() => {
    root.render(element);
  });

  return { container, root };
}

function expectIsologo(scope: Element | null | undefined): void {
  const mark = scope?.querySelector(`img[src="${BRAND_ASSETS.isologo}"]`);

  expect(mark).not.toBeNull();
  expect(mark?.getAttribute("alt")).toBe("");
  expect(mark?.getAttribute("width")).not.toBeNull();
  expect(mark?.getAttribute("height")).not.toBeNull();
}

function restoreEnvironment(): void {
  vi.unstubAllEnvs();
  useAuthStore.setState({ user: null, hydrated: false });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_ORBITAL_DEMO_SESSION", "1");
});

afterEach(() => {
  document.body.replaceChildren();
  restoreEnvironment();
  vi.restoreAllMocks();
});

describe("Orbital DOM foundation", () => {
  it("renders the DevTalles product shell without a demo banner", () => {
    useAuthStore.setState({ user: null, hydrated: true });
    const { container, root } = mount(
      <MissionShell>
        <main id="screen-content">Contenido de prueba</main>
      </MissionShell>,
    );

    expect(container.querySelector("header")).not.toBeNull();
    expect(container.querySelector("nav[aria-label='Navegación principal']")).not.toBeNull();
    expect(container.querySelector("main#screen-content")).not.toBeNull();
    expect(container.querySelector("a[href='/mis-rutas']")).not.toBeNull();
    expect(container.querySelector("a[href='/configurador-de-ruta']")).not.toBeNull();
    expect(container.querySelector("a[href='/docs/mcp']")).not.toBeNull();
    expect(container.querySelector("a[href='/ajustes/tokens']")).toBeNull();
    expect(container.querySelector("a[href='/login']")?.textContent).toBe("Entrar");
    expect(container.querySelectorAll("header a[href='/registro']")).toHaveLength(0);
    expect(container.querySelector("footer")).not.toBeNull();
    expect(container.textContent).toContain("DevTalles");
    const footer = container.querySelector("footer");
    expect(footer?.textContent).toContain("DevTalles");
    expect(container.textContent).not.toMatch(/code\s*quest/i);
    expect(footer?.textContent).not.toContain("•");
    expectIsologo(container.querySelector("a[aria-label='DevTalles, inicio']"));
    expectIsologo(footer);
    expect(container.querySelector("aside[aria-label='Modo demo']")).toBeNull();

    act(() => root.unmount());
  });

  it("offers the minimal login shell variant", () => {
    useAuthStore.setState({ user: null, hydrated: true });
    const { container, root } = mount(
      <MissionShell variant="login">
        <main id="login-content">Contenido de acceso</main>
      </MissionShell>,
    );

    expect(container.querySelector("nav[aria-label='Navegación principal']")).not.toBeNull();
    expect(container.querySelector("a[href='/login']")?.textContent).toBe("Entrar");
    expect(container.querySelectorAll("header a[href='/registro']")).toHaveLength(0);
    expect(container.querySelector("button[aria-controls]")).not.toBeNull();
    expect(container.querySelector("footer")).not.toBeNull();
    const footer = container.querySelector("footer");
    expect(footer?.textContent).toContain("DevTalles");
    expect(container.textContent).not.toMatch(/code\s*quest/i);
    expect(footer?.textContent).not.toContain("•");
    expectIsologo(container.querySelector("a[aria-label='DevTalles, inicio']"));
    expect(footer?.querySelector("img")).toBeNull();

    act(() => root.unmount());
  });

  it("renders two route cards, accessible gauges and no request/storage side effects", async () => {
    useAuthStore.setState({
      user: orbitalDemoSessionFixture,
      hydrated: true,
    });
    const fetchSpy = vi.fn(() => Promise.reject(new Error("network blocked")));
    vi.stubGlobal("fetch", fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");

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
    expect(container.textContent).toContain("Frontend con React");
    expect(container.querySelectorAll("svg[role='img']")).toHaveLength(2);
    expect(container.querySelector("[aria-label='Progreso de Backend con Nest: 34%']")).not.toBeNull();
    expect(container.querySelector("[aria-label='Progreso de Frontend con React: 0%']")).not.toBeNull();
    expect(container.textContent).not.toContain("Siguiente maniobra");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
