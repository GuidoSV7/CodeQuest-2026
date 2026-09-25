export type LayoutBucket = "required" | "recommended" | "optional" | "anytime";

export type LayoutItem = {
  courseId: string;
  bucket: LayoutBucket | null;
  position: number;
};

export type LayoutEdgeIn = {
  fromCourseId: string;
  toCourseId: string;
};

export type LayoutNode = {
  id: string;
  type: "header" | "card" | "group";
  position: { x: number; y: number };
  parentId?: string;
  data: { label: string; courseId?: string };
  width: number;
  height: number;
};

export type LayoutEdgeOut = {
  id: string;
  source: string;
  target: string;
  type: "smoothstep";
};

const PAD = 24;
const COL_W = 280;
const COL_GAP = 48;
const CARD_W = 248;
const CARD_H = 96;
const ROW_GAP = 24;
const HEADER_H = 40;
const GROUP_PAD = 16;
const GROUP_LABEL_H = 36;
const COLUMN_MIN = 720;

const COLUMNS = ["required", "recommended", "optional"] as const;

const HEADER_LABEL: Record<(typeof COLUMNS)[number], string> = {
  required: "REQUERIDO",
  recommended: "RECOMENDADO",
  optional: "OPCIONAL",
};

function columnOf(bucket: LayoutItem["bucket"]): (typeof COLUMNS)[number] {
  if (bucket === "required" || bucket === "recommended") return bucket;
  return "optional";
}

function byPosition(left: LayoutItem, right: LayoutItem): number {
  return left.position - right.position || left.courseId.localeCompare(right.courseId);
}

function keepEdges(items: LayoutItem[], edges: LayoutEdgeIn[]): LayoutEdgeOut[] {
  const ids = new Set(items.map((item) => item.courseId));
  return edges
    .filter((edge) => ids.has(edge.fromCourseId) && ids.has(edge.toCourseId))
    .map((edge) => ({
      id: `${edge.fromCourseId}->${edge.toCourseId}`,
      source: edge.fromCourseId,
      target: edge.toCourseId,
      type: "smoothstep" as const,
    }));
}

function columnLayout(items: LayoutItem[]): LayoutNode[] {
  const nodes: LayoutNode[] = COLUMNS.map((bucket, index) => ({
    id: `header:${bucket}`,
    type: "header",
    position: { x: PAD + index * (COL_W + COL_GAP), y: PAD },
    data: { label: HEADER_LABEL[bucket] },
    width: COL_W,
    height: HEADER_H,
  }));
  const buckets = {
    required: items.filter((item) => columnOf(item.bucket) === "required").sort(byPosition),
    recommended: items.filter((item) => columnOf(item.bucket) === "recommended").sort(byPosition),
    optional: items.filter((item) => item.bucket !== "anytime" && columnOf(item.bucket) === "optional").sort(byPosition),
  };
  const anytime = items.filter((item) => item.bucket === "anytime").sort(byPosition);
  for (const [index, bucket] of COLUMNS.entries()) {
    const column = buckets[bucket];
    const cardX = PAD + index * (COL_W + COL_GAP) + (COL_W - CARD_W) / 2;
    column.forEach((item, row) => {
      nodes.push({
        id: item.courseId,
        type: "card",
        position: { x: cardX, y: PAD + HEADER_H + row * (CARD_H + ROW_GAP) },
        data: { label: item.courseId, courseId: item.courseId },
        width: CARD_W,
        height: CARD_H,
      });
    });
  }
  const maxRows = Math.max(buckets.required.length, buckets.recommended.length, buckets.optional.length);
  const colsBottom = PAD + HEADER_H + maxRows * CARD_H + Math.max(0, maxRows - 1) * ROW_GAP;
  if (anytime.length > 0) {
    const contentWidth = GROUP_PAD * 2 + anytime.length * CARD_W + Math.max(0, anytime.length - 1) * 16;
    nodes.push({
      id: "group:anytime",
      type: "group",
      position: { x: PAD, y: colsBottom + 32 },
      data: { label: "EN CUALQUIER MOMENTO" },
      width: Math.max(COL_W * 3 + COL_GAP * 2, contentWidth),
      height: GROUP_PAD + GROUP_LABEL_H + CARD_H + GROUP_PAD,
    });
    anytime.forEach((item, index) => {
      nodes.push({
        id: item.courseId,
        type: "card",
        parentId: "group:anytime",
        position: { x: GROUP_PAD + index * (CARD_W + 16), y: GROUP_PAD + GROUP_LABEL_H },
        data: { label: item.courseId, courseId: item.courseId },
        width: CARD_W,
        height: CARD_H,
      });
    });
  }
  return nodes;
}

function verticalLayout(items: LayoutItem[]): LayoutNode[] {
  const sections: Array<{ bucket: LayoutBucket | "optional"; label: string; items: LayoutItem[] }> = [
    { bucket: "required", label: "Requerido", items: items.filter((item) => item.bucket === "required").sort(byPosition) },
    { bucket: "recommended", label: "Recomendado", items: items.filter((item) => item.bucket === "recommended").sort(byPosition) },
    { bucket: "optional", label: "Opcional", items: items.filter((item) => item.bucket === "optional" || item.bucket === null).sort(byPosition) },
    { bucket: "anytime", label: "En cualquier momento", items: items.filter((item) => item.bucket === "anytime").sort(byPosition) },
  ];
  const nodes: LayoutNode[] = [];
  let cursor = PAD;
  for (const section of sections) {
    if (section.items.length === 0) continue;
    nodes.push({
      id: `header:${section.bucket}`,
      type: "header",
      position: { x: PAD, y: cursor },
      data: { label: section.label },
      width: CARD_W,
      height: 36,
    });
    cursor += 36;
    for (const item of section.items) {
      nodes.push({
        id: item.courseId,
        type: "card",
        position: { x: PAD, y: cursor },
        data: { label: item.courseId, courseId: item.courseId },
        width: CARD_W,
        height: CARD_H,
      });
      cursor += CARD_H + ROW_GAP;
    }
  }
  return nodes;
}

export function layoutPath(items: LayoutItem[], edges: LayoutEdgeIn[], width: number): {
  nodes: LayoutNode[];
  edges: LayoutEdgeOut[];
} {
  const nodes = width < COLUMN_MIN ? verticalLayout(items) : columnLayout(items);
  return { nodes, edges: keepEdges(items, edges) };
}
