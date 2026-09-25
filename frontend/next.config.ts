import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type OrbitalNextConfig = NextConfig & {
  allowedDevOrigins: string[];
};

const appDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDir, "..");
// Workspace installs hoist `debug` to the repo root. Turbopack only resolves
// inside `root`, so a frontend-only root cannot see that package.
const moduleRoot = existsSync(path.join(workspaceRoot, "node_modules", "debug"))
  ? workspaceRoot
  : appDir;

const nextConfig: OrbitalNextConfig = {
  output: "standalone",
  allowedDevOrigins: ["10.110.100.99"],
  outputFileTracingRoot: moduleRoot,
  transpilePackages: ["path-diagram"],
  turbopack: {
    root: moduleRoot,
  },
};

export default nextConfig;
