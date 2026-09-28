# Verify — `ui-devtalles-polish`

> Fase: `sdd-verify`. Fecha: 2026-09-27. Diff verificado: working tree sin commitear (56 archivos modificados + nuevos, ver `git status --short`). HEAD `0d1a541`.
> Lectura: .cursor/rules/constitution-fases.mdc e3160314
> Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a

## Veredicto

**PASS con observaciones.** El código cumple todos los CA de `spec.md` (1.1–4.12, T.1–T.4) con evidencia ejecutada ahora. Ningún defecto funcional, de seguridad ni de accesibilidad bloquea el archive.

Condición de proceso (no del código): **el recibo SDD no se emitió** porque no hay nada stageado (exit 2 "Worktree ≠ index"), y además `sdd.receipt.json` pide gates (`lint`, `test:pg`, `npm run sdd:verify`) que este repo no tiene. El pre-commit va a rechazar el commit hasta que el dev stagee la unidad y alinee el recibo (ver O-1). No stageé nada: esa decisión es del dev o de apply.

---

## 1. Recibo y gates deterministas

| Gate | Estado | Evidencia |
|---|---|---|
| Recibo SDD | ⚠️ NO EMITIDO | No existe `npm run sdd:verify` (ningún `package.json` lo define). Invocado directo: `cd CodeQuest-2026 && node ../.cursor/scripts/sdd/verify-receipt.mjs` → **exit 2** `✖ Worktree ≠ index. Stageá todo lo que forma parte de la unidad (git add) o descartalo:` + lista de los 56 archivos `M`/`??`. Regla (a): no stageo; lo decide apply o el dev. |
| Suite front | ✅ | `cd frontend && npx vitest run` → **exit 0** · `Test Files 47 passed (47)` · `Tests 174 passed (174)` |
| Paquete `path-diagram` build | ✅ | `cd frontend/path-diagram && npm run build:widget` → **exit 0** · `dist/widget/index.html 883.21 kB` · `✓ built in 4.95s` |
| Paquete `path-diagram` tests | ✅ | `npx vitest run` → **exit 0** · `Test Files 9 passed (9)` · `Tests 36 passed (36)` (incluye `widget-bundle.test.ts` y `path-diagram.modal.test.tsx` 7 tests) |
| Suite backend | ✅ (línea base) | `cd backend && npx vitest run` → exit 1 · `Test Files 6 failed \| 48 passed (54)` · `Tests 199 passed \| 24 skipped (223)`. Los 6 archivos rojos son **todos** `Error: Cannot find package '@embedded-postgres/windows-x64'`: `migrations.spec.ts`, `postgres-oauth-server.model.spec.ts`, `auth.service.spec.ts`, `typeorm-user.repository.spec.ts`, `learning-path.repositories.spec.ts`, `auth.controller.spec.ts`. Ninguno está en el diff. **0 tests fallidos** fuera de esa causa de entorno = línea base confirmada. |
| tsc front | ✅ (línea base) | `cd frontend && npx tsc --noEmit` → exit 1 con **exactamente 2** errores preexistentes: `.next/types/validator.ts(60,39)` (tipo generado stale que apunta a `ajustes/tokens/page.js`, no borrado en este diff) y `test/src/features/auth/lib/local-session.test.ts(14,7)` (archivo sin diff). Cero errores en archivos tocados. |
| tsc `path-diagram` | ✅ (línea base) | `cd frontend/path-diagram && npx tsc --noEmit` → exit 1 con los mismos 2 errores de arriba (resuelve `../.next` y `../test`). Nada propio del paquete. |
| tsc backend | ✅ (línea base) | `cd backend && npx tsc --noEmit` → exit 1 · **29** errores (= línea base) en 8 specs: `redis-catalog.repository.spec.ts` 1, `session-auth.guard.spec.ts` 1, `live-path.tools.spec.ts` 3, `cimd-fetch.spec.ts` 2, `mcp-user-tools.spec.ts` 15, `postgres-oauth-server.model.spec.ts` 4, `session-consent-user.spec.ts` 1, `pg-test-context.ts` 2. `mcp-user-tools.spec.ts` está en el diff: sus 15 errores son el patrón preexistente `content?.find(...)` / `textOf(await callTool(...))` (tipo del SDK MCP). La línea 200 era la 199 en HEAD (mismo `callTool`); las líneas agregadas (20, 24, 64, 202-207, 214-218) **no** generan errores. Cero errores en `course-card.ts`, `course-card.spec.ts`, `catalog-scraper.controller.spec.ts`, `learning-paths.service.spec.ts`. |
| Lint | ⚠️ NO EJECUTADO | Ni `frontend`, ni `backend`, ni `frontend/path-diagram` definen script `lint` (`node -e` sobre los 3 `package.json`: solo dev/build/start/test). No hay config de ESLint en el repo. |
| Token-lint (stylelint de literales visuales) | ⚠️ NO EXISTE | Sin stylelint en el repo. Compensado con `tokens.static.test.ts` (verde) + grep manual (§4.6). **Recomendación única:** configurar el token-lint de `frontend-reference/references/design-lint.md`; es lo único que vuelve el "cero literales" un gate real en todo `src/`, no solo en los 4 archivos que fija el test. |
| Arquitectura (`arch-guard`) | ⚠️ NO EJECUTADO | `node ../.cursor/scripts/sdd/arch-guard.mjs frontend/src` (y `backend/src`) → exit 1 `✖ arch: salida de depcruise no es JSON: ❌ Oops! You're trying to run a package that should be provided by a local binary, but isn't… This is a placeholder published to prevent dependency confusion.` → `dependency-cruiser` no está instalado y `npx` resolvió un paquete placeholder. Inspección manual en §3. **Recomendación única:** instalar `dependency-cruiser` como devDependency (evita además que `npx` descargue paquetes por nombre). |
| Higiene de procesos | ✅ | Ninguna suite ni script de este cambio levanta contenedores/túneles. Sin `docker compose` ni procesos huérfanos introducidos. |

