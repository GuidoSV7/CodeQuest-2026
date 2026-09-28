# Spec — `ui-rutas-y-marca`

⚠️ FLUJOS SIN COBERTURA (revisar antes de aprobar)
- `LearningPathsDashboard` (`/mis-rutas`) estado de error: tocado, sin test del estado error hoy → se cubre con test de caracterización del comportamiento actual (error → alert + Reintentar) ANTES de tocarlo, y después tests nuevos por estado (CA-1.x).
- `MyRouteStatus` carga fallida y error de creación: tocados, sin test hoy → caracterización previa (carga fallida → alert; submit fallido → "No se pudo crear la ruta") + tests nuevos (CA-2.x).
- `lib/axios.ts` → `mapApiResponseError` (del que depende la señal 401): NO se modifica, pero el cambio depende de que ponga `codigoEstado`/`cuerpo` → se cubre con test de caracterización (con `response` / sin `response`) (CA-6.1).
- `lib/errors.ts` → `asApiError` (se reusa, 0 callers y 0 tests hoy) → se cubre con test nivel 2 (CA-6.2).
- `app/(producto)/configurador-de-ruta/page.tsx`: pasa a leer `searchParams`, sin test hoy → se cubre con test del saneo del deep link (CA-3.x).
- Contrato de error front↔back (`AllExceptionsFilter` → `{ statusCode, code }`): se consume sin artefacto compartido → **deuda explícita** (D-3); los tests del front usan fixtures copiados del shape actual del filtro.

## Paths en scope

- `frontend/public/devtalles-brand/**`
- `frontend/src/config/brand-assets.ts`
- `frontend/src/app/(producto)/page.tsx`
- `frontend/src/app/(producto)/page.module.css`
- `frontend/src/app/(producto)/configurador-de-ruta/page.tsx`
- `frontend/src/app/(producto)/configurador-de-ruta/page.module.css`
- `frontend/src/features/learning-paths/**`
- `frontend/src/features/orbital/components/MissionShell.tsx`
- `frontend/src/features/orbital/components/MissionShell.module.css`
- `frontend/src/features/orbital/fixtures/landing.fixture.ts`
- `frontend/src/lib/errors.ts`
- `frontend/test/**`

> `frontend/src/lib/errors.ts` entra solo si hace falta un helper puro para leer `code` del cuerpo (reusando `asApiError`); no se crea un tercer normalizador. `features/auth/**`, `lib/axios.ts`, `lib/api-auth-policy.ts` y todo `backend/**` quedan **fuera**.

## Nota de mezcla (working tree)

`MyRouteStatus.*`, `app/(producto)/page.tsx`, `MissionShell.*`, `landing.fixture.ts`, `LearningPathsDashboard.*`, `LearningPathsEmptyState.tsx` y varios tests de la lista ya tienen cambios **sin commitear** del ciclo `ui-devtalles-polish` (implementado y archivado, sin commit). Si no se commitea ese ciclo antes de `apply`, el diff de este ciclo queda mezclado con el anterior y el gate cruzará ambos contra estos paths. Recomendación: commitear `ui-devtalles-polish` primero. Decide el dev en el checkpoint.

## Problema

Referencias en `explore.md`:

