# Explore — `auth-gate-rutas`

> Fase `sdd-explore`. Fecha: 2026-09-27. App: `CodeQuest-2026/frontend` (Next 16.3.5 App Router, React 19.3, zustand 5, vitest 3).
> Pedido: toda la zona de rutas exige sesión; sin sesión se ve una pantalla "iniciá sesión" con DEVI (SVG del paquete DevTalles) y un botón **Entrar**, en lugar de "Armá tu ruta" / "No pudimos cargar tus rutas". Además: arreglar el TS2352 que rompe `next build`.
> Base: ciclo `specs/ui-rutas-y-marca/` cerrado sin commit (archive.md, spec.md leídos).

## Memoria previa consultada

- **#1503 "Login vacío en dev: sesión demo siempre activa"** → CONFIRMADA contra el repo. `isOrbitalDemoSessionEnabled` (`frontend/src/features/auth/lib/demo-session.ts:11-18`) devuelve `environment.nodeEnv === "development"` e ignora `demoSession`. El dev ya aprobó el fix `nodeEnv === "development" && demoSession === "true"` para "una sesión SDD de auth aparte" → es ESTE ciclo. Sin ese fix el gate de este pedido no sirve en `next dev` (siempre hay usuario fixture).
- **#1490 "Frontend mock-only sin backend"** → CONTRADICHA por el repo (gana el repo; marcar para `mem_review`). Decía que el hydrator ya no llama `fetchMe`; hoy `AuthSessionHydrator.tsx:28-30` sí llama `fetchMe` (fuera de dev, o tras "Salir"). Lo único vigente: en dev el fixture evita la red.
- `mem_search "demo session auth hydrator orbital"` → solo #1490 (y #1503 por id, citada por el dev).

## Resumen de hallazgos (TL;DR)

