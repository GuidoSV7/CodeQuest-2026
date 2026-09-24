import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { tokenPreviewFixture } from "@/../test/fixtures/ui-stitch-orbital";
import {
  initialTokenState,
  tokenErrorState,
  transitionTokenState,
} from "@/features/integrations/lib/token-state";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("mock token preview", () => {
  it("keeps the fixture explicitly non-credential and masked", () => {
    const component = readFrontendFile(
      "src/features/integrations/components/TokenPreview.tsx",
    );

    expect(tokenPreviewFixture.isRealCredential).toBe(false);
    expect(tokenPreviewFixture.maskedToken).toContain("[masked]");
    expect(JSON.stringify(tokenPreviewFixture)).not.toMatch(
      /(secret|password|authorization|oauth|https?:\/\/|api\/)/i,
    );
    expect(component).toContain("PREVIEW MOCK-ONLY");
  });

  it("models generate, copy, revoke, error and retry locally", () => {
    const component = readFrontendFile(
      "src/features/integrations/components/TokenPreview.tsx",
    );
    const initial = initialTokenState(tokenPreviewFixture.maskedToken);

    expect(transitionTokenState(initial, "generate").status).toBe("success");
    expect(transitionTokenState(initial, "copy").maskedToken).toBe(
      tokenPreviewFixture.maskedToken,
    );
    expect(transitionTokenState(initial, "revoke").maskedToken).toBeNull();
    expect(tokenErrorState(initial).status).toBe("error");
    expect(transitionTokenState(tokenErrorState(initial), "retry").status).toBe(
      "idle",
    );
    expect(component).toContain("aria-expanded");
    expect(component).toContain("aria-live");
  });

  it("shows the masked preview without a session gate and without network side effects", () => {
    const component = readFrontendFile(
      "src/features/integrations/components/TokenPreview.tsx",
    );

    expect(component).toContain("Tokens de acceso");
    expect(component).not.toContain("if (!user)");
    expect(component).not.toContain("Preview protegida");
    expect(component).not.toContain("useAuthStore");
    expect(component).not.toMatch(
      /\b(fetch|axios|localStorage|sessionStorage|document\.cookie|oauth)\b/i,
    );
  });
});
