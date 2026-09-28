// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { orbitalDemoSessionFixture } from "@/features/orbital/fixtures";
import { AssessmentResults } from "@/features/assessment/components/AssessmentResults";
import { AssessmentWizard } from "@/features/assessment/components/AssessmentWizard";
import { TypescriptCheckpoint } from "@/features/assessment/components/TypescriptCheckpoint";
import { useAuthStore } from "@/stores/auth-session";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

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

function mount(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, root };
}

beforeEach(() => {
  push.mockReset();
  useAuthStore.setState({ user: orbitalDemoSessionFixture, hydrated: true });
});

afterEach(() => {
  document.body.replaceChildren();
  act(() => useAuthStore.setState({ user: null, hydrated: false }));
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("literal assessment surfaces", () => {
  it("renders PASO 03/12, four cards and advances after 320ms with keyboard", () => {
    vi.useFakeTimers();
    const { container, root } = mount(<AssessmentWizard />);

    expect(container.textContent).toContain("PASO 03 / 12");
    expect(container.querySelectorAll("[title^='Nodo']")).toHaveLength(12);
    expect(container.querySelectorAll("[role='button']")).toHaveLength(4);

    const option = container.querySelector("[role='button']") as HTMLElement;
    act(() => option.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(option.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("CALIBRANDO SIGUIENTE ESCENARIO");
    act(() => vi.advanceTimersByTime(319));
    expect(push).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(push).toHaveBeenCalledWith("/configurador-de-ruta/resultados");

    act(() => root.unmount());
  });

  it("renders results with a hexagonal radar, affinity and three route cards", () => {
    const { container, root } = mount(<AssessmentResults />);

    expect(container.textContent).toContain("Investigador que shipea");
    expect(container.textContent).toContain("94.2%");
    expect(container.querySelector("svg[role='img']")).not.toBeNull();
    expect(container.querySelectorAll("polygon")).toHaveLength(5);
    expect(container.querySelectorAll("article")).toHaveLength(3);
    expect(container.textContent).toContain("Backend con Nest");
    expect(container.textContent).toContain("Frontend con React");
    expect(container.textContent).toContain("Go desde cero");

    act(() => root.unmount());
  });

  it("keeps checkpoint disabled initially and confirms locally after selection", () => {
    const fetchSpy = vi.fn();
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    vi.stubGlobal("fetch", fetchSpy);
    const { container, root } = mount(<TypescriptCheckpoint />);

    expect(container.textContent).toContain("¿Qué hace 'readonly'");
    expect(container.querySelectorAll("label")).toHaveLength(4);
    const confirm = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Confirmar respuesta"),
    );
    expect(confirm?.hasAttribute("disabled")).toBe(true);

    const firstOption = container.querySelector("input[type='radio']") as HTMLInputElement;
    act(() => firstOption.click());
    expect(confirm?.hasAttribute("disabled")).toBe(false);
    act(() => confirm?.click());
    expect(container.textContent).toContain("Guardando tu respuesta");
    const feedback = container.querySelector("button");
    act(() => feedback?.click());
    expect(container.textContent).toContain("Respuesta registrada");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
