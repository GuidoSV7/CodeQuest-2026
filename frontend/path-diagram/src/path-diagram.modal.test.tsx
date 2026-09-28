// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagramModel } from "./model";
import { PathDiagram } from "./path-diagram";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

const model: DiagramModel = {
  title: "C#",
  pathId: "path-1",
  allowProgress: false,
  edges: [],
  items: [
    {
      courseId: "csharp",
      title: "C#: Empieza tu camino en el lenguaje",
      url: "https://cursos.devtalles.com/courses/csharp",
      bucket: "recommended",
      position: 0,
      alreadyKnown: false,
      partial: false,
      completed: false,
      category: null,
      lessonCount: 40,
      videoHours: 12,
      detail: {
        description: "Primeros pasos en el lenguaje",
        instructor: "Fernando Herrera",
        lessonCount: 40,
        videoHours: 12,
        previewYoutubeId: "abc123XYZ",
        coverImageUrl: null,
        prerequisites: ["Conocimientos básicos de programación"],
        tags: ["bases", "backend"],
        sections: [{ title: "Fundamentos", lessons: ["Variables"] }],
        url: "https://cursos.devtalles.com/courses/csharp",
      },
    },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("PathDiagram course modal", () => {
  it("opens topics, tags and the intro video when a card is clicked", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<PathDiagram model={model} mode="web" width={429} />);
    });

    const card = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("C#:"),
    );
    act(() => {
      card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dialog = container.querySelector("[role='dialog']");
    expect(dialog?.textContent).toContain("Fundamentos");
    expect(dialog?.textContent).toContain("Variables");
    expect(dialog?.textContent).toContain("bases");
    expect(dialog?.textContent).toContain("Video de introducción");
    const frame = dialog?.querySelector("iframe");
    expect(frame?.getAttribute("src")).toBe("https://www.youtube-nocookie.com/embed/abc123XYZ");
    expect(frame?.getAttribute("title")).toBe("Video de introducción");

    act(() => root.unmount());
  });

  it("loads the scraped course card when the path did not include it", async () => {
    const bare = {
      ...model,
      items: [{ ...model.items[0], lessonCount: null, videoHours: null, detail: null }],
    };
    const loadCourse = vi.fn(async () => ({
      description: "API REST en .NET",
      instructor: "Teddy Paz",
      lessonCount: 159,
      videoHours: 11,
      previewYoutubeId: "lcHU71CyUyw",
      coverImageUrl: null,
      prerequisites: ["Conocimientos básicos de programación"],
      tags: ["backend"],
      sections: [{ title: "Sección 1: Introduction", lessons: ["Bienvenido al curso .Net Backend"] }],
      url: "https://cursos.devtalles.com/courses/NET-Backend",
      price: { amount: 60, currency: "USD" as const },
      related: [{ title: "C#: Empieza tu camino", url: "https://cursos.devtalles.com/courses/csharp" }],
    }));
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<PathDiagram model={bare} mode="web" width={429} loadCourse={loadCourse} />);
    });
    const card = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("C#:"),
    );
    await act(async () => {
      card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    const dialog = container.querySelector("[role='dialog']");
    expect(loadCourse).toHaveBeenCalledWith("csharp");
    expect(dialog?.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/lcHU71CyUyw",
    );
    expect(dialog?.textContent).toContain("Teddy Paz");
    expect(dialog?.textContent).toContain("Sección 1: Introduction");
    expect(dialog?.textContent).toContain("Bienvenido al curso .Net Backend");
    expect(dialog?.textContent).toContain("Conocimientos básicos de programación");
    expect(dialog?.textContent).toContain("159 lecciones");
    expect(dialog?.textContent).toContain("11 horas");
    expect(dialog?.textContent).toContain("60 USD");
    expect(dialog?.textContent).toContain("C#: Empieza tu camino");
    act(() => root.unmount());
  });

  it("shows only a short preview of a long course description", () => {
    const long =
      "¡Te damos la bienvenida al inicio de una emocionante aventura en el mundo del desarrollo con C#! Este curso ha sido diseñado especialmente para acompañarte paso a paso desde cero hasta escribir tus primeros programas.";
    const verbose = {
      ...model,
      items: [
        {
          ...model.items[0],
          detail: { ...model.items[0].detail!, description: long },
        },
      ],
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<PathDiagram model={verbose} mode="web" width={429} />);
    });
    const card = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("C#:"),
    );
    act(() => {
      card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const preview = container.querySelector("[data-course-description]");
    expect(preview?.textContent?.startsWith("¡Te damos la bienvenida")).toBe(true);
    expect(preview?.textContent?.endsWith("…")).toBe(true);
    expect(preview?.textContent).not.toContain("primeros programas");
    act(() => root.unmount());
  });

  const COVER_URL = "https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg";

  function withCover(coverImageUrl: string | null): DiagramModel {
    return {
      ...model,
      items: [{ ...model.items[0], detail: { ...model.items[0].detail!, coverImageUrl } }],
    };
  }

  function openModal(diagram: DiagramModel, mode: "web" | "mcp") {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<PathDiagram model={diagram} mode={mode} width={429} />);
    });
    const card = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("C#:"),
    );
    act(() => {
      card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const dialog = container.querySelector("[role='dialog']");
    return { root, dialog };
  }

  it("shows the course cover when the card has one", () => {
    const { root, dialog } = openModal(withCover(COVER_URL), "web");
    const cover = dialog?.querySelector("img");
    expect(cover?.getAttribute("src")).toBe(COVER_URL);
    expect(cover?.getAttribute("alt")).toBe("");
    expect(cover?.getAttribute("width")).toBe("640");
    expect(cover?.getAttribute("height")).toBe("360");
    expect(cover?.getAttribute("loading")).toBe("lazy");
    expect(cover?.getAttribute("referrerpolicy")).toBe("no-referrer");
    act(() => root.unmount());
  });

  it("renders no cover block without an image", () => {
    const { root, dialog } = openModal(withCover(null), "web");
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelector("img")).toBeNull();
    act(() => root.unmount());
  });

  it("hides the cover when it fails to load", () => {
    const { root, dialog } = openModal(withCover(COVER_URL), "web");
    const cover = dialog?.querySelector("img");
    expect(cover).not.toBeNull();
    act(() => {
      cover?.dispatchEvent(new Event("error"));
    });
    expect(dialog?.querySelector("img")).toBeNull();
    act(() => root.unmount());
  });

  it("never renders the cover in mcp mode", () => {
    const { root, dialog } = openModal(withCover(COVER_URL), "mcp");
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelector("img")).toBeNull();
    act(() => root.unmount());
  });
});
