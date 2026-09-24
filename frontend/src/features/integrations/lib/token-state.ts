import type { TokenAction, TokenPreviewState } from "../types/token.types";

export function initialTokenState(maskedToken: string): TokenPreviewState {
  return { status: "idle", maskedToken, message: null };
}

export function transitionTokenState(
  state: TokenPreviewState,
  action: TokenAction,
): TokenPreviewState {
  if (action === "retry") {
    return { status: "idle", maskedToken: state.maskedToken, message: null };
  }
  if (action === "revoke") {
    return {
      status: "success",
      maskedToken: null,
      message: "La preview quedó revocada visualmente.",
    };
  }
  if (action === "generate") {
    return {
      status: "success",
      maskedToken: state.maskedToken,
      message: "La preview fue generada localmente.",
    };
  }
  return {
    status: "success",
    maskedToken: state.maskedToken,
    message: "Se mantuvo el valor enmascarado.",
  };
}

export function tokenErrorState(state: TokenPreviewState): TokenPreviewState {
  return {
    status: "error",
    maskedToken: state.maskedToken,
    message: "La acción simulada no pudo completarse.",
  };
}
