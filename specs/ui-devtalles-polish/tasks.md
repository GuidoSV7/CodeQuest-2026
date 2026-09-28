# Tasks — `ui-devtalles-polish`

> Fase: `sdd-tasks`. Fuente de verdad: `explore.md`, `proposal.md`, `spec.md`, `design.md`, `decisions/0002-lucide-chrome-icons.md` (todo aprobado; el dev pidió correr sin frenar).
> Orden: Lote 1 → 2 → 3 → 4. Dentro de cada lote, las tareas van en orden de dependencia. **TDD:** en cada tarea, primero se escribe/actualiza el test (rojo), después el código (verde).
> Apply implementa y el dev commitea **una unidad a la vez** (`## Unidad N`). Cada unidad cierra con `npm run sdd:verify` en verde + el commit sugerido.
> Los valores exactos (copy, tokens, líneas) viven en `design.md` — cada tarea cita la sección; no se re-inventan acá.

**Comandos de referencia** (desde `CodeQuest-2026/`):

- Front: `cd frontend && npx vitest run`
- Front test puntual: `cd frontend && npx vitest run <ruta-del-test>`
- Paquete: `cd frontend/path-diagram && npm run build:widget && npx vitest run`
- Backend: `cd backend && npx vitest run`
- Typecheck: `cd frontend && npx tsc --noEmit` y `cd backend && npx tsc --noEmit` (el typecheck del front cubre `path-diagram/src` de producción; el paquete no tiene `tsconfig` propio).

**Marcas:** 🔗 = toca un flujo conectado del explore (tabla "Disposición de flujos conectados" del spec). 🧪car = test de caracterización de un flujo EN SCOPE sin cobertura hoy (va ANTES de tocar el flujo).

**Pre-requisito de commit del Lote 1 (no de código):** el dev sella la spec con `node .cursor/scripts/sdd/sdd-gate.mjs approve specs/ui-devtalles-polish` y ratifica ADR 0002 `accepted`. Sin eso el gate bloquea el commit (toca `src/**/auth/**`).

---

# Lote 1 — Shell / auth / mobile / Lucide chrome

## Unidad 1 — Iconos de chrome con Lucide

- [x] **T1.1 — ADR 0002 presente y `accepted`**
  - Archivos: `decisions/0002-lucide-chrome-icons.md` (verificar, no reescribir).
  - CA: CA-1.1, CA-4.11 (parte ADR).
  - Test: n/a (documento). Verificación: el archivo tiene `status: accepted` y `spec.md` contiene la línea `ADR: decisions/0002-lucide-chrome-icons.md`.
  - Verificar: `grep -n "accepted" decisions/0002-lucide-chrome-icons.md && grep -n "^ADR:" specs/ui-devtalles-polish/spec.md`

- [x] **T1.2 — Test estático de chrome (rojo)**
  - Archivos: nuevo `frontend/test/src/ui-devtalles-polish/shell-chrome.static.test.ts` — solo la parte de iconos (design §1.8 "Nuevo"): `lucide-react` = `"1.48.0"` exacto; imports nombrados; sin `import * as`/default; cada `<Menu|X|Copy|Check|ArrowRight|ArrowUpRight|ExternalLink>` con `strokeWidth={CHROME_ICON_STROKE_WIDTH}` y `aria-hidden="true"`; `MissionShellMobileNav.tsx` y `MyRouteStatus.tsx` sin `<svg`; `LivePathScreen.tsx` sin `×`.
  - CA: CA-1.2, CA-1.9, CA-4.10 (parte estática).
  - Verificar (debe fallar): `cd frontend && npx vitest run test/src/ui-devtalles-polish/shell-chrome.static.test.ts`

- [x] **T1.3 — Instalar `lucide-react@1.48.0` exacto + constante de stroke** — desvío: el repo es npm workspace, el install actualiza el `package-lock.json` raíz; `frontend/package-lock.json` (lo usa `npm ci` del `frontend/Dockerfile`) se regeneró aparte con `--package-lock-only --workspaces=false` (+10 líneas, solo `lucide-react`).
  - Archivos: `frontend/package.json`, `frontend/package-lock.json` (`cd frontend && npm install --save-exact lucide-react@1.48.0`); nuevo `frontend/src/config/chrome-icon.ts` (`export const CHROME_ICON_STROKE_WIDTH = 2;`, design §1.2).
  - CA: CA-1.2.
  - Supuesto a verificar: peer React 19 OK y los 7 nombres existen en `node_modules/lucide-react/dist/lucide-react.d.ts`.
  - Verificar: `grep -n '"lucide-react": "1.48.0"' frontend/package.json` y `rg -n "declare const (Menu|X|Copy|Check|ArrowRight|ArrowUpRight|ExternalLink)\b" frontend/node_modules/lucide-react/dist/lucide-react.d.ts`

- [x] **T1.4 — Hamburguesa/cerrar del menú móvil → `Menu`/`X`** 🔗 (shell)
  - Archivos: `frontend/src/features/orbital/components/MissionShellMobileNav.tsx` (design §1.5), `frontend/src/features/orbital/components/MissionShell.module.css` (`.menuIcon` queda solo `width/height: 1.25rem`, design §1.2).
  - CA: CA-1.9. Test que ya lo cubre: `fase-0/mobile-nav.test.tsx` (aria/Escape sin cambio) + T1.2.
  - Restricción: no escribir `position: fixed` después de `.mobilePanel` (regex greedy de `mobile-nav.test.tsx:135-136`).
  - Verificar: `cd frontend && npx vitest run test/src/ui-stitch-orbital/fase-0/mobile-nav.test.tsx test/src/ui-devtalles-polish/shell-chrome.static.test.ts`

- [x] **T1.5 — Copiar en `MyRouteStatus` → `Copy`/`Check`** 🔗 (configurador)
  - Archivos: `frontend/src/features/learning-paths/components/MyRouteStatus.tsx:214-219` (design §1.6).
  - CA: CA-1.9. Test: `MyRouteStatus.test.tsx` (sin cambio de asserts) + T1.2.
  - Verificar: `cd frontend && npx vitest run test/src/features/learning-paths/components/MyRouteStatus.test.tsx`

