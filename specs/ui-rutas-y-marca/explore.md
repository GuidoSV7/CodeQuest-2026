# Explore — `ui-rutas-y-marca`

> Fase `sdd-explore`. Fecha: 2026-09-27. Continúa `specs/ui-devtalles-polish/` (implementado, **sin commit**). Dirección aprobada por el dev vía plan: no se reabre; acá solo se reporta evidencia.
> Framework: Next **16.3.5** App Router (`output: "standalone"`, self-hosted → runtime Node propio, no Vercel), React 19, CSS Modules, vitest. Versión contra `nextjs-reference/references/versiones-seguridad.md`: 16.x = Active LTS → **en soporte** (no suma riesgo; revisar el release mensual de seguridad vigente antes del PR). Backend NestJS (no se toca en el plan). `lucide-react` **1.48.0** instalado.

## Memoria previa consultada

- **#1503 (bugfix) "Login vacío en dev: sesión demo siempre activa"** → CONFIRMADA contra el repo. `isOrbitalDemoSessionEnabled` (`frontend/src/features/auth/lib/demo-session.ts:11-18`) devuelve `nodeEnv === "development"` e **ignora** `NEXT_PUBLIC_ORBITAL_DEMO_SESSION`. `AuthSessionHydrator.tsx:28-33` mete `orbitalDemoSessionFixture` en `useAuthStore` sin llamar `/api/auth/me` (salvo tras "Salir", `cq_signed_out=1`). Implica: en `next dev`, `useAuthStore.user` ≠ sesión backend. Fix propuesto allí (`&& demoSession === "true"`) quedó **pendiente para una sesión SDD de auth aparte**.
- **#1426 (architecture) "Sesión Orbital demo solo development"** → describe la intención original (flag `=1` + NODE_ENV); el código actual ya no respeta el flag. Gana el repo; #1426 queda desactualizada → candidata a `mem_review`.
- **#1490 (bugfix) "Frontend mock-only sin backend"** → histórico; hoy `/mis-rutas` y el configurador SÍ llaman al backend (`loadMyRoutes` → `GET /api/me/learning-paths`). Gana el repo; #1490 describe un estado superado.
- **#1506 / #1510 / #1513 / #1514** (ciclo `ui-devtalles-polish`) → voseo, sin cifras inventadas, Lucide solo chrome (ADR 0002), `StackIcon` + mapa único en `config/official-paths.ts`, archive con deuda O-1…O-7. Este ciclo no debe contradecirlos.
- **#1439 (decision) "Shell Orbital DevTalles"** → shell sin marca CQ; coherente con quitar "Hecho para Code Quest 2026".

## Blast radius (codegraph)

`.codegraph/` existe. Salida de `codegraph_explore` (callers/impact) resumida por símbolo tocado:

| Símbolo | Consumidores (codegraph) | Tests que lo cubren |
|---|---|---|
| `LearningPathsDashboard` (`features/learning-paths/components/LearningPathsDashboard.tsx:15`) | `app/(producto)/mis-rutas/page.tsx` (6 refs) → renderiza `StackIcon`, `RouteGauge`, `LearningPathsEmptyState` | `LearningPathsDashboard.test.tsx`, `fase-0/dom.test.tsx`, `fase-3/routes-dom.test.tsx` |
| `LearningPathsEmptyState` (`…/LearningPathsEmptyState.tsx:4`) | `LearningPathsDashboard.tsx` (3 refs) | `fase-3/routes-dom.test.tsx` |
| `loadMyRoutes` / `createOfficialRoute` (`features/learning-paths/lib/load-my-routes.ts:25,44`) | `LearningPathsDashboard.tsx`, `MyRouteStatus.tsx` | `load-my-routes.test.ts` |
| `MyRouteStatus` (`…/MyRouteStatus.tsx:23`) | `app/(producto)/configurador-de-ruta/page.tsx` | `MyRouteStatus.test.tsx`, `configurator-layout.static.test.ts`, `shell-chrome.static.test.ts`, `copy-voice.static.test.ts`, `tokens.static.test.ts` |
| `mapApiResponseError` (`lib/api-auth-policy.ts:24`) | `lib/axios.ts` (interceptor de respuesta; **todo** request de `api` pasa por acá) | **ninguno** ("no tests found within 3 caller hops") |
| `asApiError` / `ApiError` (`lib/errors.ts:19`) | **0 callers** en `src/` (grep) | ninguno |
| `LearningPathsController` (`backend/…/learning-paths.controller.ts:27`) | `learning-paths.module.ts` | `learning-paths.controller.spec.ts` |
| `SessionAuthGuard` (`backend/…/identity/presentation/session-auth.guard.ts:25`) | `identity.module.ts`, `course-progress.controller.ts`, `learning-paths.controller.ts`, `auth.controller.ts` +1 | `session-auth.guard.spec.ts`, `auth.controller.spec.ts`, `learning-paths.controller.spec.ts` |
| `useAuthStore` (`stores/auth-session.ts:12`) | 15 callers (`HomeAuthStatus`, `AuthenticatedEntry`, `AuthSessionHydrator`, `MissionRadarLive`, `ShellAccount`…) | `ShellAccount.test.tsx`, `fase-0/dom.test.tsx`, `fase-4/…`, `fase-5/…` |
| `AuthSessionHydrator` (`features/auth/components/AuthSessionHydrator.tsx:14`) | `app/providers.tsx` | **ninguno** |
| `readLocalSessionToken` (`features/auth/lib/local-session.ts:13`) | `lib/api-auth-policy.ts` | `local-session.test.ts` |
| `MissionShell` (`features/orbital/components/MissionShell.tsx`) | layouts de `(producto)` y `(acceso)` → **todas las páginas** | `fase-0/dom.test.tsx`, `mobile-nav.test.tsx`, `header-responsive.characterization.test.ts`, `shell-chrome.static.test.ts`, `tokens.static.test.ts` |
| `landingFixture` (`features/orbital/fixtures/landing.fixture.ts:9`) | solo `app/(producto)/page.tsx` (vía `fixtures/index.ts`) | `fase-1/landing.test.tsx`, `landing-copy.test.tsx`, `copy-voice.static.test.ts` |
| `officialPathIconSrc` / `StackIcon` | `MyRouteStatus`, `LearningPathsDashboard` | `official-paths.test.ts`, `StackIcon.test.tsx` |

