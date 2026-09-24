import type { ReplanningFixture } from "@/../test/fixtures/ui-stitch-orbital";

export type ReplanningActionState = "idle" | "loading" | "success" | "error";

export type ReplanningResult = {
  status: ReplanningActionState;
  message: string | null;
};

export type { ReplanningFixture };