## 2. Criterios de aceptación

### Lote 1 — Shell / auth / mobile / Lucide

| CA | Estado | Evidencia |
|---|---|---|
| 1.1 | ✅ | `decisions/0002-lucide-chrome-icons.md` frontmatter `status: accepted`; L8 "Supera parcialmente a 0001: solo la cláusula 'sin librerías de iconos nuevas' (limitada a iconos de chrome)". Ratificación formal del dev pendiente según design (no hay commit todavía). |
| 1.2 | ✅ | `git diff frontend/package.json` → `+"lucide-react": "1.48.0"` (exacta). Imports: 7 archivos, todos `import { … } from "lucide-react"` (grep). Cero `import * as`/default (`shell-chrome.static.test.ts` verde). Todos los usos llevan `strokeWidth={CHROME_ICON_STROKE_WIDTH}` (grep de usos sin ese prop → 0 líneas), una sola fuente `src/config/chrome-icon.ts` = `2`. Typecheck sin errores en esos archivos. |
| 1.3 | ✅ | Navegador, HTML SSR sin sesión, 5 páginas × 3 anchos: `entrarCount: 1`, `registroInHeader: 0` en todos. `ShellAccount.tsx` diff: un solo `<Link … href={authEntryPath("login")}>Entrar</Link>`. `dom.test.tsx`, `mobile-nav.test.tsx`, `ShellAccount.test.tsx`, `shell-chrome.static.test.ts` verdes. |
| 1.4 | ✅ | `git status --short -- frontend/src/features/auth/api` → vacío (sin diff en `auth.service.ts` ni `auth-entry`). `auth.service.test.ts` (1) y `auth-entry.test.ts` (1) verdes sin modificar. `curl /registro` → 200 con "Creá tu cuenta". |
| 1.5 | ✅ | Navegador a 375 px sin sesión: hamburguesa `44x44@208,10`, "Entrar" `89x44@260,10` → `entrarRight: true`, `sameRow: true`, header 64 px, sin scroll horizontal. CSS: `.loginNav { display: none }` base y `display: flex` en `@media (min-width: 48rem)`; `mobile-nav.test.tsx` y `header-responsive.characterization.test.ts` verdes sin cambios en sus asserts de CSS. |
| 1.6 | ✅ | `MissionShell.tsx` variante login monta `<MissionShellMobileNav links={[...PRODUCT_LINKS]} />`. Navegador `/login` a 375: `burger 44x44` visible. `mobile-nav.test.tsx` nuevo `it` de variante login (click → 3 links, Escape → cerrado) verde. |
| 1.7 | ✅ | `PRODUCT_LINKS` → `"Configurador de ruta"`; navegador a 768/1280: nav `["Mis rutas","Configurador de ruta","MCP"]`. Grep `Descubre tu ruta` en `frontend/src` → 0. |
| 1.8 | ✅ | Footer de las 5 páginas: `"DevTalles•Hecho para Code Quest 2026"`; crédito con `.footerCredit` (`--orbital-ink-muted`). `dom.test.tsx` assert de orden verde. |
| 1.9 | ✅ | `<svg` ausente en `MissionShellMobileNav.tsx` y `MyRouteStatus.tsx`; `×` ausente en `frontend/src` (grep). Todo icono Lucide con `aria-hidden="true"`; botones de solo icono con `aria-label` ("Abrir/Cerrar menú de navegación", "Copiar"/"Copiado", "Cerrar"). Marcas GitHub/LinkedIn/Discord y radar siguen como SVG propios. |
| 1.10 | ✅ | `login-contract.test.ts (3 tests)` verde. Reescritura declarada en spec §"Los 2 rojos obsoletos". |
| 1.11 | ✅ | Suite front 47/174 verde, 0 rojos. |

