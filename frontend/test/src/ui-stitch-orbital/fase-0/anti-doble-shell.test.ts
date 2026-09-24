import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

function countTag(source: string, tag: "header" | "footer"): number {
  const open = new RegExp(`<${tag}\\b`, "g");
  return (source.match(open) ?? []).length;
}

describe("anti-doble-shell acceso composition", () => {
  it("ui.shell.double_chrome: login page + acceso layout yield a single shell chrome", () => {
    const accesoLayout = readFrontendFile("src/app/(acceso)/layout.tsx");
    const loginPage = readFrontendFile("src/app/(acceso)/login/page.tsx");
    const authError = readFrontendFile("src/app/(acceso)/auth/error/page.tsx");
    const shell = readFrontendFile(
      "src/features/orbital/components/MissionShell.tsx",
    );

    expect(accesoLayout).toContain('<MissionShell variant="login">');
    expect(loginPage).not.toContain("MissionShell");
    expect(loginPage).not.toContain("skipLink");
    expect(authError).not.toContain("MissionShell");

    const loginComposition = `${accesoLayout}\n${loginPage}`;
    const authComposition = `${accesoLayout}\n${authError}`;

    // Shell markup itself has exactly one header/footer per variant;
    // pages must not add another MissionShell (already asserted above).
    expect(countTag(shell, "header")).toBe(2); // product + login branches
    expect(countTag(shell, "footer")).toBe(2);
    expect(loginComposition).toContain('variant="login"');
    expect(authComposition).toContain('variant="login"');
    expect(loginPage).not.toMatch(/<header\b/);
    expect(loginPage).not.toMatch(/<footer\b/);
    expect(authError).not.toMatch(/<header\b/);
    expect(authError).not.toMatch(/<footer\b/);
  });

  it("removes :has(#login-content) chrome patch and keeps a single login skip target", () => {
    const shellCss = readFrontendFile(
      "src/features/orbital/components/MissionShell.module.css",
    );
    const shell = readFrontendFile(
      "src/features/orbital/components/MissionShell.tsx",
    );
    const loginPage = readFrontendFile("src/app/(acceso)/login/page.tsx");

    expect(shellCss).not.toContain(":has(#login-content)");
    expect(shell).toContain('href="#login-shell-content"');
    expect(loginPage).not.toContain('href="#login-content"');
    expect(loginPage).not.toContain("Saltar al contenido");
  });
});
