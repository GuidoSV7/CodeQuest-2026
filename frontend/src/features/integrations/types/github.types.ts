export type SharePayload = {
  readonly title: string;
  readonly text: string;
};

export type ClipboardPort = {
  readonly writeText: (text: string) => Promise<void>;
};

export type SharePort = {
  readonly share: (payload: SharePayload) => Promise<void>;
};

export type GithubCapabilityState = "available" | "unavailable" | "rejected";
