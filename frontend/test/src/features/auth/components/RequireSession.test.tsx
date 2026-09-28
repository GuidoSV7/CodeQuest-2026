// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BRAND_ASSETS } from "@/config/brand-assets";
import { discordStartUrl } from "@/features/auth/api/auth.service";
import { AuthSessionHydrator } from "@/features/auth/components/AuthSessionHydrator";
import { RequireSession } from "@/features/auth/components/RequireSession";
import type { SessionRead, SessionStatus, SessionUser } from "@/features/auth/types/auth.types";
import { useAuthStore } from "@/stores/auth-session";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const navigation = vi.hoisted(() => ({ pathname: "/mis-rutas" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

const { fetchMeStatus } = vi.hoisted(() => ({ fetchMeStatus: vi.fn<() => Promise<SessionRead>>() }));

vi.mock("@/features/auth/api/auth.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/api/auth.service")>()),
  fetchMeStatus,
}));

const user: SessionUser = {
  id: "7f1c2a9e-0b4d-4c61-9a52-3e8f1d6b2c70",
  displayName: "Ada Lovelace",
  avatarUrl: null,
  email: null,
};

const CHILD_MARKUP = "<p>Armá tu ruta</p>";
let childRenders = 0;

function ProtectedChild() {
  childRenders += 1;
  return <p>Armá tu ruta</p>;
}

let root: Root | undefined;
let container: HTMLDivElement;

async function render(withHydrator = false): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <>
        {withHydrator ? <AuthSessionHydrator /> : null}
        <RequireSession>
          <ProtectedChild />
        </RequireSession>
      </>,
    );
  });
}

function setStatus(sessionStatus: SessionStatus): void {
  useAuthStore.setState({
    sessionStatus,
    hydrated: sessionStatus !== "unknown",
    user: sessionStatus === "authenticated" ? user : null,
  });
}

function signInHref(): string | null {
  const link = [...container.querySelectorAll("a")].find((a) => a.textContent === "Entrar");
  return link?.getAttribute("href") ?? null;
}

function deferred(): { promise: Promise<SessionRead>; resolve: (read: SessionRead) => void } {
  let resolve: (read: SessionRead) => void = () => undefined;
  const promise = new Promise<SessionRead>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("RequireSession", () => {
  beforeEach(() => {
    childRenders = 0;
    navigation.pathname = "/mis-rutas";
    window.history.replaceState(null, "", "/mis-rutas");
    fetchMeStatus.mockReset();
    useAuthStore.setState(useAuthStore.getInitialState(), true);
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    document.body.replaceChildren();
    sessionStorage.clear();
  });

  it("unknown → accessible checking status and children never render", async () => {
    await render();

    const status = container.querySelector('[role="status"]');
    expect(status?.textContent).toBe("Verificando tu sesión…");
    expect(childRenders).toBe(0);
  });

  it("anonymous → DEVI, exact copy and Entrar pointing to Discord with returnTo", async () => {
    setStatus("anonymous");
    await render();

    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(BRAND_ASSETS.deviLaptop);
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("width")).toBe("160");
    expect(img?.getAttribute("height")).toBe("177");
    expect(container.querySelector("h1")?.textContent).toBe("Iniciá sesión para ver y armar tus rutas");
    expect(container.querySelector("p")?.textContent).toBe(
      "Tus rutas se guardan en tu cuenta de DevTalles. Entrá con Discord para seguir.",
    );
    expect(signInHref()).toBe(discordStartUrl("/mis-rutas"));
    expect(childRenders).toBe(0);
  });

  it("keeps the configurator query in returnTo", async () => {
    navigation.pathname = "/configurador-de-ruta";
    window.history.replaceState(null, "", "/configurador-de-ruta?panel=form&path=programas-react");
    setStatus("anonymous");
    await render();

    expect(signInHref()).toBe(discordStartUrl("/configurador-de-ruta?panel=form&path=programas-react"));
  });

  it("never sends the hash in returnTo", async () => {
    window.history.replaceState(null, "", "/mis-rutas#cq_session=secret");
    setStatus("anonymous");
    await render();

    expect(signInHref()).toBe(discordStartUrl("/mis-rutas"));
    expect(signInHref()).not.toContain("cq_session");
  });

  it("turns a hostile //evil.example pathname into returnTo /", async () => {
    navigation.pathname = "//evil.example";
    setStatus("anonymous");
    await render();

    expect(signInHref()).toBe(discordStartUrl("/"));
    expect(signInHref()).not.toContain("evil.example");
  });

  it("authenticated → renders children without any wrapper", async () => {
    setStatus("authenticated");
    await render();

    expect(container.innerHTML).toBe(CHILD_MARKUP);
  });

  it.each(["unknown", "anonymous", "unreachable"] as const)(
    "%s never shows the protected route copy",
    async (status) => {
      setStatus(status);
      await render();

      const text = container.textContent ?? "";
      expect(text).not.toContain("Armá tu ruta");
      expect(text).not.toContain("Arma tu ruta");
      expect(text).not.toContain("No pudimos cargar tus rutas");
      expect(childRenders).toBe(0);
    },
  );

  it("clear() while authenticated switches to the sign-in screen", async () => {
    setStatus("authenticated");
    await render();
    expect(container.innerHTML).toBe(CHILD_MARKUP);

    act(() => useAuthStore.getState().clear());

    expect(container.querySelector("h1")?.textContent).toBe("Iniciá sesión para ver y armar tus rutas");
    expect(container.textContent).not.toContain("Armá tu ruta");
  });

  describe("unreachable with the hydrator mounted", () => {
    async function renderUnreachableThenRetry(second: Promise<SessionRead>): Promise<void> {
      fetchMeStatus.mockResolvedValueOnce({ status: "unreachable" }).mockReturnValueOnce(second);
      await render(true);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).not.toBeNull();
      expect(container.querySelector("h1")?.textContent).toBe("No pudimos conectar con el servidor");
      expect(container.querySelector("p")?.textContent).toBe("Probá de nuevo en unos segundos.");
      expect(container.querySelector("img")?.getAttribute("src")).toBe(BRAND_ASSETS.deviLaptop);

      const retry = container.querySelector("button");
      expect(retry?.textContent).toBe("Reintentar");
      act(() => retry?.click());

      expect(container.querySelector('[role="status"]')?.textContent).toBe("Verificando tu sesión…");
      expect(container.querySelector("button")).toBeNull();
      expect(fetchMeStatus).toHaveBeenCalledTimes(2);
    }

    it("retry → authenticated mounts the children", async () => {
      const second = deferred();
      await renderUnreachableThenRetry(second.promise);

      await act(async () => {
        second.resolve({ status: "authenticated", user });
      });

      expect(container.textContent).toBe("Armá tu ruta");
      expect(childRenders).toBeGreaterThan(0);
    });

    it("retry → anonymous shows the sign-in screen", async () => {
      const second = deferred();
      await renderUnreachableThenRetry(second.promise);

      await act(async () => {
        second.resolve({ status: "anonymous" });
      });

      expect(container.querySelector("h1")?.textContent).toBe("Iniciá sesión para ver y armar tus rutas");
      expect(childRenders).toBe(0);
    });
  });
});
