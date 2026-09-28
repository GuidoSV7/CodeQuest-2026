// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OFFICIAL_PATHS } from "@/config/official-paths";
import HomePage from "@/app/(producto)/page";

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

vi.mock("@/features/auth/components/HomeAuthStatus", () => ({
  HomeAuthStatus: () => null,
}));

const frontendRoot = resolve(import.meta.dirname, "../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

const INVENTED_FIGURES = /38 rutas|100%|~4 minutos|riasec\.dev|0% spam|cero deuda técnica|fernando herrera/i;

afterEach(() => {
  document.body.replaceChildren();
});

describe("landing without invented figures", () => {
  it("renders no invented claim and derives the official route count", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<HomePage />);
    });

    expect(container.textContent).not.toMatch(INVENTED_FIGURES);
    const label = Array.from(container.querySelectorAll("span")).find(
      (span) => span.textContent === "Rutas oficiales",
    );
    expect(label?.parentElement?.querySelector("strong")?.textContent).toBe(
      String(OFFICIAL_PATHS.length),
    );

    act(() => root.unmount());
  });

  it("keeps the sources free of invented figures and literal counts", () => {
    const page = readFrontendFile("src/app/(producto)/page.tsx");
    const fixture = readFrontendFile("src/features/orbital/fixtures/landing.fixture.ts");

    expect(page).not.toMatch(INVENTED_FIGURES);
    expect(fixture).not.toMatch(INVENTED_FIGURES);
    expect(page).toContain("OFFICIAL_PATHS.length");
    expect(page).not.toMatch(/\b13\s+rutas/i);
    expect(fixture).not.toMatch(/\b13\s+rutas/i);
  });

  it("lets visitors select landing text", () => {
    expect(readFrontendFile("src/app/(producto)/page.module.css")).not.toContain("user-select: none");
  });
});
