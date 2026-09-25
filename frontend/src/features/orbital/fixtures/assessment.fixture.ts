import type { OrbitalFixtureMode } from "./modes";

export type AssessmentOption = {
  readonly id: string;
  readonly label: string;
  readonly detail: string | null;
};

export type AssessmentQuestion = {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly AssessmentOption[];
};

export type AssessmentResult = {
  readonly archetype: string | null;
  readonly affinity: string | null;
  readonly complexity?: string | null;
  readonly primaryDomain?: string | null;
  readonly systemStatus?: string | null;
  readonly radar: Readonly<{
    infra: number | null;
    backend: number | null;
    frontend: number | null;
    community: number | null;
    shipper: number | null;
    quality: number | null;
  }>;
  readonly recommendations: readonly string[];
  readonly routeCards?: readonly {
    readonly label: string;
    readonly title: string;
    readonly match: string;
    readonly location: string;
    readonly duration: string;
    readonly completion: string;
    readonly courses: string;
    readonly sequence?: readonly string[];
    readonly description: string;
    readonly action: string;
  }[];
};

export type CheckpointFixture = {
  readonly prompt: string;
  readonly options: readonly AssessmentOption[];
  readonly correctOptionId: string | null;
};

export type AssessmentFixture = {
  readonly questions: readonly AssessmentQuestion[];
  readonly result: AssessmentResult;
  readonly checkpoint: CheckpointFixture;
};

export const assessmentFixture: AssessmentFixture = {
  questions: [
    {
      id: "saturday-vector",
      prompt: "Tienes un sábado libre y ganas de codear.",
      options: [
        {
          id: "inv-data",
          label: "Optimizo una query que me tiene picado",
          detail: "Rendimiento interno y profiling",
        },
        {
          id: "art-design",
          label: "Rediseño la UI de mi side project",
          detail: "Micro-interacciones y pulido visual",
        },
        {
          id: "real-infra",
          label: "Monto el pipeline de deploy que llevo posponiendo",
          detail: "Automatización y CI/CD robusto",
        },
        {
          id: "ent-product",
          label: "Lanzo un MVP y se lo mando a 10 personas",
          detail: "Feedback temprano y tracción",
        },
      ],
    },
  ],
  result: {
    archetype: "Investigador que shipea",
    affinity: "94.2%",
    complexity: "NIVEL III",
    primaryDomain:
      "Infraestructura Distribuida + Lógica de Alto Rendimiento",
    systemStatus: "SYS::READY",
    radar: {
      infra: null,
      backend: null,
      frontend: null,
      community: null,
      shipper: null,
      quality: null,
    },
    recommendations: [
      "Backend con Nest",
      "Frontend con React",
      "Go desde cero",
    ],
    routeCards: [
      {
        label: "RUTA RECOMENDADA #01 ✦ 98% MATCH",
        title: "Backend con Nest",
        match: "98% MATCH",
        location: "LOC: PRI-01",
        duration: "DURACIÓN: 140 HORAS",
        completion: "FINALIZACIÓN: 18 NOV 2025",
        courses: "5 CURSOS",
        sequence: [
          "NestJS Microservicios",
          "Docker & K8s",
          "React Enterprise",
          "AWS Lambda",
        ],
        description: "ACCESO INMEDIATO",
        action: "Elegir esta ruta",
      },
      {
        label: "RUTA ALTERNATIVA #02 ✦ 89% MATCH",
        title: "Frontend con React",
        match: "89% MATCH",
        location: "LOC: ALT-02",
        duration: "DURACIÓN: 96 HORAS",
        completion: "FINALIZACIÓN: 04 OCT 2025",
        courses: "4 CURSOS",
        description: "ESCALABILIDAD UI & PERFORMANCE",
        action: "Examinar ruta",
      },
      {
        label: "VECTOR SORPRESA #03 ✦ DESAFÍO COGNITIVO",
        title: "Go desde cero",
        match: "DESAFÍO COGNITIVO",
        location: "LOC: VEC-03",
        duration: "DURACIÓN: 80 HORAS",
        completion: "FINALIZACIÓN: 12 SEP 2025",
        courses: "3 CURSOS",
        description: "MEMORIA SEGURA & WEBASSEMBLY",
        action: "Examinar ruta",
      },
    ],
  },
  checkpoint: {
    prompt: "¿Qué hace 'readonly' en una propiedad de una interfaz?",
    options: [
      {
        id: "prevents-reassignment",
        label: "Impide reasignarla después de la inicialización",
        detail: null,
      },
      {
        id: "optional",
        label: "La hace opcional",
        detail: null,
      },
      {
        id: "private",
        label: "La convierte en privada",
        detail: null,
      },
      {
        id: "read-from-class",
        label: "Solo permite leerla desde otra clase",
        detail: null,
      },
    ],
    correctOptionId: null,
  },
};

export const assessmentFixtures: Readonly<
  Record<OrbitalFixtureMode, AssessmentFixture | null>
> = {
  anonymous: assessmentFixture,
  authenticated: assessmentFixture,
  loading: null,
  empty: null,
  error: null,
  disabled: null,
};
