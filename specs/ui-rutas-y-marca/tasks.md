# Tasks — `ui-rutas-y-marca`

> Fase `sdd-tasks`. Fecha: 2026-09-27. Entrada: `explore.md`, `spec.md` (CA-1…CA-7), `design.md` (aprobado por el orquestador).
> Todas las rutas son relativas a `CodeQuest-2026/frontend/` salvo que se indique otra cosa. Tests en `test/src/…`.
> Regla de cada tarea de test: **escribir → correr → verde (caracterización) o rojo esperado (nuevo) → código → verde.**

## Decisiones del checkpoint que condicionan estas tareas

- **D-9 aceptada (orquestador, checkpoint de design):** `src/features/learning-paths/components/LearningPathsDashboard.module.css` **NO** se agrega a `TOKENIZED_CSS`. La spec (CA-5.10) dice "si se toca un `.module.css` no listado, se agrega a la lista"; **el ajuste de CA-5.10 está aprobado por D-9 de design**: ese archivo solo recibe borrados de reglas huérfanas (ninguna declaración nueva) y queda fuera de la guardia de tokens. Todo CSS nuevo va a módulos nuevos que sí entran a la guardia.
- **Q-1…Q-4 resueltas** (design §Preguntas): "Code Quest" se quita solo del `MissionShell`; footer product = isologo + "DevTalles", footer login = "DevTalles"; metadata `unknown` = `["Nivel", "Inicial"]`; D-8 (diff mezclado con `ui-devtalles-polish`) **aceptada**.
- Nombre efectivo del mapa de marca: `BRAND_ASSETS` (la spec escribe `BRAND`; mismo significado).

## Supuestos de ejecución declarados (verificar antes de la Unidad 1)

- ⚠️ **No existen scripts `typecheck`, `lint` ni `sdd:verify`** en `frontend/package.json` ni en el `package.json` raíz (solo `test` = `vitest run` y `build` = `next build`). Comandos a usar:
  - Tests: `npm run test --workspace=frontend` (o `npm test` dentro de `frontend/`).
  - Typecheck: `npx tsc --noEmit -p frontend` (verificar que `frontend/tsconfig.json` existe; si no compila así, avisar — no inventar otro).
  - Lint: **sin script** → `verify` lo declara como hueco (CA-7.1 pide lint verde); no se agrega script en este ciclo sin pedido.
  - "`npm run sdd:verify` en verde" por unidad = suite del frontend verde + typecheck verde.
- Observación (no cambia el diseño): `@tanstack/react-query` **sí** está en `frontend/package.json`, aunque design dice que no. La decisión se mantiene porque los componentes tocados usan el patrón manual `useEffect` + `active` + `attempt` y se respeta el patrón existente.
- Origen de los SVG de marca (verificado): `proyecto/DEVTALLES-PAQUETES DE ELEMENTOS/SVG/ISOLOGO COLOR.svg` (25 líneas) y `DEVI HELLO BORDER.svg` (146 líneas), fuera del repo `CodeQuest-2026/`.

Leyenda: 🔗 = toca un flujo conectado de `explore.md` · 🧪C = test de caracterización (verde contra el código actual) · 🧪N = test nuevo (rojo esperado antes del código).

---

# Lote A — caracterización + helpers de error + CTA Entrar + estados dashboard/configurador

## Unidad 1 — Caracterización de errores y helpers de clasificación

- [x] **A1. 🧪C `mapApiResponseError`** 🔗 (`lib/axios.ts`, sin modificar)
  - Archivos: `test/src/lib/api-auth-policy.test.ts` (nuevo).
  - Casos: con `response` → `Error` con `codigoEstado = status` y `cuerpo = data`; sin `response` → `Error` sin `codigoEstado`. Verde contra el código actual. **No se toca `lib/axios.ts`.**
  - CA: CA-6.1.
- [x] **A2. 🧪C `asApiError`** 🔗 (`lib/errors.ts`, reusado)
  - Archivos: `test/src/lib/errors.test.ts` (nuevo).
  - Casos: `Error` con `codigoEstado`/`cuerpo` → `ApiError { statusCode, body }`; `Error` plano → `statusCode 0`; `ApiError` → misma instancia; no-Error → `statusCode 0`. Verde hoy.
  - CA: CA-6.2.
