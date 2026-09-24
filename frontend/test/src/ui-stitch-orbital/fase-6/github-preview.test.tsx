import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { githubPreviewFixture } from "@/../test/fixtures/ui-stitch-orbital";
import { getBrowserCapabilities } from "@/features/integrations/lib/browser-capabilities";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("safe GitHub preview", () => {
  it("keeps the fixture free of secrets, endpoints and unverified URLs", () => {
    const component = readFrontendFile(
      "src/features/integrations/components/GithubPreview.tsx",
    );

    expect(githubPreviewFixture.repositoryLabel).toBeNull();
    expect(JSON.stringify(githubPreviewFixture)).not.toMatch(
      /(token|secret|oauth|https?:\/\/|api\/)/i,
    );
    expect(component).toContain("Tu ruta en tu GitHub");
  });

  it("models absent browser capabilities without touching the browser", () => {
    const component = readFrontendFile(
      "src/features/integrations/components/GithubPreview.tsx",
    );
    const capabilities = getBrowserCapabilities(undefined);

    expect(capabilities).toEqual({ clipboard: null, share: null });
    expect(component).toContain("No se pudo copiar");
    expect(component).toContain("Compartir no está disponible");
  });

  it("supports injected success and rejection ports", async () => {
    const copied: string[] = [];
    const success = getBrowserCapabilities({
      clipboard: {
        writeText: async (text) => {
          copied.push(text);
        },
      },
      share: async () => undefined,
    });
    const rejected = getBrowserCapabilities({
      clipboard: {
        writeText: async () => {
          throw new Error("permission denied");
        },
      },
      share: async () => {
        throw new Error("permission denied");
      },
    });

    await success.clipboard?.writeText("local");
    expect(copied).toEqual(["local"]);
    if (rejected.clipboard === null || rejected.share === null) {
      throw new Error("rejected capabilities should be available");
    }
    await expect(rejected.clipboard.writeText("local")).rejects.toThrow(
      "permission denied",
    );
    await expect(rejected.share.share({ title: "local", text: "local" })).rejects.toThrow(
      "permission denied",
    );
  });
});