- [x] **T1.6 — Cerrar de LivePath → `X`** 🔗 (LivePath)
  - Archivos: `frontend/src/features/live-path/components/LivePathScreen.tsx:28-30` (design §1.6); `LivePathScreen.module.css` agrega `.close svg { width: 1.25rem; height: 1.25rem; }` (solo esta regla; el resto de tokens va en Unidad 11).
  - CA: CA-4.10 (icono). Test nuevo completo del botón va en T4.11.
  - Verificar: `cd frontend && npx vitest run test/src/ui-devtalles-polish/shell-chrome.static.test.ts`

- [x] **T1.7 — Landing: flechas, link externo y quitar icono de protocolo** 🔗 (landing)
  - Test primero: `frontend/test/src/ui-stitch-orbital/fase-1/landing.test.tsx:61` → `toHaveLength(12)` (valor medido; si difiere se fija el medido, no se relaja).
  - Archivos: `frontend/src/app/(producto)/page.tsx` (L92-94 `ArrowRight`, L150-152 `ArrowUpRight`, L56-62 rama `web` → `ExternalLink`, L165-170 `protocolIcon` eliminado; GitHub/LinkedIn se quedan) y `frontend/src/app/(producto)/page.module.css` (borrar bloque L176-182 de stroke y `.protocolIcon`/`.protocolIcon svg`), design §1.6.
  - CA: CA-1.9.
  - Verificar: `cd frontend && npx vitest run test/src/ui-stitch-orbital/fase-1 test/src/ui-devtalles-polish/shell-chrome.static.test.ts`

- [~] **T1.8 — Cierre de unidad** — vitest verde; `tsc` con 2 errores preexistentes ajenos (ver T1.14); sin `sdd:verify` ni commit (el dev no pidió commits; el script no existe en `package.json`).
  - Verificar: `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `feat(ui): iconos de chrome con lucide-react (ADR 0002)`

## Unidad 2 — Shell sin sesión con un solo "Entrar" + nav móvil en login

- [x] **T1.9 — Reescribir tests de shell al contrato nuevo (rojo)** 🔗 (shell)
  - Archivos (design §1.8): `frontend/test/src/ui-stitch-orbital/fase-0/dom.test.tsx:73-74,90-91,94`; `…/fase-0/mobile-nav.test.tsx:33,127-128` + nuevo `it` "login variant offers the mobile nav"; `frontend/test/src/features/auth/components/ShellAccount.test.tsx:38,64`; ampliar `shell-chrome.static.test.ts` con `not.toMatch(/>\s*(Login|Register)\s*</)` y `not.toContain("Descubre tu ruta")` en `ShellAccount.tsx`, `MissionShell.tsx`, `MissionShellMobileNav.tsx`.
  - Sin cambio: `mobile-nav.test.tsx:130-137`, `header-responsive.characterization.test.ts`.
  - CA: CA-1.3, CA-1.5, CA-1.6, CA-1.7, CA-1.8.
  - Verificar (debe fallar): `cd frontend && npx vitest run test/src/ui-stitch-orbital/fase-0 test/src/features/auth/components/ShellAccount.test.tsx`

- [x] **T1.10 — `ShellAccount`: un único "Entrar"**
  - Archivos: `frontend/src/features/auth/components/ShellAccount.tsx` (rama sin sesión, design §1.3; rama con sesión intacta); `MissionShell.module.css`: `.authButton` (min-height `2.75rem`, padding `0 var(--orbital-space-4)`, font-size `0.875rem`), `.authButtonPrimary:active` nuevo, eliminar `.authActions`.
  - CA: CA-1.3, CA-1.4 (no tocar `authEntryPath`/`discordStartUrl`), Should de touch target.
  - Verificar: `cd frontend && npx vitest run test/src/features/auth`

- [x] **T1.11 — `MissionShell`: label de nav, MobileNav en login, footer**
  - Archivos: `frontend/src/features/orbital/components/MissionShell.tsx` (design §1.4: `PRODUCT_LINKS` label, `<nav className={styles.loginNav}>`, `<MissionShellMobileNav>` en login, footers); `MissionShell.module.css` (tabla §1.4: `.loginHeader` grid + border `color-mix`, `.loginHeader nav*` → `.loginNav*` incl. reduced-motion, media 48rem, `.accountPanel` tokens, `.footerCredit`, `.loginFooterBrand`, gap de `.loginFooter`).
  - Restricciones CA-1.5 (min-height 4rem, padding-top 4rem, nowrap, sin `max-width: 42rem`, sin `position: fixed` tras `.mobilePanel`).
  - CA: CA-1.5, CA-1.6, CA-1.7, CA-1.8.
  - Verificar: `cd frontend && npx vitest run test/src/ui-stitch-orbital/fase-0`

- [x] **T1.12 — Reescribir `login-contract.test.ts` al contrato Discord vigente**
  - Archivos: `frontend/test/src/ui-stitch-orbital/fase-2/login-contract.test.ts:24-26,43-45` (design §1.8; porqué declarado en spec §"Los 2 rojos obsoletos"). Sin cambio de código de producción.
  - CA: CA-1.10, CA-1.4.
  - Verificar: `cd frontend && npx vitest run test/src/ui-stitch-orbital/fase-2 test/src/features/auth` (incluye `auth.service.test.ts` y `auth-entry.test.ts` verdes sin modificar)

- [~] **T1.13 — Cierre de unidad** — ídem T1.8.
  - Verificar: `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `feat(shell): un solo "Entrar", nav móvil en login y footer DevTalles`

- [~] **T1.14 — Suite verde del Lote 1** — front 37 files / 108 tests verdes; path-diagram 9/31 verdes; auth `api`/`lib` sin diff. `tsc` falla por 2 errores preexistentes fuera del lote: `.next/types/validator.ts` (artefacto ignorado que referencia la página borrada `ajustes/tokens`) y `test/src/features/auth/lib/local-session.test.ts:14` (cast TS2352, archivo sin tocar).
  - `cd frontend && npx vitest run` → 0 rojos (incluidos los 2 preexistentes de `login-contract`) — CA-1.11.
  - `cd frontend/path-diagram && npm run build:widget && npx vitest run` → verde (regresión: no se tocó el paquete).
  - `cd frontend && npx tsc --noEmit` → verde.
  - `git diff --stat HEAD~2 -- frontend/src/features/auth/services frontend/src/features/auth/lib` → vacío en `auth.service.ts`/`auth-entry` (CA-1.4).

---

# Lote 2 — Iconos de stack + contrato `coverImageUrl`

## Unidad 3 — Contrato `coverImageUrl` en backend (allowlist + artefacto)