### Lote 2 — Iconos de stack + contrato `coverImageUrl`

| CA | Estado | Evidencia |
|---|---|---|
| 2.1 | ✅ | `ls public/devtalles-tech` → 14 archivos (kebab-case, tabla de design). Todos empiezan `<?xml version="1.0" encoding="UTF-8"?><svg`. `grep -il -E "<script\|\son[a-z]+\s*=\|javascript:\|<foreignObject\|href=\"http" public/devtalles-tech/*.svg` → **exit 1 (sin coincidencias)**. `official-paths.test.ts` lo fija. |
| 2.2 | ✅ | Única fuente `src/config/official-paths.ts` (13 ids, `programas-fundamentos` → `javascript.svg`). Grep `/devtalles-tech/` en `frontend/src` → solo `official-paths.ts:21`. `officialPathIconSrc(null\|desconocido)` → `null` (test verde). |
| 2.3 | ✅ | `StackIcon.tsx`: `<img>` con `width`/`height` (24/40), `alt={standaloneLabel ?? ""}`, `loading="lazy"`, `decoding="async"`. Navegador: 13 `img` en el listbox, `alt=""`, 24 px, `complete && naturalWidth>0`. |
| 2.4 | ✅ (parcial en vivo) | Picker + opciones: verificado en navegador (captura abajo). Lista de `MyRouteStatus` y cards de `/mis-rutas`: el backend no estaba levantado ("No pudimos cargar tus rutas"), se verifican por `MyRouteStatus.test.tsx`, `LearningPathsDashboard.test.tsx` (caso `ruta-c` con `img[alt=""]` y caso `null` sin `img`), `StackIcon.test.tsx`: verdes. |
| 2.5 | ✅ | `load-my-routes.ts` diff: `sourceCatalogPathId: item.sourceCatalogPathId ?? null` en `loadMyRoutes` y `createOfficialRoute`; `subscribe-learning-paths.ts` → `null`. Sin diff de backend para esto. `load-my-routes.test.ts (3)` verde. |
| 2.6 | ✅ | `course-card.ts` y `path-diagram/src/model.ts`: `coverImageUrl: string \| null` requerido, en el mismo orden. Sin `any`/casts nuevos en código de producción (grep). |
| 2.7 | ✅ | `course-card.spec.ts`: `toStrictEqual` (L48, L109) + `it.each` con host ajeno, `http:`, sufijo engañoso, credenciales, puerto, malformada, `''`, `null` → `null`; cover válida → mismo valor. Suite backend verde en ese archivo. |
| 2.8 | ✅ | `nest/catalog-scraper.controller.spec.ts` nuevo: 200 `toStrictEqual({ course })`, cover `null` presente, 404 (curso inexistente y sin snapshot), 400 para `abc` y 13 dígitos con `getCourseCard` no llamado. |
| 2.9 | ✅ | `test/src/lib/load-course-card.test.ts`: con cover, con `null`, error → `null`. Verde. |
| 2.10 | ✅ | `learning-paths.service.spec.ts`: `toEqual` → `toStrictEqual` con `coverImageUrl: null` (endurecido, no relajado). |
| 2.11 | ✅ | Artefacto único `contracts/course-card.example.json`, consumido por backend (`catalog-scraper/test/course-card-example.ts`, retorna `unknown`, sin cast) y front (`test/src/contracts/course-card.contract.test.tsx`, render del cover en `CourseModal`). Paridad en `mcp-user-tools.spec.ts:214-217`: MCP `get_my_path` = REST `getById` = `toCourseCard` = la misma URL. |
| 2.12 | ✅ | `git status --short -- backend/src/modules/mcp-public` → vacío. `partial-courses.spec.ts` y `mcp-http.spec.ts` dentro de los 48 archivos verdes. |
| 2.13 | ✅ | Suites verdes salvo los 6 archivos de Postgres embebido (entorno, línea base). |