Backend: el plan **no** cambia backend. `LearningPathsController`/`SessionAuthGuard`/`requireCatalogForWrite` se listan como **productores** de los códigos que el front va a interpretar (contrato de error que se consume, no que se modifica).

## Hallazgos por problema

### 1. `/mis-rutas` → "No pudimos cargar tus rutas" + Reintentar infinito

**Evidencia:**
- `LearningPathsController` tiene `@UseGuards(SessionAuthGuard)` a nivel clase (`learning-paths.controller.ts:25-26`). El guard (`session-auth.guard.ts:31-52`) toma cookie `cq_session` o `Authorization: Bearer`; sin token → `UnauthorizedException('Missing session')`; token inválido/expirado → `UnauthorizedException('Invalid session')`.
- `AllExceptionsFilter` (`backend/src/common/filters/all-exceptions.filter.ts:73-81`) responde `{ statusCode: 401, code: "UnauthorizedException", message: "Missing session" | "Invalid session", path, timestamp }`. **No es RFC 9457** (sin `type`/`title`/`correlationId`) — preexistente, fuera de alcance (deuda de contrato de errores).
- Front: `lib/axios.ts:20-23` rechaza con `mapApiResponseError(error)`. Si hay `response` → `Error` con `codigoEstado = res.status` y `cuerpo = res.data` (`api-auth-policy.ts:24-46`). Si **no** hay `response` (red caída, CORS, timeout de 30 s en `axios.ts:10`) → `Error` plano **sin** `codigoEstado`.
- `lib/errors.ts:19-30` ya tiene `asApiError(error)` que normaliza a `ApiError { statusCode, body }` leyendo `codigoEstado`/`cuerpo` (0 si no hay respuesta). **0 callers hoy** → patrón existente para reusar en vez de crear otro helper.
- `LearningPathsDashboard.tsx:30-32` hace `.catch(() => setResult({ status: "error" }))`: descarta el error → 401, 503 y red caída terminan en el mismo "No pudimos cargar tus rutas" + "Reintentar" (que repite el 401 para siempre).
- Localhost: la cookie del API no viaja cross-site; el JWT va como Bearer desde `sessionStorage["cq_session_token"]` (`api-auth-policy.ts:8-22`, `local-session.ts:1-16`), capturado del hash `#cq_session=` que arma `backend/…/identity/application/session-handoff.ts:7`.

**Señal fiable de "sin sesión" (verificado):**
- ❌ `useAuthStore.user` **NO sirve**: en `next dev` es siempre el fixture (`demo-session.ts:17`, `AuthSessionHydrator.tsx:28-33`) aunque no haya JWT. Además `ShellAccount` muestra avatar del fixture → el usuario "parece logueado".
- ❌ Presencia de token local **NO sirve sola**: (a) en producción la sesión va por cookie httpOnly y `sessionStorage` está vacío → "sin token" daría falso "sin sesión"; (b) un token presente puede estar vencido/revocado → el backend igual responde 401 `Invalid session`.
- ✅ **La señal fiable es la respuesta del API: `statusCode === 401`** (vía `asApiError(err).statusCode` / `codigoEstado`). Cubre cookie (prod), Bearer (localhost), token ausente y token vencido, y es la única que decide el backend (constitución: "el backend decide").
- Distinción mínima que ya permite el contrato actual: `401` → sin sesión; `0` (sin respuesta) → red/servidor inalcanzable; `503` + `code: "CATALOG_UNAVAILABLE"` → catálogo caído (solo en escrituras; lecturas degradan, ver §2); resto → error genérico.

