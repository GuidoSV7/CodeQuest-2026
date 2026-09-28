export function routeCreatedMessage(input: {
  event?: string;
  title?: string;
  replayed?: boolean;
}): string | null {
  if (input.replayed) return null;
  if (input.event !== "path.generated" && input.event !== "path_created") return null;
  const title = input.title?.trim();
  return title ? `Se armó la ruta ${title}.` : "Se armó una ruta.";
}
