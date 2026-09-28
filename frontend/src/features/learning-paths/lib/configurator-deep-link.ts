import { OFFICIAL_PATHS, type OfficialPathId } from "@/config/official-paths";

export type ConfiguratorSearchParams = Record<string, string | string[] | undefined>;

export type ConfiguratorInitialState = {
  initialPanel: "none" | "form";
  initialPathId: OfficialPathId;
};

// Allowlist exacta: la URL es input externo; `panel=mcp` se ignora a propósito (abrir un modal desde la URL no está pedido).
export function parseConfiguratorDeepLink(params: ConfiguratorSearchParams): ConfiguratorInitialState {
  const { panel, path } = params;
  return {
    initialPanel: panel === "form" ? "form" : "none",
    initialPathId: typeof path === "string" && isOfficialPathId(path) ? path : OFFICIAL_PATHS[0].id,
  };
}

function isOfficialPathId(value: string): value is OfficialPathId {
  return OFFICIAL_PATHS.some((item) => item.id === value);
}
