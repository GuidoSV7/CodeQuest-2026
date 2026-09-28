# Spec — `auth-gate-rutas`

⚠️ FLUJOS SIN COBERTURA (revisar antes de aprobar)
- `AuthSessionHydrator` (hidratación → `useAuthStore`): tocado, sin tests de comportamiento hoy (solo búsqueda de strings en el source) → se cubre con **caracterización** del comportamiento actual (demo en dev, signedOut, `setHydrated(true)` siempre) ANTES de tocarlo, y después tests nuevos por estado (CA-3.x).
- `fetchMe` (`GET /api/auth/me`): se conserva sin cambios, pero la lectura nueva de sesión sale de la misma request y hoy no tiene tests → se cubre con **caracterización** de `fetchMe` (200 → user, error → `null`) + tests nivel 2/3 de la lectura nueva (CA-2.x).
- `local-session.ts` (captura/lectura/borrado de token): firmas estrechadas, test actual solo happy path → se amplía con casos borde (CA-6.3) antes de cambiar firmas.
- `api-auth-policy.ts` (interceptor Bearer): caller de `captureLocalSessionFromLocation`, cambia solo el tipo del parámetro → cubierto por `tsc` + tests existentes de `test/src/lib/api-auth-policy.test.ts` (verdes sin modificarse).
- Contrato `SessionUser` de `/api/auth/me` sin artefacto compartido front↔back → **deuda explícita** (D-3, heredada); mitigación parcial con validación mínima del shape en la frontera (CA-2.5).
- `UserRouteDiagram` (`/mis-rutas/[routeId]`) con token vencido cae en "No pudimos cargar el diagrama" (sin estado 401) → **deuda explícita** (D-5); con sesión inexistente ya no se llega a él (gate).

## Paths en scope

- `frontend/src/features/auth/**`
- `frontend/src/stores/auth-session.ts`
- `frontend/src/app/(producto)/mis-rutas/layout.tsx`
- `frontend/src/app/(producto)/configurador-de-ruta/layout.tsx`
- `frontend/src/features/learning-paths/components/LearningPathsDashboard.tsx`
- `frontend/src/features/learning-paths/components/MyRouteStatus.tsx`
- `frontend/src/features/learning-paths/components/SignInLink.tsx`
- `frontend/src/features/learning-paths/components/SignInLink.module.css`
- `frontend/src/config/brand-assets.ts`
- `frontend/public/devtalles-brand/devi-laptop.svg`
- `frontend/.env.example`
- `frontend/test/**`

> `LearningPathsDashboard.tsx` y `MyRouteStatus.tsx` entran **solo** para cambiar el import de `SignInLink` (D4); cualquier otro cambio en ellos es fuera de scope. `SignInLink.*` de `learning-paths` entra para borrarse (se mueve a `features/auth/components/`). `backend/**`, `lib/axios.ts`, `lib/api-auth-policy.ts` (código), `features/orbital/**`, pages `(producto)/**/page.tsx` y `(producto)/layout.tsx` quedan **fuera**.

## Decisiones registradas (tomadas por el orquestador a pedido del dev)

- **D1 — Demo opt-in.** `isOrbitalDemoSessionEnabled` ⇔ `nodeEnv === "development"` **y** `demoSession ∈ {"true", "1"}`. Se **mantiene** la exigencia de `development` porque el ADR `decisions/0001-ui-stitch-orbital.md` (accepted) lo exige dos veces ("únicamente en `development`"; "en test, preview, staging y producción se ignora como falso") y la spec `ui-stitch-orbital` CA-6 también. Se acepta `"1"` además de `"true"` porque el addendum del mismo ADR documenta `=1` y el cuerpo `"true"`: aceptar ambos es la única lectura compatible con los dos párrafos. Cualquier otro valor (`undefined`, `""`, `"false"`, `"TRUE"`, `"0"`) → deshabilitado.
- **D2 — Distinguir sin sesión de servidor inalcanzable.** Lectura nueva de sesión con resultado de 3 ramas; el store expone `sessionStatus: "unknown" | "authenticated" | "anonymous" | "unreachable"`. Timeout propio de la lectura: **8 000 ms** (constante nombrada, no literal suelto). `fetchMe` conserva firma y comportamiento (lo usan tests de contrato por string y es API pública del servicio).
- **D3 — Gate por layout de segmento.** `(producto)/mis-rutas/layout.tsx` y `(producto)/configurador-de-ruta/layout.tsx` (Server Components) envuelven `children` en `RequireSession` (client, `features/auth/components/`). Cubren las 7 URLs protegidas del explore sin mover pages. Los estados 401 de `ui-rutas-y-marca` quedan como respaldo para token vencido.
- **D4 — `SignInLink` se mueve** de `features/learning-paths/components/` a `features/auth/components/` (con su `.module.css`); se actualizan los 2 imports y la ruta en `copy-voice.static.test.ts`.
- **D5 — Tests nuevos** de lectura de `/me`, hydrator y `RequireSession` (CA-2, CA-3, CA-4).
- **D6 — Fix TS2352** estrechando firmas de `local-session.ts` con `Pick<…>` y quitando los 3 casts del test.
- **D7 — Commits** los hace el orquestador tras `verify`, en este orden: (1) fix TS2352 solo (para que el gate `typecheck` del recibo pase), (2) ciclos previos sin commitear (`ui-devtalles-polish`, `ui-rutas-y-marca`, …), (3) este ciclo (fix demo-session antes que el gate, idealmente en commit propio). Presupuesto 400 líneas por commit.