- [x] **A3. 🧪N `apiErrorCode`** → implementar
  - Archivos: `test/src/lib/errors.test.ts` (casos nuevos), `src/lib/errors.ts` (nuevo export `apiErrorCode(error: ApiError): string | null`).
  - Casos: cuerpo con `code` string → ese string; cuerpo sin `code` → `null`; `code` no-string → `null`; cuerpo no-objeto / `null` → `null`. `ApiError`, `asApiError`, `ApiErrorBody` sin cambio de firma.
  - CA: CA-6.2 (cláusula del helper).
- [x] **A4. 🧪N `route-errors`** → implementar
  - Archivos: `test/src/features/learning-paths/lib/route-errors.test.ts` (nuevo), `src/features/learning-paths/lib/route-errors.ts` (nuevo).
  - `classifyRouteLoadError`: 401 → `unauthorized`; 0 / 500 / 503 / 422 / no-Error → `failed`.
  - `classifyRouteCreateError`: 401 → `unauthorized`; 503 + `code === "CATALOG_UNAVAILABLE"` → `catalog-unavailable`; 503 sin ese code, 422, 400, 0, no-Error → `failed`.
  - Fixtures de error con el shape de `AllExceptionsFilter` (`{ statusCode, code, message }`) dentro de `cuerpo` (deuda D-3). Sin copy en el módulo; sin leer `useAuthStore` ni token.
  - CA: soporte de CA-1.1/1.2/1.5, CA-2.1/2.2/2.4–2.6.

> Commit sugerido: `test(frontend): caracterizar mapeo de errores y clasificar fallos de rutas`

## Unidad 2 — `/mis-rutas`: estado sin sesión con CTA "Entrar"

- [x] **A5. 🧪C `LearningPathsDashboard` en error** 🔗 (hoy sin test del estado error)
  - Archivos: `test/src/features/learning-paths/components/LearningPathsDashboard.test.tsx` (casos nuevos; los 3 existentes no se tocan).
  - Casos: `load` rechaza con `Error` plano y con `codigoEstado: 503` → `role="alert"` + "No pudimos cargar tus rutas" + "Reintentar"; clic → `load` llamado 2 veces; botón deshabilitado mientras carga. **Verde hoy y debe seguir verde después sin reescribirse** (pasa a ser el test de CA-1.2).
  - CA: CA-1.2 (caracterización), CA-1.4 (los 3 existentes intactos).
- [x] **A6. `SignInLink`** (componente compartido)
  - Archivos: `src/features/learning-paths/components/SignInLink.tsx` (nuevo), `SignInLink.module.css` (nuevo, solo tokens: réplica de `.authButtonPrimary` según design §UI, `:hover` brightness 1.08, `:active` `lime-strong`, reduced-motion `transition: none`).
  - `<a className={styles.action} href={discordStartUrl(returnTo)}>Entrar</a>`; importa `discordStartUrl` de `features/auth/api/auth.service.ts` (solo lectura; `features/auth/**` no se edita).
  - Cubierto por los tests de A7 y B-/C- (no lleva test propio: se verifica vía `href === discordStartUrl(...)` en los consumidores).
  - CA: CA-1.1, CA-2.1, CA-2.4 (soporte); CA-5.10 (CSS nuevo tokenizado).
- [x] **A7. 🧪N estados nuevos del dashboard** → implementar 🔗
  - Archivos: `LearningPathsDashboard.test.tsx` (casos nuevos), `src/features/learning-paths/components/LearningPathsDashboard.tsx`.
  - Tests: 401 → sección `aria-labelledby="session-required-title"`, h2 "Entrá para ver tus rutas", p "Iniciá sesión con Discord y volvés directo a esta pantalla.", link "Entrar" con `href === discordStartUrl("/mis-rutas")`; **sin** `role="alert"` y **sin** "Reintentar" (CA-1.1). `[]` → `LearningPathsEmptyState`, sin alert ni "Entrar" (CA-1.3). Error → clic Reintentar → segundo intento rechaza 401 → estado sin sesión (CA-1.5).
  - Código: `LoadState` con `unauthorized`; el `.catch` usa `classifyRouteLoadError`; reusa `.state`. **Sin tocar `LearningPathsDashboard.module.css`** (D-9).
  - CA: CA-1.1, CA-1.3, CA-1.5; A5 sigue verde (CA-1.2).

