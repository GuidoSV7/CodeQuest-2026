# Tasks — `auth-gate-rutas`

> Fase `sdd-tasks`. Fecha: 2026-09-27. Base: `explore.md`, `spec.md`, `design.md` (checkpoint de design aprobado: las 6 recomendaciones aceptadas, incluido literal `rem` opción (a) → sin D-11).
> Orden = §9 del design (caracterización primero). Rutas relativas a `CodeQuest-2026/frontend/` salvo indicación. `src/` = código, `test/src/` = tests.
> Leyenda: 🔗 toca flujo conectado de explore · 🧪C test de caracterización (fija comportamiento actual, debe quedar verde **sin modificarse** después) · N2/N3 = nivel de la escala de testing.
> Verificación por unidad: `node .cursor/scripts/sdd/verify-receipt.mjs` (desde `CodeQuest-2026/`; `npm run sdd:verify` no existe — explore D-11). Apply implementa **una unidad a la vez**; el dev commitea cada una.

⚠️ Antes de arrancar apply: `spec.md` dice `Aprobado por dev: PENDIENTE` y el copy de CA-4.2 / CA-4.5 ya está reflejado. El orquestador sella con `node .cursor/scripts/sdd/sdd-gate.mjs approve specs/auth-gate-rutas`.

---

## Unidad 1 — Fix TS2352 en `local-session` (desbloquea el gate `typecheck`)

- [x] **1.1** 🔗🧪C (N2) Ampliar `test/src/features/auth/lib/local-session.test.ts` con los 4 casos borde de CA-6.3 contra el código actual: hash sin `cq_session` → ni `setItem` ni `replace`; `#cq_session=x&tab=2` → `replace` con `…#tab=2`; `readLocalSessionToken(undefined)` → `null`; `clearLocalSessionToken` llama `removeItem("cq_session_token")`. Verde con vitest. — CA-6.3
- [x] **1.2** 🔗 Estrechar firmas en `src/features/auth/lib/local-session.ts` a `Pick<Location, "hash" | "pathname" | "search">`, `Pick<Storage, "setItem">`, `Pick<Storage, "getItem"> | undefined`, `Pick<Storage, "removeItem"> | undefined`. Cuerpos sin cambios. — CA-6.1, CA-6.4
- [x] **1.3** En `local-session.test.ts` quitar los 3 casts (`as Location` l.13, `as Storage` l.14 y l.23); fakes inline con **solo** los miembros de la firma. Mismos asserts de comportamiento. Grep `/\bas\s+(Location|Storage|unknown|any)\b/` = 0. — CA-6.2
- [x] **1.4** Verificar: `cd frontend && npx tsc --noEmit` = 0 errores; `api-auth-policy.test.ts`, `AuthSessionHydrator`, `logoutSession` compilan sin cambios; recibo verde. — CA-6.4, CA-8.1

Commit sugerido: `fix(auth): estrechar firmas de local-session y quitar casts del test (TS2352)`

---

## Unidad 2 — Caracterización de sesión + demo opt-in (#1503)

- [x] **2.1** 🔗🧪C (N2) Crear `test/src/features/auth/api/auth.service.test.ts` → `describe("fetchMe (caracterización)")` con `vi.mock("@/lib/axios")`: 200 → user; rechazo con `codigoEstado 401` → `null`; rechazo sin respuesta → `null`. Verde contra el código actual. — CA-2.6
- [x] **2.2** 🔗🧪C (N2) Crear `test/src/features/auth/components/AuthSessionHydrator.test.tsx` → `describe("caracterización")` (jsdom, `createRoot` + `act`, axios mockeado, `vi.stubEnv`, reset del store con `getInitialState()` — verificar la API en `node_modules/zustand`). Aserciones **solo sobre store y `api.get`**: dev + demo `"1"` → 0 llamadas, `user` = fixture, `hydrated` true; `cq_signed_out="1"` + 200 → 1 llamada, `user` del body, marca borrada; `cq_signed_out="1"` + rechazo → `user null`, `hydrated` true. Verde contra el código actual. — CA-3.7
- [x] **2.3** 🔗 (N2) Reescritura declarada en `test/src/ui-stitch-orbital/fase-2/demo-session.test.ts` l.9-28: renombrar el caso y reemplazar por matriz table-driven 4 `nodeEnv` × 7 `demoSession` (28 combos, `true` solo en `development`+`"true"`/`"1"`). Debe quedar **rojo** (fija el bug). l.30-69 intactas. — CA-1.1
- [x] **2.4** 🔗 Fix D1 en `src/features/auth/lib/demo-session.ts` (`isOrbitalDemoSessionEnabled` con allowlist literal `"true" | "1"` + `development`). Matriz de 2.3 verde; l.30-69 verdes; `fase-0/dom.test.tsx:57-60` verde; `OrbitalDemoBanner.tsx` sin tocar. — CA-1.1, CA-1.2, CA-1.4
- [x] **2.5** 🔗 (N2) Tests + implementación de `resolveOrbitalSessionRead(environment, readSession)` en `demo-session.ts` (test en `demo-session.test.ts`, bloque nuevo): demo → `{status:"authenticated", user: fixture}` sin invocar lector; dev sin variable → lector exactamente 1 vez. `resolveOrbitalSession` sin cambios (D-9). Requiere agregar `SessionRead`/`SessionStatus` a `src/features/auth/types/auth.types.ts`. — CA-1.2, CA-1.3
- [x] **2.6** Verificar: caracterizaciones 2.1 y 2.2 siguen verdes **sin modificarse**; recibo verde.

