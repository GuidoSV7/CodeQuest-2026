import type { ReplanningFixture } from "@/features/orbital/fixtures";

export type ReplanningActionState = "idle" | "loading" | "success" | "error";

export type ReplanningResult = {
  status: ReplanningActionState;
  message: string | null;
};

export type { ReplanningFixture };
