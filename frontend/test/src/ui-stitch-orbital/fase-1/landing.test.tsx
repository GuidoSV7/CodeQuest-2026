// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { landingFixture } from "@/features/orbital/fixtures";
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

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("Orbital public landing", () => {
  it("renders source copy, landmarks, CTA and six-node radar in the DOM", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<HomePage />);
    });

    expect(container.querySelector("main")).not.toBeNull();
    expect(container.querySelector("h1")?.textContent).toContain(
      "descubre tu ruta de",
    );
    expect(container.querySelector("h1 span")?.textContent).toBe(
      "aprendizaje ideal",
    );
    expect(container.querySelector("h2")?.textContent).toBe(
      "puertas de acceso a la misión",
    );
    expect(container.querySelectorAll("article")).toHaveLength(4);
    expect(container.querySelectorAll("svg circle")).toHaveLength(14);
    expect(container.querySelector("a[href='/configurador-de-ruta']")).not.toBeNull();

    act(() => root.unmount());
  });

  it("keeps the source-backed fixture and accessible radar contract", () => {
    const page = readFrontendFile("src/app/(producto)/page.tsx");
    const radar = readFrontendFile(
      "src/features/orbital/components/MissionRadar.tsx",
    );

    expect(landingFixture.doors).toHaveLength(4);
    expect(page).toContain("landingFixture");
    expect(page).toContain("<MissionRadar />");
    expect(page).toContain("aria-label=\"Puertas de aprendizaje\"");
    expect(page).toContain('href={landingFixture.ctaHref}');
    expect(radar).toContain('role="img"');
    expect(radar).toContain("<title");
    expect(radar).toContain("<desc");
  });

  it("does not add requests or persistent storage to the landing", () => {
    const page = readFrontendFile("src/app/(producto)/page.tsx");
    const radar = readFrontendFile(
      "src/features/orbital/components/MissionRadar.tsx",
    );

    expect(`${page}\n${radar}`).not.toMatch(
      /\b(fetch|axios|localStorage|sessionStorage|useRouter)\b/,
    );
  });

  it("keeps landing styles responsive and motion-optional", () => {
    const styles = readFrontendFile("src/app/(producto)/page.module.css");

    expect(styles).toContain("@media (max-width: 64rem)");
    expect(styles).toContain("@media (max-width: 34rem)");
    expect(styles).toContain("@media (min-width: 48rem)");
    expect(styles).toContain("@media (min-width: 64rem)");
    expect(styles).toContain("var(--orbital-tertiary)");
    expect(styles).not.toContain("tailwind");
  });
});
