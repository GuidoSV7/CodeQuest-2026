import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("existing authentication presentation contract", () => {
  it("hydrates a fixture session without network and keeps home status gating", () => {
    const hydrator = readFrontendFile(
      "src/features/auth/components/AuthSessionHydrator.tsx",
    );
    const homeStatus = readFrontendFile(
      "src/features/auth/components/HomeAuthStatus.tsx",
    );

    expect(hydrator).toContain("orbitalDemoSessionFixture");
    expect(hydrator).toContain("setHydrated(true)");
    expect(hydrator).not.toContain("fetchMe");
    expect(hydrator).not.toContain("axios");
    expect(homeStatus).toContain("!hydrated || !user");
    expect(homeStatus).toContain("user.displayName");
  });

  it("keeps Discord helpers in the service while the panel stays presentation-only", () => {
    const loginPage = readFrontendFile("src/app/(acceso)/login/page.tsx");
    const loginPanel = readFrontendFile(
      "src/features/auth/components/LoginPanel.tsx",
    );
    const authService = readFrontendFile(
      "src/features/auth/api/auth.service.ts",
    );

    expect(loginPage).toContain('startsWith("/")');
    expect(loginPage).toContain('startsWith("//")');
    expect(loginPanel).toContain("Continuar con Discord");
    expect(loginPanel).toContain("event.preventDefault()");
    expect(loginPanel).not.toContain("discordStartUrl");
    expect(loginPanel).not.toContain("logoutSession");
    expect(loginPanel).not.toContain("fetchMe");
    expect(authService).toContain("/api/auth/discord/start");
    expect(authService).toContain("/api/auth/logout");
    expect(authService).toContain("/api/auth/me");
  });

  it("keeps the local auth error catalog and hides unknown details", () => {
    const errorPage = readFrontendFile("src/app/(acceso)/auth/error/page.tsx");

    expect(errorPage).toContain("REASONS");
    expect(errorPage).toContain("access_denied");
    expect(errorPage).toContain("No se pudo completar");
    expect(errorPage).not.toContain("String(error)");
  });
});
