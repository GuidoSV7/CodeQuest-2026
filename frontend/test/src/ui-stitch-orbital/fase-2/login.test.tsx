// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPanel } from "@/features/auth/components/LoginPanel";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("Orbital login surface", () => {
  it("sends login to Discord and offers register", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<LoginPanel returnTo="/mis-rutas" />);
    });

    expect(container.querySelector("h1")?.textContent).toBe(
      "Inicia sesión en tu misión",
    );
    expect(
      container.querySelector("a[href*='/api/auth/discord/start']"),
    ).not.toBeNull();
    expect(container.querySelector("a[href='/registro']")?.textContent).toBe(
      "Crear cuenta",
    );
    expect(container.querySelector("input[type='password']")).toBeNull();

    act(() => root.unmount());
  });

  it("sends register through the same Discord start", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<LoginPanel intent="register" returnTo="/" />);
    });

    expect(container.querySelector("h1")?.textContent).toBe("Creá tu cuenta");
    expect(
      container.querySelector("a[aria-label='Crear cuenta con Discord']"),
    ).not.toBeNull();
    expect(container.querySelector("a[href='/login']")?.textContent).toBe(
      "Ya tengo cuenta",
    );

    act(() => root.unmount());
  });

  it("wires Discord helpers in the panel without local storage", () => {
    const panel = readFrontendFile(
      "src/features/auth/components/LoginPanel.tsx",
    );
    const service = readFrontendFile("src/features/auth/api/auth.service.ts");

    expect(panel).toContain("discordStartUrl");
    expect(panel).not.toContain("localStorage");
    expect(service).toContain("authEntryPath");
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