- [x] **T2.1 — Artefacto de contrato compartido**
  - Archivos: nuevo `contracts/course-card.example.json` (contenido exacto en design §2.8; ningún valor inventado).
  - CA: CA-2.11.
  - Verificar: `node -e "JSON.parse(require('fs').readFileSync('contracts/course-card.example.json','utf8'))"`

- [x] **T2.2 — 🧪car Controller `GET /catalog/courses/:courseId`** 🔗 — desvío: `Test.createTestingModule` no resuelve el controller (inyecta por tipo sin `@Inject` y Vitest/esbuild no emite decorator metadata → `this.service` undefined). Se instancia a mano con el `CatalogScraperService` real sobre un repo en memoria (sin cambiar código de producción); caso extra 404 sin snapshot. Helper compartido nuevo `backend/src/modules/catalog-scraper/test/course-card-example.ts` (snapshot tipado sin casts + lectura del artefacto), mismo patrón que `learning-paths/test/`.
  - Archivos: nuevo `backend/src/modules/catalog-scraper/nest/catalog-scraper.controller.spec.ts` (design §2.9): primero los casos del comportamiento ACTUAL — 200 `{ course }`, 404 `NotFoundException`, 400 `BadRequestException` para `'abc'` y 13 dígitos sin llamar a `getCourseCard`. Debe quedar verde **antes** de tocar `course-card.ts`.
  - CA: CA-2.8 (caracterización).
  - Verificar: `cd backend && npx vitest run src/modules/catalog-scraper/nest/catalog-scraper.controller.spec.ts`

- [x] **T2.3 — Tests de `toCourseCard` + allowlist (rojo)** 🔗 — 12 rojos / 1 verde antes de T2.4; caso extra: host no permitido → `coverImageUrl: null` presente.
  - Archivos: `backend/src/modules/catalog-scraper/application/course-card.spec.ts` (design §2.9): L41-53 `toEqual` → `toStrictEqual` con `coverImageUrl`; `describe('allowedCoverImageUrl')` con `it.each` de los 9 casos; contract test contra `contracts/course-card.example.json` + `COURSE_CARD_KEYS satisfies Record<keyof CourseCard, true>`.
  - CA: CA-2.6, CA-2.7, CA-2.11 (lado provider).
  - Verificar (debe fallar): `cd backend && npx vitest run src/modules/catalog-scraper/application/course-card.spec.ts`

- [x] **T2.4 — Implementar `allowedCoverImageUrl` y `coverImageUrl` en `CourseCard`** 🔗 — `tsc` backend: 29 errores preexistentes en specs ajenos (medido con stash: 29 antes y después).
  - Archivos: `backend/src/modules/catalog-scraper/application/course-card.ts` (design §2.6: `URL.canParse`, sin try/catch; campo entre `previewYoutubeId` y `prerequisites`).
  - CA: CA-2.6, CA-2.7.
  - Verificar: `cd backend && npx vitest run src/modules/catalog-scraper && npx tsc --noEmit`

- [x] **T2.5 — Controller: casos del campo nuevo**
  - Archivos: `catalog-scraper.controller.spec.ts` — agregar 200 con mapeo real (`toStrictEqual({ course: example })`) y cover `null` presente (`'coverImageUrl' in course`).
  - CA: CA-2.8.
  - Verificar: `cd backend && npx vitest run src/modules/catalog-scraper/nest`

- [x] **T2.6 — `detail` de learning-paths con `coverImageUrl`** 🔗 (REST detalle + SSE indirecto)
  - Archivos: `backend/src/modules/learning-paths/learning-paths.service.spec.ts:290-302` (`toStrictEqual` + `coverImageUrl: null`). Sin cambio de código del service.
  - CA: CA-2.10.
  - Verificar: `cd backend && npx vitest run src/modules/learning-paths`

- [x] **T2.7 — Paridad MCP `get_my_path` ↔ REST ↔ catálogo** 🔗 (consumidor externo) — userId real del spec: `USER_A`; `snapshot` pasó a variable del `describe` para usarlo en `toCourseCard`.
  - Archivos: `backend/src/modules/mcp-user/mcp-user-tools.spec.ts` (fixture L61 con cover válido; assert de paridad en el test de `get_my_path`, design §2.9). Apply verifica el nombre real del userId del spec.
  - CA: CA-2.11 (paridad), CA-2.12 (no tocar `mcp-public/**`).
  - Verificar: `cd backend && npx vitest run src/modules/mcp-user src/modules/mcp-public`

- [~] **T2.8 — Cierre de unidad** — vitest backend verde salvo 6 archivos que dependen de Postgres embebido (`@embedded-postgres/windows-x64` no instalado, entorno); `tsc` 29 preexistentes; `mcp-public` sin diff; sin `sdd:verify` (no existe) ni commit.
  - Verificar: `cd backend && npx vitest run && npx tsc --noEmit` → `git diff --stat -- backend/src/modules/mcp-public` vacío → `npm run sdd:verify`
  - Commit sugerido: `feat(catalog): exponer coverImageUrl validado en CourseCard`

## Unidad 4 — Contrato `coverImageUrl` en front

- [x] **T2.9 — 🧪car `loadCourseCard`** 🔗
  - Archivos: nuevo `frontend/test/src/lib/load-course-card.test.ts` (design §2.9): con cover, con `null`, `get` rechaza → `null`. Escribir primero el caso de error (comportamiento actual del `catch`), verde antes de tocar el tipo.
  - CA: CA-2.9.
  - Verificar: `cd frontend && npx vitest run test/src/lib/load-course-card.test.ts`

- [x] **T2.10 — Contract test front (parte claves/tipos, rojo)** — rojo por `tsc` (TS2353 en `COURSE_CARD_KEYS`) antes de T2.11.
  - Archivos: nuevo `frontend/test/src/contracts/course-card.contract.test.tsx`: lee `contracts/course-card.example.json`; `COURSE_CARD_KEYS satisfies Record<keyof CourseCard, true>`; type guard `isCourseCard` sin casts. (El render del cover se agrega en T3.4.)
  - CA: CA-2.6, CA-2.11 (lado consumer).
  - Verificar (debe fallar por typecheck/claves): `cd frontend && npx vitest run test/src/contracts && npx tsc --noEmit`

