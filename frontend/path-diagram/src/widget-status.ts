export const WIDGET_RESULT_TIMEOUT_MS = 8000;

export function widgetView(input: {
  text: string | null;
  isError: boolean;
  elapsedMs: number;
}): { kind: "waiting" | "timeout" | "error" | "data"; message: string } {
  if (input.isError) {
    const detail = input.text?.trim();
    return {
      kind: "error",
      message: detail
        ? `No se pudo mostrar la ruta. ${detail}`
        : "No se pudo mostrar la ruta. Error del servidor. Podés reintentar.",
    };
  }
  if (input.text) return { kind: "data", message: input.text };
  if (input.elapsedMs >= WIDGET_RESULT_TIMEOUT_MS) {
    return { kind: "timeout", message: "La ruta no llegó a tiempo. Podés reintentar." };
  }
  return { kind: "waiting", message: "Esperando la ruta…" };
}
