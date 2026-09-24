import type { OrbitalFixtureMode } from "./modes";

export type LearningPathSection = {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly durationLabel: string | null;
  readonly etaLabel?: string | null;
  readonly state?: "active" | "queued" | "locked";
};

export type LearningPathFixture = {
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

export type LearningPathCollectionFixture = {
  readonly routes: readonly LearningPathFixture[];
};

const backendRoute: LearningPathFixture = {
  routeId: "orbital-route-demo",
  title: "Backend con Nest",
  summary:
    "Ruta técnica de especialización para arquitectura de servicios distribuidos y microservicios modulares en TypeScript.",
  progressPercent: 34,
  completedSections: null,
  totalSections: null,
  statusLabel: "En progreso",
  stageLabel: "Etapa 02",
  nextActionLabel: "Continuar: TypeScript — sección 4",
  updatedAt: null,
  hoursTelemetry: "HORAS: 14/42",
  blocksTelemetry: "BLOQUES: 08/24",
  delayDays: 4,
  detailSummary:
    "Ruta técnica de especialización para arquitectura de servicios distribuidos y microservicios modulares en TypeScript.",
  overallProgress: 48.2,
  nextSectionLabel: "Sección 04: Transpilación",
  courseTimeline: [
    { title: "git y github desde cero", status: "completed" },
    { title: "typescript", status: "active" },
    { title: "node", status: "waiting" },
    { title: "nest", status: "locked" },
  ],
  sections: [
    {
      id: "typescript-section-4",
      title: "TypeScript — sección 4",
      description: "Transpilación y configuración del compilador TypeScript.",
      durationLabel: "FASE 03 EN VUELO",
      etaLabel: "ETA: 12 OCT",
      state: "active",
    },
  ],
};

const frontendRoute: LearningPathFixture = {
  routeId: "orbital-route-frontend",
  title: "Frontend con React",
  summary: "Ecosistema cliente",
  progressPercent: 0,
  completedSections: null,
  totalSections: null,
  statusLabel: "Trayectoria",
  stageLabel: "Sin empezar",
  nextActionLabel: null,
  updatedAt: null,
  hoursTelemetry: "HORAS: 0/42",
  blocksTelemetry: "BLOQUES: 00/24",
  delayDays: null,
  detailSummary: null,
  overallProgress: null,
  nextSectionLabel: null,
  courseTimeline: undefined,
  sections: [],
};

const learningPathCollection: LearningPathCollectionFixture = {
  routes: [backendRoute, frontendRoute],
};

export const learningPathFixtures: Readonly<
  Record<OrbitalFixtureMode, LearningPathCollectionFixture | null>
> = {
  anonymous: null,
  authenticated: learningPathCollection,
  loading: null,
  empty: null,
  error: null,
  disabled: null,
};