- [x] **T2.11 — `CourseCard.coverImageUrl` en `path-diagram`**
  - Archivos: `frontend/path-diagram/src/model.ts:5-17` (campo requerido después de `previewYoutubeId`); fixtures literales `frontend/path-diagram/src/path-diagram.modal.test.tsx:37-46,88-100` y `frontend/path-diagram/src/model.test.ts:51-61` (+ `coverImageUrl: null`).
  - CA: CA-2.6.
  - Verificar: `cd frontend && npx tsc --noEmit && npx vitest run test/src/contracts test/src/lib` y `cd frontend/path-diagram && npx vitest run`

- [~] **T2.12 — Cierre de unidad** — ídem T1.8.
  - Verificar: `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `feat(path-diagram): coverImageUrl en el contrato CourseCard del front`

## Unidad 5 — Assets y mapa ruta → icono (fuente única)

- [x] **T2.13 — Test del mapa (rojo)**
  - Archivos: nuevo `frontend/test/src/config/official-paths.test.ts` (design §2.9 a-e): ids = `OFFICIAL_PATH_IDS` del backend por regex; cada icono existe en `public/devtalles-tech/`; desconocido/`null` → `null`; 14 SVG sin `<script`/`on*=`/`href="javascript:`; ningún archivo de `frontend/src/**` salvo `config/official-paths.ts` contiene `/devtalles-tech/`.
  - CA: CA-2.1, CA-2.2.
  - Verificar (debe fallar): `cd frontend && npx vitest run test/src/config/official-paths.test.ts`

- [x] **T2.14 — Vendorizar los 14 SVG** — 14 archivos (27.6 KB, todos `<?xml`), `rg` de `<script|on*=|javascript:` vacío. Miden 377 líneas → la Unidad 5 queda en ~463 (> 400): commitear los SVG aparte como `chore(assets)` según la nota del pronóstico.
  - Archivos: `frontend/public/devtalles-tech/{javascript,react,vue,angular,node,nest,dart,python,java,csharp,ia,php,go,legacy}.svg` (tabla design §2.1, `curl -fsSL` sin reescribir contenido).
  - CA: CA-2.1. Validar contenido (empieza con `<?xml`/`<svg`, sin `<script`, sin `on*=`) antes de seguir.
  - Verificar: `ls frontend/public/devtalles-tech | wc -l` = 14 y `rg -il "<script|\son[a-z]+\s*=" frontend/public/devtalles-tech` vacío

- [x] **T2.15 — `frontend/src/config/official-paths.ts`**
  - Archivos: nuevo `frontend/src/config/official-paths.ts` (código en design §2.2: `OFFICIAL_PATHS`, `OfficialPathId`, `officialPathIconSrc`, `officialPathLabel`). `PATH_CHOICES` de `MyRouteStatus.tsx` NO se toca todavía (va en T3.8).
  - CA: CA-2.2.
  - Verificar: `cd frontend && npx vitest run test/src/config && npx tsc --noEmit`

- [~] **T2.16 — Cierre de unidad** — ídem T1.8.
  - Verificar: `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `feat(ui): iconos de stack DevTalles y mapa de rutas oficiales`

## Unidad 6 — Iconos de stack en `/mis-rutas` y lista de rutas

- [x] **T2.17 — `sourceCatalogPathId` en `MyRouteSummary` (test primero)** 🔗 (`/mis-rutas`, configurador) — test cubre también `createOfficialRoute`; en `MyRouteStatus.test.tsx:51` el tipo inline de `notify` pasó a `MyRouteSummary`.
  - Test: nuevo `frontend/test/src/features/learning-paths/lib/load-my-routes.test.ts` (campo presente → se conserva; ausente → `null`).
  - Archivos: `frontend/src/features/learning-paths/lib/load-my-routes.ts` (design §2.5; `createOfficialRoute` → `api.post<LearningPathSummaryItem>`), `frontend/src/features/learning-paths/lib/subscribe-learning-paths.ts:24-30` (`sourceCatalogPathId: null`).
  - Fixtures de tipo: `test/src/ui-stitch-orbital/fase-3/routes-dom.test.tsx:53-54`, `fase-0/dom.test.tsx:111-112`, `test/src/features/learning-paths/components/MyRouteStatus.test.tsx:38,51,66,74` (+ `sourceCatalogPathId`).
  - CA: CA-2.5.
  - Verificar: `cd frontend && npx vitest run test/src/features/learning-paths && npx tsc --noEmit`

- [x] **T2.18 — Componente `StackIcon` (test primero)**
  - Test: nuevo `frontend/test/src/features/learning-paths/components/StackIcon.test.tsx` (`ruta-c` → `img[src='/devtalles-tech/csharp.svg'][alt='']` `width="24"`; `standaloneLabel` → `alt`; `null` → vacío).
  - Archivos: nuevos `frontend/src/features/learning-paths/components/StackIcon.tsx` + `StackIcon.module.css` (design §2.3).
  - CA: CA-2.3.
  - Verificar: `cd frontend && npx vitest run test/src/features/learning-paths/components/StackIcon.test.tsx`

- [x] **T2.19 — Icono en cards de `/mis-rutas` y en la lista de `MyRouteStatus`** 🔗 — desvío: se adelantó de design §3.3 solo `.route { display: flex; align-items: center; gap: var(--orbital-space-3) }` (hoy `display: block`): sin eso el icono queda apilado sobre el título hasta el Lote 3. T3.7 conserva el resto de la regla (`.form .pickerButton`, `.form .menu button`).
  - Test primero: `test/src/features/learning-paths/components/LearningPathsDashboard.test.tsx:23-29` (`sourceCatalogPathId: "ruta-c"` + assert `article img[src='/devtalles-tech/csharp.svg']` `alt=""`; caso `null` → sin `img`).
  - Archivos: `frontend/src/features/learning-paths/components/LearningPathsDashboard.tsx:89-94` + `LearningPathsDashboard.module.css` (`.cardTitleLead`); `MyRouteStatus.tsx` lista L95-101 (`StackIcon size="sm"`) — design §2.4.
  - CA: CA-2.4.
  - Verificar: `cd frontend && npx vitest run test/src/features/learning-paths test/src/ui-stitch-orbital/fase-3`

- [~] **T2.20 — Cierre de unidad** — ídem T1.8.
  - Verificar: `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `feat(learning-paths): icono de stack en mis rutas`

