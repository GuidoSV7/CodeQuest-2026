// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPanel } from "@/features/auth/components/LoginPanel";
import { useAuthStore } from "@/stores/auth-session";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

afterEach(() => {
  document.body.replaceChildren();
  useAuthStore.setState({ user: null, hydrated: false });
  vi.restoreAllMocks();
});

describe("Orbital login surface", () => {
  it("renders source copy, form labels and the real Discord link", () => {
    useAuthStore.setState({ user: null, hydrated: true });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<LoginPanel returnTo="/mis-rutas" />);
    });

    expect(container.querySelector("section")).not.toBeNull();
    expect(container.querySelector("h1")?.textContent).toBe(
      "Inicia sesión en tu misión",
    );
    expect(container.querySelector("label[for='email']")?.textContent).toBe(
      "Correo electrónico",
    );
    expect(container.querySelector("label[for='password']")?.textContent).toBe(
      "Contraseña",
    );
    expect(container.querySelector("a[href*='/api/auth/discord/start?']")).not.toBeNull();
    expect(container.textContent).toContain("MODO INVITADO DISPONIBLE");
    expect(container.textContent).toContain("Entrar con correo");

    act(() => root.unmount());
  });

  it("does not request auth or persist data from presentation controls", () => {
    useAuthStore.setState({ user: null, hydrated: true });
    const fetchSpy = vi.fn();
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    vi.stubGlobal("fetch", fetchSpy);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<LoginPanel />);
    });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    act(() => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(container.querySelector("input[type='email']")).not.toBeNull();
    expect(container.querySelector("input[type='password']")).not.toBeNull();

    act(() => root.unmount());
  });

  it("exposes loading, anonymous, authenticated and logout states", () => {
    const panel = readFrontendFile(
      "src/features/auth/components/LoginPanel.tsx",
    );

    expect(panel).toContain("!hydrated");
    expect(panel).toContain("if (user)");
    expect(panel).toContain("Continuar con Discord");
    expect(panel).toContain("Cerrar sesión");
    expect(panel).toContain("aria-busy");
    expect(panel).toContain("role=\"alert\"");
  });

  it("keeps the action operable without adding another request path", () => {
    const panel = readFrontendFile(
      "src/features/auth/components/LoginPanel.tsx",
    );
    const service = readFrontendFile("src/features/auth/api/auth.service.ts");

    expect(panel).toContain('href={discordStartUrl(returnTo)}');
    expect(panel).not.toContain("fetch(");
    expect(panel).not.toContain("localStorage");
    expect(service).toContain("discordStartUrl");
  });

  it("uses CSS Modules with responsive controls and visible focus inherited globally", () => {
    const styles = readFrontendFile(
      "src/features/auth/components/LoginPanel.module.css",
    );
    const pageStyles = readFrontendFile("src/app/(acceso)/login/page.module.css");

    expect(styles).toContain("var(--orbital-lime)");
    expect(styles).toContain("@media (max-width: 34rem)");
    expect(pageStyles).toContain(".skipLink");
  });
});
