type OfficialPath = { id: string; label: string; icon: string };

export const OFFICIAL_PATHS = [
  { id: "programas-fundamentos", label: "Fundamentos", icon: "javascript.svg" },
  { id: "programas-react", label: "React", icon: "react.svg" },
  { id: "programas-vue", label: "Vue", icon: "vue.svg" },
  { id: "programas-angular", label: "Angular", icon: "angular.svg" },
  { id: "programas-node", label: "Node", icon: "node.svg" },
  { id: "programas-nest", label: "NestJS", icon: "nest.svg" },
  { id: "ruta-dart", label: "Dart y Flutter", icon: "dart.svg" },
  { id: "ruta-python", label: "Python", icon: "python.svg" },
  { id: "ruta-java", label: "Java", icon: "java.svg" },
  { id: "ruta-c", label: "C# y .NET", icon: "csharp.svg" },
  { id: "ruta-ia", label: "Inteligencia artificial", icon: "ia.svg" },
  { id: "ruta-php", label: "PHP", icon: "php.svg" },
  { id: "ruta-go", label: "Go", icon: "go.svg" },
] as const satisfies readonly OfficialPath[];

export type OfficialPathId = (typeof OFFICIAL_PATHS)[number]["id"];

const ICON_BASE_PATH = "/devtalles-tech/";

export function officialPathIconSrc(pathId: string | null): string | null {
  const path = OFFICIAL_PATHS.find((item) => item.id === pathId);
  return path ? `${ICON_BASE_PATH}${path.icon}` : null;
}

export function officialPathLabel(pathId: OfficialPathId): string {
  return OFFICIAL_PATHS.find((item) => item.id === pathId)?.label ?? pathId;
}
