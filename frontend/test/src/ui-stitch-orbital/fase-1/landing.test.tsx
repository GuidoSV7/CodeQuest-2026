// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OFFICIAL_PATHS, officialPathIconSrc } from "@/config/official-paths";
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

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

function renderLanding(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<HomePage />);
  });

  return { container, root };
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
      "Descubrí tu ruta de",
    );
    expect(container.querySelector("h1 span")?.textContent).toBe(
      "aprendizaje ideal",
    );
    expect(container.querySelector("h2")?.textContent).toBe(
      "Elegí desde dónde arrancás",
    );
    expect(container.querySelectorAll("article")).toHaveLength(4);
    expect(container.querySelectorAll("svg circle").length).toBeGreaterThan(4);
    expect(container.querySelector("a[href='/configurador-de-ruta']")).not.toBeNull();
    const crew = Array.from(
      container.querySelectorAll("[aria-labelledby='crew-title'] li"),
    ).map((item) => item.textContent);
    expect(container.querySelector("#crew-title")?.textContent).toBe("Desarrolladores");
    expect(crew).toEqual([
      "Guido Salazar VargasFront/BackGitHubLinkedIn",
      "Jose Alejandro Sahonero SalasFrontGitHub",
      "Marco David Toledo CannaFront/BackGitHubLinkedInPortafolio",
    ]);
    expect(container.querySelector("a[href='https://github.com/GuidoSalazarV7']")).toBeNull();
    expect(container.querySelector("[aria-labelledby='crew-title'] [aria-disabled='true']")).not.toBeNull();
    const portraits = Array.from(
      container.querySelectorAll("[aria-labelledby='crew-title'] img"),
    );
    expect(portraits.map((photo) => photo.getAttribute("alt"))).toEqual([
      "Vista previa de Guido Salazar Vargas",
      "Vista previa de Jose Alejandro Sahonero Salas",
      "Vista previa de Marco David Toledo Canna",
    ]);

    act(() => root.unmount());
  });

  it("keeps the source-backed fixture and accessible radar contract", () => {
    const page = readFrontendFile("src/app/(producto)/page.tsx");
    const radar = readFrontendFile(
      "src/features/orbital/components/MissionRadar.tsx",
    );

    expect(landingFixture.doors).toHaveLength(4);
    expect(page).toContain("landingFixture");
    expect(page).toContain("<MissionRadarLive />");
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

  it("shows the stack icon of each door path and none for the unknown door", () => {
    const { container, root } = renderLanding();

    const articles = Array.from(container.querySelectorAll("[aria-label='Puertas de aprendizaje'] article"));
    landingFixture.doors.forEach((door, index) => {
      const icon = articles[index]?.querySelector("img");
      if (door.stackPathId === null) {
        expect(icon, door.id).toBeNull();
        return;
      }
      expect(icon?.getAttribute("src"), door.id).toBe(officialPathIconSrc(door.stackPathId));
      expect(icon?.getAttribute("alt"), door.id).toBe("");
    });

    act(() => root.unmount());
  });

  it("lists one labelled icon per official path in the hero strip", () => {
    const { container, root } = renderLanding();

    const strip = container.querySelector("ul[aria-label='Tecnologías de las rutas oficiales']");
    const icons = Array.from(strip?.querySelectorAll("img") ?? []);
    expect(icons).toHaveLength(OFFICIAL_PATHS.length);
    expect(icons.map((icon) => icon.getAttribute("alt"))).toEqual(OFFICIAL_PATHS.map((path) => path.label));

    act(() => root.unmount());
  });

  it("wraps the stack strip instead of scrolling horizontally", () => {
    const styles = readFrontendFile("src/app/(producto)/page.module.css");
    const stackStrip = styles.match(/\.stackStrip\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(stackStrip).toContain("flex-wrap: wrap");
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