## Problema

1. **Sin sesión se ve la pantalla de datos, no un login.** `/mis-rutas/**` y `/configurador-de-ruta/**` renderizan sus componentes (`LearningPathsDashboard`, `MyRouteStatus`, `UserRouteDiagram`, mocks) aunque no haya sesión; el usuario ve "Armá tu ruta" o "No pudimos cargar tus rutas" en vez de una invitación a entrar. Ningún layout de segmento existe hoy (`app/(producto)/mis-rutas/` y `configurador-de-ruta/` solo tienen `page.tsx`).
2. **La sesión demo está siempre prendida en `next dev`** (#1503): `features/auth/lib/demo-session.ts:17` devuelve `environment.nodeEnv === "development"` e ignora `demoSession`. Con eso cualquier gate basado en el store es inútil en dev (siempre hay usuario fixture). Contradice ADR 0001 y `ui-stitch-orbital/spec.md` CA-6. Los asserts de `test/src/ui-stitch-orbital/fase-2/demo-session.test.ts:10-15` codifican el bug.
3. **`fetchMe` confunde red con falta de sesión** (`features/auth/api/auth.service.ts:7-14`): cualquier error → `null`. Con backend caído el gate mostraría "iniciá sesión", y además tras 30 s (timeout general de `lib/axios.ts:10`).
4. **`next build` / `tsc --noEmit` rojos por TS2352** en `test/src/features/auth/lib/local-session.test.ts:14` (`} as Storage` sobre un fake sin `length/clear/key`); el cast `as Location` (l.13) y el `as Storage` (l.23) son la misma deuda. Con `typecheck` rojo ningún commit pasa el pre-commit sin `--no-verify`.

## Scope (MoSCoW)

**Must**
- M1. Fix demo opt-in (D1) + reescritura declarada del assert que fija el bug.
- M2. Lectura de sesión de 3 ramas con timeout propio de 8 000 ms (D2) y `sessionStatus` en el store; hydrator la usa.
- M3. `RequireSession` + 2 layouts (D3): carga / login con DEVI / inalcanzable con Reintentar / children.
- M4. Vendorizar `DEVI LAPTOP BORDER.svg` → `public/devtalles-brand/devi-laptop.svg` byte a byte + clave `deviLaptop` en `BRAND_ASSETS`.
- M5. Mover `SignInLink` a `features/auth/components/` (D4).
- M6. Fix TS2352 sin casts (D6).
- M7. Tests: caracterización previa de hydrator y `fetchMe`, tests nuevos (D5), matriz de demo, casos borde de `local-session`.

**Should**
- S1. Documentar `NEXT_PUBLIC_ORBITAL_DEMO_SESSION` comentada en `frontend/.env.example` (con la nota de que solo aplica en `development`).

**Could**
- C1. Ninguno.

**Won't (este ciclo)**
- W1. SSE `/events` y WS `/live` sin Bearer → D-1 (heredada D-2 de `ui-rutas-y-marca`).
- W2. Señales de `sdd.paths.json` para `frontend/src/**` → D-2 (heredada D-4).
- W3. Bajar el timeout general de axios (30 s) → D-4. Solo la lectura de `/me` usa 8 s.
- W4. Estado 401 en `UserRouteDiagram` → D-5.
- W5. Gatear `LivePathModal` (vive en `MissionShell`, global) → fuera del pedido.
- W6. Cambiar `HomeAuthStatus`, `ShellAccount`, `AuthenticatedEntry` para mostrar `unreachable`: siguen leyendo `user`/`hydrated` (con `unreachable` muestran "Entrar", como hoy con `null`).
- W7. Reintento automático / polling de `/me`: solo manual.
- W8. Protección server-side (middleware/cookies en Next): el gate es UX; la frontera real sigue siendo `SessionAuthGuard` del backend.

## Criterios de aceptación

### CA-1 — Sesión demo opt-in (`demo-session.ts`)

- **CA-1.1** Matriz exhaustiva (test table-driven) de `isOrbitalDemoSessionEnabled` con `nodeEnv ∈ {"development","production","test",undefined}` × `demoSession ∈ {undefined,"","true","1","false","0","TRUE"}`: devuelve `true` **solo** en `("development","true")` y `("development","1")`; las 26 combinaciones restantes → `false`.
- **CA-1.2** `resolveOrbitalSession` (o su reemplazo) en modo demo no invoca el lector de red y devuelve el fixture `orbitalDemoSessionFixture` (test existente `demo-session.test.ts:30-45` verde sin modificarse: usa `"1"`, que sigue válido por D1).
- **CA-1.3** Fuera de demo (`development` sin variable) se invoca el lector real exactamente 1 vez.
- **CA-1.4** `OrbitalDemoBanner.tsx` no se modifica y `fase-0/dom.test.tsx:57-60` sigue verde.

### CA-2 — Lectura de sesión (`auth.service.ts`)

Nombre: `fetchMeStatus()` en `features/auth/api/auth.service.ts`, retorna `Promise<SessionRead>` con `SessionRead = { status: "authenticated"; user: SessionUser } | { status: "anonymous" } | { status: "unreachable" }` (tipo en `features/auth/types/auth.types.ts`). No lanza nunca: toda rama de error se clasifica.

- **CA-2.1** `GET /api/auth/me` 200 con body válido → `{ status: "authenticated", user }` con el `user` del body.
- **CA-2.2** Respuesta 401 o 403 (`asApiError(err).statusCode ∈ {401,403}`) → `{ status: "anonymous" }`.
- **CA-2.3** Sin respuesta (`statusCode === 0`: red caída, CORS, timeout `ECONNABORTED`), 5xx, u otro código (400, 404, 429) → `{ status: "unreachable" }`. Un test por cada uno: red, timeout, 500, 503, 404.
- **CA-2.4** La request lleva `timeout` = constante exportada `SESSION_READ_TIMEOUT_MS = 8_000` (test: el mock de `api.get` recibe `{ timeout: 8000 }` en su config). El timeout general de `lib/axios.ts` (30 000) no cambia.
- **CA-2.5** Validación en la frontera (respuesta de API = input no confiable) de los **4 campos** de `SessionUser`: 200 solo es `authenticated` si el body es objeto no nulo con `id` string no vacío, `displayName` string, `avatarUrl` string|null y `email` string|null; cualquier otro body → `{ status: "unreachable" }`. Tests: body `null`, `{}`, `{ id: 1 }`, `id: ""`, falta `avatarUrl`, y un body válido con `avatarUrl`/`email` `null`.
- **CA-2.6** `fetchMe` no cambia de firma ni de comportamiento: caracterización (200 → user; 401 → `null`; red → `null`) escrita y verde **antes** de agregar `fetchMeStatus`, y verde después. `login-contract.test.ts:18` verde sin tocarse.

### CA-3 — Store e hidratación

- **CA-3.1** `stores/auth-session.ts` agrega `sessionStatus` (inicial `"unknown"`) sin quitar `user`, `hydrated`, `setUser`, `setHydrated`, `clear` (15 callers + tests DOM que hacen `setState({ user, hydrated })` siguen compilando y verdes sin modificarse).
- **CA-3.2** Invariantes del store, verificados por test exhaustivo sobre el espacio finito (4 estados × cada acción pública, incluida `clear`): `sessionStatus === "authenticated"` ⇔ `user !== null`; `hydrated === true` ⇔ `sessionStatus !== "unknown"`. (Sustituye a property-based: dominio finito enumerable; sin dependencia nueva.)
- **CA-3.3** `clear()` (lo llama `ShellAccount` al salir) deja `user = null` **y** `sessionStatus = "anonymous"`; test: tras `clear()` en `/mis-rutas`, `RequireSession` muestra la pantalla de login sin recargar.
- **CA-3.4** Hidratación (tests de comportamiento del hydrator montado, con `fetchMeStatus` mockeado):
  - demo habilitada (D1) → `authenticated` con fixture, `fetchMeStatus` 0 llamadas;
  - `authenticated` → store `authenticated` + `clearSignedOut()` llamado;
  - `anonymous` → store `anonymous`, `user null`;
  - `unreachable` → store `unreachable`, `user null`;
  - con `cq_signed_out = "1"` y demo habilitada → **no** usa el fixture, llama `fetchMeStatus` (comportamiento actual preservado);
  - con `cq_signed_out = "1"` y lectura `unreachable` → store `unreachable` (no se disfraza de `anonymous`).
  - En todos los casos el store termina con `hydrated === true`.
- **CA-3.5** Cancelación (concurrencia de montaje — StrictMode monta dos veces en dev): si el componente se desmonta antes de que resuelva la lectura, el store **no** se escribe (test: resolver la promesa tras `unmount` → `sessionStatus` sigue `"unknown"`).
- **CA-3.6** Re-hidratación: existe una acción del store (nombre en design) que vuelve `sessionStatus` a `"unknown"` y dispara una nueva lectura; una lectura vieja que resuelve después de iniciada la nueva no pisa el resultado de la nueva (test con dos promesas resueltas en orden inverso → gana la última iniciada).
- **CA-3.7** Caracterización previa del hydrator (antes de tocarlo): demo en dev → fixture sin red; signedOut → `fetchMe`; siempre `setHydrated(true)`. Verde contra el código actual (con la variable de demo seteada, dado que CA-1 cambia el default).

### CA-4 — `RequireSession` y layouts

- **CA-4.1** `sessionStatus === "unknown"` → estado de carga accesible (`role="status"`, texto "Verificando tu sesión…") y **`children` no se montan** (test: componente hijo espía con contador de render = 0). Es también el HTML de SSR (sin mismatch de hidratación: no lee `window` en esta rama).
- **CA-4.2** `anonymous` → pantalla de login: `<img src={BRAND_ASSETS.deviLaptop} alt="" width height>` con `width/height` proporcionales al viewBox 267.11×296.16 (±1 px); `h1` exactamente "Iniciá sesión para ver y armar tus rutas"; texto exactamente "Tus rutas se guardan en tu cuenta de DevTalles. Entrá con Discord para seguir."; link "Entrar" (`SignInLink`) cuyo `href === discordStartUrl(returnTo)`. `children` no montan.
- **CA-4.3** `returnTo` = `window.location.pathname + window.location.search` leídos al renderizar la rama `anonymous` (sin `useSearchParams` → sin `<Suspense>` extra en build). Tests: `/mis-rutas` → `discordStartUrl("/mis-rutas")`; `/configurador-de-ruta?panel=form&path=programas-react` → `discordStartUrl("/configurador-de-ruta?panel=form&path=programas-react")`; el `hash` (`#cq_session=…`) **nunca** entra en `returnTo`.
- **CA-4.4** Seguridad de `returnTo` (input controlado por el usuario vía URL): pathname `//evil.example` → el `href` resultante apunta a `returnTo` relativo `/` (lo garantiza `loginReturnTarget`; test lo fija sobre el `href` final, no sobre el helper).
- **CA-4.5** `unreachable` → `role="alert"`, DEVI (mismo asset), `h1` exactamente "No pudimos conectar con el servidor", texto exactamente "Probá de nuevo en unos segundos.", botón "Reintentar". Clic → re-hidratación por acción del store (CA-3.6): se ve "Verificando tu sesión…" (`role="status"`), el botón deja de existir mientras está en `unknown` (no hay doble disparo posible) y `fetchMeStatus` pasa a exactamente 2 llamadas. Si la segunda lectura da `authenticated` → se montan `children` (recovery testeado); si da `anonymous` → pantalla de login.
- **CA-4.6** `authenticated` → renderiza `children` tal cual, sin wrapper visual extra.
- **CA-4.7** Ningún estado distinto de `authenticated` contiene "Armá tu ruta", "Arma tu ruta" ni "No pudimos cargar tus rutas" (test por estado sobre `textContent`), y no se dispara `loadMyRoutes` (el hijo no monta).
- **CA-4.8** `app/(producto)/mis-rutas/layout.tsx` y `app/(producto)/configurador-de-ruta/layout.tsx` existen, **no** tienen `"use client"`, y su default export envuelve `children` en `RequireSession` (test estático). `(producto)/layout.tsx`, `(producto)/page.tsx` y `docs/mcp/page.tsx` no importan `RequireSession` (landing y docs siguen públicas).
- **CA-4.9** Los tests estáticos de pages siguen verdes sin modificarse: `configurator-page.static.test.ts`, `copy-voice.static.test.ts` (salvo la ruta de D4), `configurator-layout.static.test.ts`, `access.characterization.test.tsx` (el dashboard sigue sin leer `useAuthStore`).
- **CA-4.10** Estilos en `RequireSession.module.css` solo con tokens / `color-mix` sobre token, salvo `font-size`: el proyecto no tiene tokens tipográficos, así que se usan **solo literales `rem` ya presentes en el CSS existente** (sin valores nuevos ni tokens nuevos); el archivo se agrega a la lista de `tokens.static.test.ts`. DEVI solo como `<img>` (nunca inline). Foco visible en "Entrar" y "Reintentar". `RequireSession.tsx` se agrega a `LIVE_COPY_FILES` de `copy-voice.static.test.ts` y pasa voseo / sin `//`.
- **CA-4.11** Gate de Lenguaje visual de `sdd-verify`: captura en 375 y 1280 px de los estados `anonymous` y `unreachable` sobre `/mis-rutas`; el componente extiende el sistema Orbital existente (mismo patrón visual que `LearningPathsEmptyState`).

### CA-5 — Marca

- **CA-5.1** `frontend/public/devtalles-brand/devi-laptop.svg` es copia byte a byte de `DEVTALLES-PAQUETES DE ELEMENTOS/SVG/DEVI LAPTOP BORDER.svg` (16 065 B); `verify` compara sha256 origen/destino por comando (origen fuera del repo).
- **CA-5.2** `BRAND_ASSETS.deviLaptop === "/devtalles-brand/devi-laptop.svg"`; `brand-assets.test.ts` (existencia, inercia, fuente única) verde y cubre el asset nuevo sin excepciones.

### CA-6 — Fix TS2352 (`local-session.ts`)

- **CA-6.1** Firmas: `captureLocalSessionFromLocation(location: Pick<Location, "hash" | "pathname" | "search">, storage: Pick<Storage, "setItem">, replace)`, `readLocalSessionToken(storage: Pick<Storage, "getItem"> | undefined)`, `clearLocalSessionToken(storage: Pick<Storage, "removeItem"> | undefined)`. Cuerpos sin cambios.
- **CA-6.2** `local-session.test.ts` sin ningún `as` (grep `/\bas\s+(Location|Storage|unknown|any)\b/` = 0) ni `any`. Los fakes pasan inline **solo** los miembros de la firma estrechada (evita el error de propiedad excedente y conserva el tipado contextual de los parámetros).
- **CA-6.3** Casos borde nuevos: hash sin `cq_session` → no llama `setItem` ni `replace`; hash con otros params (`#cq_session=x&tab=2`) → `replace` con `…#tab=2`; `readLocalSessionToken(undefined)` → `null`; `clearLocalSessionToken` llama `removeItem("cq_session_token")`.
- **CA-6.4** Callers (`AuthSessionHydrator`, `lib/api-auth-policy.ts`, `logoutSession`) compilan sin cambios de código.

### CA-7 — `SignInLink` movido

- **CA-7.1** `features/auth/components/SignInLink.tsx` + `.module.css` existen con el mismo contenido; `features/learning-paths/components/SignInLink.*` no existen; `LearningPathsDashboard` y `MyRouteStatus` importan del path nuevo; sus tests (`LearningPathsDashboard.test.tsx`, `MyRouteStatus.test.tsx`, `routes-dom`) verdes sin modificarse.

### CA-8 — Suite y build

- **CA-8.1** `cd frontend && npx tsc --noEmit` → 0 errores.
- **CA-8.2** `npm --prefix frontend test` verde.
- **CA-8.3** `cd frontend && npm run build` verde (regenera `.next/types` con los 2 layouts nuevos; `/configurador-de-ruta` sigue compilando como ruta dinámica).
- **CA-8.4** `node .cursor/scripts/sdd/verify-receipt.mjs` emite recibo con `typecheck`, `unit`, `sdd-self-test` verdes. Rojo o sin correr = no hecho.

## Disposición de flujos conectados

| Flujo (explore) | Disposición | Evidencia / cobertura |
|---|---|---|
| `demo-session.ts` | EN SCOPE | CA-1.x; assert reescrito (§Tests). |
| `AuthSessionHydrator` | EN SCOPE | Caracterización CA-3.7 antes; CA-3.4–3.6 después. |
| `fetchMe` | EN SCOPE (se preserva) | Caracterización CA-2.6; `fetchMeStatus` nuevo CA-2.1–2.5. |
| `local-session.ts` | EN SCOPE | CA-6.x. |
| `api-auth-policy.ts` | EN SCOPE (solo tipo del argumento, sin editar) | `tsc` (CA-8.1) + tests existentes de `test/src/lib/` verdes. |
| `logoutSession` / `ShellAccount` → `markSignedOut` + `clear` | EN SCOPE (efecto de `clear`) | CA-3.3; `ShellAccount.test.tsx` verde sin modificarse. |
| `AuthenticatedEntry` (`/login`, `/registro`) | FUERA DE SCOPE / no afectado | Lee `user`/`hydrated`, que conservan semántica (CA-3.1/3.2: `hydrated` sigue pasando a `true` al terminar). `login.test.tsx`, `login-contract.test.ts` verdes. En dev deja de rebotar a `/` (efecto buscado de #1503). |
| `HomeAuthStatus`, `MissionRadarLive` | FUERA DE SCOPE / no afectado | Solo leen `user`/`hydrated`; `home-auth-status.test.tsx` verde. |
| `LearningPathsDashboard` | EN SCOPE (solo import, D4) | Tests existentes verdes sin modificarse; queda detrás del gate, 401 como respaldo. |
| `MyRouteStatus` | EN SCOPE (solo import, D4) | Ídem. |
| `UserRouteDiagram` | FUERA DE SCOPE / no afectado | No se edita; queda detrás del gate del layout `mis-rutas`. Hueco 401 → D-5. |
| Pages mock (`ReplanningProposal`, `GithubPreview`, `TypescriptCheckpoint`, `AssessmentResults`) | FUERA DE SCOPE / no afectado | No se editan; quedan detrás del gate. Tests fase-4/5/6 renderizan los componentes directos (no los layouts) → verdes. |
| Pages `(producto)/mis-rutas/page.tsx`, `configurador-de-ruta/page.tsx` | FUERA DE SCOPE / no afectado | El gate va en `layout.tsx` hermano; pages sin cambios (CA-4.9). |
| `(producto)/layout.tsx` + `MissionShell` | FUERA DE SCOPE / no afectado | No se toca (CA-4.8); `foundation.test.ts`, `dom.test.tsx` verdes. |
| `access.characterization.test.tsx` | Restricción respetada | El gate no entra al dashboard (CA-4.9). |
| `BRAND_ASSETS` + `public/devtalles-brand/` | EN SCOPE | CA-5.x. |
| `RequireSession` (nuevo) | EN SCOPE | CA-4.x. |
| `GET /api/auth/me`, `SessionAuthGuard` (backend) | FUERA DE SCOPE / no afectado | Ningún path `backend/**`; se consume el 401/200 tal cual. |

## Tests

### Niveles (constitución → Testing)

| Flujo | Nivel | Tests exigidos |
|---|---|---|
| `fetchMeStatus` (clasificación de sesión) | **3** (auth) | CA-2.1–2.5: 200, 401, 403, red, timeout, 500, 503, 404, bodies inválidos, config de timeout |
| Hidratación + store | **3** (auth) | CA-3.x: 6 ramas, invariantes, cancelación, re-hidratación con carrera, recovery `unreachable → authenticated` |
| `RequireSession` | **3** (decide qué ve un usuario sin sesión) | CA-4.1–4.7: 4 estados, hijos no montan, `returnTo` con query, `returnTo` hostil, retry + recovery |
| Demo opt-in | 2 | matriz CA-1.1 + lector CA-1.2/1.3 |
| `local-session` | 2 | CA-6.3 |
| Layouts, marca, move de `SignInLink` | 1 | estáticos CA-4.8, CA-5.2, CA-7.1 |

**Recovery de fallo parcial (nivel 3):** `unreachable → Reintentar → authenticated` monta los hijos (CA-4.5); lectura vieja no pisa la nueva (CA-3.6); desmontaje a mitad no escribe (CA-3.5).

**Segundo eje (camino crítico):**
- *Concurrencia*: **presente** (doble montaje StrictMode, reintento con lectura en vuelo) → CA-3.5 y CA-3.6. No hay BD: la "clave compartida" es el store; test sobre el store real (zustand), no mock.
- *Cruza un contrato*: **presente** (shape `SessionUser` de `/api/auth/me`) → sin artefacto compartido: **deuda D-3**. Mitigación: validación mínima CA-2.5.
- *Depende del tiempo*: **presente** (timeout 8 000 ms) → CA-2.4 fija la config y CA-2.3 clasifica el error de timeout; sin esperas reales ni `Date.now()` en la lógica. No hay TTL/expiry en el cliente.
- *Muta invariante de estado*: **presente** (coherencia `sessionStatus`/`user`/`hydrated`) → CA-3.2 exhaustivo sobre dominio finito.
- *Dinero*: ausente.

**Mutation testing:** Stryker no está configurado en `frontend/` → `verify` ofrece configurarlo UNA vez sobre `auth.service.ts`, `demo-session.ts` y `RequireSession.tsx`, sin bloquear.

**Seguridad situacional:** sin endpoints nuevos → no aplica IDOR/BFLA. Timeout explícito en llamada a servicio: CA-2.4. Validación de respuesta externa: CA-2.5. Open redirect en `returnTo`: CA-4.4. El gate no es frontera de confianza: el backend sigue devolviendo 401 en cada endpoint (sin cambio).

**Orden en `apply`:** (1) CA-6 (TS2352) aislado; (2) caracterización de `fetchMe` (CA-2.6) y del hydrator (CA-3.7) en verde contra el código actual; (3) CA-1; (4) CA-2, CA-3; (5) CA-5, CA-7; (6) CA-4.

### Asserts que se reescriben (con el porqué)

| Test:línea | Hoy | Pasa a | Por qué |
|---|---|---|---|
| `fase-2/demo-session.test.ts:9` (nombre) | "enables the fixture for every development session…" | "enables the fixture only with explicit opt-in in development…" | El nombre describe el bug #1503. |
| `fase-2/demo-session.test.ts:10-15` | `development + undefined → true` | `→ false`, dentro de la matriz CA-1.1 | Codifica el bug: contradice ADR 0001 ("valor explícito") y `ui-stitch-orbital` CA-6. Se reemplaza por la aserción correcta, no se borra. |
| `local-session.test.ts:9-23` | fakes con `as Location` / `as Storage` | fakes inline con solo los miembros de la firma, sin casts | TS2352 (build rojo). Mismos asserts de comportamiento (`readLocalSessionToken` → `"abc.def"`, `replace` → `"/configurador-de-ruta"`). |
| `fase-0/auth.characterization.test.ts:20-22` y `fase-2/auth-session-hydrator.test.ts` (`toContain("fetchMe")`, `"resolveOrbitalSession"`, `"setHydrated(true)"`) | strings del hydrator actual | Solo si design cambia esos nombres: se reemplazan por el símbolo que el hydrator efectivamente llama, con límite de palabra (`/\bfetchMeStatus\b/`, no `toContain("fetchMe")`, que pasaría vacío por substring). Prohibido borrarlos. | Son guardas de frontera por nombre; la guarda de comportamiento real pasa a CA-3.4. |
| `copy-voice.static.test.ts:24` | `src/features/learning-paths/components/SignInLink.tsx` | `src/features/auth/components/SignInLink.tsx` + se agrega `RequireSession.tsx` | D4 (move) + extensión de cobertura (CA-4.10). |
| `tokens.static.test.ts` (lista de CSS) | sin `RequireSession.module.css`; ruta vieja de `SignInLink.module.css` si estuviera listada | se agrega / se actualiza la ruta | Extensión (CA-4.10) y D4. |

Tests que **no** se modifican y deben seguir verdes: `demo-session.test.ts:30-69`, `login-contract.test.ts`, `login.test.tsx`, `ShellAccount.test.tsx`, `home-auth-status.test.tsx`, `LearningPathsDashboard.test.tsx`, `MyRouteStatus.test.tsx`, `routes-dom`, `assessment-dom`, `replanning-dom`, `fase-0/dom.test.tsx`, `access.characterization.test.tsx`, `configurator-page.static.test.ts`, `configurator-layout.static.test.ts`, `brand-assets.test.ts`, `api-auth-policy.test.ts`.

### Tests nuevos

- `test/src/features/auth/api/auth.service.test.ts` — caracterización `fetchMe` + `fetchMeStatus` (CA-2).
- `test/src/features/auth/components/AuthSessionHydrator.test.tsx` — caracterización previa + CA-3.4–3.6.
- `test/src/stores/auth-session.test.ts` — invariantes CA-3.2, `clear` CA-3.3.
- `test/src/features/auth/components/RequireSession.test.tsx` — CA-4.1–4.7.
- Estático de layouts (CA-4.8) en archivo del ciclo bajo `test/src/auth-gate-rutas/`.
- Matriz CA-1.1 en `demo-session.test.ts`; casos CA-6.3 en `local-session.test.ts`.

## Requisitos no funcionales

- **Timeout de lectura de `/me` = 8 000 ms.** Costo: 1 request por carga de app (sin cambio de volumen); con backend caído, el usuario espera ≤ 8 s en "Verificando tu sesión…" (hoy 30 s) y ve "No pudimos conectar". ¿Qué decisión se rompe si el dato llega más tarde? Ninguna de negocio: solo la espera percibida. Riesgo del valor más corto: un backend con arranque en frío > 8 s daría `unreachable` falso en la primera carga → mitigado por Reintentar manual (sin retry automático). Supuesto no verificado: latencia de arranque en frío del backend en el hosting real (`topology.md` no se consultó para este dato; frontend-only). Ajustable en el checkpoint.

## Supuestos declarados

- El backend responde 401 (no 403, no redirect) a `/api/auth/me` sin sesión (`SessionAuthGuard`, según explore; no se levantó el backend). 403 se trata igual por robustez.
- `window.location` es la fuente del `returnTo`: la rama `anonymous` solo se renderiza en cliente tras hidratar, por lo que no hay acceso a `window` en SSR.
- Next 16.3.5 con los parches mensuales vigentes: no verificado (sin changelog local).
- El `metadata.title` de las pages ("Armá tu ruta", etc.) sigue visible en la pestaña sin sesión: es metadata del Server Component, no contenido; se acepta.

## Deuda explícita aceptada

- **D-1** SSE `/api/me/learning-paths/events` y WS `/live` sin Bearer en localhost (heredada). El gate mitiga en `/mis-rutas` y `/configurador-de-ruta` (los componentes no montan sin sesión); `LivePathModal` global no.
- **D-2** Gate `sdd.paths.json` con globs `src/**` anclados: no dispara para `frontend/src/**` → este cambio de auth **no** queda bloqueado por el gate de spec en pre-commit (heredada D-4). Solo protege el recibo (`typecheck`/`unit`).
- **D-3** Contrato `SessionUser` (y shape de error) sin artefacto compartido front↔back: si el backend cambia `/api/auth/me`, ninguna suite lo ve (mitigación parcial CA-2.5).
- **D-4** Timeout general de axios en 30 s para el resto de las requests (`lib/axios.ts:10`).
- **D-5** `UserRouteDiagram` sin estado 401: token vencido → "No pudimos cargar el diagrama".
- **D-6** Licencia de uso de DEVI (terceros, sin licencia declarada) — heredada.
- **D-7** Stryker no configurado: mutation testing del nivel 3 queda ofrecido, no ejecutado, hasta que el dev lo acepte.
- **D-8** Working tree con 88 entradas de ciclos previos sin commitear; el diff de este ciclo no se aísla hasta ejecutar D7.

## Decisiones del checkpoint (aceptadas por el dev)

- Timeout de lectura de `/me` = 8 000 ms.
- Demo con `"true"` o `"1"`, siempre con `NODE_ENV === "development"` obligatorio (D1).
- Salir + backend caído → `unreachable` → "No pudimos conectar con el servidor" (CA-3.4).
- Validación de los 4 campos de `SessionUser` (CA-2.5 ampliado según design).
- Re-hidratación por acción del store (CA-3.6).
- Durante el reintento se ve "Verificando tu sesión…" y el botón desaparece (CA-4.5).
- `font-size` con literales `rem` existentes, sin tokens nuevos (CA-4.10); tokens tipográficos quedan fuera de este ciclo.
- Copy de CA-4.2 y CA-4.5 fijado literalmente.

## Checkpoint

🔔 El dev revisa y aprueba esta spec antes de `design`. Sella con `node .cursor/scripts/sdd/sdd-gate.mjs approve specs/auth-gate-rutas`.

📚 Referencias cargadas: `CodeQuest-2026/specs/auth-gate-rutas/explore.md`, `.cursor/rules/constitution-fases.mdc`, `.cursor/rules/constitution-codigo.mdc`, `.cursor/sdd.readproof.json`, `CodeQuest-2026/specs/ui-rutas-y-marca/spec.md` (formato y estados 401 de respaldo), `CodeQuest-2026/decisions/0001-ui-stitch-orbital.md`, `CodeQuest-2026/specs/ui-stitch-orbital/spec.md` (CA-6 matriz demo), código leído: `demo-session.ts`, `auth.service.ts`, `AuthSessionHydrator.tsx`, `stores/auth-session.ts`, `local-session.ts`, `SignInLink.tsx`, `lib/axios.ts`, `lib/api-auth-policy.ts`, `config/brand-assets.ts`, `demo-session.test.ts`, `local-session.test.ts`, `auth-session-hydrator.test.ts`, `axios/index.d.ts` (`timeout?` por request verificado).

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
Lectura: .cursor/rules/constitution-fases.mdc e3160314

Aprobado por dev: 2026-09-27 sha256:a802e4f1f5e5