1. **`/mis-rutas` no distingue estados** (`LearningPathsDashboard.tsx:30-32`): el `.catch` descarta el error → 401 (sin sesión), red caída y 5xx muestran el mismo "No pudimos cargar tus rutas" + "Reintentar", que repite el 401 indefinidamente. `useAuthStore.user` no sirve como señal: en `next dev` es siempre el fixture demo (memoria #1503).
2. **`/configurador-de-ruta` (`MyRouteStatus.tsx`)**: carga fallida sin reintentar ni distinción de 401 (`:74-78`); vacío con copy pobre "Por el momento no hay ruta" (`:79-81`); crear ruta traga el error (`:157-173`) aunque el backend distingue 401 / 503 `CATALOG_UNAVAILABLE` / 422.
3. **Landing**: las 4 puertas (`landing.fixture.ts:36-67`) apuntan a `/configurador-de-ruta` sin contexto; el usuario vuelve a elegir lo que ya eligió.
4. **Picker de ruta** (`MyRouteStatus.tsx:112-143`): sin chevron ni pista de que es un desplegable con scroll interno (13 opciones, `max-height: 16rem`).
5. **Marca**: el shell dice "Hecho para Code Quest 2026" (`MissionShell.tsx:47,82`), contra la decisión de shell DevTalles-only (#1439). No hay isologo, mascota ni iconos de stack en la landing.

## Scope (MoSCoW)

**Must**
- M1. Estados diferenciados en `/mis-rutas` y `/configurador-de-ruta`: sin sesión (401) / error (red, 5xx, otros) / vacío / con rutas.
- M2. CTA "Entrar" del estado sin sesión → `discordStartUrl(returnTo)` (ya existe en `features/auth/api/auth.service.ts`), `returnTo` = pantalla actual. No se toca `demo-session.ts` ni lógica de auth.
- M3. Reintentar en ambas pantallas para el estado de error.
- M4. Crear ruta: 401 → pedir entrar (CTA); 503 + `CATALOG_UNAVAILABLE` → copy de catálogo no listo; otros → mensaje corto.
- M5. Deep link de las 4 puertas a `/configurador-de-ruta?panel=form&path=<id>`, leído con `await searchParams` en el Server Component, validado por allowlist.
- M6. Picker con chevron Lucide + texto de ayuda visible con `N = OFFICIAL_PATHS.length` + `aria-describedby`.
- M7. Quitar "Code Quest 2026" del `MissionShell` (variantes product y login).
- M8. Vendorizar isologo y DEVI a `public/devtalles-brand/`, rutas centralizadas en `config/brand-assets.ts`, isologo en el header, DEVI en `LearningPathsEmptyState`, `StackIcon` en las 3 puertas con path, franja de iconos de `OFFICIAL_PATHS` en la landing.
- M9. Tests nivel 2 de los estados nuevos + caracterización previa de lo que hoy no tiene test + guardas estáticas de assets de marca.

**Should**
- S1. Copy de la puerta `unknown` coherente con su destino (formulario con Fundamentos), mencionando el MCP como alternativa (ver CA-3.6).

**Could**
- C1. DEVI también en el vacío del configurador (mismo asset, mismo patrón `<img>`).

**Won't (este ciclo)**
- W1. Fix de `features/auth/lib/demo-session.ts` (#1503) → deuda D-1.
- W2. SSE `/events` (`LivePathModal.tsx:59-61`) y WebSocket `/live` (`subscribe-learning-paths.ts:14-17`) sin Bearer en localhost → deuda D-2.
- W3. Agregar señales al gate `sdd.paths.json` (sus globs `src/**` no matchean el monorepo `frontend/`/`backend/`) → deuda D-4.
- W4. Portadas de curso: sin cambio; verificación manual.
- W5. Patrón de teclado completo del listbox (flechas, Home/End, Escape, foco al abrir) → deuda D-5.
- W6. Cambiar el shape de error del backend a RFC 9457 → deuda D-3.
- W7. Retry automático: el reintento es solo manual.
- W8. Menciones del nombre de producto "CodeQuest" (sin espacio) fuera del `MissionShell`: `LoginPanel.tsx:22` ("Entrá a CodeQuest"), metadata de `login`/`registro`, `config/site.ts`, copy del MCP (`codequest-cuenta`). No son el crédito "Code Quest 2026" que pide quitar la dirección → pregunta abierta Q-1.

## Criterios de aceptación

Señal de sesión (común a CA-1 y CA-2): **"sin sesión" ⇔ `asApiError(err).statusCode === 401`** (el `codigoEstado` que pone `mapApiResponseError`). Prohibido derivarla de `useAuthStore.user` o de la presencia de token local. Cualquier otro fallo de lectura (statusCode `0` = sin respuesta, `5xx`, u otro código) = estado de error.

### CA-1 — `/mis-rutas` (`LearningPathsDashboard`)

- **CA-1.1** `load` rechaza con error `codigoEstado: 401` → se renderiza un estado "sin sesión": encabezado con copy en voseo que diga que hay que entrar para ver las rutas, y un link "Entrar" cuyo `href` es exactamente `discordStartUrl("/mis-rutas")`. **No** se muestra "Reintentar" ni `role="alert"` en este estado.
- **CA-1.2** `load` rechaza sin `codigoEstado` (red caída) o con `codigoEstado ≥ 500` (o cualquier código ≠ 401) → `role="alert"` con "No pudimos cargar tus rutas" + botón "Reintentar"; clic → vuelve a llamar `load` (se verifica con contador de llamadas = 2) y el botón queda deshabilitado mientras carga.
- **CA-1.3** `load` resuelve `[]` → `LearningPathsEmptyState` (sin alert, sin CTA de entrar).
- **CA-1.4** `load` resuelve rutas → grilla actual sin cambios (los 3 tests existentes de `LearningPathsDashboard.test.tsx` siguen verdes sin modificarse).
- **CA-1.5** Tras el reintento, si el nuevo intento da 401 se pasa al estado sin sesión (no queda en error).

### CA-2 — `/configurador-de-ruta` (`MyRouteStatus`)

- **CA-2.1** Carga con 401 → estado sin sesión con link "Entrar" `href === discordStartUrl("/configurador-de-ruta")`; sin "Reintentar".
- **CA-2.2** Carga con red caída / 5xx / otro código → `role="alert"` "No pudimos cargar tus rutas" + botón "Reintentar" (mismo patrón `attempt` + `retrying` + flag `active` de `LearningPathsDashboard`); clic → `loadRoutes` llamado 2 veces; deshabilitado mientras carga.
- **CA-2.3** Carga `[]` → copy "Todavía no creaste ninguna ruta." (voseo, oración); el texto "Por el momento no hay ruta" desaparece del componente.
- **CA-2.4** Crear ruta con error 401 → mensaje que pide entrar + link "Entrar" `href === discordStartUrl("/configurador-de-ruta")`.
- **CA-2.5** Crear ruta con error 503 y `cuerpo.code === "CATALOG_UNAVAILABLE"` → exactamente "El catálogo todavía no está listo en el servidor. Probá de nuevo en unos minutos." (sin cifras de tiempo).
- **CA-2.6** Crear ruta con cualquier otro error (503 sin ese `code`, 422, 400, red) → mensaje corto "No se pudo crear la ruta." (el actual).
- **CA-2.7** Los mensajes de error de creación se anuncian (`role="alert"` o región `aria-live`) y el formulario sigue operable (se puede reintentar enviando otra vez).
- **CA-2.8** Los tests existentes de `MyRouteStatus.test.tsx` (happy, live, crear, MCP) siguen verdes; solo cambian los asserts de copy de vacío listados en §Tests.

### CA-3 — Deep link landing → configurador

- **CA-3.1** `landing.fixture.ts`: `start` → `/configurador-de-ruta?panel=form&path=programas-fundamentos`; `switch` → `…&path=programas-react`; `specialize` → `…&path=programas-nest`; `unknown` → `…&path=programas-fundamentos`. Cada `path` usado existe en `OFFICIAL_PATHS` (assert que recorre las puertas).
- **CA-3.2** `configurador-de-ruta/page.tsx` es Server Component, lee `searchParams: Promise<…>` con `await` (patrón `(acceso)/login/page.tsx`), sin `useSearchParams` ni `"use client"`, y pasa a `MyRouteStatus` props iniciales ya saneadas.
- **CA-3.3** Saneo (función pura testeable): `path` se acepta solo si es un string que coincide con un `id` de `OFFICIAL_PATHS`; `panel` solo si es exactamente `"form"`. Valor ausente, desconocido, vacío o array → se ignora y rige el default actual (`panel` cerrado, `catalogPathId = OFFICIAL_PATHS[0].id`). Casos de test: válido, `path` desconocido, `path=../x`, `panel=mcp`, `panel=FORM`, array, ausente.
- **CA-3.4** Con `panel=form&path=programas-react` el configurador renderiza el formulario abierto con React preseleccionado (label visible "React" en el trigger del picker). Sin params, el render es idéntico al actual.
- **CA-3.5** El CTA principal de la landing sigue en `/configurador-de-ruta` sin query (`landing.test.tsx:62` verde) y `page.tsx` de la landing sigue sin `fetch|axios|localStorage|sessionStorage|useRouter` (`landing.test.tsx:109-118` verde).
- **CA-3.6** Puerta `unknown`: no muestra `StackIcon`; su copy ya no promete que el destino es el modo IA: invita a empezar por Fundamentos en el formulario y menciona el MCP como alternativa desde el configurador; metadata deja de ser `["Modo", "Con tu IA"]` (propuesta: `["Nivel", "Inicial"]`, ajustable en el checkpoint). Pasa `copy-voice.static.test.ts`.

### CA-4 — Picker de ruta

- **CA-4.1** El trigger muestra un icono Lucide `ChevronDown` cerrado; abierto muestra `ChevronUp` (o `ChevronDown` rotado 180° por CSS con transición < 300 ms y curva no-default), con `strokeWidth={CHROME_ICON_STROKE_WIDTH}` y `aria-hidden="true"`. Sin `<svg` a mano en `MyRouteStatus.tsx` (`shell-chrome.static.test.ts:46` verde).
- **CA-4.2** Texto de ayuda **siempre visible** junto al picker que dice que es una lista desplegable de `N` rutas oficiales con scroll interno, con `N` interpolado de `OFFICIAL_PATHS.length` (test: el texto contiene `String(OFFICIAL_PATHS.length)`; grep: el componente no contiene el literal `13`).
- **CA-4.3** El trigger tiene `aria-describedby` apuntando al `id` del texto de ayuda; mantiene `aria-haspopup="listbox"` y `aria-expanded` correcto.
- **CA-4.4** `shell-chrome.static.test.ts` se extiende: `LUCIDE_FILES["…/MyRouteStatus.tsx"]` incluye los chevrons usados e `ICON_USAGE` los polícia (stroke + aria-hidden).
- **CA-4.5** Estilos nuevos en `MyRouteStatus.module.css` solo con tokens / `color-mix` sobre token (`tokens.static.test.ts` verde).

### CA-5 — Marca

- **CA-5.1** `MissionShell` (variantes product y login) no contiene "Code Quest" (regex `/code\s*quest/i` sobre el `textContent` del shell renderizado). Footer = marca "DevTalles" sola, sin separador `•` huérfano; se elimina el CSS que quede sin uso (`.footerCredit` y el separador) de `MissionShell.module.css`.
- **CA-5.2** Assets vendorizados byte a byte: `DEVTALLES-PAQUETES DE ELEMENTOS/SVG/ISOLOGO COLOR.svg` → `frontend/public/devtalles-brand/isologo-color.svg`; `DEVI HELLO BORDER.svg` → `frontend/public/devtalles-brand/devi-hello.svg`. `verify` compara sha256 origen/destino por comando (el origen está fuera del repo; no va en test).
- **CA-5.3** `frontend/src/config/brand-assets.ts` es la única fuente de las rutas de marca. Test estático: el literal `/devtalles-brand/` no aparece en `frontend/src/` fuera de ese archivo; cada ruta exportada existe en `public/`.
- **CA-5.4** Test de SVG inerte sobre `public/devtalles-brand/*.svg`: sin `<script`, atributos `on*=`, `href`/`xlink:href`, `url(`, `<image`, `foreignObject` (réplica del patrón de `official-paths.test.ts`).
- **CA-5.5** Los assets de marca se usan solo como `<img>` (nunca inline): isologo y DEVI con `width`/`height` explícitos. `landing.test.tsx:61` (`svg circle` = 12) sigue verde.
- **CA-5.6** Isologo en el header de ambas variantes de `MissionShell`, junto al texto "DevTalles", `alt=""` (el link ya tiene `aria-label="DevTalles, inicio"`), alto ≤ 2rem. `header-responsive.characterization.test.ts` y `mobile-nav.test.tsx` verdes sin modificarse (4rem / `nowrap`).
- **CA-5.7** `LearningPathsEmptyState` muestra DEVI (`<img src=BRAND.deviHello alt="">`, decorativa: el h2 ya da el mensaje) en lugar de la ilustración SVG de radar actual; h2 y copy actuales se mantienen.
- **CA-5.8** Puertas `start`/`switch`/`specialize` renderizan `StackIcon size="md"` de su `path` (src vía `officialPathIconSrc`, `alt=""` porque el label de la puerta es texto visible); `unknown` no renderiza icono.
- **CA-5.9** Franja en la landing con un icono por cada elemento de `OFFICIAL_PATHS` (conteo = `OFFICIAL_PATHS.length`), vía `StackIcon`, con nombre accesible por icono (`standaloneLabel` = label de la ruta) dentro de una región etiquetada; en 375 px envuelve sin scroll horizontal (`flex-wrap: wrap`, test estático de CSS). `official-paths.test.ts:47-55` verde (ningún literal `/devtalles-tech/` fuera del mapa).
- **CA-5.10** CSS nuevo de landing, shell y empty state sin hex/`rgb()` literales; si se toca un `.module.css` que `tokens.static.test.ts` no lista (p. ej. `LearningPathsDashboard.module.css` o el del empty state), se agrega a la lista.

### CA-6 — Soporte de errores (caracterización)

- **CA-6.1** Test de caracterización de `mapApiResponseError`: con `response` → `Error` con `codigoEstado = status` y `cuerpo = data`; sin `response` → `Error` sin `codigoEstado`. No se modifica el código.
- **CA-6.2** Tests de `asApiError`: `Error` con `codigoEstado`/`cuerpo` → `ApiError { statusCode, body }`; `Error` plano → `statusCode 0`; `ApiError` → misma instancia; no-Error → `statusCode 0`. Si se agrega un helper para leer `code`, se testea con cuerpo con `code` string, sin `code`, y cuerpo no-objeto.
- **CA-6.3** `copy-voice.static.test.ts` agrega `LearningPathsDashboard.tsx` a `LIVE_COPY_FILES` (hoy su copy no está policiado) y todo el copy nuevo pasa voseo + sin `//`.

### CA-7 — Suite

- **CA-7.1** `npm test` (vitest) del frontend verde, typecheck y lint verdes, `next build` verde (verifica que `/configurador-de-ruta` compile como ruta dinámica sin error de Suspense). Rojo o sin correr = no hecho.

## Disposición de flujos conectados

| Flujo (explore) | Disposición | Evidencia / cobertura |
|---|---|---|
| `GET /api/me/learning-paths` (controller + guard) | FUERA DE SCOPE / no afectado | Backend no se toca (ningún path `backend/**`); se consume su 401 tal cual. Specs backend existentes. |
| `POST /api/me/learning-paths` (`requireCatalogForWrite`) | FUERA DE SCOPE / no afectado | Backend intacto; se consumen 401/503/422 + `code`. `learning-paths.service.spec.ts` existente. |
| `AllExceptionsFilter` (shape de error) | FUERA DE SCOPE / consumido | No se modifica; shape `{ statusCode, code, message }` usado como fixture en tests del front. Sin artefacto compartido → D-3. |
| `lib/axios.ts` → `mapApiResponseError` | EN SCOPE (dependencia directa, sin modificar) | Caracterización CA-6.1. |
| `lib/errors.ts` `asApiError` | EN SCOPE (se reusa) | Tests CA-6.2. |
| `loadMyRoutes` / `createOfficialRoute` | FUERA DE SCOPE / no afectado | No cambian: propagan el error del interceptor sin envolverlo (`load-my-routes.ts:25,44`); `load-my-routes.test.ts` verde. |
| `LearningPathsDashboard` | EN SCOPE | Caracterización previa del error + CA-1.1–1.5. |
| `LearningPathsEmptyState` | EN SCOPE | CA-5.7; assert reescrito `routes-dom.test.tsx:81`. |
| `MyRouteStatus` | EN SCOPE | Caracterización previa (error de carga, error de submit) + CA-2.x, CA-3.4, CA-4.x. |
| `configurador-de-ruta/page.tsx` | EN SCOPE | CA-3.2, CA-3.3. |
| Landing `page.tsx` + `landingFixture` | EN SCOPE | CA-3.1, CA-3.5, CA-3.6, CA-5.8, CA-5.9; tests existentes de landing verdes. |
| `MissionShell` | EN SCOPE | CA-5.1, CA-5.6; asserts reescritos de `fase-0/dom.test.tsx`. |
| `config/official-paths.ts` + `StackIcon` | FUERA DE SCOPE / no afectado | Se reusan sus exports (`OFFICIAL_PATHS`, `officialPathIconSrc`, `StackIcon` sizes `sm`/`md`, `standaloneLabel`) sin cambiar firma; `official-paths.test.ts`, `StackIcon.test.tsx` verdes. |
| `AuthenticatedEntry` → `/login?returnTo` | FUERA DE SCOPE / no afectado | El CTA nuevo apunta a `discordStartUrl`, no a `/login` → no pasa por `AuthenticatedEntry` (evita el rebote demo en dev). `login.test.tsx` verde. |
| `AuthSessionHydrator` + `demo-session` + `useAuthStore` | FUERA DE SCOPE / no afectado | Ningún path `features/auth/**` ni `stores/**` en scope; la señal de sesión no lee `useAuthStore`. Fix → D-1. |
| `ShellAccount` | FUERA DE SCOPE / no afectado | No se toca; sigue mostrando el avatar demo en dev (D-1). |
| `subscribeLearningPathEvents` (WS `/live`) | FUERA DE SCOPE / no afectado | `subscribe-learning-paths.ts` no cambia (aunque cae bajo el glob `features/learning-paths/**`, no se edita). → D-2. |
| `LivePathModal` (SSE `/events`) | FUERA DE SCOPE / no afectado | `features/live-path/**` fuera de scope. → D-2. |

## Tests

### Niveles (constitución → Testing)

| Flujo nuevo/cambiado | Nivel | Tests exigidos |
|---|---|---|
| Estados de `/mis-rutas` (clasificación 401 / error / vacío / rutas + reintento) | 2 | happy + 401 + red + 5xx + vacío + reintento→401 (CA-1.x) |
| Estados y creación en configurador | 2 | 401 / error+reintento / vacío / submit 401 / 503 CATALOG_UNAVAILABLE / 503 sin code / 422 (CA-2.x) |
| Saneo del deep link | 2 | allowlist válido + 6 inválidos (CA-3.3) + render con props (CA-3.4) |
| Hrefs del fixture | 2 | mapeo exacto + ids ∈ `OFFICIAL_PATHS` (CA-3.1) |
| Picker (chevron + ayuda) | 1–2 | render cerrado/abierto, ayuda con N, `aria-describedby` (CA-4.x) |
| Marca (footer, isologo, DEVI, franja, iconos) | 1 | render + guardas estáticas (CA-5.x) |
| `mapApiResponseError` / `asApiError` | 2 | caracterización + casos borde (CA-6.x) |

Orden en `apply`: **primero** los tests de caracterización del comportamiento actual de error en `LearningPathsDashboard`, `MyRouteStatus` (carga y submit) y `mapApiResponseError`; verdes contra el código actual; recién después se cambia el código y se actualizan con el comportamiento nuevo.

**Segundo eje:** ningún flujo es camino crítico (sin dinero; auth solo se *consume* vía 401, no cambia lógica de auth). Declarado igual: sin concurrencia (flag `active` + botón deshabilitado); cruza contrato **interno** front↔back (shape de error) → D-3; no depende del tiempo (sin TTL/backoff nuevos; timeout axios preexistente); no muta invariantes.

**Seguridad (tests situacionales):** no aplica IDOR/BFLA (sin endpoints nuevos). Input no confiable = query de la URL → cubierto por CA-3.3 (allowlist). `returnTo` del CTA es literal de la app (no viene del usuario) y `discordStartUrl` → `loginReturnTarget` ya lo valida.

### Asserts que se reescriben (con el porqué)

| Test:línea | Hoy | Pasa a | Por qué |
|---|---|---|---|
| `fase-0/dom.test.tsx:78` | footer contiene "Code Quest 2026" | footer contiene "DevTalles" y `textContent` no matchea `/code\s*quest/i` | Decisión de producto (dirección aprobada + #1439): shell DevTalles-only. Supera CA-1.8 de `ui-devtalles-polish/spec.md`. Se reemplaza por la aserción inversa (más fuerte), no se borra. |
| `fase-0/dom.test.tsx:79` | `indexOf("DevTalles") < indexOf("Code Quest 2026")` | eliminado; cubierto por la aserción inversa de :78 | El orden entre dos textos pierde sentido cuando uno deja de existir (daría -1). |
| `fase-0/dom.test.tsx:98` | login contiene "Code Quest 2026" | login contiene "DevTalles" y no matchea `/code\s*quest/i` | Ídem :78, variante login. |
| `fase-0/dom.test.tsx:100` | orden en variante login | eliminado; cubierto por :98 | Ídem :79. |
| `MyRouteStatus.test.tsx:31,65` | contiene "Por el momento no hay ruta" | contiene "Todavía no creaste ninguna ruta." | Copy del vacío cambia (CA-2.3). |
| `MyRouteStatus.test.tsx:47,70` | no contiene "Por el momento no hay ruta" | no contiene "Todavía no creaste ninguna ruta." | Con el copy viejo quedarían vacuamente verdes; se apuntan al copy nuevo para seguir probando algo. |
| `fase-3/routes-dom.test.tsx:81` | `querySelector("svg")` no null en empty state | `querySelector('img[src$="devi-hello.svg"]')` no null con `alt=""` | DEVI (`<img>`) reemplaza la ilustración SVG de radar (CA-5.7). |
| `shell-chrome.static.test.ts:11-21` | `LUCIDE_FILES`/`ICON_USAGE` sin chevrons | se agregan los chevrons | Extensión: el icono nuevo queda policiado (CA-4.4). |
| `copy-voice.static.test.ts:11` | `LIVE_COPY_FILES` sin `LearningPathsDashboard.tsx` | se agrega | Extensión: copy nuevo policiado (CA-6.3). |
| `tokens.static.test.ts` | lista de CSS | se agregan los `.module.css` tocados no listados | Extensión (CA-5.10). |

Tests que **no** se modifican y deben seguir verdes: `landing.test.tsx:60,61,62,109-118`, `landing-copy.test.tsx`, `LearningPathsDashboard.test.tsx` (3), `load-my-routes.test.ts`, `header-responsive.characterization.test.ts`, `mobile-nav.test.tsx`, `official-paths.test.ts`, `StackIcon.test.tsx`, `login.test.tsx`, `demo-session.test.ts`.

### Tests nuevos

- Caracterización + estados: `LearningPathsDashboard.test.tsx`, `MyRouteStatus.test.tsx` (casos nuevos).
- `test/src/lib/api-auth-policy.test.ts` (CA-6.1), `test/src/lib/errors.test.ts` (CA-6.2).
- Saneo del deep link (CA-3.3) junto al módulo que lo implemente en `features/learning-paths/lib/`.
- Fixture de landing (CA-3.1) y puertas/franja (CA-5.8, CA-5.9) en `fase-1/landing.test.tsx` o archivo nuevo del ciclo.
- `test/src/config/brand-assets.test.ts` (CA-5.3, CA-5.4).

## Requisitos no funcionales de intervalo / SLA

No hay. El reintento es manual; no se agrega polling ni retry automático.

## Supuestos declarados

- El backend local responde 401 inmediato sin sesión (inferido del guard + filtro; no se levantó en explore). Con backend caído el síntoma es ~30 s de "Cargando…" y luego estado de error (timeout axios preexistente, fuera de scope).
- Red caída y 5xx comparten copy ("No pudimos cargar tus rutas"); distinguirlos no está pedido.
- Contraste de `StackIcon md` sobre `.door` de la landing: se verifica manual en `verify` (gate de Lenguaje visual).
- 13 iconos caben envolviendo en 375 px sin scroll horizontal.

## Deuda explícita aceptada

- **D-1** Sesión demo en dev (`demo-session.ts` ignora `NEXT_PUBLIC_ORBITAL_DEMO_SESSION`, #1503): `ShellAccount` sigue mostrando avatar demo aunque el API responda 401. Mitigado por el CTA a `discordStartUrl`. Fix en sesión SDD de auth aparte (riesgo ALTO).
- **D-2** SSE `/api/me/learning-paths/events` y WebSocket `/live` sin Bearer → no autentican en localhost (fallan en silencio). Fuera de alcance.
- **D-3** Contrato de error: el backend no emite RFC 9457 (sin `type`/`title`/`correlationId`) y no hay artefacto de contrato compartido del shape de error; si el filtro cambia, el mapeo 401/`CATALOG_UNAVAILABLE` del front se rompe sin que ninguna suite lo vea.
- **D-4** Gate `sdd.paths.json`: los globs `src/**` están anclados a la raíz y no matchean `frontend/src/**` ni `backend/src/**` → ninguna señal dispara en este monorepo. Se agrega en un ciclo propio (decisión del dev).
- **D-5** Listbox del picker sin patrón de teclado completo (flechas, Home/End, Escape, foco al abrir).
- **D-6** Licencia de uso de isologo y DEVI (terceros, sin licencia declarada en el paquete) — amplía la deuda de assets de `ui-devtalles-polish`.
- **D-7** Portadas de curso: sin cambio, verificación manual.
- **D-8** Mezcla con `ui-devtalles-polish` sin commitear (ver §Nota de mezcla), si el dev decide no aislarlo.

## Preguntas abiertas para el checkpoint

- **Q-1** ¿"Quitar Code Quest" incluye el nombre de producto "CodeQuest" en `LoginPanel.tsx:22`, metadata de login/registro y `config/site.ts`? Esta spec asume que **no** (solo el crédito "Code Quest 2026" del shell). Incluirlo agrega `features/auth/components/**` y `app/(acceso)/**` a los paths.
- **Q-2** Footer: marca sola "DevTalles" (asumido) vs. "Catálogo oficial de cursos de DevTalles".
- **Q-3** Metadata de la puerta `unknown`: `["Nivel", "Inicial"]` (propuesto) u otro.
- **Q-4** ¿Se commitea `ui-devtalles-polish` antes de `apply`?

## Checkpoint

🔔 El dev revisa y aprueba esta spec antes de `design`/`apply`. Sella con `node .cursor/scripts/sdd/sdd-gate.mjs approve specs/ui-rutas-y-marca`.

📚 Referencias cargadas: `CodeQuest-2026/specs/ui-rutas-y-marca/explore.md`, `.cursor/rules/constitution-fases.mdc`, `.cursor/rules/constitution-codigo.mdc`, `.cursor/rules/frontend-layers.mdc` (adjunta por glob), `.cursor/sdd.readproof.json`, `CodeQuest-2026/specs/ui-devtalles-polish/spec.md` (formato y CA-1.8 que se supera), `frontend/src/features/auth/api/auth.service.ts`, `frontend/src/features/learning-paths/components/StackIcon.tsx`, `LearningPathsDashboard.tsx`, `landing.fixture.ts`.

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
Lectura: .cursor/rules/constitution-fases.mdc e3160314

Aprobado por dev: 2026-09-27 sha256:df595573d373
