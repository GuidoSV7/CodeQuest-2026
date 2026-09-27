// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellAccount } from "@/features/auth/components/ShellAccount";
import { useAuthStore } from "@/stores/auth-session";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/features/auth/api/auth.service", () => ({
  authEntryPath: (intent: "login" | "register") => (intent === "register" ? "/registro" : "/login"),
  logoutSession: vi.fn().mockResolvedValue(undefined),
}));

const user = {
  id: "e325e61b-e895-49a9-ae24-aa3a379fecc4",
  displayName: "Guido Salazar",
  avatarUrl: null,
  email: null,
};

describe("ShellAccount logout", () => {
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    document.body.replaceChildren();
    useAuthStore.setState({ user: null, hydrated: false });
    sessionStorage.clear();
  });

  it("opens Salir from the name and returns to Login", async () => {
    useAuthStore.setState({ user, hydrated: true });
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<ShellAccount />);
    });

    expect(container.textContent).toContain("Guido Salazar");
    expect(container.textContent).not.toContain("Salir");
    const account = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Guido Salazar"),
    );
    act(() => {
      account?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const logout = [...container.querySelectorAll("button")].find((button) => button.textContent === "Salir");
    expect(logout).toBeTruthy();

    await act(async () => {
      logout?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useAuthStore.getState().user).toBeNull();
    expect(container.textContent).toContain("Login");
  });
});
