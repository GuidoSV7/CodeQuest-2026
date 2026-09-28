const STORAGE_KEY = "cq_session_token";

export function captureLocalSessionFromLocation(
  location: Pick<Location, "hash" | "pathname" | "search">,
  storage: Pick<Storage, "setItem">,
  replace: (url: string) => void,
): void {
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  const token = params.get("cq_session");
  if (!token) return;
  storage.setItem(STORAGE_KEY, token);
  params.delete("cq_session");
  const rest = params.toString();
  replace(`${location.pathname}${location.search}${rest ? `#${rest}` : ""}`);
}

export function readLocalSessionToken(storage: Pick<Storage, "getItem"> | undefined): string | null {
  if (!storage) return null;
  return storage.getItem(STORAGE_KEY);
}

export function clearLocalSessionToken(storage: Pick<Storage, "removeItem"> | undefined): void {
  storage?.removeItem(STORAGE_KEY);
}

export function loginReturnTarget(origin: string, path: string): string {
  const relative = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  try {
    const url = new URL(origin);
    if (url.protocol === "http:" && url.port === "3000" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      return `${url.origin}${relative}`;
    }
  } catch {
    return relative;
  }
  return relative;
}
