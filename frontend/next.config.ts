import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

type OrbitalNextConfig = NextConfig & {
  allowedDevOrigins: string[];
};

const nextConfig: OrbitalNextConfig = {
  output: "standalone",
  allowedDevOrigins: ["10.110.100.99"],
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
};

export default nextConfig;
