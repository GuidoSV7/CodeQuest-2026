export type PathProgressSnapshot = {
  status: "active" | "archived";
  updatedAt: string;
  progressRatio: number;
  completedCount: number;
  itemCount: number;
};

export type RadarProgress = {
  progressRatio: number;
  completedCount: number;
  itemCount: number;
};

const IDLE: RadarProgress = {
  progressRatio: 0,
  completedCount: 0,
  itemCount: 0,
};

export function radarBearingDegrees(progressRatio: number): number {
  return clampRatio(progressRatio) * 360;
}

export function activeNodeIndex(progressRatio: number, nodeCount: number): number {
  if (nodeCount <= 0) return -1;
  const ratio = clampRatio(progressRatio);
  if (ratio <= 0) return -1;
  if (ratio >= 1) return nodeCount - 1;
  return Math.min(nodeCount - 1, Math.floor(ratio * nodeCount));
}

export function selectActivePathProgress(
  paths: PathProgressSnapshot[],
): RadarProgress {
  const active = paths
    .filter((path) => path.status === "active")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!active) return IDLE;

  return {
    progressRatio: clampRatio(active.progressRatio),
    completedCount: active.completedCount,
    itemCount: active.itemCount,
  };
}

function clampRatio(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
