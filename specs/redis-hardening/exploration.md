## Exploration: redis-hardening

### Current State

Redis is a standalone Dokploy database service (`redis:7`, running **7.4.11**, `redis_mode: standalone`). There is no Compose stack in the repo and no Compose service in Dokploy. The only production Redis client is ioredis in the catalog module. Sessions, users, learning paths, progress, OAuth grants, refresh tokens, and PATs are not stored in Redis.

Live read-only probe (2026-09-25): `DBSIZE` 2, `used_memory` 3.25M (peak 5.02M), `maxmemory` 0, `maxmemory-policy` noeviction, `appendonly` no, `aof_enabled` 0, `save` `3600 1 300 100 60 10000`, `dir` `/data`, `dbfilename` `dump.rdb`, `requirepass` set. Last successful RDB: `2026-09-21T02:30:43Z`, `rdb_changes_since_last_save` 0, `rdb_last_bgsave_status` ok. Volume file listing contains `dump.rdb` only (no AOF file). `appendfsync` is `everysec` but has no effect while AOF is off.

#### Live Redis keys

| Key | Module | Type | TTL | If the key disappears |
|---|---|---|---|---|
| `catalog:current` | catalog-scraper repository. Value is `vN` (live strlen 2, MEMORY USAGE 72). | string | none (`TTL -1`). Written by `SET`, no `EXPIRE`/`SETEX`. | `getCurrent()` returns null. MCP cache serves `catalog.seed.json` from memory and keeps serving it. Learning-path reads treat the catalog as empty and can mark path courses unavailable. Writes that need a catalog return 503. Boot does not re-import the seed. |
| `catalog:v{n}` | Same repository. Live key `catalog:v1`, strlen 1,677,554, MEMORY USAGE 1,835,064. | string | none | If the pointer still names this key, `getCurrent()` returns null (same outcomes as a missing pointer). Older versions are deleted only by the in-app GC after a newer save. |
| `catalog:previous` | Same repository. Pointer string `vN` written only when a previous current pointer exists. **Not present** in the live DB (only `v1` has been saved). | string | none | Readers do not load it. The next save simply omits updating it until a current pointer exists. No user-facing data loss. |

No other keys were present. There is no `INCR`, `EXPIRE`, `SETEX`, or `DEL` of user/session/token data on this instance. `DEL` is used only to GC old `catalog:v{n}` keys after a successful save (`retainPreviousVersions` default 1). Pointer updates are an ioredis pipeline of `SET`s, not `MULTI`/`EXEC`.

#### Declared but not Redis

| Name | Where | What actually happens |
|---|---|---|
| `REDIS_KEYS.lock` (`catalog:lock`) | Constant in `catalog-repository.port.ts`. Never referenced. | Cron/manual sync uses `createMemoryCatalogLock()` (process `Map`). Default TTL 1,800,000 ms, key string `catalog:lock`. Comment in the Nest module: lock stays process-local. Loss of the process drops the lock; it is not a Redis key. |
| `oauth:state:{state}` | `createRedisLikeOAuthStateStore` only. TTL is an `expiresAt` field inside the JSON, not Redis `EXPIRE`. | Nest wires `createMemoryOAuthStateStore()`. Production OAuth state is in-process (env TTL 600s). Not a live Redis key. |
| MCP public rate limit | `mcp-http-guards.ts` | Process `Map` on `globalThis`, 30 hits / 60s per IP. Not Redis. |
| Web session `cq_session` | `session-jwt.ts` + cookie | Signed JWT. Users and Discord accounts are TypeORM/Postgres. Not Redis. |
| MCP access/refresh tokens, grants, PATs | `mcp-user.module.ts` | `MemoryOAuthServerModel` in process (`accessTokenLifetime` 900s, `refreshTokenLifetime` 1,209,600s). Not Redis. A process restart drops them; a Redis wipe does not. |

#### Classification

**Discardable (live):** `catalog:current`, `catalog:v{n}`, `catalog:previous`. Loss does not delete users, paths, or progress. The scraper can rebuild a snapshot; `catalog.seed.json` is a separate fallback and is a stub (1,199 bytes, 1 course, 0 paths, `version` 0, `source` seed), not a copy of the live 1.6 MB snapshot.

**Durable Redis keys:** none. No file/line stores progress, paths, OAuth grants, refresh tokens, PATs, or profile in Redis.

#### Deploy definition

