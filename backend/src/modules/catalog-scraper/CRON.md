# Decisión de cron — scraper DevTalles

## Elección: **cron de plataforma** (default)

| Opción | Pros | Contras |
|---|---|---|
| Scheduler in-process (`node-cron` / `setInterval`) | Simple en un solo contenedor 24/7 | No corre si la app escala a 0, duerme (serverless) o reinicia a media ejecución; duplica jobs con N réplicas sin lock externo |
| **Cron de plataforma / GitHub Actions → CLI** | Corre aunque la API esté dormida; un solo disparo; logs/auditoría del runner; encaja con Dokploy/GitHub | Requiere secretos/env en el runner |

**Decisión:** `CATALOG_CRON_MODE=platform` por defecto. El job diario invoca el disparo manual:

```bash
npm run catalog:sync
# o dry-run:
npm run catalog:sync -- --dry-run
```

Hora configurable vía el scheduler externo (y documentada en `CATALOG_CRON_SCHEDULE`, p. ej. `0 6 * * *` = 06:00 UTC).

El workflow de ejemplo está en `.github/workflows/catalog-sync.yml`.

## Opt-in in-process

Solo si el deploy garantiza un proceso siempre vivo y una sola réplica (o Redis lock compartido):

```bash
CATALOG_CRON_MODE=in-process
CATALOG_CRON_IN_PROCESS=true
CATALOG_CRON_SCHEDULE=0 6 * * *
```

Incluso entonces, el **lock** (`catalog:lock`) evita solapes con el disparo manual.

## Lock

Toda ejecución (cron plataforma, in-process o CLI manual) pasa por `runCatalogSyncJob` + `CatalogLock`.
