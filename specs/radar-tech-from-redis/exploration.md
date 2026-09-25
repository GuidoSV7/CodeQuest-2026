## Exploration: radar-tech-from-redis

Home-page MissionRadar paints six fixed SVG labels. Redis catalog data cannot supply those strings as stored today. Recommendation: keep the six-node geometry and current callsigns for anonymous visitors; bind labels to the signed-in user's active path course titles only if the product wants a personal radar. Do not treat course categories or path-entry tags as technologies.

### Current State

`MissionRadar` (`viewBox="0 0 400 400"`) owns a constant `NODES` array of six positioned labels: `TS_FOUND`, `NEST.SYS`, `REACT_ARC`, `DOCKER/K8S`, `HEX_DOMAIN`, `CLEAN_CODE`. Positions, radii, text anchors, the connecting polygon (`m120 120 80-30…`), and the accessible title ("Matriz orbital de seis nodos") are all fixed to that count. `progressRatio` rotates the beam (`ratio * 360`) and selects one active node via `activeNodeIndex`. At ratio `0` no node is active and the footer reads `EN ESPERA`.

`MissionRadarLive` is the only data owner. Until the auth store is hydrated with a user, progress stays `{ progressRatio: 0, completedCount: 0, itemCount: 0 }`. After login it calls `GET /api/me/learning-paths` (session cookie) and `selectActivePathProgress` keeps the newest `status: "active"` summary. Failures fall back to idle. The list payload is `{ items: LearningPathSummaryDto[] }` and includes `progressRatio`, `completedCount`, and `itemCount`. It does not include course titles, slugs, or tags. Detail (`GET /api/me/learning-paths/:pathId`, also session-guarded) does include items: `courseTitle`, `courseSlug`, `bucket`, progress. Those titles are snapshots written at path creation; path-entry tags are not copied onto items.

The DevTalles catalog is a versioned Redis snapshot, not an HTTP catalog for the browser.

- Pointer `catalog:current` (value `vN`); payload `catalog:vN`; previous pointer `catalog:previous`.
- `CatalogSnapshot` holds `courses[]` and `paths[]`.
- `Course` fields: id, slug, title, price, curriculum, prerequisites, related courses. No technology or tag field.
- `CourseCategory` is a listing bucket only: `all | wip | free | mini | exclusive | legacy`.
- `PathEntry.tags` comes from `extractTags` on path-page spans whose class is `bases-text`, `frontend-text`, `backend-text`, `movil-text`, or `mobile-text`. Values are lowercased badge text (track: bases / frontend / backend / mobile), not stack callsigns.
- Official path ids (`OFFICIAL_PATH_IDS`, 13 values such as `programas-react`, `programas-nest`, `ruta-python`) are the closest technology vocabulary already stored. They are paths, not radar nodes, and the set size is 13.
- Public catalog HTTP: `POST /api/catalog/sync` only, `Authorization: Bearer CATALOG_SYNC_TOKEN`. No unauthenticated read. Learning-path controllers use `SessionAuthGuard` on `me/*`. The frontend cannot read Redis.

Landing source contract (`landing.test.tsx`) forbids `fetch` / `axios` inside `page.tsx` and `MissionRadar.tsx`. Live fetching already lives in `MissionRadarLive`.

### Affected Areas

- `frontend/src/features/orbital/components/MissionRadar.tsx` — six hardcoded labels, geometry, and a11y title.
- `frontend/src/features/orbital/components/MissionRadarLive.tsx` — auth gate and the only allowed network call for the radar.
- `frontend/src/features/orbital/lib/radar-progress.ts` — progress selection only; no labels. Node index assumes a stable `nodeCount`.
- `frontend/test/src/ui-stitch-orbital/fase-1/landing.test.tsx` — source contract: presentational radar, no extra client fetches in `MissionRadar`.
- `frontend/src/app/(producto)/page.tsx` — renders `<MissionRadarLive />` for anonymous and signed-in visitors.
- `backend/src/modules/catalog-scraper/domain/models.ts` and `domain/catalog.ts` — course and path shapes; no stack field.
- `backend/src/modules/catalog-scraper/infrastructure/parsers/parse-learning-path.ts` — `extractTags` (track badges).
- `backend/src/modules/catalog-scraper/infrastructure/redis/redis-catalog.repository.ts` and `ports/catalog-repository.port.ts` — `catalog:current` / `catalog:vN`.
- `backend/src/modules/catalog-scraper/nest/catalog-scraper.controller.ts` — sync-only, bearer token.
- `backend/src/modules/learning-paths/learning-paths.controller.ts` and `learning-paths.service.ts` — authenticated summaries vs detail items; catalog used only to validate/snapshot courses, not to expose tags.