### Lote 3 — Diagrama / configurador

| CA | Estado | Evidencia |
|---|---|---|
| 3.1 | ✅ | `path-diagram.tsx` diff: `<img src={cover} alt="" width={640} height={360} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError=…>`; `null`/error/modo `mcp` → sin nodo. `path-diagram.modal.test.tsx (7)` verde (con cover, sin cover, error, mcp). |
| 3.2 | ✅ | `layout-path.test.ts`: diff solo agrega el `it` de labels; asserts de geometría sin tocar. Paquete 36/36. |
| 3.3 | ✅ | `layout-path.ts` labels en oración; `path-diagram.module.css` diff: `text-transform: uppercase` quitado de `.header,.groupLabel` y `.dialog h3`, `.tags li` → `capitalize`. `configurator-layout.static.test.ts (5)` verde. |
| 3.4 | ✅ | Navegador `/configurador-de-ruta`: sección 768 px de ancho con márgenes izquierdo/derecho **128/128 (1024), 256/256 (1280), 336/336 (1440)** → diferencia 0 ≤ 1rem; todos los hijos alineados igual. Sin scroll horizontal en 375/768. `justify-self: start` generalizado eliminado (test estático). |
| 3.5 | ✅ | Picker y 13 opciones con `StackIcon` (navegador + `MyRouteStatus.test.tsx`). |
| 3.6 | ✅ | Grep `El video va acá` en `frontend/src` → 0; `MyRouteStatus.test.tsx` afirma `not.toContain`. |
| 3.7 | ✅ | Build del widget + 36/36 (ver §1). |

### Lote 4 — Copy, tokens, marca, landing