> Commit sugerido: `feat(learning-paths): distinguir sin sesión en /mis-rutas con CTA Entrar`

## Unidad 3 — Configurador: estados de carga (sin sesión / error + reintentar / vacío)

- [x] **A8. 🧪C `MyRouteStatus` carga fallida y submit fallido** 🔗 (hoy sin test)
  - Archivos: `test/src/features/learning-paths/components/MyRouteStatus.test.tsx` (casos nuevos).
  - Casos: `loadRoutes` rechaza → alert "No pudimos cargar tus rutas"; `createOfficial` rechaza → el feedback **contiene** "No se pudo crear la ruta" (`toContain`, vale con y sin punto final — design §Nota de copy; no es relajar un assert, nace así). Verde hoy, verde después.
  - CA: caracterización previa de CA-2.2 y CA-2.6.
- [x] **A9. 🧪N estados de carga del configurador** → implementar 🔗
  - Archivos: `MyRouteStatus.test.tsx`, `src/features/learning-paths/components/MyRouteStatus.tsx`, `MyRouteStatus.module.css`.
  - Tests: 401 → `.notice` con "Entrá para ver y guardar tus rutas." + "Entrar" `href === discordStartUrl("/configurador-de-ruta")`, sin "Reintentar" ni alert (CA-2.1). Red / 5xx / otro → `role="alert"` "No pudimos cargar tus rutas" + "Reintentar"; clic → `loadRoutes` ×2; deshabilitado + "Reintentando…" mientras carga (CA-2.2). `[]` → "Todavía no creaste ninguna ruta."; el componente ya no contiene "Por el momento no hay ruta" (CA-2.3).
  - **Reescritura de asserts en este mismo commit** (spec §Asserts que se reescriben): `MyRouteStatus.test.tsx:31,65` → contiene "Todavía no creaste ninguna ruta."; `:47,70` → no contiene "Todavía no creaste ninguna ruta.".
  - Código: `LoadState` de 4 estados + `attempt`/`retrying`/`active` copiados del dashboard; `useEffect` depende de `[attempt, loadRoutes]`; `mergeRoutes` y suscripción live sin cambios; botones "Quiero hacerlo por…" y formulario visibles en todos los estados.
  - CSS: `.notice` nuevo; `.retry` **sumado a los grupos existentes** (`.choice, .form button, .dialog button`, sus `:hover`/`:active` con `:not(:disabled)`, y `.form .submit:disabled`); reduced-motion para `.retry`. Solo tokens.
  - CA: CA-2.1, CA-2.2, CA-2.3, CA-2.8 (happy/live/crear/MCP existentes verdes), CA-4.5.

> Commit sugerido: `feat(learning-paths): estados de carga y reintento en el configurador`

---

# Lote B — deep link: parser + page async + fixture landing

## Unidad 4 — Deep link landing → configurador

- [x] **B1. 🧪N `parseConfiguratorDeepLink`** → implementar
  - Archivos: `test/src/features/learning-paths/lib/configurator-deep-link.test.ts` (nuevo), `src/features/learning-paths/lib/configurator-deep-link.ts` (nuevo).
  - Casos: válido (`panel=form&path=programas-react` → `form` + `programas-react`); `path` desconocido; `path=../x`; `path=""`; `panel=mcp`; `panel=FORM`; `panel`/`path` como array; ausentes → `{ initialPanel: "none", initialPathId: OFFICIAL_PATHS[0].id }`. `path` sin `panel` → preselecciona con form cerrado. Type guard `isOfficialPathId` privado; `config/official-paths.ts` no se toca.
  - CA: CA-3.3.
- [x] **B2. Props iniciales de `MyRouteStatus`** 🔗
  - Archivos: `MyRouteStatus.tsx`, `MyRouteStatus.test.tsx`.
  - Props `initialPanel?: "none" | "form"` (default `"none"`) e `initialPathId?: OfficialPathId` (default `OFFICIAL_PATHS[0].id`), solo como inicializadores de `useState`.
  - Test 🧪N: con `initialPanel="form"` + `initialPathId="programas-react"` → formulario abierto y el trigger del picker muestra "React". Tests existentes (sin props) verdes sin cambios.
  - CA: CA-3.4, CA-2.8.