| Fact | Value |
|---|---|
| Repo Compose | None. No `docker-compose*.yml`. |
| Dokploy | Project `CodeQuest-2026` (`ASpR-wATe1qU96ywQ3b3C`), production env. Redis service name `Redis`, app name `codequest-redis-veojwy`, redisId `-oGlTAZ393Db6P1PkwLWg`. Compose list is empty. |
| Image | Tag `redis:7`. Running server and image manifest: **7.4.11**. |
| Command | `/bin/sh -c redis-server --requirepass <set>`. Official image entrypoint/redis.conf is not used. Secret value not recorded here. |
| Volume | Named volume `codequest-redis-veojwy-data` mounted at `/data` (driver `local`, RW). Not a bind mount. |
| AOF | Off (`appendonly no`). |
| RDB | Default save rules above. `dump.rdb` exists on the volume. |
| Memory | `maxmemory` 0 (unlimited). Policy `noeviction` (inactive until a limit is set). Container memory limit unset (`Memory` 0). `used_memory` 3.25M. |
| Password | `requirepass` set. Local `REDIS_PASSWORD` set. Local `REDIS_USERNAME` set. Dokploy `databasePassword` set. Values not recorded. |
| Port | Published on all interfaces: `0.0.0.0:8864` and `[::]:8864` -> container `6379`. Also attached to `dokploy-network` at `10.0.1.105`. Service `externalPort` 8864. |
| Health / restart | No container healthcheck. Restart policy `no`. Dokploy object `replicas` is 1; Redis itself is standalone (not Sentinel/Cluster). |
| App wiring | `REDIS_HOST` / `REDIS_PORT` / optional username and password. Local `.env` points at the published host port 8864. Production app env values were redacted by Dokploy and were not read. |

#### Cold start vs MCP

`bootstrapCatalog` (`backend/src/modules/catalog-scraper/application/bootstrap-catalog.ts`):

- Redis returns a snapshot: source `redis`.
- Redis answers and the snapshot is null: `importCatalogSeed` **writes** the seed into Redis (`source: seed-imported`).
- Redis throws: parses the seed JSON in memory (`source: seed-memory`), warning text includes `serving catalog.seed.json from memory`. Does not write Redis.

That function is exported and unit-tested. It is **not** called from `main`, `CatalogCronService.onModuleInit`, or `CatalogScraperService`. An empty Redis at process start is not filled by the running Nest app.

MCP path (`createCatalogCache` in `backend/src/modules/mcp-public/catalog-cache.ts`), used by `McpHttpController` and user MCP tools:

- Every `load()` calls `getCurrent()` again.
- Null or throw: `useSeed()` reads `catalog.seed.json` once into the process cache (`fromSeed: true`) and reuses that object on later failures.
- It does not write the seed back to Redis.
- If a later `getCurrent()` returns a snapshot, the cache switches to Redis.
- Seed path resolves `dist/.../catalog.seed.json` (nest-cli asset) or `src/.../catalog.seed.json`. The backend Dockerfile copies `dist/`, so the compiled seed is expected in the image. The running container filesystem was not listed.

Learning-path HTTP reads do not use that cache or the seed file. `loadCatalogForRead` returns an empty in-memory catalog when Redis returns null, and the string `'degraded'` when Redis throws (GET sets `unavailable: false`). Writes call `requireCatalogForWrite` and return 503 when Redis returns null or throws.

### Affected Areas

- `backend/src/modules/catalog-scraper/ports/catalog-repository.port.ts` — key names, including unused `lock`.
- `backend/src/modules/catalog-scraper/infrastructure/redis/redis-catalog.repository.ts` — GET/SET/pipeline SET/DEL. No TTL.
- `backend/src/modules/catalog-scraper/infrastructure/redis/ioredis-client.ts` — connection options; no startup CONFIG check.
- `backend/src/modules/catalog-scraper/nest/catalog-scraper.module.ts` — production ioredis wiring; memory lock.
- `backend/src/modules/catalog-scraper/application/bootstrap-catalog.ts` — seed import / memory fallback; not on the Nest boot path.
- `backend/src/modules/mcp-public/catalog-cache.ts` — request-time seed fallback while Redis is empty or down.
- `backend/src/modules/learning-paths/learning-paths.service.ts` — empty catalog vs degraded read vs 503 write.
- `backend/src/modules/identity/infrastructure/memory-oauth-state-store.ts` — unused Redis-like adapter; live store is memory.
- `backend/src/modules/identity/identity.module.ts` — memory OAuth state and JWT session.
- `backend/src/modules/mcp-user/mcp-user.module.ts` — in-memory OAuth server model.
- `backend/src/modules/mcp-public/mcp-http-guards.ts` — in-memory rate limit.
- `backend/src/config/env.validation.ts` and `backend/.env.example` — Redis host/port/password.
- Dokploy Redis `codequest-redis-veojwy` — image, volume, command, published port 8864. Not in git.

### Approaches