| CA | Estado | Evidencia |
|---|---|---|
| 4.1 | ✅ | Grep `\b(Inicia\|Descubre\|Selecciona\|Copia y pega\|Elige\|Vienes\|necesitas\|Lleva\|Deja\|tienes)\b` en `frontend/src` → 0. `copy-voice.static.test.ts` verde. |
| 4.2 | ✅ | `copy-voice.static.test.ts` (sin separador `//` en los archivos de CA-4.2) verde. |
| 4.3 | ✅ | Headings en oración en navegador ("Descubrí tu ruta de aprendizaje ideal", "Elegí desde dónde arrancás", "Desarrolladores", "Armá tu ruta", "Mis rutas"). `tokens.static.test.ts` verifica `lowercase` fuera y `.title` sin `text-transform`. |
| 4.4 | ✅ | `curl /` (sin sesión) → `Rutas oficiales</span><strong>13`; sin `38 rutas`, `100%`, `RIASEC`, `LOC: 09`. `landing-copy.test.tsx` verifica derivación de `OFFICIAL_PATHS.length`. |
| 4.5 | ✅ | Grep `user-select:\s*none` en `frontend/src/**/*.css` → 0. |
| 4.6 | ✅ | Grep `--live-display` → 0. |
| 4.7 | ✅ | Grep `#hex\|rgba?(` en `frontend/src/**/*.css`: `LivePathScreen.module.css`, `MyRouteStatus.module.css`, `MissionShell.module.css`, `app/(producto)/page.module.css` → **0 coincidencias** (no aparecen en el conteo). `tokens.static.test.ts` verde. Excepción declarada `LoginPanel.module.css` (Discord). |
| 4.8 | ✅ | `LivePathModal.tsx` `EXIT_MS = 280 → 240`; CSS con `var(--orbital-motion-standard)` (240 ms, `cubic-bezier(0.77, 0, 0.175, 1)`). Ningún `ease` genérico ni `transition: all` agregado (grep del diff CSS). |
| 4.9 | ✅ | `LivePathScreen.tsx`: "Esperando que tu IA arme la ruta." (ver O-4 sobre otro texto fuera del CA). |
| 4.10 | ✅ | `LivePathScreen.test.tsx (2)` verde: `button[aria-label='Cerrar']` con `svg[aria-hidden]`, sin `×`, click → `onClose` 1 vez. |
| 4.11 | ✅ | ADR 0002 L30 registra la superación de #1460. Engram `mem_search` → **#1510** "ui-devtalles-polish supersedes 1460…", relación `supersedes: #1460`. |
| 4.12 | ✅ | Tests de caracterización reescritos (ver §5), suite verde. |

### Transversales

| CA | Estado | Evidencia |
|---|---|---|
| T.1 Accesibilidad AA | ✅ | Script de contraste en navegador (texto visible con fondo sólido, 1280 px) sobre `/`, `/configurador-de-ruta`, `/mis-rutas`, `/docs/mcp` → **0 pares por debajo de 4.5:1 (3:1 texto grande)**. Texto sobre `background-image` (hero) queda fuera de la medición automática. Controles de solo icono con nombre accesible; imágenes decorativas `alt=""`; foco visible global `globals.css` (sin cambio). Ver O-5. |
| T.2 Responsive | ✅ | Navegador, 5 páginas × 375/768/1280 (con sesión y HTML SSR sin sesión): `hScroll: false` en todas, header 64 px (una línea), ningún control interactivo < 24×24 px; controles tocados 44 px (hamburguesa 44×44, "Entrar" 89×44, opciones 50 px). |
| T.3 Typecheck | ✅ | Solo errores de línea base (§1); sin `any`/casts nuevos en producción. El único `as` en tests nuevos es `ResizeObserverMock as typeof ResizeObserver`, patrón ya presente en 5 tests del repo. |
| T.4 Huérfanos y widget | ✅ | `git status --short` sobre `RouteDetail*`, `AssessmentWizard*`, `OrbitalDemoBanner*`, `app/_componentes`, `path-diagram/src/register*`, `next.config.ts` → vacío. `widget-bundle.test.ts` verde. |

## 3. Arquitectura y calidad

- ✅ `allowedCoverImageUrl` vive en `application/course-card.ts` (función pura, sin imports nuevos, sin framework). Controller, service y MCP sin cambios de código.
- ✅ Front: `StackIcon` es presentación pura (sin fetch). Config sin imports. `load-my-routes.ts` sigue siendo la única capa que usa `@/lib/axios`.
- ✅ Sin `console.log`, sin código comentado, sin imports sin usar en el diff (tsc sin TS6133 en archivos tocados).
- ✅ Unit of Work / atomicidad: no aplica (sin escrituras nuevas).
- ✅ Contrato: `coverImageUrl` es aditivo en `GET /catalog/courses/:courseId`, `detail` y `get_my_path`; ningún campo quitado ni renombrado → sin bump (design §Versión).
- ✅ Runtime de endpoints: el diff no toca rutas, handlers ni queries (solo el mapeo puro `toCourseCard`). El catálogo vive en Redis (snapshot), no en BD, como declara la spec; el controller se ejercita con Nest `TestingModule` y la paridad corre contra el snapshot fixture. `test:pg` no aplica y no existe en el repo.
- ✅ Error contract: sin códigos nuevos (400/404 existentes caracterizados) → no aplica.

