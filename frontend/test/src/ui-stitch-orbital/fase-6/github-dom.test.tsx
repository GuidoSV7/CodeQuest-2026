// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubPreview } from "@/features/integrations/components/GithubPreview";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("literal GitHub preview", () => {
  it("copies the safe snippet, shares locally and hides the toast after 2.8s", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <GithubPreview
          capabilities={{
            clipboard: { writeText },
            share: { share },
          }}
        />,
      );
    });

    expect(container.textContent).toContain("Tu ruta en tu GitHub");
    expect(container.querySelector("svg[role='img']")).not.toBeNull();
    expect(container.textContent).toContain("[![DevTalles Route]");
    expect(container.textContent).not.toMatch(/https?:\/\/|oauth|token/i);

    await act(async () => {
      container.querySelector("[aria-label='Copiar código Markdown']")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(writeText).toHaveBeenCalledWith("[![DevTalles Route](badge-url)](profile-url)");
    expect(container.textContent).toContain("MARKDOWN COPIADO AL PORTAPAPELES");
    act(() => vi.advanceTimersByTime(2800));
    expect(container.textContent).not.toContain("MARKDOWN COPIADO AL PORTAPAPELES");

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Compartir en Discord"))
        ?.click();
    });
    expect(share).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
