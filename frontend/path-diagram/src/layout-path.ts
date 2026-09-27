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
  data: { label: string; courseId?: string; step?: number; vertical?: boolean };
  width: number;
  height: number;
};

export type LayoutEdgeOut = {
  id: string;
  source: string;
  target: string;
  type: "smoothstep" | "straight";
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

const FLOW_GAP_X = 48;
const FLOW_GAP_Y = 80;
const FLOW_CARD_H = 200;

function isConnectedFlow(items: LayoutItem[], edges: LayoutEdgeIn[]): boolean {
  if (items.length < 2) return false;
  const ids = new Set<string>();
  for (const edge of keepEdges(items, edges)) {
    ids.add(edge.source);
    ids.add(edge.target);
  }
  return items.every((item) => ids.has(item.courseId));
}

function flowRanks(items: LayoutItem[], edges: LayoutEdgeOut[]): LayoutItem[][] {
  const incoming = new Map(items.map((item) => [item.courseId, 0]));
  const outgoing = new Map(items.map((item) => [item.courseId, [] as string[]]));
  for (const edge of edges) {
    outgoing.get(edge.source)?.push(edge.target);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }
  const rankOf = new Map<string, number>();
  const ready = items.filter((item) => incoming.get(item.courseId) === 0).map((item) => item.courseId);
  for (const id of ready) rankOf.set(id, 0);
  const pending = new Map(incoming);
  while (ready.length > 0) {
    const id = ready.shift();
    if (!id) break;
    const rank = rankOf.get(id) ?? 0;
    for (const next of outgoing.get(id) ?? []) {
      rankOf.set(next, Math.max(rankOf.get(next) ?? 0, rank + 1));
      pending.set(next, (pending.get(next) ?? 1) - 1);
      if (pending.get(next) === 0) ready.push(next);
    }
  }
  const rows: LayoutItem[][] = [];
  for (const item of [...items].sort(byPosition)) {
    const rank = rankOf.get(item.courseId) ?? 0;
    const row = rows[rank] ?? [];
    row.push(item);
    rows[rank] = row;
  }
  return rows;
}

function flowLayout(items: LayoutItem[], edges: LayoutEdgeIn[]): {
  nodes: LayoutNode[];
  edges: LayoutEdgeOut[];
} {
  const kept = keepEdges(items, edges);
  const rows = flowRanks(items, kept);
  const tallest = Math.max(...rows.map((row) => row.length), 1);
  const span = tallest * FLOW_CARD_H + Math.max(0, tallest - 1) * FLOW_GAP_Y;
  const nodes: LayoutNode[] = [];
  rows.forEach((row, rank) => {
    const columnHeight = row.length * FLOW_CARD_H + Math.max(0, row.length - 1) * FLOW_GAP_Y;
    const originY = PAD + (span - columnHeight) / 2;
    row.forEach((item, index) => {
      nodes.push({
        id: item.courseId,
        type: "card",
        position: {
          x: PAD + rank * (CARD_W + FLOW_GAP_X),
          y: originY + index * (FLOW_CARD_H + FLOW_GAP_Y),
        },
        data: { label: item.courseId, courseId: item.courseId, step: rank + 1 },
        width: CARD_W,
        height: FLOW_CARD_H,
      });
    });
  });
  return { nodes, edges: kept };
}

const PHONE_GAP_Y = 64;

function phoneCardWidth(viewport: number): number {
  return Math.max(280, Math.min(viewport - 32, 420));
}

function flowLayoutVertical(items: LayoutItem[], edges: LayoutEdgeIn[], width: number): {
  nodes: LayoutNode[];
  edges: LayoutEdgeOut[];
} {
  const kept = keepEdges(items, edges);
  const rows = flowRanks(items, kept);
  const cardW = phoneCardWidth(width);
  const nodes: LayoutNode[] = [];
  let y = PAD;
  rows.forEach((row, rank) => {
    for (const item of row) {
      nodes.push({
        id: item.courseId,
        type: "card",
        position: { x: PAD, y },
        data: { label: item.courseId, courseId: item.courseId, step: rank + 1, vertical: true },
        width: cardW,
        height: FLOW_CARD_H,
      });
      y += FLOW_CARD_H + PHONE_GAP_Y;
    }
  });
  return { nodes, edges: chainStackedCards(nodes) };
}

function chainStackedCards(nodes: LayoutNode[]): LayoutEdgeOut[] {
  const cards = nodes.filter((node) => node.type === "card");
  const edges: LayoutEdgeOut[] = [];
  for (let index = 0; index < cards.length - 1; index += 1) {
    const from = cards[index];
    const to = cards[index + 1];
    if (!from || !to) continue;
    edges.push({
      id: `${from.id}->${to.id}`,
      source: from.id,
      target: to.id,
      type: "straight",
    });
  }
  return edges;
}

const SEARCH_GAP = 24;

function searchLayout(items: LayoutItem[], width: number): LayoutNode[] {
  const ordered = [...items].sort(byPosition);
  const columns = width < COLUMN_MIN ? 1 : 3;
  return ordered.map((item, index) => ({
    id: item.courseId,
    type: "card" as const,
    position: {
      x: PAD + (index % columns) * (CARD_W + SEARCH_GAP),
      y: PAD + Math.floor(index / columns) * (CARD_H + ROW_GAP),
    },
    data: { label: item.courseId, courseId: item.courseId },
    width: CARD_W,
    height: CARD_H,
  }));
}

function verticalLayout(items: LayoutItem[]): LayoutNode[] {
  const sections: Array<{ bucket: LayoutBucket | "optional"; label: string; items: LayoutItem[] }> = [
    { bucket: "required", label: "Requerido", items: items.filter((item) => item.bucket === "required").sort(byPosition) },
    { bucket: "recommended", label: "Recomendado", items: items.filter((item) => item.bucket === "recommended").sort(byPosition) },
    { bucket: "optional", label: "Opcional", items: items.filter((item) => item.bucket === "optional").sort(byPosition) },
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
  if (items.some((item) => item.bucket === null)) {
    return { nodes: searchLayout(items, width), edges: [] };
  }
  if (isConnectedFlow(items, edges)) {
    return width < COLUMN_MIN
      ? flowLayoutVertical(items, edges, width)
      : flowLayout(items, edges);
  }
  const nodes = width < COLUMN_MIN ? verticalLayout(items) : columnLayout(items);
  return { nodes, edges: keepEdges(items, edges) };
}
