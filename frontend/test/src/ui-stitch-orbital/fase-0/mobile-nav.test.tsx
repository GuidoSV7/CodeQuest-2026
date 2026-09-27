// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

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

import { MissionShell } from "@/features/orbital/components/MissionShell";
import { MissionShellMobileNav } from "@/features/orbital/components/MissionShellMobileNav";
import { useAuthStore } from "@/stores/auth-session";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const frontendRoot = resolve(import.meta.dirname, "../../../..");
const PRODUCT_LINKS = [
  { href: "/mis-rutas", label: "Mis rutas" },
  { href: "/configurador-de-ruta", label: "Descubre tu ruta" },
  { href: "/docs/mcp", label: "MCP" },
];

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

function mount(element: React.ReactNode): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  const root = createRoot(container);
  document.body.appendChild(container);

  act(() => {
    root.render(element);
  });

  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("MissionShell mobile nav a11y", () => {
  it("ui.shell.menu_closed: panel destinations are not reachable while closed", () => {
    const { container, root } = mount(
      <MissionShellMobileNav links={PRODUCT_LINKS} />,
    );

    const button = container.querySelector("button[aria-expanded]");
    const panel = container.querySelector("[id]");

    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(panel?.hasAttribute("hidden")).toBe(true);
    expect(container.querySelectorAll("nav[aria-label='Navegación móvil'] a")).toHaveLength(
      3,
    );

    act(() => root.unmount());
  });

  it("ui.shell.menu_open: opens three destinations with visible control state", () => {
    const { container, root } = mount(
      <MissionShellMobileNav links={PRODUCT_LINKS} />,
    );
    const button = container.querySelector("button[aria-expanded]") as HTMLButtonElement;

    act(() => {
      button.click();
    });

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector("[hidden]")).toBeNull();
    expect(container.querySelector("a[href='/mis-rutas']")).not.toBeNull();
    expect(container.querySelector("a[href='/configurador-de-ruta']")).not.toBeNull();
    expect(container.querySelector("a[href='/docs/mcp']")).not.toBeNull();

    act(() => root.unmount());
  });

  it("ui.shell.menu_escape: Escape returns to closed", () => {
    const { container, root } = mount(
      <MissionShellMobileNav links={PRODUCT_LINKS} />,
    );
    const button = container.querySelector("button[aria-expanded]") as HTMLButtonElement;

    act(() => {
      button.click();
    });
    expect(button.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("[hidden]")).not.toBeNull();

    act(() => root.unmount());
  });

  it("ui.shell.menu_not_second_fixed_bar: product shell keeps a single fixed header", () => {
    useAuthStore.setState({ user: null, hydrated: true });
    const css = readFrontendFile(
      "src/features/orbital/components/MissionShell.module.css",
    );
    const { container, root } = mount(
      <MissionShell>
        <main>contenido</main>
      </MissionShell>,
    );

    expect(container.querySelectorAll("header")).toHaveLength(1);
    expect(container.querySelector("a[href='/login']")).not.toBeNull();
    expect(container.querySelector("a[href='/registro']")).not.toBeNull();
    expect(container.querySelector("button[aria-expanded]")).not.toBeNull();
    expect(css).toContain("min-height: 4rem");
    expect(css).toContain("padding-top: 4rem");
    expect(css).toContain("@media (min-width: 48rem)");
    expect(css).toContain("flex-wrap: nowrap");
    expect(css).not.toContain("@media (max-width: 42rem)");
    expect(css).not.toMatch(/\.mobilePanel[\s\S]*position:\s*fixed/);
    expect(css).not.toMatch(/\.mobilePanelOpen[\s\S]*position:\s*fixed/);
    expect(css).toMatch(/\.mobileNav\s*\{[^}]*display:\s*none/s);

    act(() => root.unmount());
  });
});