- [x] **B3. `configurador-de-ruta/page.tsx` async** 🔗 (hoy sin test)
  - Archivos: test estático nuevo `test/src/ui-rutas-y-marca/configurator-page.static.test.ts`, `src/app/(producto)/configurador-de-ruta/page.tsx`.
  - Test 🧪N (estático sobre el fuente): sin `"use client"`, sin `useSearchParams`, contiene `await searchParams` y `parseConfiguratorDeepLink`.
  - Código: `async`, `searchParams: Promise<ConfiguratorSearchParams>`, pasa `initialPanel`/`initialPathId`. `metadata` intacta; patrón `(acceso)/login/page.tsx`. `configurator-layout.static.test.ts` verde.
  - CA: CA-3.2.
- [x] **B4. 🧪N fixture de la landing** → cambiar fixture 🔗
  - Archivos: `test/src/ui-stitch-orbital/fase-1/landing.test.tsx` (casos nuevos) o `test/src/ui-rutas-y-marca/landing-doors.test.ts` (nuevo), `src/features/orbital/fixtures/landing.fixture.ts`.
  - Tests: hrefs exactos — `start`/`unknown` → `/configurador-de-ruta?panel=form&path=programas-fundamentos`, `switch` → `…&path=programas-react`, `specialize` → `…&path=programas-nest`; recorrer las puertas: cada `path` ∈ `OFFICIAL_PATHS`; `stackPathId` (`start`→fundamentos, `switch`→react, `specialize`→nest, `unknown`→`null`); metadata `unknown` = `["Nivel", "Inicial"]`; description de `unknown` menciona Fundamentos y el MCP.
  - Código: `LandingDoor.stackPathId: OfficialPathId | null`; hrefs; copy de `unknown` (texto literal de design §Landing). `copy-voice.static.test.ts` verde (el fixture ya está en `LIVE_COPY_FILES`).
  - Deben seguir verdes sin tocarse: `landing.test.tsx:60,61,62,109-118`, `landing-copy.test.tsx`.
  - CA: CA-3.1, CA-3.5, CA-3.6 (copy + metadata; la ausencia de icono se prueba en D6).

> Commit sugerido: `feat(landing): deep link de las puertas al formulario del configurador`

---

# Lote C — picker chevron/hint + errores al crear

## Unidad 5 — Picker con chevron y texto de ayuda

- [x] **C1. 🧪N chevron y ayuda del picker** → implementar
  - Archivos: `MyRouteStatus.test.tsx`, `MyRouteStatus.tsx`, `MyRouteStatus.module.css`.
  - Tests: cerrado → trigger contiene el svg de `ChevronDown` con `aria-hidden="true"`, `aria-expanded="false"`; abierto → `aria-expanded="true"`; texto `#path-choice-hint` visible y contiene `String(OFFICIAL_PATHS.length)`; trigger con `aria-describedby="path-choice-hint"` y `aria-haspopup="listbox"`. Test estático: `MyRouteStatus.tsx` no contiene el literal `13` ni `<svg`.
  - Código: `ChevronDown` (Lucide) con `strokeWidth={CHROME_ICON_STROKE_WIDTH}`, `className={styles.chevron}`; `<p className={styles.pickerHint} id="path-choice-hint">` con copy de design.
  - CSS: `.chevron` (+ rotación 180° en `[aria-expanded="true"]`, `transition: transform var(--orbital-motion-fast)`, nunca `all`), `.pickerButton:hover` (`--orbital-border-strong`), `[aria-expanded="true"]` (`--orbital-lime`), `.pickerHint`, reduced-motion. Solo tokens.
  - CA: CA-4.1, CA-4.2, CA-4.3, CA-4.5. (El policiado en `shell-chrome` es E1.)

> Commit sugerido: `feat(learning-paths): chevron y ayuda visible en el selector de ruta`

## Unidad 6 — Errores tipados al crear ruta