**Flujo conectado crítico — rebote del CTA en dev:** si el estado 401 ofrece "Entrar" → `/login?returnTo=/mis-rutas`, en `next dev` `AuthenticatedEntry.tsx:21-27` ve `user` (fixture) y hace `router.replace(returnTo)` → vuelve a `/mis-rutas` → 401 otra vez (bucle visual). En producción no pasa (sin demo). Salida hoy: "Salir" (marca `cq_signed_out`) y luego Entrar. **Cerrarlo exige el fix de #1503 en `features/auth/lib/demo-session.ts` (área auth)**: decisión de alcance para `spec` (incluirlo → sube riesgo del área a ALTO por auth; excluirlo → deuda explícita dev-only).

### 2. `/configurador-de-ruta` (`MyRouteStatus.tsx`)

**Evidencia:**
- Carga (`MyRouteStatus.tsx:39-55`): `.catch(() => setState({ status: "error" }))` → `<p role="alert">No pudimos cargar tus rutas</p>` **sin reintentar** y sin distinguir 401 (`:74-78`).
- Vacío: "Por el momento no hay ruta" (`:79-81`), sin CTA ni ilustración.
- Crear (`submitForm`, `:157-173`): `catch { setFormError("No se pudo crear la ruta") }` descarta el error. Códigos posibles del `POST /api/me/learning-paths` (verificados en `learning-paths.service.ts`): **401** (guard), **503 `CATALOG_UNAVAILABLE`** (`requireCatalogForWrite`, `:399-419`, también si Redis tira excepción), **422** `CATALOG_PATH_ID_REQUIRED` / `COURSE_NOT_IN_CATALOG` / unknown path (`:325-370`), 400 por DTO. Lectura (`getById`) degrada sin 503 (`loadCatalogForRead`, `:422-432`).
- El cuerpo trae `code` (string) en `cuerpo.code` → el catálogo de mensajes vive en el cliente por `code` (constitución → API y errores; `error-contract` skill).
- `subscribeLearningPathEvents` (`lib/subscribe-learning-paths.ts:10-34`) abre WebSocket `/api/me/learning-paths/live` sin Bearer (cookie) → en localhost no autentica; falla en silencio (sin handler de `error`/`close`). No rompe la pantalla; es la deuda del punto 7.

### 3. Landing: deep link de las 4 puertas

**Evidencia:**
- `landing.fixture.ts:36-67`: las 4 puertas tienen `href: "/configurador-de-ruta"` literal. `LandingDoor.href: string`. Único consumidor: `app/(producto)/page.tsx:120-135` (Server Component, sin `"use client"`).
- IDs válidos: `OFFICIAL_PATHS` + tipo `OfficialPathId` en `frontend/src/config/official-paths.ts:3-19` (anclados por test a `OFFICIAL_PATH_IDS` del backend). Mapeo propuesto por el dev: `start→programas-fundamentos`, `switch→programas-react`, `specialize→programas-nest`, `unknown→programas-fundamentos`.
- **Cómo leer `searchParams` (verificado en `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`):**
  - `useSearchParams` en un Client Component de una ruta prerenderizada **exige `<Suspense>`**; en `next dev` no suspende y "parece andar", pero **`next build` falla** ("Missing Suspense boundary with useSearchParams") (doc L180-181). `/configurador-de-ruta/page.tsx` hoy es estática (sin `searchParams`).
  - **Patrón existente del repo:** `app/(acceso)/login/page.tsx:10-19`, `registro/page.tsx:11-15`, `auth/error/page.tsx:18-24` leen `searchParams: Promise<…>` con `await` en el **Server Component** y pasan props ya saneadas al client (`login` valida `returnTo` relativo). Esto vuelve la ruta dinámica, sin Suspense, y no hay `cacheComponents` en `next.config.ts` → sin restricciones extra. Es el patrón a seguir (constitución: respetar lo existente).
  - `MyRouteStatus` ya inicializa `panel` y `catalogPathId` con `useState` (`:33-34`) y acepta props inyectables (patrón de tests) → props iniciales opcionales encajan sin romper los tests actuales (default `none` / `OFFICIAL_PATHS[0]`).
  - El `path` de la URL es input no confiable → validar contra `OFFICIAL_PATHS` (allowlist) y caer al default si no matchea; `panel` contra `"form" | "mcp"`. El backend ya valida `catalogPathId` (422) — el front no es frontera.
- `fase-1/landing.test.tsx:109-118` prohíbe `fetch|axios|localStorage|sessionStorage|useRouter` en `page.tsx` → los hrefs deben ser estáticos (fixture o derivados), no navegación imperativa.

**Observación de coherencia (para que `spec` adjudique, no reabre la dirección):**
❌ La puerta `unknown` dice "Pedile a tu IA que te haga preguntas y arme una ruta a tu medida con el MCP de CodeQuest" y metadata "Modo: Con tu IA" (`landing.fixture.ts:60-67`), pero el mapeo la manda a `panel=form&path=programas-fundamentos`, y con `StackIcon` mostraría el logo de JavaScript.
💡 El destino contradice el copy de la propia puerta; el usuario que "no sabe qué quiere" aterriza en un formulario con Fundamentos preseleccionado.
✅ Alternativa dentro de la misma decisión de deep link: `unknown → ?panel=mcp` (sin `path`, sin StackIcon), o cambiar el copy de la puerta. Decide el dev.