Commit sugerido: `fix(auth): sesion demo solo con opt-in explicito en development`

---

## Unidad 3 — Lectura de `/me` en 3 ramas con timeout 8 s

- [x] **3.1** (N3) Crear `test/src/features/auth/lib/session-read.test.ts` (rojo): `parseSessionUser` (válido con `avatarUrl`/`email` `null`, `null`, `{}`, `{ id: 1 }`, `id: ""`, falta `avatarUrl`); `classifySessionReadError` (401, 403 → `anonymous`; 0, 500, 503, 404, 429, `new Error` sin código, valor no-Error → `unreachable`; nunca `authenticated`). — CA-2.2, CA-2.3, CA-2.5
- [x] **3.2** Implementar `src/features/auth/lib/session-read.ts` (puro, usa `asApiError` como `learning-paths/lib/route-errors.ts`). 3.1 verde. — CA-2.2, CA-2.3, CA-2.5
- [x] **3.3** 🔗 (N3) En `auth.service.test.ts` agregar `describe("fetchMeStatus")` (rojo): 200 válido → `authenticated`; 401/403 → `anonymous`; red, timeout `ECONNABORTED`, 500, 503, 404 → `unreachable`; bodies inválidos → `unreachable`; `api.get` recibe `("/api/auth/me", { timeout: 8000 })`; `SESSION_READ_TIMEOUT_MS === 8_000`. — CA-2.1–2.5
- [x] **3.4** 🔗 Implementar `SESSION_READ_TIMEOUT_MS` y `fetchMeStatus` en `src/features/auth/api/auth.service.ts`. `fetchMe`, `logoutSession`, `discordStartUrl`, `authEntryPath` sin cambios; `lib/axios.ts` sin tocar. 3.3 verde; caracterización 2.1 y `login-contract.test.ts` verdes sin tocarse. — CA-2.4, CA-2.6

Commit sugerido: `feat(auth): lectura de sesion que distingue anonimo de servidor inalcanzable`

---

## Unidad 4 — Store con `sessionStatus` + hydrator de 3 ramas