- [~] **T2.21 — Suite verde del Lote 2** — front 42 files / 138 tests verdes; path-diagram build OK + 9/31 verdes; backend 48 files / 199 tests verdes (24 skipped), 6 archivos rojos todos por `@embedded-postgres/windows-x64` ausente (entorno; la línea base decía 2, son 6 con la misma causa); `tsc` front solo los 2 preexistentes, backend 29 preexistentes (igual a la línea base).
  - `cd frontend && npx vitest run` → verde.
  - `cd frontend/path-diagram && npm run build:widget && npx vitest run` → verde (incluye `widget-bundle.test.ts`, 0 URLs externas).
  - `cd backend && npx vitest run` → verde (salvo las 2 suites que requieren Postgres local, rojas por entorno en la línea base — CA-2.13).
  - `cd frontend && npx tsc --noEmit` y `cd backend && npx tsc --noEmit` → verdes (CA-2.6, CA-T.3).

---

# Lote 3 — Diagrama / configurador

## Unidad 7 — Cover en el modal de curso + headers en oración

- [x] **T3.1 — Tests del cover en `CourseModal` (rojo)** 🔗 (`loadPathDetail` → `CourseModal`) — rojo medido: 2 fallan (con cover, onError); "sin cover" y "mcp" pasan desde antes (fijan la ausencia).
  - Archivos: `frontend/path-diagram/src/path-diagram.modal.test.tsx` — 4 `it` nuevos (design §3.5): con cover (src, `alt=""`, 640×360, lazy, `referrerpolicy`), sin cover, `onError` oculta, modo `mcp` sin cover.
  - CA: CA-3.1, Should de fallback y `referrerPolicy`.
  - Verificar (debe fallar): `cd frontend/path-diagram && npx vitest run src/path-diagram.modal.test.tsx`

- [x] **T3.2 — Implementar cover en `CourseModal`** — desvío menor: sin la constante `showCover` del design; la condición va inline (`cover !== null && cover !== failedCover`) para que TS estreche `src` a `string` sin cast.
  - Archivos: `frontend/path-diagram/src/path-diagram.tsx` (estado `failedCover`, `<img>` antes de `<header className={styles.summary}>`, design §3.1); `frontend/path-diagram/src/path-diagram.module.css` (`.cover`, hex del paquete permitidos).
  - CA: CA-3.1.
  - Verificar: `cd frontend/path-diagram && npx vitest run src/path-diagram.modal.test.tsx`

- [x] **T3.3 — Headers de columna y títulos del modal en oración**
  - Test primero: `frontend/path-diagram/src/layout-path.test.ts` nuevo `it` "column headers are sentence case" (los 13 de geometría sin cambio).
  - Archivos: `frontend/path-diagram/src/layout-path.ts:45-47,108`; `path-diagram.module.css` `.header, .groupLabel`, `.dialog h3`, `.tags li` (`capitalize`) — design §3.2.
  - CA: CA-3.2, CA-3.3 (`path-diagram.modal.test.tsx:74` verde sin tocar).
  - Verificar: `cd frontend/path-diagram && npx vitest run`

- [x] **T3.4 — Completar el contract test del front con render** — el archivo pasa a `@vitest-environment jsdom` + `ResizeObserver` mock (mismo patrón que `UserRouteDiagram.test.tsx`).
  - Archivos: `frontend/test/src/contracts/course-card.contract.test.tsx` — render `<PathDiagram mode="web" width={429}>` con `detail` = ejemplo → click en card → `dialog img[src=example.coverImageUrl]`.
  - CA: CA-2.11 (render en `CourseModal`).
  - Verificar: `cd frontend && npx vitest run test/src/contracts`

- [~] **T3.5 — Cierre de unidad** — ídem T1.8 (suites verdes, ver T3.10; sin `sdd:verify` ni commit).
  - Verificar: `cd frontend/path-diagram && npm run build:widget && npx vitest run` + `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `feat(path-diagram): portada del curso en el modal y headers en oración`

## Unidad 8 — Configurador centrado con iconos y sin placeholder

- [x] **T3.6 — Tests del configurador (rojo)** 🔗 (configurador) — rojo medido: 5 fallan. El static test normaliza `\r\n` → `\n` al leer (los CSS están en CRLF y el bloque `.header,\n.groupLabel` no se encontraba); el assert no cambia.
  - Archivos: `frontend/test/src/features/learning-paths/components/MyRouteStatus.test.tsx:128` → `not.toContain("El video va acá")` + assert de 13 opciones con `img[src^='/devtalles-tech/']` `alt=""`; nuevo `frontend/test/src/ui-devtalles-polish/configurator-layout.static.test.ts` (design §3.5).
  - CA: CA-3.4, CA-3.5, CA-3.6, CA-3.3 (parte estática).
  - Verificar (debe fallar): `cd frontend && npx vitest run test/src/features/learning-paths/components/MyRouteStatus.test.tsx test/src/ui-devtalles-polish/configurator-layout.static.test.ts`

- [x] **T3.7 — Centrado del configurador y estados de botones** — desvíos: (a) hover/active de `.form .submit` como `:not(:disabled)` (con el selector literal, hover sobre "Crear ruta" deshabilitado pintaba fondo lime con texto `--orbital-outline`); (b) `.dialog .copyIcon` 2rem → 2.75rem × 2.75rem: el `min-height: 2.75rem` nuevo de `.dialog button` lo dejaba en 2×2.75rem, y el design declara touch target ≥ 2.75rem para "copiar". `.route` flex ya estaba desde T2.19; `.sectionTitle` queda definida sin uso hasta T4.6.
  - Archivos: `frontend/src/app/(producto)/configurador-de-ruta/page.module.css:8` (`min(100%, 48rem)`); `frontend/src/features/learning-paths/components/MyRouteStatus.module.css` (`.choice, .form button, .dialog button` sin `justify-self: start`, tokens, `min-height: 2.75rem`, transiciones; reglas nuevas `.choices`, hover/active, `.submit`, `.submit:disabled`, `.dialogClose`, `.sectionTitle`, `.route/.pickerButton/.menu button` flex — design §3.3).
  - CA: CA-3.4, CA-T.2.
  - Verificar: `cd frontend && npx vitest run test/src/ui-devtalles-polish/configurator-layout.static.test.ts`

- [x] **T3.8 — Picker con iconos, `PATH_CHOICES` → `OFFICIAL_PATHS`, sin placeholder**
  - Archivos: `MyRouteStatus.tsx` (import `@/config/official-paths`; `routeTitle`, estado inicial, mapeos; picker L131 y opciones L146 con `StackIcon`; botón "Cerrar" L229 `styles.dialogClose`; eliminar L199 `videoSlot`); `MyRouteStatus.module.css` (eliminar `.videoSlot`).
  - CA: CA-3.5, CA-3.6. `MyRouteStatus.test.tsx:95` (`textContent === "React"`) sigue verde.
  - Verificar: `cd frontend && npx vitest run test/src/features/learning-paths test/src/config && npx tsc --noEmit`

- [~] **T3.9 — Cierre de unidad** — ídem T3.5.
  - Verificar: `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `feat(configurador): layout centrado, iconos de stack y sin placeholder de video`

