import type {
  ClipboardPort,
  SharePayload,
  SharePort,
} from "../types/github.types";

export type BrowserCapabilitiesSource = {
  readonly clipboard?: {
    readonly writeText: (text: string) => Promise<void>;
  };
  readonly share?: (payload: SharePayload) => Promise<void>;
};

export type BrowserCapabilities = {
  readonly clipboard: ClipboardPort | null;
  readonly share: SharePort | null;
};

export function getBrowserCapabilities(
  source: BrowserCapabilitiesSource | undefined,
): BrowserCapabilities {
  const clipboard = source?.clipboard;
  const share = source?.share;
  return {
    clipboard: clipboard
      ? { writeText: (text) => clipboard.writeText(text) }
      : null,
    share: share ? { share } : null,
  };
}