- [x] **C2. 🧪N feedback de creación** → implementar 🔗 (A8 verde antes y después)
  - Archivos: `MyRouteStatus.test.tsx`, `MyRouteStatus.tsx`, `MyRouteStatus.module.css`.
  - Tests: submit 401 → `role="alert"` con "Tu sesión no está activa. Entrá para crear la ruta." + "Entrar" `href === discordStartUrl("/configurador-de-ruta")` (CA-2.4); 503 + `CATALOG_UNAVAILABLE` → exactamente "El catálogo todavía no está listo en el servidor. Probá de nuevo en unos minutos." (CA-2.5); 503 sin code, 422, 400, red → exactamente "No se pudo crear la ruta." (CA-2.6); tras un error, nuevo submit exitoso limpia el feedback y agrega la ruta (CA-2.7).
  - Código: `formError: string` → `SubmitFeedback = { kind: "none" } | { kind: RouteCreateFailure }` vía `classifyRouteCreateError`; copy por clasificación en el componente; contenedor `.formFeedback` con `role="alert"`.
  - CSS: `.formFeedback` (`--orbital-error`). Solo tokens.
  - CA: CA-2.4, CA-2.5, CA-2.6, CA-2.7, CA-2.8, CA-4.5.

> Commit sugerido: `feat(learning-paths): mensajes diferenciados al fallar la creación de ruta`

---

# Lote D — marca

## Unidad 7 — Assets de marca vendorizados + fuente única

- [x] **D1. 🧪N guardia de assets de marca** (rojo esperado: archivos y mapa no existen)
  - Archivos: `test/src/config/brand-assets.test.ts` (nuevo).
  - Casos: el literal `/devtalles-brand/` no aparece en `src/` fuera de `src/config/brand-assets.ts` (réplica de `official-paths.test.ts:47-55`); cada valor de `BRAND_ASSETS` existe en `public/`; SVG inertes en `public/devtalles-brand/*.svg`: sin `<script`, `on*=`, `href`/`xlink:href`, `url(`, `<image`, `foreignObject`.
  - CA: CA-5.3, CA-5.4.
- [x] **D2. Vendorizar SVG byte a byte + `brand-assets.ts`**
  - Archivos: `public/devtalles-brand/isologo-color.svg` ← `DEVTALLES-PAQUETES DE ELEMENTOS/SVG/ISOLOGO COLOR.svg`; `public/devtalles-brand/devi-hello.svg` ← `DEVI HELLO BORDER.svg` (copia por comando, sin editar contenido); `src/config/brand-assets.ts` (nuevo, `BRAND_ASSETS` + `BrandAssetKey`). Solo esos dos SVG.
  - Registrar sha256 origen/destino para `verify` (no va en test: el origen está fuera del repo).
  - CA: CA-5.2, CA-5.3; D1 pasa a verde.

> Commit sugerido: `feat(brand): vendorizar isologo y DEVI con mapa único de rutas`

## Unidad 8 — Shell DevTalles-only con isologo + DEVI en el vacío de `/mis-rutas`

- [x] **D3. 🧪 reescritura de asserts del shell** → `MissionShell` 🔗 (todas las páginas)
  - Archivos: `test/src/ui-stitch-orbital/fase-0/dom.test.tsx`, `src/features/orbital/components/MissionShell.tsx`, `MissionShell.module.css`.
  - Asserts (spec §Asserts que se reescriben, **mismo commit que el cambio**): `:78` → footer contiene "DevTalles" y `textContent` del shell no matchea `/code\s*quest/i`; `:79` eliminado (cubierto por `:78`); `:98` → login contiene "DevTalles" y no matchea `/code\s*quest/i`; `:100` eliminado. Nuevo: `img[alt=""]` con `src` del isologo dentro del link `aria-label="DevTalles, inicio"` en ambas variantes, con `width`/`height`; footer product con isologo; footer login sin isologo; sin `•`.
  - Código: isologo `<img src={BRAND_ASSETS.isologo} alt="" width={32} height={32}>` en `.brand` y `.loginBrand`; footers según Q-2.
  - CSS: `.brand` gap; `.loginBrand` inline-flex; `.brandMark` (2rem); `.footerBrand` inline-flex; `.footerMark` (1.5rem); **borrar** `.footerCredit` y el separador.
  - Deben seguir verdes sin modificarse: `header-responsive.characterization.test.ts`, `mobile-nav.test.tsx`, `ShellAccount.test.tsx`.
  - CA: CA-5.1, CA-5.5, CA-5.6.
