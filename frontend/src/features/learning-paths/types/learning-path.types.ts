import type { OrbitalFixtureMode } from "@/features/orbital/fixtures";

export type LearningPathStatus =
  | "anonymous"
  | "authenticated"
  | "loading"
  | "empty"
  | "error"
  | "disabled";

export type LearningPathSection = {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly durationLabel: string | null;
  readonly etaLabel?: string | null;
  readonly state?: "active" | "queued" | "locked";
};

export type LearningPath = {
  readonly routeId: string;
  readonly title: string;
  readonly summary: string | null;
  readonly progressPercent: number | null;
  readonly completedSections: number | null;
  readonly totalSections: number | null;
  readonly statusLabel: string | null;
  readonly stageLabel: string | null;
  readonly nextActionLabel: string | null;
  readonly updatedAt: null;
  readonly sections: readonly LearningPathSection[];
  readonly hoursTelemetry?: string | null;
  readonly blocksTelemetry?: string | null;
  readonly delayDays?: number | null;
  readonly detailSummary?: string | null;
  readonly overallProgress?: number | null;
  readonly nextSectionLabel?: string | null;
  readonly courseTimeline?: readonly {
    readonly title: string;
    readonly status: "completed" | "active" | "waiting" | "locked";
  }[];
};

export type LearningPathCollection = {
  readonly routes: readonly LearningPath[];
};

export type LearningPathFixtureMap = Readonly<
  Record<OrbitalFixtureMode, LearningPathCollection | null>
>;