1. **El TS2352 NO es el cast `as Location`**: `tsc --noEmit` reporta `local-session.test.ts(14,7)`, que es el cast `} as Storage` (línea 14; `as Location` es la línea 13 y compila). El fake `{ getItem, setItem, removeItem }` no tiene `length/clear/key` y su `setItem` devuelve `Map`. Estrechar solo `Location` **no arregla el build**. Hay que estrechar también `Storage`. Es el único error de `tsc` del frontend (incluye `.next/types/**`).
2. **Dónde va el gate**: `layout.tsx` nuevo en `app/(producto)/mis-rutas/` y en `app/(producto)/configurador-de-ruta/` (cubren todas las subrutas) que envuelvan `children` con un componente cliente `RequireSession`. NO en `(producto)/layout.tsx` (protegería la landing `/` y `/docs/mcp`, que son públicas) y NO dentro de `LearningPathsDashboard` (lo prohíbe `access.characterization.test.tsx:38`).
3. **Fix de demo-session** rompe 2 tests de `demo-session.test.ts` (líneas 9-28 y 30-45), que hoy codifican el bug y contradicen la spec original `ui-stitch-orbital/spec.md:56,161` (exigía `"true"` explícito). Además `decisions/0001-ui-stitch-orbital.md:15` documenta `=1`, no `=true` → decisión para spec.
4. **`fetchMe` traga todo error como `null`**: backend caído o 5xx ⇒ `user = null` ⇒ con el gate se mostraría "iniciá sesión" aunque el problema sea de red (y con el timeout de axios de 30 s, 30 s de carga antes). Choca con la separación 401 vs. red que acaba de cerrar `ui-rutas-y-marca` (CA-1.2). Decisión para spec.
5. **Reversión de una regla de la spec anterior**: `ui-rutas-y-marca/spec.md:73` prohibió derivar "sin sesión" de `useAuthStore.user` (por #1503). Este pedido lo hace a propósito; solo es válido si entra el fix de demo-session en el mismo ciclo. Los estados 401 de esa spec quedan como respaldo (token vencido).
6. **SVG**: `DEVI LAPTOP BORDER.svg` (16 065 B, viewBox 267.11×296.16) es inerte (0 `<script`, `on*=`, `href=`, `url(`, `<image`, `foreignObject`) y tiene silueta blanca (`.cls-9 #fff`) que le da contraste sobre `--orbital-cosmos #09081c`. La versión sin BORDER tiene contorno `#0a0613` que desaparece en el fondo oscuro. Hay que vendorizarlo como `public/devtalles-brand/devi-laptop.svg` y sumarlo a `BRAND_ASSETS`.
7. **Git/gate**: rama `main`, HEAD `0d1a541`, 88 entradas sucias (58 M, 30 ??) mezclando 3 ciclos. Hooks activos (`core.hooksPath=.cursor/githooks` dentro de `CodeQuest-2026/`). El pre-commit exige recibo `.sdd/receipt.json` con gate `typecheck` verde → **hoy ningún commit pasa sin `--no-verify`** hasta arreglar el TS2352. Presupuesto de 400 líneas por commit. El gate de spec no dispara para `frontend/src/**` (globs anclados a `src/**`, deuda D-4).

## Framework y runtime

- **Next.js 16.3.5** (`frontend/package.json`) → 16.x Active LTS según `nextjs-reference/references/versiones-seguridad.md:8` → en soporte (no sube riesgo). Verificar en spec que 16.3.5 incluya los parches mensuales vigentes (no verificado: no hay changelog local).
- **Runtime**: self-hosted, `frontend/Dockerfile` presente (no Vercel). `NEXT_PUBLIC_*` se hornea en build; en la imagen `NODE_ENV=production` ⇒ la demo queda apagada en prod con o sin el fix.
- No Angular, no Nest en el frontend. Backend Nest existe en `backend/` pero no se toca.

## Patrón existente (seguir ESTE)

- **Hidratación**: `app/providers.tsx:8` monta `<AuthSessionHydrator />` global → `useEffect` resuelve usuario y hace `setUser(...)` + `setHydrated(true)` en `stores/auth-session.ts` (zustand: `user`, `hydrated`, `setUser`, `setHydrated`, `clear`).
- **Gate cliente ya existente del mismo estilo**: `features/auth/components/AuthenticatedEntry.tsx:17-29` — lee `user`/`hydrated` del store; `!hydrated → null`; `user → router.replace`; sino `<LoginPanel>`. `ShellAccount.tsx:42-51` y `HomeAuthStatus.tsx` usan el mismo par `hydrated`/`user`. `RequireSession` debe replicar esa lectura (dos selectores del store), no inventar otra fuente.
- **Botón Entrar a Discord ya existente**: `features/learning-paths/components/SignInLink.tsx` (`<a href={discordStartUrl(returnTo)}>Entrar</a>`), usado por `LearningPathsDashboard` y `MyRouteStatus` en el estado 401. Reusar; vive en `learning-paths` → si `RequireSession` vive en `features/auth`, importaría de otra feature (decidir en design: moverlo o importar).
- **Marca**: `config/brand-assets.ts` es la única fuente de `/devtalles-brand/` (test `brand-assets.test.ts:31-39`); uso siempre como `<img>` con `width`/`height` (spec anterior CA-5.5). DEVI ya se usa en `LearningPathsEmptyState`.
- **Pages**: Server Components que exportan `metadata` y renderizan un componente cliente. `configurador-de-ruta/page.tsx` es async y lee `searchParams` (test estático `configurator-page.static.test.ts` exige que no tenga `"use client"`). Por eso el gate va en un layout/wrapper, no convirtiendo pages a cliente.

## Pantallas a proteger (evidencia)

| URL | Page | Componente | ¿Datos del usuario? |
|---|---|---|---|
| `/mis-rutas` | `(producto)/mis-rutas/page.tsx` | `LearningPathsDashboard` (API real `loadMyRoutes`) | sí |
| `/mis-rutas/[routeId]` | `mis-rutas/[routeId]/page.tsx` | `UserRouteDiagram` (API `loadPathDetail`; catch → "No pudimos cargar el diagrama", sin estado 401) | sí |
| `/mis-rutas/[routeId]/replanificacion` | idem | `ReplanningProposal` (mock) | ruta del usuario (mock) |
| `/mis-rutas/[routeId]/github` | idem | `GithubPreview` (mock) | ídem |
| `/mis-rutas/[routeId]/checkpoints/typescript` | idem | `TypescriptCheckpoint` (mock) | ídem |
| `/configurador-de-ruta` | `configurador-de-ruta/page.tsx` | `MyRouteStatus` (API `loadMyRoutes`, `createOfficialRoute`, WS) | sí |
| `/configurador-de-ruta/resultados` | `…/resultados/page.tsx` | `AssessmentResults` (mock `getAssessment("anonymous")`) | diagnóstico (mock) |
| `/` (landing), `/docs/mcp` | `(producto)/page.tsx`, `docs/mcp/page.tsx` | — | **no: públicas** |
| `/login`, `/registro`, `/auth/error` | `(acceso)/**` | `AuthenticatedEntry` | no: acceso |

Dos layouts (`mis-rutas/layout.tsx`, `configurador-de-ruta/layout.tsx`) cubren las 7 URLs protegidas sin mover archivos. Mover pages a un grupo `(producto)/(privado)/` rompería rutas hardcodeadas en tests estáticos (`copy-voice.static.test.ts:25-26`, `configurator-page.static.test.ts:6`, `tokens.static.test.ts:70`, `configurator-layout.static.test.ts:19`) → descartado por costo.

Observaciones para design (no decisiones):
- Con el gate en layout, los componentes cliente no montan sin usuario ⇒ no se dispara `loadMyRoutes` ni el WS/SSE sin sesión (mitiga parcialmente D-2 en estas pantallas).
- En SSR `hydrated=false` ⇒ el HTML inicial de las rutas protegidas es el estado de carga; el contenido aparece tras hidratar. `metadata` sigue saliendo del page (Server).
- `returnTo` del botón: `usePathname()` da el path; la query (`?panel=form&path=…` del deep link) se perdería. `useSearchParams` en un client component bajo layout obliga a `<Suspense>` en build. Alternativa: leer `window.location` al construir el href en cliente (el login solo se renderiza tras hidratar).
- `LivePathModal` vive en `MissionShell` (global) → no queda detrás del gate; fuera de este pedido.

## Hidratación de sesión — qué rompe el fix de demo opt-in

Estado actual (`AuthSessionHydrator.tsx:18-39`):
1. `captureLocalSessionFromLocation(window.location, sessionStorage, …)` guarda el token `#cq_session=` en `sessionStorage`.
2. `readSignedOut()` ? `fetchMe()` : `resolveOrbitalSession(env, fetchMe)` → en `development` devuelve `orbitalDemoSessionFixture` sin red.
3. `setUser(readSignedOut() ? null : user)`; `setHydrated(true)`.
- `fetchMe` (`auth.service.ts:7-14`): `GET /api/auth/me`; **cualquier** error → `null`.

Si `isOrbitalDemoSessionEnabled` pasa a `nodeEnv === "development" && demoSession === "true"`:

| Consumidor | Efecto | ¿Rompe test? |
|---|---|---|
| `demo-session.test.ts:9-28` | `development + undefined` esperaba `true` | **sí** (assert codifica el bug; se declara en spec antes de tocarlo, constitución → Anti-invención) |
| `demo-session.test.ts:30-45` | usa `demoSession: "1"` en dev esperando fixture | **sí** (con `"true"` estricto devuelve `readSession`) — o cambiar el fixture a `"true"`, o aceptar `"1"` también (decisión: ADR 0001 dice `=1`) |
| `demo-session.test.ts:47-56, 58-69` | production / `sessionAfterSignOut` | no |
| `OrbitalDemoBanner.tsx:5` | huérfano (ninguna ruta lo renderiza); cambia en coherencia | no hay test de render |
| `fase-0/dom.test.tsx:57-60` | stubea `NEXT_PUBLIC_ORBITAL_DEMO_SESSION="1"` y asserta que NO hay banner (MissionShell no lo monta) | no |
| `fase-2/auth-session-hydrator.test.ts`, `fase-0/auth.characterization.test.ts:20` | solo buscan strings `resolveOrbitalSession`, `fetchMe`, `setHydrated(true)` en el source | no, mientras el hydrator conserve esas llamadas |
| Tests DOM que setean el store a mano (`routes-dom`, `assessment-dom`, `replanning-dom`, `ShellAccount.test`, `dom.test:121`) | no pasan por el hydrator | no |
| `frontend/.env` (claves: `PORT`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`) y `.env.example` | **ninguno define `NEXT_PUBLIC_ORBITAL_DEMO_SESSION`** ⇒ tras el fix, `next dev` llama `/api/auth/me` de verdad | — |
| Experiencia en dev sin backend | `fetchMe` espera el timeout de axios (30 s, archive O-obs) → 30 s de "cargando" → `user=null` → pantalla de login; `ShellAccount` y `HomeAuthStatus` pasan a "Entrar" | no hay test |

Si la spec quiere que el modo demo siga disponible, hay que agregar la variable (comentada) a `.env.example` para que sea descubrible.

## Fix TS2352 (propuesta, sin casts)

Error real (`npx tsc --noEmit`, único del proyecto):
```
test/src/features/auth/lib/local-session.test.ts(14,7): error TS2352: Conversion of type '{ getItem…; setItem: (key, value) => Map<string,string>; removeItem: (key) => boolean; }' to type 'Storage' … missing … length, clear, key
```
Propuesta (principio de mínima interfaz, sin casts ni `unknown`):
- `local-session.ts:3` → `captureLocalSessionFromLocation(location: Pick<Location, "hash" | "pathname" | "search">, storage: Pick<Storage, "setItem">, replace: …)`. Usa solo `location.hash/pathname/search` y `storage.setItem`.
- `local-session.ts:13` → `readLocalSessionToken(storage: Pick<Storage, "getItem"> | undefined)`.
- `local-session.ts:18` → `clearLocalSessionToken(storage: Pick<Storage, "removeItem"> | undefined)` (consistencia; no es necesario para el build).
- Test: quitar `as Location` (l.13), `as Storage` (l.14) y `as Storage` (l.23). Un `setItem` que devuelve `Map` es asignable a una firma que devuelve `void` en TS → compila sin cast.
- Callers (codegraph + grep): `AuthSessionHydrator.tsx:19` y `lib/api-auth-policy.ts:18,21` pasan `window.location` / `sessionStorage` (superconjuntos, asignables); `auth.service.ts:18` pasa `sessionStorage | undefined` a `clearLocalSessionToken`. Nadie más. Sin cambio de comportamiento.
- `.next/types/validator.ts` y `routes.d.ts` existen y están dentro del `include` de `tsconfig.json`; `tsc` no reporta nada ahí ⇒ tras el fix, `tsc` queda verde. Los dos layouts nuevos regeneran `.next/types` en el próximo build: correr `next build` completo en verify (no corrido en explore por costo, ~minutos en esta máquina).
- ⚠️ Codegraph marcó `local-session.ts` como "editado hace 3 ms" durante la exploración; el contenido leído es el original (33 líneas, firmas con `Location`/`Storage`). Si otro proceso lo está editando, revisar antes de apply.

## SVG candidato

| Archivo (paquete `DEVTALLES-PAQUETES DE ELEMENTOS/SVG/`) | Bytes | viewBox | Inerte | Fondo oscuro |
|---|---|---|---|---|
| `DEVI LAPTOP BORDER.svg` | 16 065 | 0 0 267.11 296.16 | sí (0 script/on*/href/url(/image/foreignObject) | silueta blanca `.cls-9 #fff` detrás de todo → contraste alto sobre `#09081c` |
| `DEVI LAPTOP.svg` | 14 744 | 0 0 247.17 276.16 | sí | contorno `#0a0613` ≈ fondo → se pierde |
| `DEVI HELLO BORDER.svg` | 18 046 | 0 0 292.5 310.69 | sí | ya vendorizado como `public/devtalles-brand/devi-hello.svg` (usado en el vacío de `/mis-rutas`) |

- Recomendación para spec: `DEVI LAPTOP BORDER` → `public/devtalles-brand/devi-laptop.svg` (nombre cumple `/^\/devtalles-brand\/[a-z-]+\.svg$/`, `brand-assets.test.ts:11`) + clave `deviLaptop` en `BRAND_ASSETS`. Lo distingue visualmente del vacío (que usa HELLO). Verify compara sha256 origen/destino (el origen está fuera del repo).
- Paleta: `#7105e2`, `#9013fe`, `#300a6f`, `#e8d2ff`, `#c4c4c4`, `#d8d8d8`, `#0a0613`, `#fff`. Usa `<style>` con clases `.cls-*` → **solo como `<img>`** (inline chocaría con otras clases y viola CA-5.5 previa). Decorativa → `alt=""`, el `h1/h2` de la pantalla da el mensaje.
- Licencia de uso sin declarar (deuda D-6 heredada).

## Propiedades del cambio

| Propiedad | Respuesta |
|---|---|
| **Reversible** | Sí. Solo frontend, sin migraciones ni datos; un revert deja todo como hoy. `sessionStorage` (`cq_session_token`, `cq_signed_out`) no cambia de formato. |
| **Quién consume** | Nadie externo. `GET /api/auth/me` y `/api/me/learning-paths` se consumen tal cual, sin cambiar request/response. Sin cambio de contrato de API. |
| **Cuándo corre** | Por interacción/navegación del usuario (efecto de hidratación al montar). Nada recurrente (sin cron, poll ni retry). |
| **Qué volumen** | No aplica: 1 request `/api/auth/me` por carga de app; no procesa colecciones. |
| **Dinero / auth / datos sensibles** | **Sí — auth**: cambia cuándo existe sesión en el cliente (demo-session), la hidratación y qué ve un usuario sin sesión. La autorización real sigue en el backend (`SessionAuthGuard` → 401); el gate es UX, no frontera de confianza. |
| **Infra** | No toca migraciones, esquema, Dockerfile ni arranque. Toca la configuración de env de dev (`NEXT_PUBLIC_ORBITAL_DEMO_SESSION`, opcional en `.env.example`) y desbloquea `next build`/`tsc`, que son gates del recibo. |

## Riesgo

**Tamaño**: mediano — ~2 layouts nuevos, 1 componente `RequireSession` (+ CSS), 1 asset + `brand-assets.ts`, `demo-session.ts` (1 línea), `local-session.ts` (3 firmas), tests (demo-session, local-session, RequireSession, brand-assets). Estimado 250-400 líneas con tests.

**Tipo**: feature nueva de bajo acoplamiento (wrapper) + intervención chica en legacy de auth (demo-session, local-session).

**Nivel: ALTO** — toca autenticación del cliente (política de sesión demo y quién ve qué sin sesión) aunque sean pocas líneas; además revierte una regla explícita de la spec anterior (`useAuthStore.user` como señal) y cambia la experiencia de todo `next dev`. Mitigantes: reversible con un revert, sin contrato externo ni datos, backend sigue siendo la frontera real. No es refactor de legacy → no exige plan escalonado de `propose`, pero conviene que el fix de demo-session y el TS2352 sean commits separados del gate (y previos a él).

## Blast radius (codegraph)

Salida de `codegraph_explore` (callers / impacto) por símbolo tocado:

- `isOrbitalDemoSessionEnabled` (`features/auth/lib/demo-session.ts:11`) — 4 callers: `resolveOrbitalSession` (mismo archivo), `OrbitalDemoBanner.tsx` (huérfano). Tests: `fase-2/demo-session.test.ts`.
- `resolveOrbitalSession` (`demo-session.ts:20`) — llamado por `AuthSessionHydrator`. Tests: `demo-session.test.ts`; strings en `auth-session-hydrator.test.ts`, `auth.characterization.test.ts`.
- `AuthSessionHydrator` (`features/auth/components/AuthSessionHydrator.tsx:14`) — 2 callers en `app/providers.tsx` (`ProveedoresApp`, montado en root layout). "no tests found within 3 caller hops" (solo tests estáticos de strings).
- `fetchMe` (`features/auth/api/auth.service.ts:7`) — 2 callers en `AuthSessionHydrator.tsx`. Sin tests.
- `captureLocalSessionFromLocation` (`features/auth/lib/local-session.ts:3`) — 5 callers en `AuthSessionHydrator.tsx`, `lib/api-auth-policy.ts` (interceptor de axios → todas las requests). Tests: `test/src/features/auth/lib/local-session.test.ts`.
- `readLocalSessionToken` / `clearLocalSessionToken` — `api-auth-policy.ts:21`, `auth.service.ts:18` (`logoutSession`). Tests: `local-session.test.ts` (read).
- `useAuthStore` (`stores/auth-session.ts:12`) — 15 callers (según `ui-rutas-y-marca/explore.md:28` + grep): `AuthSessionHydrator`, `AuthenticatedEntry`, `ShellAccount`, `HomeAuthStatus`, `MissionRadarLive` + tests DOM. El store **no cambia de forma**; `RequireSession` sería un consumidor nuevo.
- `MissionShell` (`features/orbital/components/MissionShell.tsx:19`) — 6 callers en `(producto)/layout.tsx`, `(acceso)/layout.tsx`. No se toca si el gate va en layouts de segmento.
- `LearningPathsDashboard`, `MyRouteStatus`, `UserRouteDiagram`, `AssessmentResults` — cada uno 1 page caller; no se modifican con el gate en layout. Tests: `LearningPathsDashboard.test.tsx`, `MyRouteStatus.test.tsx`, `fase-3/routes-dom.test.tsx`, `fase-4/assessment-dom.test.tsx`.
- `SignInLink` — renderizado por `LearningPathsDashboard` y `MyRouteStatus`; reuso previsto.
- `BRAND_ASSETS` — `MissionShell`, `LearningPathsEmptyState`; test `config/brand-assets.test.ts` (inercia + fuente única) aplica al asset nuevo.

## Flujos conectados

| Flujo conectado | ¿El cambio lo TOCA? | ¿Tiene test hoy? | Nivel actual / requerido |
|---|---|---|---|
| `demo-session.ts` (`isOrbitalDemoSessionEnabled`, `resolveOrbitalSession`) | **sí** — cambia la condición de sesión demo | sí (`demo-session.test.ts`) — codifica el bug | happy + bordes de entorno / 2 (+ matriz `NODE_ENV × valor`) |
| `AuthSessionHydrator` (hidratación → `useAuthStore`) | **sí** — su salida en dev cambia (fixture → `fetchMe`) | **no** (solo strings en source) | sin tests / 2 (auth): `hydrated` siempre termina `true`, signedOut, cancelación |
| `fetchMe` (`GET /api/auth/me`) | **sí** — pasa a ser la señal del gate; su `catch → null` confunde red y 401 | **no** | sin tests / 2 |
| `local-session.ts` (captura/lectura/borrado de token) | **sí** — firmas estrechadas (sin cambio de comportamiento) | sí (`local-session.test.ts`: captura + returnTarget) | happy / 2 (falta: sin token no toca storage ni replace; conserva otros params del hash) |
| `api-auth-policy.ts` (interceptor Bearer) | sí — caller de `captureLocalSessionFromLocation` (solo tipo) | parcial (`test/src/lib/` nuevo, no revisado en detalle) | — / 2 |
| `logoutSession` / `ShellAccount` → `markSignedOut` | no (misma API); en dev pasa a mostrar "Entrar" sin demo | sí (`ShellAccount.test.tsx`) | happy + salir / 2 |
| `AuthenticatedEntry` (`/login`, `/registro`) | no — mismo store; en dev deja de rebotar a `/` (arregla #1503) | parcial (`fase-2/login.test.tsx`, `login-contract.test.ts`) | happy / 2 |
| `HomeAuthStatus`, `MissionRadarLive` (landing) | no (lectura del store); en dev dejan de mostrar el fixture | `home-auth-status.test.tsx` (estático) | caracterización / 1 |
| `LearningPathsDashboard` (401/error/vacío) | no se modifica; queda detrás del gate, 401 como respaldo | sí (`LearningPathsDashboard.test.tsx`, `dom.test.tsx`, `routes-dom`) | 2 / 2 |
| `MyRouteStatus` (401/error/vacío/crear) | no se modifica; ídem | sí (`MyRouteStatus.test.tsx`) | 2 / 2 |
| `UserRouteDiagram` (`/mis-rutas/[routeId]`) | no se modifica; queda detrás del gate. Sin estado 401 (catch genérico) | parcial (`routes-dom`?) | happy / 2 — hueco: 401 cae en "No pudimos cargar el diagrama" |
| Pages mock (`ReplanningProposal`, `GithubPreview`, `TypescriptCheckpoint`, `AssessmentResults`) | no se modifican; quedan detrás del gate | sí (fase-4/5/6) | caracterización / 1 |
| Pages `(producto)` (`mis-rutas/page.tsx`, `configurador-de-ruta/page.tsx`) | no si el gate va en `layout.tsx` hermano; **sí** si se envuelve dentro del page (tests estáticos `configurator-page.static.test.ts`, `copy-voice.static.test.ts`) | sí (estáticos) | 1 / 1 |
| `(producto)/layout.tsx` + `MissionShell` | no (se descarta gatear ahí: landing y `/docs/mcp` son públicas) | sí (`foundation.test.ts:50`, `dom.test.tsx`) | — |
| `access.characterization.test.tsx` (prohíbe `useAuthStore`/`if (!user)` en `LearningPathsDashboard`/`RouteDetail`) | **restricción**: el gate NO puede ir dentro del dashboard | sí | — |
| `BRAND_ASSETS` + `public/devtalles-brand/` | **sí** — nuevo asset y clave | sí (`brand-assets.test.ts`) | 1 / 1 |
| `RequireSession` (nuevo) | nuevo | no existe | — / 2 (loading / sin usuario / con usuario / returnTo / no monta hijos sin usuario) |
| `GET /api/auth/me`, `SessionAuthGuard` (backend) | no | specs backend existentes | fuera de scope |

**Candidatos #1 a romperse en silencio**: `AuthSessionHydrator` y `fetchMe` — el cambio los toca (la señal del gate sale de ahí) y no tienen tests de comportamiento. Deben entrar con tests en este ciclo o quedar como 🛑 en spec.

## Estado de tests (escala de la constitución)

- `demo-session`: nivel 2 parcial; 2 asserts contradicen la spec original → reescritura declarada (no "relajar para que pase").
- `AuthSessionHydrator`: **sin tests** de comportamiento → hueco en flujo de auth (requerido ≥2). Deuda visible.
- `fetchMe`: **sin tests** → hueco (requerido 2: 200 → user, 401 → null, red → ?).
- `local-session`: happy path → hueco a nivel 2.
- `UserRouteDiagram`: sin distinción 401 → hueco funcional (la pantalla queda protegida por el gate, pero token vencido cae en error genérico).
- **Segundo eje** (auth es camino crítico según constitución, aunque aquí el cliente no es frontera de confianza):
  - *Depende del tiempo*: carrera entre hidratación y render (`hydrated=false` → loading) y timeout de axios 30 s con backend caído; sin test.
  - *Concurrencia*: `AuthSessionHydrator` usa flag `cancelled` en el cleanup; sin test (StrictMode monta dos veces en dev).
  - *Cruza un contrato*: shape de `SessionUser` de `/api/auth/me` sin contrato compartido (igual que D-3); sin test de paridad.
  - *Muta invariante de estado*: `cq_signed_out` en `sessionStorage` decide si se ignora la sesión; cubierto solo por `sessionAfterSignOut` puro.
  - Señal presente sin test = **deuda de dimensión** (el dev decide cerrarla o dejarla explícita).
- Mutation testing (nivel 3): no hay Stryker configurado en `frontend/` (no verificado en profundidad; `package.json` no lo lista).

## Estado de git y gate (para commitear después)

- Repo git = `CodeQuest-2026/` (la raíz del workspace **no** es repo). Rama `main`, HEAD `0d1a541 feat: abrir Salir desde el nombre…`.
- `git status --short`: **88 entradas** — 58 modificados (backend `catalog-scraper`, `learning-paths.service.spec`, `mcp-user-tools.spec`; `frontend/path-diagram/**`; pages y componentes de `(producto)`, `LoginPanel`, `ShellAccount`, `MissionShell`, `lib/errors.ts`, tests fase-0…6, `package.json`/locks) y 30 sin trackear (`contracts/`, `decisions/`, `public/devtalles-brand/`, `public/devtalles-tech/`, `config/*.ts`, `SignInLink`, `StackIcon`, `route-errors`, `configurator-deep-link`, tests nuevos, `specs/{ui-devtalles-polish,ui-rutas-y-marca,ui-stitch-orbital,_done}/`, `specs/README.md`, `specs/_bypass.log` vacío). Mezcla de al menos 3 ciclos sin commit (D-8 de `ui-rutas-y-marca`).
- Hooks: `git config core.hooksPath` = `.cursor/githooks` (origen `.git/config`), resuelto contra `CodeQuest-2026/.cursor/githooks/` que existe (`pre-commit`, `post-commit`, `pre-push`, `post-checkout`, `post-merge`). Sin `.husky`.
- `pre-commit` corre:
  1. `sdd-gate.mjs pre-commit`: si el diff stageado matchea `sdd.paths.json → specRequired.paths` exige `specs/<f>/explore.md` (con las 3 secciones) + `spec.md` aprobado (`Aprobado por dev: YYYY-MM-DD sha256:…`, vía `node .cursor/scripts/sdd/sdd-gate.mjs approve specs/<f>`) + líneas `Lectura:`. **Los globs son `src/**/auth/**` anclados con `^`** → `frontend/src/features/auth/**` NO dispara (D-4). Hoy el gate de spec no protege este cambio.
  2. `check-receipt.mjs`: exige `.sdd/receipt.json` (ignorado por git; hoy **no existe**) emitido por `node .cursor/scripts/sdd/verify-receipt.mjs` sobre el index exacto (`git write-tree`) y el mismo HEAD, con los 3 gates de `CodeQuest-2026/.cursor/sdd.receipt.json` en verde: `typecheck` (`cd frontend && npx tsc --noEmit`), `unit` (`npm --prefix frontend test`), `sdd-self-test` (`node --test .cursor/scripts/sdd/*.test.mjs`). Presupuesto **400 líneas** stageadas por commit (excluye locks, `specs/`, `.snap`); excepción `SDD_SIZE_EXCEPTION=1`.
  - ⇒ Con el TS2352, `typecheck` sale rojo y **ningún commit pasa** sin `--no-verify` (queda registrado en `specs/_bypass.log` por `post-commit` solo si hay señales). El fix TS2352 conviene como primer commit de este ciclo.
  - `npm run sdd:verify` que citan los mensajes **no existe** (sin `package.json` raíz; D-11) → usar `node .cursor/scripts/sdd/verify-receipt.mjs`.
- `CodeQuest-2026/.cursor/` y la raíz del workspace `.cursor/` tienen reglas y scripts idénticos (sha256 iguales), salvo `sdd.receipt.json` (el de CodeQuest-2026 es el que rige).

## Preguntas abiertas para spec

1. **Valor de la demo**: ¿solo `"true"` (spec `ui-stitch-orbital:56`) o también `"1"` (ADR `decisions/0001:15`)? ¿Se documenta en `.env.example`?
2. **Backend caído**: con `fetchMe → null` en todo error, sin backend se ve "iniciá sesión". ¿Aceptar como deuda, o que `fetchMe` distinga 401 (sin sesión) de red/5xx (mostrar "No pudimos verificar tu sesión" + reintentar)? Lo segundo cambia el tipo de retorno de `fetchMe` (interno, sin contrato externo).
3. **`returnTo`** del botón: ¿path solo, o path + query (deep link del configurador)?
4. **Ubicación de `SignInLink`**: ¿reusar desde `learning-paths` o moverlo a `features/auth`?
5. **Tests de `AuthSessionHydrator`/`fetchMe`**: ¿entran en este ciclo (recomendado, auth) o deuda explícita?
6. **Orden de commits** frente a los 88 archivos sucios de ciclos previos (el diff de este ciclo no se aísla por `git diff` hasta commitear lo anterior).

📚 Referencias cargadas: `.cursor/rules/constitution-codigo.mdc`, `.cursor/rules/herramientas-detalle.mdc`, `.cursor/rules/frontend-layers.mdc` (adjunta por glob), `nextjs-reference/references/versiones-seguridad.md` (versión), `specs/ui-rutas-y-marca/{archive,spec}.md`, `CodeQuest-2026/.cursor/{sdd.paths,sdd.receipt,sdd.readproof}.json`, `CodeQuest-2026/.cursor/scripts/sdd/{sdd-gate,check-receipt,verify-receipt}.mjs`. Para el resto del pipeline: `nextjs-reference/SKILL.md` + `rol-por-archivo.md` (layouts/Server vs Client), `frontend-reference/SKILL.md` (UI de login + auth → sensible; `design-language.md`, `accessibility.md`, `security.md`), `constitution-fases.mdc` (spec).

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
Lectura: .cursor/rules/herramientas-detalle.mdc 801a70f1
