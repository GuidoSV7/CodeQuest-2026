# CodeQuest backend

API NestJS. El catálogo público también se consulta por MCP, sin autenticación, en `/mcp` (no `/api/mcp`).

## Conectar el MCP

URL: `https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io/mcp`

Claude.ai: Ajustes → Conectores → Agregar conector personalizado. URL `https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io/mcp`. Autenticación: ninguna.

Claude Code:

```bash
claude mcp add --transport http codequest https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io/mcp
```

Cursor, en `.cursor/mcp.json` (o Settings → MCP):

```json
{
  "mcpServers": {
    "codequest": {
      "url": "https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io/mcp"
    }
  }
}
```
