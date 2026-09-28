import { describe, expect, it } from "vitest";
import { layoutPath, type LayoutItem } from "./layout-path";

function item(
  courseId: string,
  bucket: LayoutItem["bucket"],
  position: number,
): LayoutItem {
  return { courseId, bucket, position };
}

describe("layoutPath", () => {
  it("returns the same coordinates for the same input", () => {
    const items = [
      item("b", "required", 2),
      item("a", "required", 1),
      item("c", "anytime", 0),
    ];
    const edges = [{ fromCourseId: "a", toCourseId: "b" }];
    const first = layoutPath(items, edges, 960);
    const second = layoutPath([...items].reverse(), [...edges], 960);
    expect(second).toEqual(first);
  });

  it("places each bucket in its column and sorts by position", () => {
    const nodes = layoutPath(
      [
        item("req-late", "required", 5),
        item("req-early", "required", 1),
        item("rec", "recommended", 0),
        item("opt", "optional", 0),
      ],
      [],
      960,
    ).nodes;
    const at = (id: string) => nodes.find((node) => node.id === id);
    expect(at("req-early")?.position).toEqual({ x: 40, y: 64 });
    expect(at("req-late")?.position).toEqual({ x: 40, y: 184 });
    expect(at("rec")?.position).toEqual({ x: 368, y: 64 });
    expect(at("opt")?.position).toEqual({ x: 696, y: 64 });
  });

  it("aligns headers and the first card of every column", () => {
    const nodes = layoutPath(
      [
        item("req-a", "required", 0),
        item("req-b", "required", 1),
        item("rec", "recommended", 0),
        item("opt", "optional", 0),
      ],
      [],
      960,
    ).nodes;
    const headers = nodes.filter((node) => node.type === "header");
    expect(headers.map((node) => node.position.y)).toEqual([24, 24, 24]);
    expect(nodes.find((node) => node.id === "req-a")?.position.y).toBe(64);
    expect(nodes.find((node) => node.id === "rec")?.position.y).toBe(64);
    expect(nodes.find((node) => node.id === "opt")?.position.y).toBe(64);
  });

  it("draws a search grid without columns or edges when a bucket is null", () => {
    const { nodes, edges } = layoutPath(
      [item("search-a", null, 1), item("search-b", null, 0)],
      [{ fromCourseId: "search-b", toCourseId: "search-a" }],
      960,
    );
    expect(edges).toEqual([]);
    expect(nodes.some((node) => node.type === "header" || node.type === "group")).toBe(false);
    expect(nodes.map((node) => node.data.label).join(" ")).not.toMatch(/sin bucket/i);
    expect(nodes.find((node) => node.id === "search-b")?.position).toEqual({ x: 24, y: 24 });
    expect(nodes.find((node) => node.id === "search-a")?.position.x).toBe(24 + 248 + 24);
  });

  it("stacks a search grid in one column below 720px", () => {
    const { nodes, edges } = layoutPath(
      [item("search-a", null, 0), item("search-b", null, 1)],
      [{ fromCourseId: "search-a", toCourseId: "search-b" }],
      380,
    );
    expect(edges).toEqual([]);
    expect(nodes.filter((node) => node.type === "header")).toEqual([]);
    expect(nodes.map((node) => node.position.x)).toEqual([24, 24]);
  });

  it("puts anytime courses inside a group below the columns", () => {
    const { nodes } = layoutPath(
      [item("req-a", "required", 0), item("req-b", "required", 1), item("any", "anytime", 0)],
      [],
      960,
    );
    const group = nodes.find((node) => node.id === "group:anytime");
    const child = nodes.find((node) => node.id === "any");
    expect(group?.type).toBe("group");
    expect(group?.position).toEqual({ x: 24, y: 312 });
    expect(child?.parentId).toBe("group:anytime");
    expect(child?.position).toEqual({ x: 16, y: 52 });
  });

  it("stacks sections in one column below 720px", () => {
    const { nodes } = layoutPath(
      [item("req", "required", 0), item("any", "anytime", 0)],
      [],
      400,
    );
    expect(nodes.find((node) => node.id === "req")?.position).toEqual({ x: 24, y: 60 });
    expect(nodes.find((node) => node.id === "any")?.position).toEqual({ x: 24, y: 216 });
    expect(nodes.find((node) => node.id === "group:anytime")).toBeUndefined();
    expect(nodes.filter((node) => node.type === "card").every((node) => node.position.x === 24)).toBe(true);
  });

  it("uses columns again at exactly 720px", () => {
    const narrow = layoutPath([item("req", "required", 0)], [], 719);
    const wide = layoutPath([item("req", "required", 0)], [], 720);
    expect(narrow.nodes.find((node) => node.id === "req")?.position).toEqual({ x: 24, y: 60 });
    expect(wide.nodes.find((node) => node.id === "req")?.position).toEqual({ x: 40, y: 64 });
  });

  it("keeps only edges whose endpoints exist", () => {
    const { edges } = layoutPath(
      [item("a", "required", 0), item("b", "required", 1)],
      [
        { fromCourseId: "a", toCourseId: "b" },
        { fromCourseId: "a", toCourseId: "missing" },
        { fromCourseId: "ghost", toCourseId: "b" },
      ],
      960,
    );
    expect(edges).toEqual([
      { id: "a->b", source: "a", target: "b", type: "smoothstep" },
    ]);
  });

  it("does not invent an edge when the list is empty", () => {
    const result = layoutPath(
      [item("a", "required", 0), item("b", "required", 1)],
      [],
      960,
    );
    expect(result.edges).toEqual([]);
  });

  it("lays out a single course", () => {
    const { nodes, edges } = layoutPath([item("solo", "required", 9)], [], 960);
    expect(edges).toEqual([]);
    expect(nodes.find((node) => node.id === "solo")).toMatchObject({
      type: "card",
      position: { x: 40, y: 64 },
    });
  });

  it("stacks the fork under the start on a phone so each card stays readable", () => {
    const { nodes, edges } = layoutPath(
      [
        item("blazor", "recommended", 2),
        item("csharp", "recommended", 0),
        item("dotnet", "recommended", 1),
      ],
      [
        { fromCourseId: "csharp", toCourseId: "dotnet" },
        { fromCourseId: "csharp", toCourseId: "blazor" },
      ],
      429,
    );
    const csharp = nodes.find((node) => node.id === "csharp");
    const dotnet = nodes.find((node) => node.id === "dotnet");
    const blazor = nodes.find((node) => node.id === "blazor");
    expect(nodes.some((node) => node.type === "header")).toBe(false);
    expect(csharp?.data.step).toBe(1);
    expect(dotnet?.data.step).toBe(2);
    expect(blazor?.data.step).toBe(2);
    expect(csharp?.position.x).toBe(dotnet?.position.x);
    expect(dotnet?.position.x).toBe(blazor?.position.x);
    expect(csharp && dotnet && csharp.position.y < dotnet.position.y).toBe(true);
    expect(dotnet && blazor && dotnet.position.y < blazor.position.y).toBe(true);
    expect(csharp?.width).toBeGreaterThanOrEqual(360);
    expect(csharp?.data.vertical).toBe(true);
    expect(edges.map((edge) => edge.id)).toEqual(["csharp->dotnet", "dotnet->blazor"]);
    expect(edges.every((edge) => edge.type === "straight")).toBe(true);
  });

  it("lays out an empty path with column headers and no edges", () => {
    const { nodes, edges } = layoutPath([], [], 960);
    expect(edges).toEqual([]);
    expect(nodes.filter((node) => node.type === "card")).toEqual([]);
    expect(nodes.map((node) => node.id)).toEqual([
      "header:required",
      "header:recommended",
      "header:optional",
    ]);
  });

  it("column headers are sentence case", () => {
    const { nodes } = layoutPath([item("req", "required", 0), item("any", "anytime", 0)], [], 960);
    const labels = nodes
      .filter((node) => node.id.startsWith("header:") || node.id === "group:anytime")
      .map((node) => node.data.label);
    expect(labels).toEqual(["Requerido", "Recomendado", "Opcional", "En cualquier momento"]);
  });
});
