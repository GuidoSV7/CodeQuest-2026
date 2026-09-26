import { describe, expect, it } from "vitest";
import { WIDGET_RESULT_TIMEOUT_MS, widgetView } from "./widget-status";

describe("widget tool result", () => {
  it("shows the error code and ref instead of waiting", () => {
    const view = widgetView({
      text: "internal_error (ref: a1b2c3). Error del servidor. Podés reintentar.",
      isError: true,
      elapsedMs: 10,
    });
    expect(view.kind).toBe("error");
    expect(view.message).toContain("internal_error (ref: a1b2c3)");
    expect(view.message).not.toContain("Esperando la ruta");
  });

  it("shows a timeout when the tool result never arrives", () => {
    const view = widgetView({ text: null, isError: false, elapsedMs: WIDGET_RESULT_TIMEOUT_MS });
    expect(view.kind).toBe("timeout");
    expect(view.message?.length).toBeGreaterThan(10);
  });
});