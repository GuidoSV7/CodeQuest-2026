# Features — CodeQuest domain map

Dependency flow: `shared (components/ui, lib, stores, types) → features/<domain> → app/`

- No cross-feature imports; compose in `app/` pages.
- New UI code lands in `features/`. Keep `app/` thin (routing).

| Feature | Status | Notes |
|---------|--------|-------|
| `auth` | stub | Discord OAuth + cookie session vs Nest `/api/auth/*` |
| `learning-paths` | planned | `/me/learning-paths*` |
| `catalog` | planned | read catalog snapshot from API/Redis-backed backend |

HTTP: services in `features/<domain>/api/` using `@/lib/axios` (`withCredentials: true`).
