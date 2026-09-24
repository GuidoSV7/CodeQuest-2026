export type TokenAction = "generate" | "copy" | "revoke" | "retry";

export type TokenPreviewState = {
  readonly status: "idle" | "loading" | "success" | "error";
  readonly maskedToken: string | null;
  readonly message: string | null;
};
