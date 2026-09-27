import { describe, expect, it } from "vitest";
import { routeCreatedMessage } from "@/features/learning-paths/lib/route-created-notice";

describe("routeCreatedMessage", () => {
  it("names the route when one is generated or saved", () => {
    expect(routeCreatedMessage({ event: "path.generated", title: "Ruta React" })).toBe(
      "Se armó la ruta Ruta React.",
    );
    expect(routeCreatedMessage({ event: "path_created", title: "Ruta Nest" })).toBe(
      "Se armó la ruta Ruta Nest.",
    );
  });

  it("stays quiet for a replay, a read, or a progress update", () => {
    expect(routeCreatedMessage({ event: "path.generated", title: "Ruta React", replayed: true })).toBeNull();
    expect(routeCreatedMessage({ event: "path.saved", title: "Ruta React" })).toBeNull();
    expect(routeCreatedMessage({ event: "progress.updated", title: "Ruta React" })).toBeNull();
  });
});
