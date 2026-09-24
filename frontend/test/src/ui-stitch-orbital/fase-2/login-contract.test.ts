import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("login contract", () => {
  it("keeps the existing Discord helpers and auth routes untouched", () => {
    const service = readFrontendFile("src/features/auth/api/auth.service.ts");
    const panel = readFrontendFile(
      "src/features/auth/components/LoginPanel.tsx",
    );

    expect(service).toContain("fetchMe");
    expect(service).toContain("logoutSession");
    expect(service).toContain("discordStartUrl");
    expect(service).toContain("/api/auth/me");
    expect(service).toContain("/api/auth/logout");
    expect(service).toContain("/api/auth/discord/start");
    expect(panel).toContain("discordStartUrl(returnTo)");
    expect(panel).toContain("logoutSession()");
  });

  it("rejects external returnTo values before the panel receives them", () => {
    const page = readFrontendFile("src/app/(acceso)/login/page.tsx");

    expect(page).toContain('returnTo.startsWith("/")');
    expect(page).toContain('!returnTo.startsWith("//")');
    expect(page).toContain(' : "/"');
    expect(page).not.toContain("window.location");
  });

  it("keeps credential and guest copy presentation-only", () => {
    const panel = readFrontendFile(
      "src/features/auth/components/LoginPanel.tsx",
    );

    expect(panel).toContain('type="password"');
    expect(panel).toContain("MODO INVITADO DISPONIBLE");
    expect(panel).toContain("event.preventDefault()");
    expect(panel).not.toContain("fetch(");
    expect(panel).not.toContain("localStorage");
  });
});