- [~] **T3.10 — Suite verde del Lote 3** — front 43 files / 144 tests verdes; path-diagram build OK (`widget bytes 882461`) + 9 files / 36 tests verdes; `tsc` front solo los 2 preexistentes (`.next/types/validator.ts`, `local-session.test.ts:14`).
  - `cd frontend && npx vitest run` → verde.
  - `cd frontend/path-diagram && npm run build:widget && npx vitest run` → verde (CA-3.7).
  - `cd frontend && npx tsc --noEmit` → verde.
  - Backend no se toca en este lote (no se corre).

---

# Lote 4 — Copy humanizado + tokens + marca + landing

## Unidad 9 — Landing sin cifras inventadas y radar con rutas reales

- [x] **T4.1 — Tests de landing (rojo)** 🔗 (landing) — rojo medido: 5 fallan (3 archivos).
  - Archivos: `frontend/test/src/ui-stitch-orbital/fase-1/landing.test.tsx:51-53,57-59,66` (design §4.6); `…/fase-1/landing-breakpoints.characterization.test.ts:15-18` (ausencia de `.location`); nuevo `frontend/test/src/ui-devtalles-polish/landing-copy.test.tsx` (cifras prohibidas, telemetría "Rutas oficiales" = `String(OFFICIAL_PATHS.length)`, `page.tsx` contiene `OFFICIAL_PATHS.length`, sin `13 rutas` literal, sin `user-select: none`).
  - CA: CA-4.3, CA-4.4, CA-4.5, CA-4.12.
  - Verificar (debe fallar): `cd frontend && npx vitest run test/src/ui-stitch-orbital/fase-1 test/src/ui-devtalles-polish/landing-copy.test.tsx`

- [x] **T4.2 — Copy de landing y fixture** — se quitó también el parámetro `index` del map de puertas (quedó sin uso). Efecto visual: con un solo span en `.doorData`, la regla existente `.doorData span:last-child strong` pinta el valor de metadata en `--orbital-primary` (antes lo tenía el claim eliminado).
  - Archivos: `frontend/src/app/(producto)/page.tsx` y `frontend/src/features/orbital/fixtures/landing.fixture.ts` (tablas design §4.1 y §4.2: eliminar `.location`, `.calibration`, `.dispatch`, `.doorMeta`, span de claims; telemetría derivada); `frontend/src/app/(producto)/page.module.css` (borrar reglas de los bloques eliminados + `user-select: none`, design §4.4).
  - CA: CA-4.1, CA-4.2, CA-4.3, CA-4.4, CA-4.5.
  - Verificar: `cd frontend && npx vitest run test/src/ui-stitch-orbital/fase-1 test/src/ui-devtalles-polish/landing-copy.test.tsx`

- [x] **T4.3 — `MissionRadar` con rutas oficiales** — `svg circle` sigue en 12.
  - Archivos: `frontend/src/features/orbital/components/MissionRadar.tsx` (tabla design §4.1: `pathId` + `officialPathLabel`, "Tu progreso", "Avance: N %", estados en oración, eliminar L95 y constante `orbit`).
  - CA: Should de Lote 4 (labels reales), CA-4.2. Conteo `svg circle` (T1.7) debe seguir en 12.
  - Verificar: `cd frontend && npx vitest run test/src/ui-stitch-orbital/fase-1 test/src/ui-stitch-orbital/fase-0`

- [~] **T4.4 — Cierre de unidad** — ídem T1.8 (suites verdes, ver T4.18; sin `sdd:verify` ni commit).
  - Verificar: `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `feat(landing): copy en voseo sin cifras inventadas y radar con rutas reales`

## Unidad 10 — Copy humanizado del resto de pantallas vivas

- [x] **T4.5 — Tests de copy (rojo)** — rojo medido: 14 fallan. Desvíos: (a) la regex de tuteo usa `(?<!\p{L})…(?!\p{L})` con flag `u` en vez de `\b`, porque `\b` trata `á` como límite y marcaría el voseo correcto (`Llevá`, `Dejá`, `Iniciá`); (b) la lista cubre 13 archivos = los 11 únicos de design §4.6 + `mis-rutas/page.tsx` y `mis-rutas/[routeId]/page.tsx` (tocados en T4.6); (c) se reescribió también `routes-dom.test.tsx:83` (`"Responde el cuestionario…"` → `"Elegí una ruta oficial o pedile a tu IA que arme una."`): mismo componente vivo y mismo tipo de assert que `:80`, omitido en la tabla del design.
  - Archivos (design §4.6): `test/src/ui-stitch-orbital/fase-2/login.test.tsx:43-44`; `test/src/features/learning-paths/components/MyRouteStatus.test.tsx:129`; `test/src/ui-stitch-orbital/fase-6/github-dom.test.tsx:58,60`; `test/src/ui-stitch-orbital/fase-4/assessment-dom.test.tsx:97,105`; `…/fase-4/checkpoint.test.tsx:21`; `…/fase-3/routes-dom.test.tsx:80`; nuevo `frontend/test/src/ui-devtalles-polish/copy-voice.static.test.ts` (sin `//` separador, sin tuteo, sobre los 13 archivos listados en design §4.6). No tocar `assessment-dom:64` ni asserts de `RouteDetail`.
  - CA: CA-4.1, CA-4.2, CA-4.3, CA-4.12.
  - Verificar (debe fallar): `cd frontend && npx vitest run test/src/ui-stitch-orbital test/src/ui-devtalles-polish/copy-voice.static.test.ts`