### 4. Picker sin chevron ni pista de scroll

**Evidencia:**
- `MyRouteStatus.tsx:112-143`: botón `aria-haspopup="listbox"` + `aria-expanded`, contenido `StackIcon` + label; sin indicador. `MyRouteStatus.module.css:142-157`: `.menu` `max-height: 16rem; overflow: auto` (13 opciones → hay scroll, sin affordance).
- `ChevronDown` (y `ChevronUp`) **existen** en `lucide-react` 1.48.0 instalado (`require('lucide-react').ChevronDown` → object). Es chrome → permitido por ADR 0002 con `strokeWidth={CHROME_ICON_STROKE_WIDTH}` + `aria-hidden="true"`.
- `shell-chrome.static.test.ts:11-21`: `LUCIDE_FILES["…/MyRouteStatus.tsx"] = ["Copy","Check"]` y `ICON_USAGE` no incluye `ChevronDown` → el uso nuevo **no quedaría policiado** (stroke/aria) salvo que se agregue al test. `:46` exige `MyRouteStatus.tsx` sin `<svg` → el chevron no puede ser SVG ad hoc.
- `tokens.static.test.ts:24-38`: `MyRouteStatus.module.css` sin hex/`rgb()` → cualquier estilo nuevo (fade de scroll, rotación del chevron) con tokens / `color-mix` sobre token.
- **A11y preexistente (no pedido, se menciona):** el listbox no implementa el patrón de teclado (flechas, Home/End, Escape para cerrar, foco al abrir); son `<button role="option">`. Si `spec` no lo toma, queda como deuda.

### 5. Quitar "Hecho para Code Quest 2026"

