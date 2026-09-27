// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MissionRadar } from "@/features/orbital/components/MissionRadar";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.replaceChildren();
});

describe("MissionRadar technologies", () => {
  it("draws scraped route titles instead of the static demo labels", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<MissionRadar technologies={["React", "NestJS", "Python"]} />);
    });
    const labels = Array.from(container.querySelectorAll("text")).map((node) => node.textContent);
    expect(labels).toEqual(["React", "NestJS", "Python"]);
    expect(container.textContent).not.toContain("NEST.SYS");
    expect(container.textContent).not.toContain("REACT_ARC");
    act(() => root.unmount());
  });
});