## 4. Seguridad

1. **IDOR/BOLA:** sin endpoints nuevos; `get_my_path` del usuario B sigue devolviendo error (`mcp-user-tools.spec.ts:149-153`, verde).
2. **Injection / input externo en frontera:** ✅ `coverImageUrl` (scraping `og:image`) se valida en backend antes de exponerse: `URL.canParse` → `https:` → `hostname === 'import.cdn.thinkific.com'` exacto → sin `username`/`password`/`port`; si no, `null`. Casos hostiles cubiertos por `it.each` (sufijo `…thinkific.com.evil.com`, `http:`, credenciales, puerto, malformada, vacía, `null`). El front no revalida, como fija la spec.
3. **Misconfiguration / secretos:** sin cambios de config, env ni CSP. `lucide-react@1.48.0` exacta con `integrity` en lockfile, licencia ISC.
4. `<img>` de covers: `alt=""`, `loading="lazy"`, `decoding="async"`, `width/height` 640×360, `referrerPolicy="no-referrer"`, `onError` oculta. Sin `dangerouslySetInnerHTML` en el diff.
5. SVG vendorizados: sin `<script>`, `on*=`, `javascript:`, `foreignObject` ni href externos; además se cargan por `<img>` (el navegador no ejecuta scripts de un SVG cargado así).
6. Situacionales: sin rate limiting, CSRF, JWT, SSRF ni uploads nuevos. Señal "dependencias de terceros": lockfile fijo ✅.

## 5. Tests no debilitados (gate 1b)

`git diff` sobre tests: cada `expect` quitado se reemplaza por uno del **mismo tipo y precisión** con el valor nuevo, y todos figuran en spec §"Asserts que se reescriben" o design §4.6 (fijan copy de componentes vivos, con el porqué declarado). Casos que revisé uno por uno:
- `landing-breakpoints…:15-18`: `.location { display:none }` pasa a afirmar ausencia de `.location` en CSS y de `styles.location` en `page.tsx` (declarado en spec: se quitó la línea `LOC: 09° // …`).
- `landing.test.tsx:61`: `svg circle` 13 → 12 exacto (icono de protocolo eliminado, declarado).
- `login-contract.test.ts`: 2 `it` obsoletos reescritos al contrato Discord (declarado).
- `course-card.spec.ts` y `learning-paths.service.spec.ts`: `toEqual` → `toStrictEqual` (más estricto).
- `routes-dom.test.tsx:80,83` y `assessment-dom.test.tsx:97,105`: copy de `LearningPathsEmptyState`/`TypescriptCheckpoint` (vivos), declarado en design §4.6.
- Ningún assert pasó a `toMatchObject`/`toBeTruthy` ni se borró sin reemplazo.

## 6. Flujos conectados (disposición de la spec)

