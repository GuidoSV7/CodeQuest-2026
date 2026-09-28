import { beforeEach, describe, expect, it } from "vitest";
import type { SessionRead, SessionStatus, SessionUser } from "@/features/auth/types/auth.types";
import { useAuthStore } from "@/stores/auth-session";

const user: SessionUser = {
  id: "7f1c2a9e-0b4d-4c61-9a52-3e8f1d6b2c70",
  displayName: "Ada Lovelace",
  avatarUrl: null,
  email: null,
};

const otherUser: SessionUser = { ...user, id: "b3d2c1a0-0000-4000-8000-000000000001", displayName: "Grace" };

type Snapshot = Readonly<{ user: SessionUser | null; hydrated: boolean; sessionStatus: SessionStatus }>;

const INITIAL_STATES: ReadonlyArray<readonly [string, Snapshot]> = [
  ["unknown", { user: null, hydrated: false, sessionStatus: "unknown" }],
  ["authenticated", { user, hydrated: true, sessionStatus: "authenticated" }],
  ["anonymous", { user: null, hydrated: true, sessionStatus: "anonymous" }],
  ["unreachable", { user: null, hydrated: true, sessionStatus: "unreachable" }],
];

const READS: ReadonlyArray<SessionRead> = [
  { status: "authenticated", user: otherUser },
  { status: "anonymous" },
  { status: "unreachable" },
];

type Action = readonly [string, () => void];

const ACTIONS: ReadonlyArray<Action> = [
  ["setUser(user)", () => useAuthStore.getState().setUser(otherUser)],
  ["setUser(null)", () => useAuthStore.getState().setUser(null)],
  ["setHydrated(true)", () => useAuthStore.getState().setHydrated(true)],
  ["setHydrated(false)", () => useAuthStore.getState().setHydrated(false)],
  ["clear()", () => useAuthStore.getState().clear()],
  ...READS.map((read): Action => [
    `applySessionRead(${read.status}, vigente)`,
    () => useAuthStore.getState().applySessionRead(read, useAuthStore.getState().sessionReadRequest),
  ]),
  ...READS.map((read): Action => [
    `applySessionRead(${read.status}, viejo)`,
    () => useAuthStore.getState().applySessionRead(read, useAuthStore.getState().sessionReadRequest - 1),
  ]),
  ["requestSessionRead()", () => useAuthStore.getState().requestSessionRead()],
];

function seed(snapshot: Snapshot, sessionReadRequest = 3): void {
  useAuthStore.setState({ ...snapshot, sessionReadRequest });
}

function expectInvariants(): void {
  const { user: current, hydrated, sessionStatus } = useAuthStore.getState();
  expect(sessionStatus === "authenticated").toBe(current !== null);
  expect(hydrated).toBe(sessionStatus !== "unknown");
}

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState(), true);
  });

  it("starts unknown, not hydrated, without user and request 0", () => {
    const state = useAuthStore.getState();
    expect(state.sessionStatus).toBe("unknown");
    expect(state.hydrated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.sessionReadRequest).toBe(0);
  });

  describe("invariantes I1/I2 (4 estados × cada acción)", () => {
    for (const [stateName, snapshot] of INITIAL_STATES) {
      for (const [actionName, run] of ACTIONS) {
        it(`${stateName} → ${actionName}`, () => {
          seed(snapshot);
          run();
          expectInvariants();
        });
      }
    }
  });

  it.each(INITIAL_STATES)("clear() from %s leaves anonymous without user", (_name, snapshot) => {
    seed(snapshot);
    useAuthStore.getState().clear();
    expect(useAuthStore.getState()).toMatchObject({ user: null, sessionStatus: "anonymous", hydrated: true });
  });

  it.each(INITIAL_STATES)("applySessionRead with a stale request from %s is a no-op", (_name, snapshot) => {
    seed(snapshot, 5);
    for (const read of READS) useAuthStore.getState().applySessionRead(read, 4);
    expect(useAuthStore.getState()).toMatchObject({ ...snapshot, sessionReadRequest: 5 });
  });

  it("applySessionRead with the current request writes the read", () => {
    seed(INITIAL_STATES[0][1], 2);
    useAuthStore.getState().applySessionRead({ status: "authenticated", user }, 2);
    expect(useAuthStore.getState()).toMatchObject({ user, sessionStatus: "authenticated", hydrated: true });
    useAuthStore.getState().applySessionRead({ status: "unreachable" }, 2);
    expect(useAuthStore.getState()).toMatchObject({ user: null, sessionStatus: "unreachable", hydrated: true });
  });

  it.each(INITIAL_STATES)("requestSessionRead() from %s increments the request and returns to unknown", (_name, snapshot) => {
    seed(snapshot, 7);
    useAuthStore.getState().requestSessionRead();
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      hydrated: false,
      sessionStatus: "unknown",
      sessionReadRequest: 8,
    });
  });

  it("setHydrated(true) keeps an already hydrated session untouched", () => {
    seed(INITIAL_STATES[1][1]);
    useAuthStore.getState().setHydrated(true);
    expect(useAuthStore.getState()).toMatchObject(INITIAL_STATES[1][1]);
  });
});