- [x] **T4.6 — Copy de auth y configurador** 🔗 (login, configurador, `/mis-rutas`) — `h2.sectionTitle` "Tus rutas" usa la clase preparada en T3.7.
  - Archivos: `frontend/src/features/auth/components/LoginPanel.tsx` (L20, L22); `MyRouteStatus.tsx` (kicker, h1 "Armá tu ruta", `h2.sectionTitle` "Tus rutas", L202); `frontend/src/features/learning-paths/components/LearningPathsEmptyState.tsx` (L20-23); `frontend/src/app/(producto)/mis-rutas/page.tsx:15`; `frontend/src/app/(producto)/mis-rutas/[routeId]/page.tsx:7` — design §4.1. OAuth intacto.
  - CA: CA-4.1, CA-4.3, Should metadata.
  - Verificar: `cd frontend && npx vitest run test/src/ui-stitch-orbital/fase-2 test/src/ui-stitch-orbital/fase-3 test/src/features`

- [x] **T4.7 — Copy de integraciones, replanning y assessment** — además se eliminó `.domain > span` de `AssessmentResults.module.css` (regla huérfana tras quitar el glifo `⌁`, mismo criterio que `.coordinate*`). Los iconos Lucide nuevos quedan en el tamaño por defecto (24 px): design no fija tamaño en rem para `GithubPreview .iconButton` ni para las flechas de `AssessmentResults`/`TypescriptCheckpoint` → revisar en el gate visual.
  - Archivos: `frontend/src/features/integrations/components/GithubPreview.tsx` (tabla §4.1, glifos `✓`/`⧉` → Lucide `Check`/`Copy` con `CHROME_ICON_STROKE_WIDTH`); `frontend/src/features/learning-paths/components/ReplanningProposal.tsx`; `frontend/src/features/assessment/components/AssessmentResults.tsx` (`ArrowRight`, `aria-hidden` en `●`, cifra derivada `routeCards.length`); `frontend/src/features/assessment/components/TypescriptCheckpoint.tsx` + `TypescriptCheckpoint.module.css` (eliminar `.coordinate*`).
  - Ampliar `shell-chrome.static.test.ts` con `GithubPreview.tsx`, `AssessmentResults.tsx`, `TypescriptCheckpoint.tsx` en la lista de archivos Lucide (mismo assert de `strokeWidth`/`aria-hidden`).
  - CA: CA-4.1, CA-4.2, CA-4.3, CA-1.2 (stroke único).
  - Verificar: `cd frontend && npx vitest run test/src/ui-stitch-orbital test/src/ui-devtalles-polish && npx tsc --noEmit`

