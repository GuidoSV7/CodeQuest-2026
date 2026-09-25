// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { orbitalDemoSessionFixture } from "@/features/orbital/fixtures";
import { TokenPreview } from "@/features/integrations/components/TokenPreview";
import { useAuthStore } from "@/stores/auth-session";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  useAuthStore.setState({ user: orbitalDemoSessionFixture, hydrated: true });
});

afterEach(() => {
  document.body.replaceChildren();
  act(() => useAuthStore.setState({ user: null, hydrated: false }));
  vi.useRealTimers();
});

describe("literal access-token preview", () => {
  it("keeps the token masked, accordions exclusive and revocation local", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = vi.fn();
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    vi.stubGlobal("fetch", fetchSpy);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<TokenPreview capabilities={{ clipboard: { writeText }, share: null }} />);
    });

    expect(container.textContent).toContain("Tokens de acceso");
    expect(container.textContent).toContain("dvt_ [masked]");
    expect(container.textContent).not.toMatch(/dvt_4f2a_simulated_payload|secret real/i);

    const accordionButtons = Array.from(container.querySelectorAll("[aria-expanded]"));
    act(() => accordionButtons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(accordionButtons[0]?.getAttribute("aria-expanded")).toBe("true");
    act(() => accordionButtons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(accordionButtons[0]?.getAttribute("aria-expanded")).toBe("false");
    expect(accordionButtons[1]?.getAttribute("aria-expanded")).toBe("true");

    act(() => (container.querySelector("[aria-label='Revocar token enmascarado']") as HTMLElement)?.click());
    expect(container.querySelector("[aria-label='Confirmar revocación local']")).not.toBeNull();
    act(() => (container.querySelector("[aria-label='Confirmar revocación local']") as HTMLElement)?.click());
    expect(container.textContent).toContain("dvt_ [REVOCADO]");

    await act(async () => {
      (container.querySelector("[aria-label='Copiar token enmascarado']") as HTMLElement)?.click();
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
