import type { Metadata } from "next";
import { McpDocs } from "@/features/mcp-docs/components/McpDocs";

export const metadata: Metadata = {
  title: "Cómo usar el MCP",
  description:
    "Conectá el catálogo DevTalles y tus rutas de CodeQuest a Cursor o Claude con el servidor MCP.",
  alternates: { canonical: "/docs/mcp" },
};

export default function McpDocsPage() {
  return (
    <main>
      <McpDocs />
    </main>
  );
}