- [x] **D4. 🧪 reescritura de assert del empty state** → DEVI 🔗
  - Archivos: `test/src/ui-stitch-orbital/fase-3/routes-dom.test.tsx`, `src/features/learning-paths/components/LearningPathsEmptyState.tsx`, `LearningPathsEmptyState.module.css` (nuevo), `LearningPathsDashboard.module.css` (**solo borrado** de `.emptyRadar`, `.emptyRadar svg`, `.emptyRadar path`, `.emptyCore`, `.emptyNode`).
  - Assert `:81` → `querySelector('img[src$="devi-hello.svg"]')` no null, con `alt=""`, `width`/`height`; `:80,83` (h2 y copy) intactos.
  - Código: `<img className={emptyStyles.mascot} src={BRAND_ASSETS.deviHello} alt="" width={160} height={170} />` en lugar del radar. C1 (DEVI en configurador) fuera.
  - CA: CA-5.5, CA-5.7; CA-5.10 **ajustado por D-9** (el CSS nuevo va a `LearningPathsEmptyState.module.css`; el del dashboard solo pierde reglas).

> Commit sugerido: `feat(brand): isologo en el shell sin crédito Code Quest y DEVI en el vacío de rutas`

## Unidad 9 — `StackIcon` en puertas y franja de tecnologías en la landing

- [x] **D5. 🧪N iconos por puerta** → `page.tsx` 🔗
  - Archivos: `landing.test.tsx` o `test/src/ui-rutas-y-marca/landing-doors.test.ts` (render), `src/app/(producto)/page.tsx`, `page.module.css`.
  - Tests: `start`/`switch`/`specialize` renderizan un `img` con `src === officialPathIconSrc(stackPathId)` y `alt=""`; `unknown` sin `img` de stack.
  - Código: `<div className={styles.doorHead}>` con `StackIcon size="md"` si `door.stackPathId`, luego el `h3`. CSS `.doorHead` (+ `h3` margin 0). Solo tokens.
  - CA: CA-5.8, CA-3.6 (sin icono en `unknown`).
- [x] **D6. 🧪N franja de iconos** → `page.tsx`
  - Archivos: mismos que D5 + test estático CSS.
  - Tests: `ul[aria-label="Tecnologías de las rutas oficiales"]` con `OFFICIAL_PATHS.length` imágenes, cada una con nombre accesible = `label` de la ruta; test estático: `.stackStrip` de `page.module.css` contiene `flex-wrap: wrap`.
  - Código: franja debajo de `.telemetryStrip` con `StackIcon size="sm" standaloneLabel={p.label}`. CSS `.stackStrip`. Solo tokens.
  - Deben seguir verdes: `landing.test.tsx:61` (`svg circle` = 12), `:109-118` (sin fetch/axios/storage/useRouter), `official-paths.test.ts:47-55`, `StackIcon.test.tsx`.
  - CA: CA-5.9, CA-5.5, CA-3.5.

> Commit sugerido: `feat(landing): iconos de stack en las puertas y franja de rutas oficiales`

---

# Lote E — guardias estáticas + suite completa

## Unidad 10 — Extender guardias estáticas

- [x] **E1. `shell-chrome.static.test.ts`**
  - Archivos: `test/src/ui-devtalles-polish/shell-chrome.static.test.ts`.
  - `LUCIDE_FILES["…/MyRouteStatus.tsx"]` += `"ChevronDown"`; `ICON_USAGE` += `ChevronDown` (stroke + `aria-hidden`). `:46` (sin `<svg` a mano) verde.
  - CA: CA-4.4, CA-4.1.
- [x] **E2. `copy-voice.static.test.ts`**
  - Archivos: `test/src/ui-devtalles-polish/copy-voice.static.test.ts`.
  - `LIVE_COPY_FILES` += `LearningPathsDashboard.tsx`, `SignInLink.tsx` (confirmar que `MyRouteStatus.tsx`, `LearningPathsEmptyState.tsx`, `page.tsx`, `landing.fixture.ts` ya están). Todo el copy nuevo pasa voseo + sin `//`.
  - CA: CA-6.3, CA-3.6.
- [x] **E3. `tokens.static.test.ts`**
  - Archivos: `test/src/ui-devtalles-polish/tokens.static.test.ts`.
  - `TOKENIZED_CSS` += `SignInLink.module.css`, `LearningPathsEmptyState.module.css`. Confirmar que `MyRouteStatus.module.css`, `MissionShell.module.css`, `app/(producto)/page.module.css` ya están listados. **`LearningPathsDashboard.module.css` NO se agrega — ajuste de CA-5.10 aprobado por D-9 de design.**
  - CA: CA-5.10 (ajustado), CA-4.5.