- `MissionShell.tsx:45-47` (variante login: `DevTalles` • `Hecho para Code Quest 2026`) y `:79-83` (product: `.footerBrand` • `.footerCredit`). Grep en `frontend/`: **únicas** menciones de "Code Quest" en `src/`; en tests solo `fase-0/dom.test.tsx`. `test/src/ui-devtalles-polish/*` **no** la fija (grep vacío).
- Al quitarla, el `•` separador y `.footerCredit` quedan sin sentido → revisar CSS huérfano en `MissionShell.module.css`.
- Contradice CA-1.8 de `ui-devtalles-polish/spec.md` ("Code Quest 2026 como crédito") → este ciclo la **supera**; `spec` debe declararlo (mismo tratamiento que #1510 sobre #1460).

### 6. Assets de marca

**Paquete fuera de la app:** `DEVTALLES-PAQUETES DE ELEMENTOS/SVG/` (raíz del workspace, fuera del repo git `CodeQuest-2026/`). Inspección con script (no a ojo):

| Archivo | Bytes | viewBox | `<script>` / `on*` / `href` / `url()` / `<image>` / `foreignObject` | Colores |
|---|---|---|---|---|
| ISOLOGO COLOR.svg | 2 713 | 0 0 1214 1214 | no / no / no / no / no / no | círculo `#130c25` + marca `#fff` |
| ISOLOGO N.svg | 2 697 | 0 0 1214 1214 | ninguno | círculo `#000` + marca `#fff` |
| ISOLOGO B.svg | 2 697 | 0 0 1214 1214 | ninguno | círculo `#fff` + marca `#000` |
| LOGO B.svg | 5 773 | 0 0 3217.23 572.37 | ninguno | wordmark `#fff` |
| LOGO N.svg | 5 773 | 0 0 3217.23 572.37 | ninguno | wordmark `#000` |
| DEVI HELLO.svg | 16 452 | 0 0 272.52 290.69 | ninguno | contorno `#0a0613`, `#7105e2`, `#9013fe`, `#e8d2ff`, `#fff`, `#d8d8d8` |
| DEVI HELLO BORDER.svg | 18 046 | 0 0 292.5 310.69 | ninguno | ídem + trazo exterior `#fff` |
| DEVI NORMAL / LAPTOP (+BORDER) | 12.7–16.1 KB | ~247–267 × 276–305 | ninguno | ídem (+ `#300a6f`, `#c4c4c4` en LAPTOP) |

- **Seguridad:** los 11 SVG son inertes (sin scripts, handlers, refs externas, imágenes embebidas ni `foreignObject`). Todos traen `<style>` con clases genéricas `.cls-1…9` e `id="Layer_1"`/`"Isolation_Mode"` → **inline colisionarían** entre sí y con el DOM (IDs duplicados, clases que se pisan). Deben usarse como `<img>` (patrón `StackIcon`), igual que ADR 0002 trata las marcas.
- **Contraste en dark** (tokens: `--orbital-surface #121125`, `--orbital-surface-container #1e1d32`, header `rgb(13 12 32 / 85%)`):
  - **Isologo → `ISOLOGO COLOR`**: el círculo `#130c25` casi coincide con el fondo (se funde, queda la marca blanca ≈ 18:1 sobre `#0d0c20`), luce nativo. `N` agrega un disco negro apenas distinto; `B` un disco blanco muy fuerte que compite con el texto "DevTalles".
  - **Logo (opcional) → `LOGO B`** (wordmark blanco). `LOGO N` es invisible en dark. Ojo: el header ya dice "DevTalles" en texto → isologo + texto evita duplicar el wordmark.
  - **DEVI → variante `BORDER`**: el contorno principal `#0a0613` sobre `#121125`/`#1e1d32` da ≈ 1.1–1.2:1 → la silueta se pierde en dark. La variante BORDER agrega el trazo blanco exterior que la separa del fondo. Para el empty state: **`DEVI HELLO BORDER.svg`** (18 KB).
- **Tamaño en header:** `.header`/`.loginHeader` `min-height: 4rem` + `flex-wrap: nowrap` (fijados por `header-responsive.characterization.test.ts:12-25` y `mobile-nav.test.tsx:132-135`); `.brand` `font-size: 1.5rem` → el isologo debe caber ≤ ~2rem de alto sin forzar wrap en 375 px. El link de marca ya tiene `aria-label="DevTalles, inicio"` → el `<img>` va `alt=""`.
- **Tests de assets:** `official-paths.test.ts:33-45` solo mira `public/devtalles-tech/` (espera **14** SVG) → una carpeta nueva `public/devtalles-brand/` no lo rompe. `:47-55` prohíbe el literal `/devtalles-tech/` en `src/` fuera del mapa → la franja de 13 iconos y las puertas deben usar `StackIcon`/`officialPathIconSrc`, nunca rutas a mano. No existe hoy guardia equivalente para `/devtalles-brand/` ni test de "SVG inerte" para esa carpeta (patrón a replicar).
- **ADR 0002:** marcas e ilustraciones quedan fuera de Lucide y se sirven como `<img>` → DEVI/isologo encajan sin ADR nuevo. El empty state hoy es una ilustración SVG propia (radar); reemplazarla por DEVI cambia el assert de `routes-dom.test.tsx:81`.
- **StackIcon en la landing:** vive en `features/learning-paths/components/`; `app/(producto)/page.tsx` ya importa de `features/orbital` y `features/auth` → importar desde `features/learning-paths` es la misma dirección de dependencia (app → feature). Los iconos son `<img>` → no alteran `svg circle` = 12 (`landing.test.tsx:61`).
- **Licencia:** misma deuda aceptada en `ui-devtalles-polish` (assets de terceros sin licencia declarada) ahora ampliada a logo/isologo/mascota.

### 7. Deuda fuera de alcance (confirmada)

- `LivePathModal.tsx:59-61`: `new EventSource(…/api/me/learning-paths/events, { withCredentials: true })` → solo cookie; en localhost no autentica (EventSource no admite headers).
- `subscribe-learning-paths.ts:14-17`: WebSocket `/api/me/learning-paths/live` sin token; falla en silencio.
- Ambos quedan fuera; `spec` debe listarlos como deuda explícita.

## Propiedades del cambio

| Propiedad | Respuesta |
|---|---|
| **Reversible** | Sí: todo es front (componentes, fixture, CSS, SVG estáticos, tests). `git revert` lo deshace; sin datos ni migraciones. |
| **Quién consume** | Nadie externo: cambian pantallas y el manejo de respuestas del API ya existente; el contrato de `/api/me/learning-paths` no cambia. El deep link `?panel=&path=` es una URL pública nueva (bookmarkable) pero sin consumidor externo conocido → no aplica "Cruza un contrato" externo. |
| **Cuándo corre** | No aplica: sin cron, cola, poll ni retry automático. (El "Reintentar" es manual; no introducir retry automático.) |
| **Qué volumen** | 13 rutas oficiales (fijo, `OFFICIAL_PATHS.length`), rutas por usuario hoy sin paginar (lista cerrada pequeña por usuario; preexistente, no crece con este cambio). Sin fixture de volumen. |
| **Dinero / auth / datos sensibles** | Sin dinero ni datos personales. **Auth-adyacente:** interpreta el 401 del guard y ofrece "Entrar" con `returnTo`; no cambia OAuth, cookies ni guard. Si `spec` incluye el fix de #1503 (`demo-session.ts`) → **toca auth** → esa área sube a ALTO. |
| **Infra** | No: sin migraciones, esquema, arranque ni deploy. Único efecto de runtime: `/configurador-de-ruta` pasa de estática a dinámica si lee `searchParams` en el server (mismo modelo que `/login`; `output: "standalone"` lo soporta). |

## Riesgo

**Global: MEDIO** — sin backend, contrato, BD ni dinero, reversible por revert; pero toca el shell de **todas** las páginas, el manejo de errores de dos pantallas conectadas al API (con `mapApiResponseError` y los estados de error **sin tests**), una URL nueva con input no confiable, y el CTA de sesión choca en dev con la sesión demo (#1503).

| Área | Riesgo | Justificación |
|---|---|---|
| 1. `/mis-rutas` 401 vs error | MEDIO | Auth-adyacente (UX de sesión), depende de `codigoEstado` propagado por un interceptor sin tests; estado de error del dashboard sin test. Sube a **ALTO** si se incluye el fix de `demo-session.ts`. |
| 2. Configurador: errores, reintentar, vacío | MEDIO | Mismo mapeo de errores + catálogo de mensajes por `code` (401/503/422); estados error y submit-error sin tests. |
| 3. Deep link landing → configurador | BAJO-MEDIO | Input de URL (allowlist obligatoria), cambio de rendering estático → dinámico. Reversible. |
| 4. Chevron + pista de scroll | BAJO | CSS + icono Lucide ya permitido; cuidar tokens y test de chrome. |
| 5. Quitar "Code Quest" | BAJO | 2 líneas + 4 asserts; supera CA-1.8 del ciclo previo. |
| 6. Marca (isologo, DEVI, franja, StackIcon en puertas) | BAJO-MEDIO | SVG inertes verificados; riesgo de licencia (deuda) y de layout del header (nowrap/4rem) en 375 px. |
| 7. SSE/WS cookie-only | fuera | Deuda explícita. |

- Tamaño: ~10–14 archivos front (+ SVG vendorizados + tests); 0 backend.
- Tipo: intervención sobre código reciente sin commitear (alto acoplamiento con `ui-devtalles-polish`: `MyRouteStatus.*`, `page.tsx`, `MissionShell.*` ya modificados en el working tree) → commitear/aislar el ciclo previo antes, o mezclar diffs.
- No es refactor de legacy de riesgo alto → no exige plan escalonado de `refactor-legacy.md`.

## Gate `.cursor/sdd.paths.json`

- El gate que corre es el de la raíz git **`CodeQuest-2026/.cursor/`** (`git rev-parse --show-toplevel`), contenido idéntico al del workspace.
- **Hallazgo:** sus globs están anclados a la raíz (`^src/(?:.*/)?auth/…`, `sdd-gate.mjs:46-59`). Probado con la misma función: `frontend/src/features/auth/lib/demo-session.ts` → **false**, `backend/src/modules/identity/presentation/session-auth.guard.ts` → **false**, `src/features/auth/x.ts` → true. En este monorepo (`frontend/`, `backend/`) **ninguna señal `src/**/…` dispara nunca**. La afirmación de `ui-devtalles-polish/spec.md` ("toca `src/**/auth/**`") no se cumple técnicamente. Señal faltante → se agrega al JSON (p. ej. `**/src/**/auth/**` o `frontend/src/**/auth/**` + `backend/src/**/auth/**`, y `backend/src/modules/identity/**`); decisión del dev, no de esta fase.
- Con el plan actual (sin tocar `features/auth/**`) no hay señal; si se incluye el fix de #1503, **tocaría** `frontend/src/features/auth/lib/demo-session.ts` (debería disparar, hoy no dispara por el hallazgo anterior). Igual la spec se sella con `sdd-gate.mjs approve` por proceso.
- `ignore: "package-lock.json"` solo matchea el lockfile raíz; `frontend/package-lock.json` sí cuenta (no se toca en este plan: sin dependencias nuevas).

## Estado de tests de los flujos afectados

| Flujo | Nivel actual | Nivel requerido | Hueco |
|---|---|---|---|
| `mapApiResponseError` (interceptor axios) | sin tests | 2 (lógica: con/sin `response`, status, cuerpo) | **deuda** |
| `asApiError` | sin tests (y sin callers) | 2 si se reusa | deuda si se reusa |
| `LearningPathsDashboard` | happy + icono + custom sin icono | 2 (error 401 / red / 503, vacío, reintentar) | **deuda**: ningún test del estado error |
| `LearningPathsEmptyState` | caracterización (h2, svg, link, texto) | 1–2 | ok (cambia assert si entra DEVI) |
| `MyRouteStatus` carga/vacío/crear/MCP | happy + vacío + live + crear + MCP | 2 (error de carga, reintentar, submit 401/503/422, deep link válido/inválido) | **deuda**: sin error ni submit-error |
| `loadMyRoutes`/`createOfficialRoute` | happy + null | 2 (propaga el error con status) | parcial |
| Landing + `landingFixture` | caracterización + estáticos | 2 (hrefs de las 4 puertas, allowlist de ids) | nuevo assert |
| `MissionShell` footer | caracterización | 1–2 | reescribir |
| `official-paths` / `StackIcon` | 2 | 2 | ok |
| `AuthSessionHydrator` / demo-session | `demo-session.test.ts` (fase-2); hydrator sin test | 2 (auth) | deuda preexistente; relevante solo si entra #1503 |
| Backend 401/503 (guard, service) | `session-auth.guard.spec.ts`, `learning-paths.service.spec.ts`, `learning-paths.controller.spec.ts` | 2 | ok (no se toca) |

**Segundo eje:** ningún flujo tocado es camino crítico (sin dinero ni lógica de auth; el guard no cambia). Declarado:
- Concurrencia: no (el `active` flag de los `useEffect` ya evita setState tras unmount; "Reintentar" deshabilitado mientras carga).
- Cruza un contrato: **sí, interno** (front interpreta `statusCode` + `code` del `AllExceptionsFilter`). Sin test que fije ese shape desde el front → **deuda de dimensión** (un cambio del filtro a RFC 9457 rompería el mapeo en silencio).
- Depende del tiempo: no (timeout axios 30 s preexistente).
- Muta invariante: no.

## Tabla de flujos conectados

| Flujo conectado | ¿El cambio lo TOCA? | ¿Tiene test hoy? | Nivel actual / requerido |
|---|---|---|---|
| `GET /api/me/learning-paths` (`LearningPathsController.list` + `SessionAuthGuard`) | no (se consume su 401) | sí (controller/guard spec) | 2 / 2 |
| `POST /api/me/learning-paths` (`create` → `requireCatalogForWrite`) | no (se consumen 401/503/422 + `code`) | sí (service spec) | 2 / 2 |
| `AllExceptionsFilter` (shape de error) | no (se **consume** `statusCode`/`code`) | parcial | — / contrato sin test desde el front |
| `lib/axios.ts` → `mapApiResponseError` | sí si se ajusta; si no, se consume `codigoEstado`/`cuerpo` | **no** | sin tests / 2 ⚠️ |
| `lib/errors.ts` `asApiError` | sí si se reusa | **no** | sin tests / 2 ⚠️ |
| `loadMyRoutes` / `createOfficialRoute` | no (propagan el error tal cual) | sí | happy / 2 |
| `LearningPathsDashboard` (`/mis-rutas`) | **sí** (estados error/401/vacío) | sí, sin estado error | happy / 2 ⚠️ |
| `LearningPathsEmptyState` | **sí** (DEVI, quizás copy) | sí | caracterización / 1–2 |
| `MyRouteStatus` (`/configurador-de-ruta`) | **sí** (errores, reintentar, vacío, chevron, props iniciales) | sí, sin error ni submit-error | happy / 2 ⚠️ |
| `app/(producto)/configurador-de-ruta/page.tsx` | **sí** (lee `searchParams`) | no (solo CSS estático) | sin tests / 2 ⚠️ |
| Landing `page.tsx` + `landingFixture` | **sí** (hrefs, StackIcon, franja) | sí | caracterización / 2 |
| `MissionShell` (todas las páginas) | **sí** (footer, isologo) | sí | caracterización / 1–2 |
| `config/official-paths.ts` + `StackIcon` | no (se reusa; quizás se extiende tamaño) | sí | 2 / 2 |
| `AuthenticatedEntry` → `/login?returnTo` | no, pero el CTA 401 depende de él (rebote en dev) | sí (`login.test.tsx`) | 2 / 2 |
| `AuthSessionHydrator` + `demo-session` + `useAuthStore` | no en el plan (sí si entra #1503) | hydrator **no**; `demo-session.test.ts` sí | parcial / 2 (auth) |
| `ShellAccount` | no | sí | 2 / 2 |
| `subscribeLearningPathEvents` (WS `/live`) | no | **no** | sin tests / 2 — fuera de alcance |
| `LivePathModal` (SSE `/events`) | no | parcial | — / fuera de alcance |

⚠️ = flujo que el cambio toca (o del que depende directamente) **sin test** del comportamiento afectado → candidatos a romperse en silencio; disparan el 🛑 en `spec`.

## Tests afectados (asserts que rompen o deben cambiar)

| Test:línea | Assert hoy | Por qué rompe |
|---|---|---|
| `fase-0/dom.test.tsx:78` | `footerText.toContain("Code Quest 2026")` | se quita el texto |
| `fase-0/dom.test.tsx:79` | `indexOf("DevTalles") < indexOf("Code Quest 2026")` | `indexOf` → -1 → falla |
| `fase-0/dom.test.tsx:98` | `container.textContent.toContain("Code Quest 2026")` (login) | se quita el texto |
| `fase-0/dom.test.tsx:100` | ídem orden en variante login | `indexOf` → -1 |
| `MyRouteStatus.test.tsx:31,65` | `toContain("Por el momento no hay ruta")` | si cambia el copy del vacío |
| `MyRouteStatus.test.tsx:47,70` | `not.toContain("Por el momento no hay ruta")` | quedarían vacuamente verdes con el copy nuevo → reescribir al texto nuevo (no relajar) |
| `fase-3/routes-dom.test.tsx:81` | `container.querySelector("svg")` no null en empty state | si DEVI `<img>` reemplaza el radar SVG |
| `fase-3/routes-dom.test.tsx:80,83` | h2 "Todavía no tenés rutas", texto "Elegí una ruta oficial…" | solo si cambia el copy |
| `shell-chrome.static.test.ts:11-21` | `LUCIDE_FILES` / `ICON_USAGE` sin `ChevronDown` | no rompe, pero no policía el icono nuevo → extender |
| `official-paths.test.ts:47-55` | `/devtalles-tech/` solo en el mapa | rompe si la franja/puertas escriben rutas a mano |
| `tokens.static.test.ts:32-38` | sin hex/`rgb()` en `MyRouteStatus.module.css`, `MissionShell.module.css`, `page.module.css` | rompe si el CSS nuevo usa literales |
| `copy-voice.static.test.ts:39-44` | voseo y sin `//` en `MyRouteStatus.tsx`, `LearningPathsEmptyState.tsx`, `page.tsx`, `landing.fixture.ts` | rompe si el copy nuevo tutea (`LearningPathsDashboard.tsx` **no** está en la lista → el copy nuevo ahí no queda policiado) |
| `fase-1/landing.test.tsx:109-118` | `page.tsx` sin `fetch|axios|…|useRouter` | rompe si la landing navega imperativamente |
| `fase-1/landing.test.tsx:61` | `svg circle` = 12 | rompe solo si los iconos/marca se inlinean como SVG |

No rompen (verificado): `landing.test.tsx:62` (el CTA principal sigue en `/configurador-de-ruta`), `:60` (4 `article`), `landing-copy.test.tsx`, `LearningPathsDashboard.test.tsx` (3), `load-my-routes.test.ts`, `header-responsive…`, `mobile-nav.test.tsx` (si el isologo respeta 4rem/nowrap), `official-paths.test.ts:33-45` (carpeta nueva separada).

## Patrones existentes a reusar

- **Lectura de query en Next 16:** `await searchParams` en el Server Component + props saneadas al client (`(acceso)/login/page.tsx:10-19`). Evita `useSearchParams` + `Suspense`.
- **Normalización de errores HTTP:** `asApiError` (`lib/errors.ts`) sobre `codigoEstado`/`cuerpo` que ya pone `mapApiResponseError`. No crear un tercer helper.
- **Estados de carga con reintento:** `LearningPathsDashboard.tsx:20-63` (`attempt` + `retrying` + `active` flag) → mismo patrón para el configurador.
- **Imagen de marca/stack:** `StackIcon` (`<img>`, `width/height` explícitos, `alt=""` junto a texto, `loading="lazy"`) + mapa único en `config/` + test de SVG inerte y de "literal solo en el mapa" (`official-paths.test.ts`) → replicar para `devtalles-brand`.
- **Chrome Lucide:** import nombrado + `CHROME_ICON_STROKE_WIDTH` + `aria-hidden` (ADR 0002, `config/chrome-icon.ts`).
- **Dependencias inyectables para tests:** `MyRouteStatus({ loadRoutes, subscribe, createOfficial })`, `LearningPathsDashboard({ load })`.
- **Link a login con retorno:** `/login?returnTo=<ruta relativa>` (validado en `login/page.tsx:16-19`; `authEntryPath` hoy no acepta `returnTo`).

## Supuestos sin verificar

- Que el dev quiera distinguir red caída (sin respuesta) de 5xx en el copy; el contrato lo permite (`statusCode` 0 vs ≥500) pero no está pedido.
- Que el backend local responda 401 inmediato en `/mis-rutas` en la máquina del dev (no se levantó el backend en esta fase; inferido del guard y del filtro). Si el backend está caído, el síntoma es 30 s de "Cargando…" y luego error de red, no 401.
- Contraste de los iconos de stack a 40 px sobre el fondo de las puertas de la landing (`.door`) — verificado en listas del ciclo previo, no en esa superficie.
- Licencia de uso de logo/isologo/DEVI (terceros, sin licencia declarada en el paquete).
- Que las 13 rutas quepan en una franja sin scroll horizontal en 375 px (depende del diseño).

## Artefactos / evidencia usada

- codegraph_explore ×2 (dashboard/errores; guard/demo/hydrator/service).
- `node_modules/next/package.json` 16.3.5; `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` L82-86, L180-188.
- `require('lucide-react').ChevronDown` → existe (1.48.0).
- Script Node sobre `DEVTALLES-PAQUETES DE ELEMENTOS/SVG/*.svg` (bytes, viewBox, scripts/handlers/refs, colores, `<style>`).
- `globToRegex` de `sdd-gate.mjs` probado contra paths reales del monorepo.

📚 Referencias cargadas: `.cursor/rules/constitution-codigo.mdc`, `.cursor/rules/herramientas-detalle.mdc`, `.cursor/sdd.readproof.json`, `.cursor/sdd.paths.json` (workspace y `CodeQuest-2026/.cursor/`), `.cursor/scripts/sdd/sdd-gate.mjs`, `.cursor/skills/nextjs-reference/references/versiones-seguridad.md`, `CodeQuest-2026/specs/ui-devtalles-polish/spec.md`, `CodeQuest-2026/specs/ui-devtalles-polish/archive.md`, `CodeQuest-2026/decisions/0002-lucide-chrome-icons.md`, `frontend-layers.mdc` (adjunta por glob), docs de Next 16 `use-search-params.md`, engram #1503/#1426/#1490/#1506/#1510/#1513/#1514/#1439. Skills a cargar en fases siguientes: `nextjs-reference` (+ `rol-por-archivo.md`), `frontend-reference` (UI + accesibilidad + design-language), `error-contract` (mapeo 401/503/422 → mensaje de UI).

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
Lectura: .cursor/rules/herramientas-detalle.mdc 801a70f1
