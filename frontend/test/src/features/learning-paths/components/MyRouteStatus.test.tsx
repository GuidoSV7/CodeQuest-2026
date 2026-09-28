// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OFFICIAL_PATHS } from "@/config/official-paths";
import { discordStartUrl } from "@/features/auth/api/auth.service";
import { MyRouteStatus } from "@/features/learning-paths/components/MyRouteStatus";
import type { MyRouteSummary } from "@/features/learning-paths/lib/load-my-routes";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("MyRouteStatus", () => {
  it("shows an empty message when the account has no routes", async () => {
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Todavía no creaste ninguna ruta.");
    act(() => root.unmount());
  });

  it("lists the route titles when the account has routes", async () => {
    const { container, root } = mount(
      <MyRouteStatus
        loadRoutes={async () => [
          { id: "path-1", title: "Ruta de Nest", itemCount: 2, completedCount: 0, progressRatio: 0, sourceCatalogPathId: "programas-nest" },
        ]}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Ruta de Nest");
    expect(container.textContent).not.toContain("Todavía no creaste ninguna ruta.");
    act(() => root.unmount());
  });

  it("adds a route when the live channel reports one", async () => {
    let notify: ((route: MyRouteSummary) => void) | undefined;
    const { container, root } = mount(
      <MyRouteStatus
        loadRoutes={async () => []}
        subscribe={(onCreated) => {
          notify = onCreated;
          return () => undefined;
        }}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Todavía no creaste ninguna ruta.");
    await act(async () => {
      notify?.({ id: "path-live", title: "Ruta desde Claude", itemCount: 0, completedCount: 0, progressRatio: 0, sourceCatalogPathId: null });
    });
    expect(container.textContent).toContain("Ruta desde Claude");
    expect(container.textContent).not.toContain("Todavía no creaste ninguna ruta.");
    act(() => root.unmount());
  });

  it("creates an official route from the form answers", async () => {
    const created = { id: "path-new", title: "Ruta React", itemCount: 4, completedCount: 0, progressRatio: 0, sourceCatalogPathId: "programas-react" };
    const createOfficial = vi.fn(async () => created);
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} createOfficial={createOfficial} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const formButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Quiero hacerlo por un formulario"),
    );
    act(() => {
      formButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const form = container.querySelector("form");
    const opener = form?.querySelector("button[aria-haspopup='listbox']");
    act(() => {
      opener?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const options = Array.from(form?.querySelectorAll("[role='option']") ?? []);
    expect(options).toHaveLength(13);
    for (const option of options) {
      const icon = option.querySelector("img[src^='/devtalles-tech/']");
      expect(icon?.getAttribute("alt")).toBe("");
    }
    const react = options.find((button) =>
      button.textContent === "React",
    );
    act(() => {
      react?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(createOfficial).toHaveBeenCalledWith({ catalogPathId: "programas-react", title: "Ruta React" });
    expect(container.textContent).toContain("Ruta React");
    expect(container.querySelector("select")).toBeNull();
    expect(container.textContent).not.toContain("Nombre de la ruta");
    act(() => root.unmount());
  });

  it("opens the MCP explanation with a docs link to copy and no video placeholder", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { container, root } = mount(<MyRouteStatus loadRoutes={async () => []} />);
    await act(async () => {
      await Promise.resolve();
    });

    const mcpButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Quiero hacerlo por MCP"),
    );
    act(() => {
      mcpButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dialog = container.querySelector("[role='dialog']");
    expect(dialog?.textContent).not.toContain("El video va acá");
    expect(dialog?.textContent).toContain("Copiá y pegá esto en tu IA para conectarte");
    expect(dialog?.textContent).toContain("/docs/mcp");
    const copy = dialog?.querySelector("button[aria-label='Copiar']");
    await act(async () => {
      copy?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/docs/mcp"));
    act(() => root.unmount());
    vi.unstubAllGlobals();
  });

  it("shows an alert when the routes cannot be loaded", async () => {
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={() => Promise.reject(new Error("Network Error"))} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector("[role='alert']")?.textContent).toContain(
      "No pudimos cargar tus rutas",
    );
    act(() => root.unmount());
  });

  it("tells the user the route could not be created when the submit fails", async () => {
    const createOfficial = vi.fn(() => Promise.reject(new Error("Network Error")));
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} createOfficial={createOfficial} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    await submitDefaultForm(container);

    expect(createOfficial).toHaveBeenCalledTimes(1);
    expect(container.querySelector("form [role='alert']")?.textContent).toContain(
      "No se pudo crear la ruta",
    );
    act(() => root.unmount());
  });

  it("asks to sign in when creating the route returns 401", async () => {
    const createOfficial = vi.fn(() => Promise.reject(unauthorized()));
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} createOfficial={createOfficial} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    await submitDefaultForm(container);

    const feedback = container.querySelector("form [role='alert']");
    expect(feedback?.textContent).toContain("Tu sesión no está activa. Entrá para crear la ruta.");
    expect(feedback?.querySelector("a")?.textContent).toBe("Entrar");
    expect(feedback?.querySelector("a")?.getAttribute("href")).toBe(
      discordStartUrl("/configurador-de-ruta"),
    );
    act(() => root.unmount());
  });

  it("explains that the catalog is not ready when creating returns 503 CATALOG_UNAVAILABLE", async () => {
    const createOfficial = vi.fn(() => Promise.reject(httpError(503, "CATALOG_UNAVAILABLE")));
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} createOfficial={createOfficial} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    await submitDefaultForm(container);

    expect(container.querySelector("form [role='alert']")?.textContent).toBe(
      "El catálogo todavía no está listo en el servidor. Probá de nuevo en unos minutos.",
    );
    act(() => root.unmount());
  });

  it.each([
    ["503 without code", httpError(503)],
    ["422", httpError(422, "INVALID")],
    ["400", httpError(400, "BAD_REQUEST")],
    ["network error", new Error("Network Error")],
  ])("shows the generic create failure (%s)", async (_label, failure) => {
    const createOfficial = vi.fn(() => Promise.reject(failure));
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} createOfficial={createOfficial} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    await submitDefaultForm(container);

    expect(container.querySelector("form [role='alert']")?.textContent).toBe(
      "No se pudo crear la ruta.",
    );
    act(() => root.unmount());
  });

  it("clears the create feedback and adds the route when a retry succeeds", async () => {
    const created = { id: "path-ok", title: "Ruta Fundamentos", itemCount: 3, completedCount: 0, progressRatio: 0, sourceCatalogPathId: "programas-fundamentos" };
    const createOfficial = vi
      .fn<(input: { catalogPathId: string; title: string }) => Promise<MyRouteSummary>>()
      .mockRejectedValueOnce(httpError(422, "INVALID"))
      .mockResolvedValueOnce(created);
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} createOfficial={createOfficial} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    await submitDefaultForm(container);
    expect(container.querySelector("form [role='alert']")).not.toBeNull();

    await act(async () => {
      container.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(createOfficial).toHaveBeenCalledTimes(2);
    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(container.textContent).toContain("Ruta Fundamentos");
    act(() => root.unmount());
  });

  it("shows a sign-in notice without alert or retry when loading returns 401", async () => {
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={() => Promise.reject(unauthorized())} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Entrá para ver y guardar tus rutas.");
    const signIn = Array.from(container.querySelectorAll("a")).find(
      (link) => link.textContent === "Entrar",
    );
    expect(signIn?.getAttribute("href")).toBe(discordStartUrl("/configurador-de-ruta"));
    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(findButton(container, "Reintentar")).toBeUndefined();
    act(() => root.unmount());
  });

  it.each([
    ["network error", new Error("Network Error")],
    ["500", httpError(500)],
    ["422", httpError(422)],
  ])("offers a retry when loading fails (%s)", async (_label, failure) => {
    let finish: (() => void) | undefined;
    const loadRoutes = vi
      .fn<() => Promise<MyRouteSummary[]>>()
      .mockRejectedValueOnce(failure)
      .mockImplementationOnce(
        () => new Promise<MyRouteSummary[]>((resolve) => {
          finish = () => resolve([]);
        }),
      );
    const { container, root } = mount(<MyRouteStatus loadRoutes={loadRoutes} />);
    await act(async () => {
      await Promise.resolve();
    });

    const alert = container.querySelector("[role='alert']");
    expect(alert?.textContent).toContain("No pudimos cargar tus rutas");
    const retry = findButton(container, "Reintentar");
    expect(retry?.disabled).toBe(false);

    act(() => {
      retry?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(loadRoutes).toHaveBeenCalledTimes(2);
    const pending = findButton(container, "Reintentando…");
    expect(pending?.disabled).toBe(true);

    await act(async () => {
      finish?.();
      await Promise.resolve();
    });
    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(container.textContent).toContain("Todavía no creaste ninguna ruta.");
    act(() => root.unmount());
  });

  it("keeps the form choices visible while the routes failed to load", async () => {
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={() => Promise.reject(unauthorized())} />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(findButton(container, "Quiero hacerlo por un formulario")).toBeDefined();
    expect(findButton(container, "Quiero hacerlo por MCP")).toBeDefined();
    act(() => root.unmount());
  });

  it("opens the form with the path preselected from the deep link props", async () => {
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} initialPanel="form" initialPathId="programas-react" />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const trigger = container.querySelector("form button[aria-haspopup='listbox']");
    expect(trigger?.textContent).toBe("React");
    act(() => root.unmount());
  });

  it("shows a chevron and a visible hint on the path picker", async () => {
    const { container, root } = mount(
      <MyRouteStatus loadRoutes={async () => []} initialPanel="form" />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const trigger = container.querySelector("form button[aria-haspopup='listbox']");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(trigger?.getAttribute("aria-describedby")).toBe("path-choice-hint");
    const hint = container.querySelector("#path-choice-hint");
    expect(hint?.textContent).toContain(String(OFFICIAL_PATHS.length));

    act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    act(() => root.unmount());
  });

  it("does not hardcode the path count nor hand-drawn svg in the picker", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../../../src/features/learning-paths/components/MyRouteStatus.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/\b13\b/);
    expect(source).not.toContain("<svg");
  });

  it("no longer uses the old empty copy", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../../../src/features/learning-paths/components/MyRouteStatus.tsx"),
      "utf8",
    );
    expect(source).not.toContain("Por el momento no hay ruta");
  });
});

// Shape actual de AllExceptionsFilter del backend, copiado a mano (deuda D-3).
function httpError(statusCode: number, code?: string): Error {
  return Object.assign(new Error("http"), {
    codigoEstado: statusCode,
    cuerpo: { statusCode, code, message: "x" },
  });
}

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

async function submitDefaultForm(container: HTMLElement) {
  act(() => {
    findButton(container, "Quiero hacerlo por un formulario")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
  });
  const form = container.querySelector("form");
  await act(async () => {
    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
}