Allowed levers only: named volume, AOF, RDB save, noeviction, no published port, requirepass, healthcheck, startup CONFIG check.

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| Keep named volume `codequest-redis-veojwy-data` on `/data` | Already in place. Survives container recreate. `dir /data` and `dump.rdb` match it. | Does not by itself flush each catalog write. | Low |
| Enable AOF (`appendonly yes`; `appendfsync everysec` already set) | Closes the up-to-3600s RDB window for a single catalog `SET`. File would land on the existing volume. | Needs a Redis restart later. Larger disk use (payload ~1.6 MB). | Low |
| Keep RDB `save 3600 1 300 100 60 10000` | Already producing `dump.rdb`. Second copy beside AOF. | One catalog write can sit unsaved for an hour (`save 3600 1`). Last snapshot is 2026-09-21. | Low |
| Keep `noeviction` and set a finite `maxmemory` | Live policy is already `noeviction`. A cap above the 5.02M peak stops host OOM without evicting the catalog (writes fail instead). Today `maxmemory` 0 so the policy never applies. | A cap set too low fails catalog saves. | Low |
| Stop publishing 8864; keep `dokploy-network` only | Port is `0.0.0.0:8864` and `[::]:8864`. Password auth is the only network control. | Local `.env` uses that published port; operators would need an internal hostname or tunnel. | Low |
| Keep `requirepass` | Already set on the server and in app env. | The process command line includes the secret, so inspect exposes it. Unpublishing does not remove that. | Low |
| Add a Redis healthcheck | None exists. Restart policy is `no`, so a dead process stays down. | Healthcheck does not change the restart policy; this item only adds the check. | Low |
| Startup CONFIG check in the Nest client | App today connects and serves even if AOF is off or the port is public. A check can fail or warn unless `appendonly`, `maxmemory-policy`, and `requirepass` match the intended config. | Cannot see host port publish from inside the container. Must not log secret values. | Medium |

1. **Persistence: volume + AOF + existing RDB** — leave the named volume and current `save` rules, and turn AOF on so catalog `SET`s are durable within `everysec` instead of the hourly single-change RDB rule.
   - Pros: no new database, no catalog copy into Postgres, matches a payload that is rebuilt by the scraper and is only ~1.6 MB.
   - Cons: Redis restart required to apply `appendonly`; RDB alone still loses the last unsaved hour if AOF is skipped.
   - Effort: Low

2. **Network: unpublish 8864, keep requirepass** — bind Redis only to the Dokploy network. Do not remove the password.
   - Pros: removes the Internet-facing listener that the live inspect shows on `0.0.0.0` and `::`.
   - Cons: breaks the current local `.env` path that dials host port 8864; command-line `requirepass` remains visible to server admins.
   - Effort: Low

3. **Memory: noeviction with an explicit maxmemory** — keep `noeviction` and set `maxmemory` above the observed 5.02M peak (tens of MB is enough for this dataset).
   - Pros: catalog keys cannot be evicted; memory growth is bounded.
   - Cons: `maxmemory` 0 today, so this is a new limit and needs headroom for one extra `catalog:v{n}` during a save.
   - Effort: Low

4. **Operability: healthcheck + startup CONFIG check** — Docker/Dokploy healthcheck for Redis, and a boot-time `CONFIG GET` in `createIoredisClient` / the Nest factory that refuses a drifted `appendonly` / `maxmemory-policy` / empty `requirepass` without printing secrets.
   - Pros: the next deploy cannot silently run the current insecure-persistence combination.
   - Cons: healthcheck does not start a stopped container (restart policy is `no`, and changing it is outside this list). CONFIG check cannot see published ports.
   - Effort: Medium

### Recommendation

Apply 1–4 together. The volume, `requirepass`, default RDB rules, and `noeviction` policy are already there. The gaps that matter are AOF off, `maxmemory` unlimited, port 8864 published on every interface, no healthcheck, and no startup check that the server still matches that policy. Do not add replicas, Sentinel, Cluster, a Postgres catalog copy, or cache-aside. Do not move sessions or MCP tokens into Redis; they are not durable Redis data today, and catalog loss does not delete user paths or progress.

### Risks

- Live catalog is only in Redis (`catalog:v1` ~1.6 MB). `catalog.seed.json` is a 1-course stub. MCP will keep serving that stub if Redis is empty or down; it will not restore the scraped catalog. Learning-path reads will not use the stub: a missing key looks like an empty catalog.
- `bootstrapCatalog` can import the seed into Redis, but the Nest process never calls it. Empty Redis stays empty until a scrape or a future boot hook.
- Default `save 3600 1` plus AOF off: one catalog write can be lost if the process dies within an hour. The volume does not prevent that.
- `0.0.0.0:8864` and `[::]:8864` publish Redis. `requirepass` is set, and the password is also present on the container command line.
- Restart policy `no` and no healthcheck: a crashed Redis stays stopped until an operator starts it. Out of the allowed change list, but it limits how much a healthcheck helps.
- Process-local `catalog:lock`: two app/CLI processes can sync at once. Not a Redis durability bug.
- Enabling AOF or unpublishing the port needs a later Redis/Dokploy change. This exploration did not change settings, redeploy, or restart.
- Production backend `REDIS_*` values were redacted, so this audit did not prove which hostname the deployed API uses.

### Ready for Proposal

Yes. The spec can be written from these facts. Scope the proposal to the existing volume, AOF, the current RDB `save` rules, `noeviction` with a finite `maxmemory`, removing the published 8864 mapping, keeping `requirepass`, a Redis healthcheck, and a startup CONFIG check. Leave catalog data out of Postgres.

### Could not be determined

- Production backend environment values (`REDIS_HOST`, password, username). Dokploy returned them redacted. Local `.env` has host, port 8864, username set, and password set, and that client successfully ran the read-only probe.
- Whether `catalog.seed.json` is actually present inside the running backend container. The image build copies `dist/`, and nest-cli lists the seed as an asset; the container filesystem was not listed.
- A public health status for Redis. The container inspect has no `Health` block.