| Flujo | Disposición | Verificación |
|---|---|---|
| `GET /catalog/courses/:courseId` | EN SCOPE | `catalog-scraper.controller.spec.ts` + `course-card.spec.ts` verdes |
| `toDetail` → `detail` REST | EN SCOPE | `learning-paths.service.spec.ts` verde |
| MCP `get_my_path` | EN SCOPE | `mcp-user-tools.spec.ts` verde (paridad L214-217) |
| SSE `path.saved`/`path.generated` | EN SCOPE (indirecto) | `live-path.sse.spec.ts` dentro de los 48 archivos verdes del backend; `live-path-state.test.ts` en la suite front verde |
| MCP público | FUERA | diff vacío en `mcp-public/**` |
| `loadCourseCard` → `PathDiagram` | EN SCOPE | `load-course-card.test.ts` verde |
| `loadPathDetail` → `CourseModal` | EN SCOPE | `path-diagram.modal.test.tsx` + contract test verdes |
| Widget MCP | FUERA | sin diff en `register*`; `widget-bundle.test.ts` verde |
| Shell | EN SCOPE | `dom`, `mobile-nav`, `ShellAccount`, `shell-chrome` verdes + navegador |
| Login/registro | EN SCOPE (UI) | `login.test.tsx`, `login-contract.test.ts` verdes; auth API sin diff |
| `/configurador-de-ruta` | EN SCOPE | `MyRouteStatus.test.tsx`, `configurator-layout` verdes + navegador |
| `/mis-rutas` | EN SCOPE | `LearningPathsDashboard.test.tsx`, `routes-dom.test.tsx` verdes + navegador |
| Landing | EN SCOPE | `landing`, `landing-breakpoints`, `home-auth-status`, `landing-copy` verdes + navegador |
| LivePath | EN SCOPE | `LivePathScreen.test.tsx` verde |
| Toast global | FUERA | `app/_componentes` sin diff |
| Huérfanos | FUERA | sin diff |
| `extractTags` | FUERA | `parse-learning-path.ts` sin diff |

## 7. Testing (escala)

Ningún flujo es camino crítico (spec §Segundo eje, declarado): nivel 2 como máximo → no aplican recovery, concurrencia ni mutation. Todos los flujos nivel 2 tienen caminos de error y bordes (allowlist con 9 casos hostiles; controller 200/404×2/400×2; `loadCourseCard` error; `CourseModal` null/error/mcp; mapa de iconos id desconocido/null). Eje "cruza un contrato": contract test contra el artefacto único ✅.

## 8. Lenguaje visual (conformidad elevada)

- ✅ Modo ejecutado = aprobado (conformidad elevada sobre Orbital).
- ✅ Iconos de chrome de un solo set (Lucide), stroke único `2` desde una constante, `currentColor`, tamaño por CSS en rem. Unicode como icono eliminado (`×`, `⧉`, `✓`, `→`, `⌁`). Viñetas decorativas con `aria-hidden` (Could).
- ✅ Tokens: 0 literales en los 4 CSS de CA-4.7. Los `+` del diff CSS con literales son: la `.cover` del paquete `path-diagram` (`12px`, `#130c25`, excepción declarada: widget sin `globals.css`) y bordes de `1px` (hairline). `page.module.css:441` `box-shadow: 0 0 0 4px …` conserva un `4px` preexistente (solo cambió el color a token); ver O-6.
- ✅ Estados: "Entrar" (default/hover/focus global/active nuevo), `.choice`/`.submit` (hover/active/disabled/loading), `.close` de LivePath (hover/active nuevos). Primitivo no migrado: no aplica.
- ✅ Motion < 300 ms con curva propia (`--orbital-motion-standard` 240 ms, `--orbital-motion-fast` 160 ms); `prefers-reduced-motion` agrega `.close` y `.loginNav a`.
- ✅ Superficies del navegador ya tematizadas en `globals.css` (sin cambio).
- ✅ Consistencia entre vistas hermanas: variantes product y login del shell comparten nav, MobileNav, "Entrar" y footer.

### Capturas (navegador, sesión del dev activa)

Configurador a 375 px, picker abierto con iconos de stack:

![Configurador 375 picker](c:\Users\JSAHON~1\AppData\Local\Temp\cursor\screenshots\page-2026-09-27T18-24-48-470Z.png)

## 9. Browser 375/768/1280 — hecho, no pendiente

Revisé `/`, `/login`, `/registro`, `/configurador-de-ruta`, `/mis-rutas` contra el dev server local (`localhost:3000`, que sirve el árbol actual). Como el navegador tenía sesión activa, el estado sin sesión se midió renderizando el HTML SSR (`fetch` sin credenciales) en un iframe sin scripts. No toqué la sesión del dev. Resultados en §2 (CA-1.3, 1.5, 1.6, 3.4, T.2).