- [x] **4.1** (N3) Crear `test/src/stores/auth-session.test.ts` (rojo) sobre el store real: invariantes I1/I2 exhaustivos (4 estados iniciales × cada acción pública: `setUser`, `setHydrated`, `clear`, `applySessionRead`, `requestSessionRead`, con argumentos representativos); `clear` → `anonymous`; `applySessionRead` con `request` viejo → no-op; `requestSessionRead` incrementa y vuelve a `unknown`. — CA-3.1, CA-3.2, CA-3.3, CA-3.6
- [x] **4.2** 🔗 Implementar en `src/stores/auth-session.ts` `sessionStatus`, `sessionReadRequest`, `applySessionRead`, `requestSessionRead` y la semántica ajustada de `setUser`/`setHydrated`/`clear` (un solo `set` por acción, §3.5). 4.1 verde; tests DOM que hacen `setState({ user, hydrated })` (`routes-dom`, `assessment-dom`, `replanning-dom`, `dom.test`, `ShellAccount.test`) verdes sin modificarse. — CA-3.1, CA-3.2, CA-3.3
- [x] **4.3** 🔗 (N3) En `AuthSessionHydrator.test.tsx` agregar `describe("lectura de 3 ramas")` (rojo) con mock parcial de `@/features/auth/api/auth.service` (`importOriginal`) sobre `fetchMeStatus`: 6 ramas CA-3.4 (incluye signedOut + demo → llama lectura; signedOut + `unreachable` → `unreachable`; `hydrated` true siempre); cancelación (resolver tras `unmount` → `unknown`); carrera (dos lecturas resueltas en orden inverso → gana la de `request` mayor). ⚠️ `vi.mock` es de archivo: el `fetchMeStatus` mockeado debe delegar por defecto en el original para que la caracterización 2.2 siga pasando por axios **sin modificarse**; si no es viable, mover este bloque a `AuthSessionHydrator.reads.test.tsx` (no tocar 2.2). — CA-3.4, CA-3.5, CA-3.6
- [x] **4.4** 🔗 Refactor de `src/features/auth/components/AuthSessionHydrator.tsx` según §3.6 (efecto dependiente de `sessionReadRequest`, `resolveOrbitalSessionRead` + `fetchMeStatus`, `clearSignedOut` si `authenticated`, `applySessionRead`, `cancelled`). 4.3 verde; caracterización 2.2 verde **sin modificarse**. — CA-3.4–3.7
- [x] **4.5** 🔗 Reescritura declarada de guardas por nombre: `test/src/ui-stitch-orbital/fase-0/auth.characterization.test.ts:20-22` y `test/src/ui-stitch-orbital/fase-2/auth-session-hydrator.test.ts:17-19` pasan a `toMatch(/\bresolveOrbitalSessionRead\b/)`, `/\bfetchMeStatus\b/`, `/\bapplySessionRead\b/`. `not.toContain("axios")` y asserts de `HomeAuthStatus` intactos; ninguno se borra. — spec §Asserts que se reescriben
- [ ] **4.6** Verificar: `ShellAccount.test.tsx`, `home-auth-status.test.tsx`, `login.test.tsx` verdes sin modificarse; recibo verde.

Commit sugerido: `feat(auth): store con sessionStatus y rehidratacion con guarda de carrera`

---

## Unidad 5 — Marca DEVI laptop + mover `SignInLink` + `.env.example`

- [x] **5.1** Copiar byte a byte `DEVTALLES-PAQUETES DE ELEMENTOS/SVG/DEVI LAPTOP BORDER.svg` → `public/devtalles-brand/devi-laptop.svg` (16 065 B; comparar sha256 por comando). Agregar `deviLaptop: "/devtalles-brand/devi-laptop.svg"` a `src/config/brand-assets.ts`. `test/src/config/brand-assets.test.ts` verde sin cambios. — CA-5.1, CA-5.2
- [x] **5.2** 🔗 Mover `src/features/learning-paths/components/SignInLink.{tsx,module.css}` → `src/features/auth/components/` con contenido idéntico; actualizar imports en `LearningPathsDashboard.tsx` y `MyRouteStatus.tsx` (único cambio en ellos); actualizar la ruta en `test/src/ui-devtalles-polish/copy-voice.static.test.ts:24` y, si figura, en `tokens.static.test.ts`. `LearningPathsDashboard.test.tsx`, `MyRouteStatus.test.tsx`, `routes-dom` verdes sin modificarse. — CA-7.1, CA-4.9
- [x] **5.3** Agregar a `frontend/.env.example` la línea comentada `# NEXT_PUBLIC_ORBITAL_DEMO_SESSION=1` con nota "solo aplica en development". — S1
- [ ] **5.4** Verificar: recibo verde.

Commit sugerido: `chore(auth): vendorizar DEVI laptop y mover SignInLink a features/auth`

---

## Unidad 6 — `RequireSession` + layouts de `/mis-rutas` y `/configurador-de-ruta`

