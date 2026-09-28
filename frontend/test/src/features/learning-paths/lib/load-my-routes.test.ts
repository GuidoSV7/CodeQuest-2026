import { afterEach, describe, expect, it, vi } from "vitest";
import { createOfficialRoute, loadMyRoutes } from "@/features/learning-paths/lib/load-my-routes";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("@/lib/axios", () => ({ default: { get, post } }));

describe("loadMyRoutes", () => {
  afterEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("keeps the official path id the backend sends", async () => {
    get.mockResolvedValue({
      data: {
        items: [
          { id: "r1", title: "Ruta Go", itemCount: 3, completedCount: 1, progressRatio: 1 / 3, sourceCatalogPathId: "ruta-go" },
        ],
      },
    });

    const [route] = await loadMyRoutes();

    expect(route?.sourceCatalogPathId).toBe("ruta-go");
  });

  it("uses null when the route has no official path id", async () => {
    get.mockResolvedValue({ data: { items: [{ id: "r2", title: "A medida" }] } });

    const [route] = await loadMyRoutes();

    expect(route).toStrictEqual({
      id: "r2",
      title: "A medida",
      itemCount: 0,
      completedCount: 0,
      progressRatio: 0,
      sourceCatalogPathId: null,
    });
  });

  it("keeps the official path id of a freshly created official route", async () => {
    post.mockResolvedValue({
      data: { id: "r3", title: "Ruta React", itemCount: 5, completedCount: 0, progressRatio: 0, sourceCatalogPathId: "programas-react" },
    });

    const route = await createOfficialRoute({ catalogPathId: "programas-react", title: "Ruta React" });

    expect(route.sourceCatalogPathId).toBe("programas-react");
  });
});
