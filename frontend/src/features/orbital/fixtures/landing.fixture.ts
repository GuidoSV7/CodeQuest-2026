export type LandingDoor = {
  readonly id: "start" | "switch" | "specialize" | "unknown";
  readonly label: string;
  readonly description: string;
  readonly href: string;
  readonly metadata: readonly [string, string];
};

export const landingFixture: Readonly<{
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  telemetry: readonly [string, string][];
  doors: readonly LandingDoor[];
  protocol: {
    readonly title: string;
    readonly description: string;
    readonly items: readonly string[];
  };
}> = {
  eyebrow:
    "SISTEMA DE NAVEGACIÓN Y CALIBRACIÓN DE CARRERA // DEV_PATH_ORBITAL",
  title: "descubre tu ruta de aprendizaje ideal",
  subtitle: "Tu próximo nivel técnico no es casualidad. Es una misión calculada.",
  description:
    "Armá tu ruta con los cursos oficiales de DevTalles. Ves por dónde empezar, qué curso sigue y podés generarla desde el configurador o desde tu editor con MCP.",
  ctaLabel: "Descubre tu ruta",
  ctaHref: "/configurador-de-ruta",
  telemetry: [
    ["TAXONOMÍA", "38 RUTAS ACTIVAS"],
    ["CERTIFICACIÓN", "100% PRODUCCIÓN"],
  ],
  doors: [
    {
      id: "start",
      label: "empiezo de cero",
      description:
        "Fundamentos sólidos, lógica de programación estructurada, Git y primeros pasos en JavaScript y TypeScript sin lagunas de concepto.",
      href: "/configurador-de-ruta",
      metadata: ["Nivel", "Inicial"],
    },
    {
      id: "switch",
      label: "cambio de stack",
      description:
        "Vienes de otro lenguaje o ecosistema backend/mobile y necesitas productividad inmediata en React, NestJS, Node o Flutter.",
      href: "/configurador-de-ruta",
      metadata: ["Nivel", "Intermedio"],
    },
    {
      id: "specialize",
      label: "especializarme",
      description:
        "Lleva tu código a escala de alta disponibilidad: microservicios distribuidos, testing automatizado, arquitectura hexagonal y DevOps pragmático.",
      href: "/configurador-de-ruta",
      metadata: ["Nivel", "Avanzado"],
    },
    {
      id: "unknown",
      label: "no sé qué quiero",
      description:
        "Deja que el test situacional detecte tus inclinaciones operativas entre frontend reactivo, backend sistémico, pipelines de nube o mobile.",
      href: "/configurador-de-ruta",
      metadata: ["Diagnóstico", "Completo"],
    },
  ],
  protocol: {
    title: "Algoritmo de alineación técnica continua",
    description:
      "Sin contenidos de relleno • Enfoque 100% en habilidades de producción real",
    items: [
      "ESTRUCTURADO POR FERNANDO HERRERA",
      "TELEMETRÍA EN TIEMPO REAL",
      "CERO DEUDA TÉCNICA",
    ],
  },
};