- [~] **T4.8 — Cierre de unidad** — ídem T4.4.
  - Verificar: `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `feat(ui): copy humanizado en voseo en pantallas vivas`

## Unidad 11 — LivePath: tokens, motion y cierre accesible

- [x] **T4.9 — 🧪 Test del botón cerrar y del texto de espera (rojo)** 🔗 (LivePath, sin test hoy) — rojo medido solo por `Claude` (botón cerrar verde desde T1.6).
  - Archivos: nuevo `frontend/test/src/features/live-path/components/LivePathScreen.test.tsx` (design §4.6: `button[aria-label='Cerrar']` con `svg[aria-hidden='true']`, sin `×`, click → `onClose` 1 vez, texto de espera sin `Claude`).
  - CA: CA-4.9, CA-4.10.
  - Verificar (debe fallar solo por `Claude`): `cd frontend && npx vitest run test/src/features/live-path`

- [x] **T4.10 — Test estático de tokens de LivePath (rojo)** — rojo medido: 4 fallan. Lee con `\r\n` → `\n` (CSS en CRLF).
  - Archivos: nuevo `frontend/test/src/ui-devtalles-polish/tokens.static.test.ts` — por ahora solo `LivePathScreen.module.css` (sin hex, sin `rgba?(`, sin fallback hex; `.title` sin `text-transform`; contiene `var(--orbital-motion-standard)` y no `ease;`), `LivePathModal.tsx` con `const EXIT_MS = 240;`, y recorrido de `frontend/src/**/*.css` sin `var(--live-display)`.
  - CA: CA-4.6, CA-4.7 (parcial), CA-4.8.
  - Verificar (debe fallar): `cd frontend && npx vitest run test/src/ui-devtalles-polish/tokens.static.test.ts`

- [x] **T4.11 — Implementar LivePath** — `.page` eliminado (0 referencias); `EXIT_MS` 280 → 240 sincronizado con `--orbital-motion-standard`.
  - Archivos: `frontend/src/features/live-path/components/LivePathScreen.module.css` (tabla completa design §4.5 "LivePathScreen.module.css completo": eliminar `.page` si sigue sin referencias, separar `.kicker`/`.title`, `.notes h2`, tokens, `.close:hover/:active`, reduced-motion); `LivePathModal.tsx:14` `EXIT_MS = 240`; `LivePathScreen.tsx:37` "Esperando que tu IA arme la ruta."
  - CA: CA-4.3, CA-4.6, CA-4.7, CA-4.8, CA-4.9, CA-4.10.
  - Verificar: `cd frontend && npx vitest run test/src/features/live-path test/src/ui-devtalles-polish && npx tsc --noEmit` (+ `live-path-state.test.ts` verde)

- [~] **T4.12 — Cierre de unidad** — ídem T4.4.
  - Verificar: `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `feat(live-path): tokens Orbital, motion estándar y cierre accesible`

## Unidad 12 — Tokens en shell, configurador y landing + títulos sin text-transform

- [x] **T4.13 — Ampliar test estático de tokens (rojo)** — rojo medido: 3 fallan (`MissionShell.module.css` ya estaba sin hex desde la Unidad 2).
  - Archivos: `frontend/test/src/ui-devtalles-polish/tokens.static.test.ts` — sumar `MyRouteStatus.module.css`, `MissionShell.module.css`, `app/(producto)/page.module.css` (sin hex, sin `rgba?(`, sin fallback hex); `mis-rutas/page.module.css` sin `lowercase`; `AssessmentResults.module.css` sin `text-transform: lowercase`.
  - CA: CA-4.3, CA-4.7.
  - Verificar (debe fallar): `cd frontend && npx vitest run test/src/ui-devtalles-polish/tokens.static.test.ts`

- [x] **T4.14 — Mapeo hex/rgb → tokens** — `MissionShell.module.css` sin cambios en este lote: solo le queda `border-radius: 999px` (L202), que no es color ni está en la tabla §4.5 → queda como está.
  - Archivos: `frontend/src/features/learning-paths/components/MyRouteStatus.module.css` (lista design §4.5 "MyRouteStatus.module.css"); `frontend/src/features/orbital/components/MissionShell.module.css` (regla de mapeo §4.5 sobre lo que quede tras Unidad 2; sin `position: fixed` tras `.mobilePanel`); `frontend/src/app/(producto)/page.module.css` (líneas listadas en §4.5 + `999px` → `var(--orbital-radius-full)`). Ningún token nuevo en `globals.css`.
  - CA: CA-4.7, CA-1.5 (restricciones de header siguen verdes).
  - Verificar: `cd frontend && npx vitest run test/src/ui-devtalles-polish test/src/ui-stitch-orbital/fase-0 test/src/ui-stitch-orbital/fase-1`

- [x] **T4.15 — `text-transform` de títulos**
  - Archivos: `frontend/src/app/(producto)/mis-rutas/page.module.css:27` (eliminar `lowercase`); `frontend/src/features/assessment/components/AssessmentResults.module.css:176` (eliminar `lowercase`). Etiquetas listadas como "se conservan" en §4.3: sin cambio.
  - CA: CA-4.3.
  - Verificar: `cd frontend && npx vitest run test/src/ui-devtalles-polish/tokens.static.test.ts test/src/ui-stitch-orbital`

- [x] **T4.16 — Nota de superación de #1460 en memoria** — observación #1510; `mem_save` no devolvió `judgment_required`, la relación se persistió con `mem_compare` (#1510 `supersedes` #1460, `rel-5392263776f87df9`); `mem_search` la devuelve con `supersedes: #1460`.
  - Acción (no es archivo del repo): `mem_save` con relación `supersedes` sobre la memoria #1460 (copy humanizado y Lucide de chrome superan la traducción literal Stitch; referencia ADR 0002). Resolver `judgment_required` si aparece.
  - CA: CA-4.11.
  - Verificar: `mem_search "ui-devtalles-polish supersedes 1460"` devuelve la observación.

- [~] **T4.17 — Cierre de unidad** — ídem T4.4.
  - Verificar: `cd frontend && npx vitest run && npx tsc --noEmit` → `npm run sdd:verify`
  - Commit sugerido: `style(ui): colores y espaciados sobre tokens Orbital`

- [~] **T4.18 — Suite verde del Lote 4 (y final de la feature)** — front 47 files / 174 tests verdes; path-diagram build OK (`widget bytes 882461`) + 9 files / 36 tests verdes; backend 48 files / 199 tests verdes (24 skipped), 6 archivos rojos por `@embedded-postgres/windows-x64` ausente (entorno, igual que T2.21); `tsc` front solo los 2 preexistentes, backend 29 preexistentes; huérfanos + `mcp-public` sin diff; grep de `//` como separador en los 13 archivos vivos = 0. Sin `sdd:verify` ni commit.
  - `cd frontend && npx vitest run` → verde (CA-4.12).
  - `cd frontend/path-diagram && npm run build:widget && npx vitest run` → verde (regresión CA-3.7).
  - `cd backend && npx vitest run` → verde salvo las 2 suites de Postgres por entorno (regresión final del contrato; el lote no toca backend).
  - `cd frontend && npx tsc --noEmit` y `cd backend && npx tsc --noEmit` → verdes (CA-T.3).
  - `git diff --stat <base>..HEAD -- frontend/src/features/learning-paths/components/RouteDetail* frontend/src/features/assessment/components/AssessmentWizard* frontend/src/features/orbital/components/OrbitalDemoBanner* backend/src/modules/mcp-public` → vacío (CA-T.4, CA-2.12).
  - CA-T.1 / CA-T.2 (AA, 375/768/1280) quedan para el gate de lenguaje visual de `sdd-verify`.

---

## Resumen de tareas

| Lote | Unidades | Tareas |
|---|---|---|
| 1 — Shell / auth / Lucide | U1, U2 | 14 (T1.1–T1.14) |
| 2 — Iconos de stack + `coverImageUrl` | U3, U4, U5, U6 | 21 (T2.1–T2.21) |
| 3 — Diagrama / configurador | U7, U8 | 10 (T3.1–T3.10) |
| 4 — Copy / tokens / landing | U9, U10, U11, U12 | 18 (T4.1–T4.18) |
| **Total** | **12 unidades** | **63** |

## Pronóstico de presupuesto por unidad (líneas cambiadas, sin lockfile, `specs/` ni snapshots)

| Unidad | Estimado | Nota |
|---|---|---|
| U1 Lucide chrome | ~170 | `package.json` +1; lockfile excluido |
| U2 Shell "Entrar" | ~260 | CSS de shell + 4 tests reescritos |
| U3 Backend `coverImageUrl` | ~330 | controller spec nuevo ~110 + course-card spec ~100 + JSON ~20 |
| U4 Front contrato | ~160 | |
| U5 SVG + mapa | ~250–380 | **incertidumbre:** tamaño de los 14 SVG no medido (cada uno ~5–20 líneas; si alguno viene minificado en una línea, cuenta poco). Apply mide con `git diff --stat` antes de commitear; si pasa 400, se separan los SVG en su propio commit `chore(assets)` con el test (b)/(d) |
| U6 `/mis-rutas` iconos | ~200 | |
| U7 Cover modal | ~170 | |
| U8 Configurador | ~200 | |
| U9 Landing | ~300 | muchas eliminaciones de CSS en `page.module.css` |
| U10 Copy resto | ~320 | 5 componentes + 7 tests + static test |
| U11 LivePath | ~260 | reescritura de `LivePathScreen.module.css` (~155 líneas) |
| U12 Tokens | ~280 | `page.module.css` ~30 líneas ×2 + MyRouteStatus/MissionShell |

Riesgo de presupuesto 400 líneas: Medio
Unidades que lo superan: ninguna
¿Partir en PRs encadenados?: Sí

> Un PR por lote (4 PRs encadenados: Lote 1 → 2 → 3 → 4), cada uno con sus unidades como commits separados. El riesgo es Medio por U5 (SVG sin medir) y U3/U10 cercanas al límite; si cualquiera supera 400 al medir, se parte como indica la nota antes de commitear — no se pide `SDD_SIZE_EXCEPTION`.

📚 Referencias cargadas: `specs/ui-devtalles-polish/design.md`, `specs/ui-devtalles-polish/spec.md`, `specs/ui-devtalles-polish/explore.md` (riesgo y estructura), `decisions/0002-lucide-chrome-icons.md` (ubicación verificada), `frontend/package.json`, `frontend/path-diagram/package.json`, `backend/package.json` (scripts).
