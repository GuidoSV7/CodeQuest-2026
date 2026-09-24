import type { ReplanningActionState, ReplanningResult } from "../types/replanning.types";

export function initialReplanningState(): ReplanningResult {
  return { status: "idle", message: null };
}

export function transitionReplanning(
  action: "keep" | "accept" | "retry" | "simulate-error",
): ReplanningResult {
  if (action === "simulate-error") {
    return { status: "error", message: "La propuesta no se pudo aplicar en esta preview." };
  }
  if (action === "retry") {
    return initialReplanningState();
  }
  return {
    status: "success",
    message:
      action === "keep"
        ? "Mantenemos tu propuesta actual en esta preview."
        : "La propuesta queda aceptada visualmente en esta preview.",
  };
}

export function isActionDisabled(state: ReplanningResult): boolean {
  return state.status === "loading";
}

export type { ReplanningActionState };