- [x] **6.1** (N2) Crear `test/src/features/auth/lib/return-to.test.ts` (rojo): path solo; path + query con URL comprometida; URL no comprometida → solo path; hash ignorado. — CA-4.3
- [x] **6.2** Implementar `src/features/auth/lib/return-to.ts` (`sessionReturnTo`, puro). 6.1 verde. — CA-4.3
- [x] **6.3** (N3) Crear `test/src/features/auth/components/RequireSession.test.tsx` (rojo; mock `next/navigation` `usePathname`, `window.history.replaceState` para la URL, store real reseteado con `getInitialState()`): CA-4.1 (hijo espía 0 renders, `role="status"` "Verificando tu sesión…"); CA-4.2 (img `deviLaptop` `alt=""` 160×177, h1/p/Entrar con copy exacto, `href === discordStartUrl(returnTo)`); CA-4.3 (`/mis-rutas` y `/configurador-de-ruta?panel=form&path=programas-react`, hash excluido); CA-4.4 (`//evil.example` → `returnTo` `/` en el `href`); CA-4.5 con hydrator montado y `fetchMeStatus` mockeado (`role="alert"`, copy exacto, clic → "Verificando…", sin `button`, 2 llamadas; 2ª `authenticated` → hijo monta; 2ª `anonymous` → login); CA-4.6 (sin wrapper); CA-4.7 (sin "Armá tu ruta"/"Arma tu ruta"/"No pudimos cargar tus rutas" en estados ≠ `authenticated`); CA-3.3 (`clear()` estando `authenticated` → login sin remount). — CA-3.3, CA-4.1–4.7
- [x] **6.4** Implementar `src/features/auth/components/RequireSession.tsx` (`"use client"`, subcomponentes internos, < 100 líneas, no lee `window` en `unknown`) + `RequireSession.module.css` (§7.2: solo tokens + literales `rem` existentes, `@keyframes` con `--orbital-motion-fast`, `prefers-reduced-motion`, breakpoint 34rem). 6.3 verde. — CA-4.1–4.7, CA-4.10
- [x] **6.5** 🔗 Crear `src/app/(producto)/mis-rutas/layout.tsx` y `src/app/(producto)/configurador-de-ruta/layout.tsx` (Server, sin `"use client"`, envuelven `children` en `RequireSession`, props como `(producto)/layout.tsx`). Pages, `(producto)/layout.tsx` y `MissionShell` sin tocar. — CA-4.8
- [x] **6.6** (N1) Crear `test/src/auth-gate-rutas/layouts.static.test.ts`: 2 layouts sin `"use client"` y envolviendo en `RequireSession`; `(producto)/layout.tsx`, `(producto)/page.tsx`, `docs/mcp/page.tsx` no importan `RequireSession`. Agregar `RequireSession.tsx` a `LIVE_COPY_FILES` (`copy-voice.static.test.ts`) y `RequireSession.module.css` a `TOKENIZED_CSS` (`tokens.static.test.ts`). `configurator-page.static.test.ts`, `configurator-layout.static.test.ts`, `access.characterization.test.tsx` verdes sin modificarse. — CA-4.8, CA-4.9, CA-4.10
- [ ] **6.7** Verificar (CA-8): `cd frontend && npx tsc --noEmit`; `npm --prefix frontend test`; `cd frontend && npm run build` (`/configurador-de-ruta` sigue dinámica); `node .cursor/scripts/sdd/verify-receipt.mjs` con `typecheck`, `unit`, `sdd-self-test` verdes. Capturas 375/1280 de `anonymous` y `unreachable` quedan para el gate visual de `verify` (CA-4.11). — CA-8.1–8.4

Commit sugerido: `feat(auth): exigir sesion en mis-rutas y configurador con pantalla de acceso DEVI`

---

## Pronóstico de presupuesto (líneas cambiadas, sin `specs/` ni locks)

| Unidad | Estimado | Nota |
|---|---|---|
| 1 — TS2352 | ~50 | 3 firmas + 4 casos borde + quitar casts |
| 2 — caracterización + demo | ~200 | 2 archivos de caracterización nuevos + matriz + `resolveOrbitalSessionRead` |
| 3 — lectura 3 ramas | ~170 | `session-read.ts` + tests table-driven + `fetchMeStatus` |
| 4 — store + hydrator | ~280 | test exhaustivo de invariantes es lo más largo; hydrator ~40 |
| 5 — marca + move | ~20 + SVG | move sin cambios de contenido (git lo detecta como rename si se stagea junto); el SVG es 1 archivo de 16 KB — si `check-receipt.mjs` lo cuenta por líneas y excede, commitear el SVG solo (misma unidad, sin romper nada) |
| 6 — gate + layouts | ~360 | `RequireSession` ~90, CSS ~90, test DOM ~150, resto chico |

Riesgo de presupuesto 400 líneas: Medio
Unidades que lo superan: ninguna
¿Partir en PRs encadenados?: No

> El design agrupaba 4-5c en un commit (~300) y 6-7c en otro (~350); se partieron en Unidades 3/4 y 5/6 para dar margen al presupuesto. Unidad 6 es la más cercana al límite: si al stagear supera 400, separar 6.1-6.2 (`return-to`) como unidad propia antes de commitear.

📚 Referencias cargadas: `CodeQuest-2026/specs/auth-gate-rutas/{explore,spec,design}.md`