### Approaches

1. **Keep the HUD callsigns** — leave `NODES` as design labels; progress stays live.
   - Pros: matches the six-node SVG, works logged out, no new API, landing contract stays intact, short strings fit the text anchors.
   - Cons: labels do not reflect the catalog or the user's courses. The visible stack (Docker, hexagonal, Clean Code) is fiction.
   - Effort: Low

2. **Project radar labels from the Redis catalog** — new public read that loads `catalog:current` and returns up to six short labels.
   - Pros: anonymous home can show live catalog-backed names; browser never talks to Redis; geometry can stay at six slots.
   - Cons: nothing in the snapshot is `TS_FOUND` / `NEST.SYS` / `DOCKER/K8S`. Mapping options are the wrong grain: four track badges, six commercial categories, ~80 long course titles, or 13 official path ids. A real technology list needs a new scraped field and model change, not a read of existing keys. Label length will overflow fixed `x`/`y` anchors. `POST /api/catalog/sync` must stay token-gated.
   - Effort: Medium for a projected digest of path ids; High if the scraper must learn stack names.

3. **Labels from the signed-in user's active path courses** — logged out, progress and labels stay idle/fallback; logged in, take the same active path already chosen for `progressRatio` and place up to six `courseTitle` (or slug) values on the existing nodes.
   - Pros: aligns the home radar with the mission the user is actually on; reuses session auth and catalog snapshots already copied onto path items; no public catalog dump; anonymous behavior stays at zero progress.
   - Cons: `GET /api/me/learning-paths` does not return items, so the live component needs the detail route or a larger list DTO. A path can have more or fewer than six courses. Tags are dropped when an official path is materialized. Logged-out visitors still need fallback callsigns. Abbreviation rules are required so titles fit the SVG.
   - Effort: Medium

### Recommendation

Prefer approach 3 with approach 1 as the logged-out fallback. Do not replace the callsigns with a direct read of Redis "technologies." That field does not exist. Path-entry tags and course categories would mislabel the radar. Official path ids are the only catalog tokens that look like technologies, and there are thirteen of them.

If the product later wants anonymous visitors to see catalog technologies, add a small public projection (max six short labels, server-side, cached from `getCurrent()`), not a snapshot endpoint and not a frontend Redis client. Inventing stack names in the scraper is a separate change and should stay out of this proposal unless the user explicitly wants labels that are not in the snapshot.

Keep the beam math and the logged-out zero-progress rule. Keep fetches in `MissionRadarLive` so `MissionRadar` stays presentational.

### Risks

- Choosing path-entry tags or listing categories will look like technologies and be wrong.
- Variable node counts break the hardcoded polygon, beam target, and "seis nodos" description.
- Course titles are longer than the current callsigns and will collide with the polar grid unless abbreviated.
- List vs detail: today's radar call cannot see course names without a second authenticated request or a DTO change.
- A public catalog read of the full snapshot would expose prices, curriculum, and related courses with no auth. The radar does not need that.
- Redis empty or degraded already forces learning-path reads to degrade; radar labels must not 500 the home page.
- Landing tests assert no `axios`/`fetch` in `MissionRadar.tsx`.

### Ready for Proposal

Yes. Tell the user the six labels are design callsigns, not catalog technologies. Propose personal course titles for the signed-in active path, with the current callsigns as the logged-out fallback, and a fixed six-slot layout. Ask only if they instead want a new scraped technology field or a public digest of the thirteen official path ids.