> Commit sugerido: `test(frontend): policiar chevron, copy y tokens de los módulos nuevos`

## Unidad 11 — Cierre: suite completa + typecheck + build (sin commit de código)

- [x] **E4. Suite completa del frontend** — `npm run test --workspace=frontend` verde. Confirmar verdes sin modificar: `landing-copy.test.tsx`, `LearningPathsDashboard.test.tsx` (3 originales), `load-my-routes.test.ts`, `header-responsive.characterization.test.ts`, `mobile-nav.test.tsx`, `official-paths.test.ts`, `StackIcon.test.tsx`, `login.test.tsx`, `demo-session.test.ts`, `configurator-layout.static.test.ts`. CA-7.1.
- [x] **E5. Typecheck** — `npx tsc --noEmit -p frontend` sin errores (sin `any`/casts nuevos). CA-7.1.
- [ ] **E6. Build** — `npm run build --workspace=frontend` verde; `/configurador-de-ruta` compila como ruta dinámica sin error de Suspense. CA-7.1.
- [x] **E7. Lint** — sin script en el repo: declarar el hueco a `verify` (no se inventa comando). CA-7.1 (parcial, declarado).
- [ ] **E8. Evidencia para `verify`** — sha256 origen/destino de los 2 SVG (CA-5.2); gate visual manual: contraste `StackIcon md` sobre `.door`, header e isologo en 375 px, franja envolviendo sin scroll horizontal (CA-5.6, CA-5.9).

> Sin commit propio (verificación). Si algo sale rojo, el fix va en la unidad dueña del archivo.

---

## Flujos conectados tocados (de `explore.md`) → tareas

| Flujo | Tareas | Caracterización previa |
|---|---|---|
| `lib/axios.ts` → `mapApiResponseError` (sin modificar) | A1 | A1 |
| `lib/errors.ts` `asApiError` | A2, A3 | A2 |
| `LearningPathsDashboard` | A7 | A5 |
| `LearningPathsEmptyState` | D4 | (existente `routes-dom.test.tsx`) |
| `MyRouteStatus` | A9, B2, C1, C2 | A8 |
| `configurador-de-ruta/page.tsx` | B3 | B1 (parser) + B3 (estático) — sin comportamiento previo que fijar |
| Landing `page.tsx` + `landingFixture` | B4, D5, D6 | (existente `landing.test.tsx`) |
| `MissionShell` (todas las páginas) | D3 | (existente `fase-0/dom.test.tsx`) |

## Pronóstico de presupuesto (líneas cambiadas, sin `specs/`)

| Unidad | Estimado |
|---|---|
| 1 — Caracterización + helpers de error | ~230 |
| 2 — `/mis-rutas` sin sesión + `SignInLink` | ~200 |
| 3 — Configurador: estados de carga | ~260 |
| 4 — Deep link | ~230 |
| 5 — Picker | ~120 |
| 6 — Errores al crear | ~180 |
| 7 — Assets vendorizados (171 líneas de SVG) + mapa + guardia | ~260 |
| 8 — Shell + DEVI | ~170 |
| 9 — Iconos en landing | ~150 |
| 10 — Guardias estáticas | ~40 |
| 11 — Cierre | 0 |

Riesgo de presupuesto 400 líneas: Medio
Unidades que lo superan: ninguna
¿Partir en PRs encadenados?: No

> Riesgo Medio porque las Unidades 3 y 7 quedan cerca de 260 y porque la mezcla D-8 con `ui-devtalles-polish` sin commitear infla el diff real que mide `check-receipt.mjs` en `MyRouteStatus.*`, `page.tsx`, `MissionShell.*`, `landing.fixture.ts` y tests. Si una unidad supera 400 por esa mezcla, 🔔 avisar al dev (excepción `SDD_SIZE_EXCEPTION=1` o commitear antes el ciclo previo).

📚 Referencias cargadas: `CodeQuest-2026/specs/ui-rutas-y-marca/explore.md`, `CodeQuest-2026/specs/ui-rutas-y-marca/spec.md`, `CodeQuest-2026/specs/ui-rutas-y-marca/design.md`, `CodeQuest-2026/frontend/package.json`, `CodeQuest-2026/package.json`, listado de `frontend/test/**`, conteo de líneas de los SVG de origen.