Lo que quedó sin ver en vivo (cubierto por tests, no por navegador):
- Lista de rutas del usuario y cards de `/mis-rutas` **con iconos**: el backend no estaba corriendo, así que la API respondió error.
- Modal de curso con cover real (`CourseModal`) y LivePath abierto: requieren backend y ruta guardada.
- h1 de `/login` ("Entrá a CodeQuest"): se renderiza en cliente y el navegador con sesión redirige a `/`. Lo cubre `login.test.tsx`.

## 10. Observaciones (ninguna bloquea el archive)

| # | Severidad | Dónde | Qué |
|---|---|---|---|
| O-1 | **Media (proceso, bloquea el commit, no el código)** | `.cursor/sdd.receipt.json` / pre-commit | Recibo no emitido: worktree ≠ index (nada stageado). Además el recibo pide `npm run lint` y `npm run test:pg`, que no existen en ningún `package.json`, y la fase pide `npm run sdd:verify`, que tampoco existe → aunque se stagee, el recibo va a salir rojo por gates inexistentes. Para cerrarlo: el dev stagea la unidad y alinea `sdd.receipt.json` a los scripts reales (quitar `lint`/`test:pg` o crearlos), y después se re-corre el recibo. |
| O-2 | Baja | `package-lock.json` (raíz), `backend/src/modules/catalog-scraper/test/course-card-example.ts` | Modificados/creados pero no figuran en "Paths en scope" de la spec. Ambos son legítimos (lockfile del workspace npm, coherente con `lucide-react@1.48.0`; helper del contract test). Agregarlos a la spec antes del commit para que `sdd-gate.mjs` no los marque fuera de alcance. |
| O-3 | Baja | `specs/ui-devtalles-polish/spec.md` último renglón | `Aprobado por dev: PENDIENTE`: el sello formal (`sdd-gate.mjs approve`) y la ratificación del ADR 0002 siguen pendientes antes del commit del Lote 1 (toca `src/**/auth/**`). |
| O-4 | Baja | `frontend/src/features/live-path/live-path-state.ts:33` | El prompt de elección de LivePath sigue diciendo "Decile a Claude cuál preferís" (Claude como único cliente). Fuera del texto literal de CA-4.9 y archivo fuera del diff; mismo criterio que CA-4.9 si se quiere neutral. |
| O-5 | Baja | `frontend/src/app/(producto)/page.tsx:132` | Los 4 links "Empezar por acá" tienen el mismo nombre accesible. Cumple WCAG 2.4.4 (AA) por contexto (cada uno dentro de su `article` con `h3`), pero en una lista de links de lector de pantalla son indistinguibles. Mejora opcional: `aria-describedby` al `h3` de la puerta. |
| O-6 | Info | `frontend/src/app/(producto)/page.module.css:441` | `box-shadow: 0 0 0 4px …` conserva un `4px` literal preexistente (solo se tokenizó el color). No lo exige CA-4.7 (habla de color); lo cazaría un token-lint. |
| O-7 | Info | tooling | Sin lint, sin token-lint y sin `dependency-cruiser` instalado (arch-guard no ejecutable; `npx` bajó un paquete placeholder). Recomendación única de cada uno en §1. |

## Checkpoint

- Veredicto: **PASS con observaciones**. Listo para `sdd-archive` en cuanto al código.
- Antes del commit (lo decide el dev): cerrar O-1 (stagear la unidad y alinear el recibo), O-2 (sumar los 2 paths a la spec) y O-3 (sellar la spec y ratificar el ADR 0002).

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc` (e3160314), `.cursor/rules/constitution-codigo.mdc` (2c261a0a), `specs/ui-devtalles-polish/spec.md`, `specs/ui-devtalles-polish/design.md`, `decisions/0002-lucide-chrome-icons.md`, `.cursor/sdd.receipt.json`, `.cursor/scripts/sdd/verify-receipt.mjs`, `.cursor/scripts/sdd/arch-guard.mjs` (salida), Engram #1510.
