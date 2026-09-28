// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { discordStartUrl } from "@/features/auth/api/auth.service";
import { LearningPathsDashboard } from "@/features/learning-paths/components/LearningPathsDashboard";
import type { MyRouteSummary } from "@/features/learning-paths/lib/load-my-routes";

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

const saved: MyRouteSummary = {
  id: "path-1",
  title: "Ruta .NET / C#",
  itemCount: 3,
  completedCount: 1,
  progressRatio: 1 / 3,
  sourceCatalogPathId: "ruta-c",
};

function mount(load: () => Promise<MyRouteSummary[]>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<LearningPathsDashboard load={load} />);
  });
  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("LearningPathsDashboard", () => {
  it("shows the saved route title and progress instead of the demo card", async () => {
    const { container, root } = mount(async () => [saved]);
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Ruta .NET / C#");
    expect(container.textContent).toContain("33%");
    expect(container.textContent).toContain("1 de 3 cursos");
    expect(container.textContent).not.toContain("Backend con Nest");
    expect(container.textContent).not.toContain("Etapa 02");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/mis-rutas/path-1");

    act(() => root.unmount());
  });

  it("shows the stack icon of an official route next to its title", async () => {
    const { container, root } = mount(async () => [saved]);
    await act(async () => {
      await Promise.resolve();
    });

    const icon = container.querySelector("article img[src='/devtalles-tech/csharp.svg']");
    expect(icon?.getAttribute("alt")).toBe("");

    act(() => root.unmount());
  });

  it("shows no stack icon for a route without official path", async () => {
    const { container, root } = mount(async () => [{ ...saved, sourceCatalogPathId: null }]);
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector("article img")).toBeNull();

    act(() => root.unmount());
  });

  it.each([
    ["network error", new Error("Network Error")],
    ["503", Object.assign(new Error("http"), { codigoEstado: 503, cuerpo: { statusCode: 503 } })],
  ])("shows an alert with retry when loading fails (%s)", async (_label, failure) => {
    let pending: (() => void) | undefined;
    const load = vi
      .fn<() => Promise<MyRouteSummary[]>>()
      .mockRejectedValueOnce(failure)
      .mockImplementationOnce(
        () => new Promise<MyRouteSummary[]>((resolve) => {
          pending = () => resolve([saved]);
        }),
      );
    const { container, root } = mount(load);
    await act(async () => {
      await Promise.resolve();
    });

    const alert = container.querySelector("[role='alert']");
    expect(alert?.textContent).toContain("No pudimos cargar tus rutas");
    const retry = findButton(container, "Reintentar");
    expect(retry).toBeDefined();

    act(() => {
      retry?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(load).toHaveBeenCalledTimes(2);
    expect(enabledRetry(container)).toBeUndefined();

    await act(async () => {
      pending?.();
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Ruta .NET / C#");

    act(() => root.unmount());
  });

  it("shows a sign-in state without alert or retry when loading returns 401", async () => {
    const { container, root } = mount(() => Promise.reject(unauthorized()));
    await act(async () => {
      await Promise.resolve();
    });

    const section = container.querySelector("section[aria-labelledby='session-required-title']");
    expect(section?.querySelector("h2#session-required-title")?.textContent).toBe(
      "Entrá para ver tus rutas",
    );
    expect(section?.querySelector("p")?.textContent).toBe(
      "Iniciá sesión con Discord y volvés directo a esta pantalla.",
    );
    const signIn = Array.from(container.querySelectorAll("a")).find(
      (link) => link.textContent === "Entrar",
    );
    expect(signIn?.getAttribute("href")).toBe(discordStartUrl("/mis-rutas"));
    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(findButton(container, "Reintentar")).toBeUndefined();

    act(() => root.unmount());
  });

  it("shows the empty state without alert or sign-in when there are no routes", async () => {
    const { container, root } = mount(async () => []);
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(
      Array.from(container.querySelectorAll("a")).some((link) => link.textContent === "Entrar"),
    ).toBe(false);
    expect(container.querySelector("section[aria-labelledby='session-required-title']")).toBeNull();

    act(() => root.unmount());
  });

  it("moves to the sign-in state when the retry returns 401", async () => {
    const load = vi
      .fn<() => Promise<MyRouteSummary[]>>()
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockRejectedValueOnce(unauthorized());
    const { container, root } = mount(load);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector("[role='alert']")).not.toBeNull();

    await act(async () => {
      findButton(container, "Reintentar")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(load).toHaveBeenCalledTimes(2);
    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(container.querySelector("section[aria-labelledby='session-required-title']")).not.toBeNull();

    act(() => root.unmount());
  });
});

function unauthorized(): Error {
  return Object.assign(new Error("Unauthorized"), {
    codigoEstado: 401,
    cuerpo: { statusCode: 401, code: "UNAUTHORIZED", message: "Unauthorized" },
  });
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(label),
  );
}

function enabledRetry(container: HTMLElement): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.startsWith("Reintent") && !button.disabled,
  );
}
