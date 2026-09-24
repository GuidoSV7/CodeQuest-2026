import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

/** Post-migration: documents that acceso lives under the login shell layout. */
describe("acceso shell after (acceso) group", () => {
  it("keeps login and auth under MissionShell variant=login layout only", () => {
    const accesoLayout = readFrontendFile("src/app/(acceso)/layout.tsx");
    const loginPage = readFrontendFile("src/app/(acceso)/login/page.tsx");
    const authError = readFrontendFile("src/app/(acceso)/auth/error/page.tsx");
    const shellCss = readFrontendFile(
      "src/features/orbital/components/MissionShell.module.css",
    );

    expect(accesoLayout).toContain('<MissionShell variant="login">');
    expect(loginPage).not.toContain("MissionShell");
    expect(authError).not.toContain("MissionShell");
    expect(shellCss).not.toContain(":has(#login-content)");
  });
});
