# catalog-diagnostics

Módulo independiente de **herramientas de diagnóstico** del catalog-scraper.
Hacen fetch **en vivo** contra DevTalles y emiten reportes (a stdout y `/tmp`).
Son CLIs de ops/desarrollo — **no** forman parte del API HTTP ni se ejecutan solas.

Consumen la API pública de `catalog-scraper` (config, parsers, use-cases); nunca
al revés.

## CLIs (`cli/`)

| Script | Qué hace | Comando |
|---|---|---|
| `diagnose-listings.cli.ts` | Baja cada listing y reporta parse OK / tarjetas problemáticas | `npm run diag:listings` |
| `investigate.cli.ts` | Reporte completo: listings + learning paths + slugs huérfanos → `/tmp/devtalles-prompt7-invest.json` | `npm run diag:investigate` |
| `dry-run.cli.ts` | Sync real sin persistir (dry-run) + resumen → `/tmp/devtalles-dry-run-report.json` | `npm run diag:dry-run` |

> Golpean el sitio real con rate-limit (~1.1s entre requests). Usar con criterio.
