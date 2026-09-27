import type { LiveScreen } from "./live-path-state";

const react = {
  type: "path.generated",
  strategy: "official_path",
  source_path_id: "programas-react",
  items: [
    { course_id: "1999158", title: "JavaScript Moderno: Guía para dominar el lenguaje", url: "https://cursos.devtalles.com/courses/javascript-moderno", bucket: "recommended", position: 0, already_known: false, partial: false },
    { course_id: "3395229", title: "React: de cero a experto", url: "https://cursos.devtalles.com/courses/react-de-cero", bucket: "required", position: 1, already_known: false, partial: false },
    { course_id: "1959693", title: "TypeScript: Tu completa guía y manual de mano", url: "https://cursos.devtalles.com/courses/typescript-guia-completa", bucket: "recommended", position: 2, already_known: false, partial: false },
  ],
  edges: [{ from_course_id: "3395229", to_course_id: "1959693" }],
};

const search = {
  type: "path.generated",
  strategy: "catalog_search",
  source_path_id: null,
  items: [
    { course_id: "2010982", title: "Angular Avanzado", url: "https://cursos.devtalles.com/courses/angular-avanzado", bucket: null, position: 0, already_known: false, partial: false },
    { course_id: "2095680", title: "Nest + GraphQL", url: "https://cursos.devtalles.com/courses/nest-graphql", bucket: null, position: 1, already_known: false, partial: false },
  ],
  edges: [],
};

export function fixtureScreen(name: string): LiveScreen {
  if (name === "choice") {
    return {
      kind: "eleccion",
      connection: "conectado",
      prompt: "Decile a Claude cuál preferís",
      options: [
        { path_id: "programas-react", title: "Ruta de aprendizaje React", alias: "react" },
        { path_id: "ruta-dart", title: "Ruta Dart", alias: "dart" },
      ],
    };
  }
  if (name === "waiting") return { kind: "esperando", connection: "conectado" };
  if (name === "search") {
    return {
      kind: "ruta",
      connection: "conectado",
      replay: false,
      model: {
        title: "Búsqueda",
        pathId: "search",
        allowProgress: false,
        edges: [],
        items: search.items.map(toItem),
      },
    };
  }
  const source = name === "dart" || name === "fundamentos" ? { ...react, source_path_id: name } : react;
  return {
    kind: "ruta",
    connection: "conectado",
    replay: false,
    model: {
      title: name === "dart" ? "Ruta Dart" : name === "fundamentos" ? "Fundamentos" : "Ruta React",
      pathId: source.source_path_id,
      allowProgress: false,
      edges: source.edges.map((edge) => ({ fromCourseId: edge.from_course_id, toCourseId: edge.to_course_id })),
      items: source.items.map(toItem),
    },
  };
}

function toItem(item: { course_id: string; title: string; url: string; bucket: string | null; position: number; already_known: boolean; partial: boolean }) {
  return {
    courseId: item.course_id,
    title: item.title,
    url: item.url,
    bucket: item.bucket as "required" | "recommended" | "optional" | "anytime" | null,
    position: item.position,
    alreadyKnown: item.already_known,
    partial: item.partial,
    completed: false,
    category: null,
    lessonCount: null,
    videoHours: null,
  };
}
