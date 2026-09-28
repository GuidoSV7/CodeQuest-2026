// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSessionHydrator } from "@/features/auth/components/AuthSessionHydrator";
import type { SessionRead } from "@/features/auth/types/auth.types";
import { orbitalDemoSessionFixture } from "@/features/orbital/fixtures";
import { useAuthStore } from "@/stores/auth-session";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/axios", () => ({ default: { get } }));

const service = vi.hoisted(() => ({
  fetchMeStatus: vi.fn<() => Promise<SessionRead>>(),
  original: undefined as undefined | (() => Promise<SessionRead>),
}));

// Delegates to the real fetchMeStatus by default so the characterization block keeps going through axios.
vi.mock("@/features/auth/api/auth.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth/api/auth.service")>();
  service.original = actual.fetchMeStatus;
  service.fetchMeStatus.mockImplementation(actual.fetchMeStatus);
  return { ...actual, fetchMeStatus: service.fetchMeStatus };
});

const user = {
  id: "7f1c2a9e-0b4d-4c61-9a52-3e8f1d6b2c70",
  displayName: "Ada Lovelace",
  avatarUrl: null,
  email: null,
};

describe("AuthSessionHydrator (caracterización)", () => {
  let root: Root | undefined;

  async function mountHydrator(): Promise<void> {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<AuthSessionHydrator />);
    });
  }

  beforeEach(() => {
    get.mockReset();
    useAuthStore.setState(useAuthStore.getInitialState(), true);
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    document.body.replaceChildren();
    sessionStorage.clear();
    vi.unstubAllEnvs();
  });

  it("uses the demo fixture in development with demo '1' without calling the API", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ORBITAL_DEMO_SESSION", "1");

    await mountHydrator();

    expect(get).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toEqual(orbitalDemoSessionFixture);
    expect(useAuthStore.getState().hydrated).toBe(true);
  });

  it("reads the real session after sign out and clears the mark when the API returns a user", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ORBITAL_DEMO_SESSION", "1");
    sessionStorage.setItem("cq_signed_out", "1");
    get.mockResolvedValue({ data: user });

    await mountHydrator();

    expect(get).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().hydrated).toBe(true);
    expect(sessionStorage.getItem("cq_signed_out")).toBeNull();
  });

  it("stays signed out when the real session read fails after sign out", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ORBITAL_DEMO_SESSION", "1");
    sessionStorage.setItem("cq_signed_out", "1");
    get.mockRejectedValue(new Error("Network Error"));

    await mountHydrator();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().hydrated).toBe(true);
  });
});

function deferred(): { promise: Promise<SessionRead>; resolve: (read: SessionRead) => void } {
  let resolve: (read: SessionRead) => void = () => undefined;
  const promise = new Promise<SessionRead>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("AuthSessionHydrator (lectura de 3 ramas)", () => {
  let root: Root | undefined;

  async function mountHydrator(): Promise<void> {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<AuthSessionHydrator />);
    });
  }

  beforeEach(() => {
    get.mockReset();
    service.fetchMeStatus.mockReset();
    useAuthStore.setState(useAuthStore.getInitialState(), true);
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    document.body.replaceChildren();
    sessionStorage.clear();
    vi.unstubAllEnvs();
    service.fetchMeStatus.mockReset();
    if (service.original) service.fetchMeStatus.mockImplementation(service.original);
  });

  it("demo enabled → authenticated fixture without reading the session", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ORBITAL_DEMO_SESSION", "true");

    await mountHydrator();

    expect(service.fetchMeStatus).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      sessionStatus: "authenticated",
      user: orbitalDemoSessionFixture,
      hydrated: true,
    });
  });

  it("authenticated → store authenticated and the signed-out mark is cleared", async () => {
    sessionStorage.setItem("cq_signed_out", "1");
    service.fetchMeStatus.mockResolvedValue({ status: "authenticated", user });

    await mountHydrator();

    expect(useAuthStore.getState()).toMatchObject({ sessionStatus: "authenticated", user, hydrated: true });
    expect(sessionStorage.getItem("cq_signed_out")).toBeNull();
  });

  it.each(["anonymous", "unreachable"] as const)("%s → store %s without user", async (status) => {
    service.fetchMeStatus.mockResolvedValue({ status });

    await mountHydrator();

    expect(service.fetchMeStatus).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({ sessionStatus: status, user: null, hydrated: true });
  });

  it("signed out + demo enabled → reads the session instead of using the fixture", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ORBITAL_DEMO_SESSION", "1");
    sessionStorage.setItem("cq_signed_out", "1");
    service.fetchMeStatus.mockResolvedValue({ status: "anonymous" });

    await mountHydrator();

    expect(service.fetchMeStatus).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({ sessionStatus: "anonymous", user: null, hydrated: true });
    expect(sessionStorage.getItem("cq_signed_out")).toBe("1");
  });

  it("signed out + unreachable → store unreachable, not anonymous", async () => {
    sessionStorage.setItem("cq_signed_out", "1");
    service.fetchMeStatus.mockResolvedValue({ status: "unreachable" });

    await mountHydrator();

    expect(useAuthStore.getState()).toMatchObject({ sessionStatus: "unreachable", user: null, hydrated: true });
    expect(sessionStorage.getItem("cq_signed_out")).toBe("1");
  });

  it("does not write the store when the read resolves after unmount", async () => {
    const read = deferred();
    service.fetchMeStatus.mockReturnValue(read.promise);

    await mountHydrator();
    act(() => root?.unmount());
    root = undefined;
    await act(async () => {
      read.resolve({ status: "authenticated", user });
    });

    expect(useAuthStore.getState()).toMatchObject({ sessionStatus: "unknown", user: null, hydrated: false });
  });

  it("keeps the newest read when two reads resolve in reverse order", async () => {
    const first = deferred();
    const second = deferred();
    service.fetchMeStatus.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    await mountHydrator();
    await act(async () => {
      useAuthStore.getState().requestSessionRead();
    });
    expect(service.fetchMeStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve({ status: "authenticated", user });
    });
    await act(async () => {
      first.resolve({ status: "anonymous" });
    });

    expect(useAuthStore.getState()).toMatchObject({
      sessionStatus: "authenticated",
      user,
      hydrated: true,
      sessionReadRequest: 1,
    });
  });
});
