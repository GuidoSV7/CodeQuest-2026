// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellAccount } from "@/features/auth/components/ShellAccount";
import { useAuthStore } from "@/stores/auth-session";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const apiPost = vi.fn();
vi.mock("@/lib/axios", () => ({
  default: { post: (...args: unknown[]) => apiPost(...args) },
}));

afterEach(() => {
  document.body.replaceChildren();
  useAuthStore.setState({ user: null, hydrated: false });
  apiPost.mockReset();
});

describe("ShellAccount avatar upload", () => {
  it("opens a modal and posts the file when the user is logged in", async () => {
    useAuthStore.setState({
      user: {
        id: "user-1",
        displayName: "Ada",
        avatarUrl: null,
        email: null,
      },
      hydrated: true,
    });
    apiPost.mockResolvedValue({
      data: {
        avatarUrl: "https://res.cloudinary.com/demo/image/upload/v1/a.png",
      },
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<ShellAccount />);
    });

    const opener = container.querySelector("[aria-label='Avatar']");
    expect(opener?.tagName).toBe("BUTTON");
    act(() => {
      opener?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.querySelector("[role='dialog']")).not.toBeNull();

    const input = document.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["img"], "face.png", { type: "image/png" });
    act(() => {
      Object.defineProperty(input, "files", { value: [file] });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const form = document.querySelector("form");
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(apiPost).toHaveBeenCalledWith(
      "/api/me/avatar",
      expect.any(FormData),
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://res.cloudinary.com/demo/image/upload/v1/a.png",
    );

    act(() => root.unmount());
  });
});
