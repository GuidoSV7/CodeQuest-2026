// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    expect(container.querySelector("a[href='/ajustes/tokens']")).not.toBeNull();
    expect(container.querySelector("a[href='/login']")?.textContent).toBe("Login");
    expect(container.querySelector("a[href='/registro']")?.textContent).toBe("Register");
    expect(container.querySelector("footer")).not.toBeNull();
    expect(container.textContent).toContain("DevTalles");
    expect(container.querySelector("aside[aria-label='Modo demo']")).toBeNull();

    act(() => root.unmount());
  });

  it("offers the minimal login shell variant", () => {
    const { container, root } = mount(
      <MissionShell variant="login">
        <main id="login-content">Contenido de acceso</main>
      </MissionShell>,
    );

    expect(container.querySelector("nav[aria-label='Navegación principal']")).not.toBeNull();
    expect(container.querySelector("a[href='/login']")?.textContent).toBe("Login");
    expect(container.querySelector("a[href='/registro']")?.textContent).toBe("Register");
    expect(container.querySelector("footer")).not.toBeNull();
    expect(container.textContent).toContain("DevTalles");
    expect(container.textContent).toContain("Code Quest 2026");

    act(() => root.unmount());
  });

  it("renders two route cards, accessible gauges and no request/storage side effects", () => {
    useAuthStore.setState({
      user: orbitalDemoSessionFixture,
      hydrated: true,
    });
    const fetchSpy = vi.fn(() => Promise.reject(new Error("network blocked")));
    vi.stubGlobal("fetch", fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");

    const { container, root } = mount(<LearningPathsDashboard />);

    expect(container.querySelectorAll("article")).toHaveLength(2);
    expect(container.textContent).toContain("Backend con Nest");
    expect(container.textContent).toContain("Frontend con React");
    expect(container.querySelectorAll("svg[role='img']")).toHaveLength(2);
    expect(container.querySelector("[aria-label='Progreso de Backend con Nest: 34%']")).not.toBeNull();
    expect(container.querySelector("[aria-label='Progreso de Frontend con React: 0%']")).not.toBeNull();
    expect(container.textContent).toContain("Siguiente maniobra");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
