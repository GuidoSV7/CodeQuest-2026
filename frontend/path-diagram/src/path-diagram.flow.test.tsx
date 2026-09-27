// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { modelFromUserPath } from "./model";
import { PathDiagram } from "./path-diagram";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

afterEach(() => {
  document.body.replaceChildren();
});

describe("PathDiagram start fork", () => {
  it("marks C# as the start and draws a line to each branch", () => {
    const model = modelFromUserPath({
      id: "ruta-c",
      title: "C#",
      items: [
        { courseId: "csharp", courseTitle: "C#: Empieza tu camino en el lenguaje", bucket: "recommended", position: 0 },
        { courseId: "dotnet", courseTitle: ".NET Backend: .NET Core, SQL Server y seguridad JWT", bucket: "recommended", position: 1 },
        { courseId: "blazor", courseTitle: "Blazor: Desde cero con arquitectura limpia", bucket: "recommended", position: 2 },
      ],
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<PathDiagram model={model} mode="web" width={429} />);
    });

    const cards = Array.from(container.querySelectorAll("button"));
    const csharp = cards.find((card) => card.textContent?.includes("C#:"));
    const dotnet = cards.find((card) => card.textContent?.includes(".NET Backend"));
    const blazor = cards.find((card) => card.textContent?.includes("Blazor"));
    expect(csharp?.textContent).toContain("Empieza aquí");
    expect(csharp?.textContent).toContain("1");
    expect(dotnet?.textContent).toContain("2");
    expect(blazor?.textContent).toContain("2");
    expect(dotnet?.textContent).not.toContain("Empieza aquí");
    expect(model.edges).toEqual([
      { fromCourseId: "csharp", toCourseId: "dotnet" },
      { fromCourseId: "csharp", toCourseId: "blazor" },
    ]);

    act(() => root.unmount());
  });
});
