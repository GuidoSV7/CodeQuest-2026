import type { OfficialPathId } from "@/config/official-paths";

export type LandingDoor = {
  readonly id: "start" | "switch" | "specialize" | "unknown";
  readonly label: string;
  readonly description: string;
  readonly href: string;
  readonly metadata: readonly [string, string];
  // Explícito y no derivado del href: `unknown` abre Fundamentos pero no debe mostrar su logo.
  readonly stackPathId: OfficialPathId | null;
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
  eyebrow: "Rutas de aprendizaje de DevTalles",
  title: "Descubrí tu ruta de aprendizaje ideal",
  subtitle: "Tu próximo nivel técnico no es casualidad. Es una misión calculada.",
  description:
    "Elegí una ruta oficial del catálogo de DevTalles o pedile a tu IA que arme una a tu medida con el MCP de CodeQuest. Después seguís tu avance curso por curso.",
  ctaLabel: "Configurá tu ruta",
  ctaHref: "/configurador-de-ruta",
  telemetry: [
    ["Catálogo", "DevTalles"],
    ["Con tu IA", "MCP para Claude y Cursor"],
  ],
  doors: [
    {
      id: "start",
      label: "Empiezo de cero",
      description:
        "Fundamentos sólidos, lógica de programación estructurada, Git y primeros pasos en JavaScript y TypeScript sin lagunas de concepto.",
      href: "/configurador-de-ruta?panel=form&path=programas-fundamentos",
      metadata: ["Nivel", "Inicial"],
      stackPathId: "programas-fundamentos",
    },
    {
      id: "switch",
      label: "Cambio de stack",
      description:
        "Venís de otro lenguaje o ecosistema backend/mobile y necesitás productividad inmediata en React, NestJS, Node o Flutter.",
      href: "/configurador-de-ruta?panel=form&path=programas-react",
      metadata: ["Nivel", "Intermedio"],
      stackPathId: "programas-react",
    },
    {
      id: "specialize",
      label: "Quiero especializarme",
      description:
        "Llevá tu código a escala: microservicios, testing automatizado, arquitectura hexagonal y DevOps pragmático.",
      href: "/configurador-de-ruta?panel=form&path=programas-nest",
      metadata: ["Nivel", "Avanzado"],
      stackPathId: "programas-nest",
    },
    {
      id: "unknown",
      label: "No sé qué quiero",
      description:
        "¿No tenés claro por dónde ir? Empezá por Fundamentos en el formulario. Si preferís que tu IA te arme una ruta a medida, en el configurador también tenés el MCP.",
      href: "/configurador-de-ruta?panel=form&path=programas-fundamentos",
      metadata: ["Nivel", "Inicial"],
      stackPathId: null,
    },
  ],
  protocol: {
    title: "Qué vas a encontrar",
    description:
      "Cursos del catálogo oficial de DevTalles, ordenados en una ruta que podés seguir curso por curso.",
    items: [
      "Rutas oficiales del catálogo DevTalles",
      "Tu progreso guardado en tu cuenta",
      "Rutas a medida con tu IA vía MCP",
    ],
  },
};
