# Archive — `auth-gate-rutas`

> Cierre SDD. Fecha: 2026-09-27. Spec aprobada `sha256:a802e4f1f5e5`. Verify: 🟡 APTO CON CONDICIÓN (recibo por unidad de commit) — ver `verify.md`.
> Estado: **sin commits, carpeta NO movida a `specs/_done/`** (por instrucción del orquestador; se hace en el commit de cierre).

## Qué cambió

- **Gate de sesión** en `(producto)/mis-rutas/layout.tsx` y `(producto)/configurador-de-ruta/layout.tsx` (Server Components) con `RequireSession` (`features/auth/components/`): estados `unknown` → "Verificando tu sesión…", `anonymous` → DEVI + "Inicia sesión…" + `SignInLink` con `returnTo` (deep link conservado, hash excluido, open redirect → `/`), `unreachable` → "No pudimos conectar" + Reintentar, `authenticated` → hijos sin wrapper.
- **Lectura de sesión de 3 ramas** (`fetchMeStatus` / `session-read.ts`, timeout 8 000 ms, valida los 4 campos de `SessionUser`); `fetchMe` intacto.
- **Store** `auth-session.ts` con `sessionStatus` e invariantes; hydrator con cancelación y protección de carrera (request más nuevo gana).
- **Demo opt-in**: `development` **y** `demoSession ∈ {"true","1"}`.
- **`SignInLink` movido** a `features/auth/components/` (+ 2 imports); asset `devi-laptop.svg` byte a byte + `BRAND_ASSETS.deviLaptop`.
- **Fix TS2352**: firmas de `local-session.ts` con `Pick<…>`, sin casts en el test.

## Por qué

Sin sesión, `/mis-rutas/**` y `/configurador-de-ruta/**` mostraban pantallas de datos/errores en vez de invitar a entrar, y "sin sesión" no se distinguía de "servidor caído". El gate es UX; la frontera real sigue en `SessionAuthGuard` del backend.

## Cómo probar

- `cd CodeQuest-2026/frontend && npx vitest run` (60 files / 417 tests), `npx tsc --noEmit`, `npm run build`.
- Manual: backend apagado → `/mis-rutas` → ~8 s → "No pudimos conectar" con DEVI + Reintentar. Backend arriba sin sesión → "Inicia sesión…" con DEVI; "Entrar" lleva `returnTo` y conserva `?panel=form&path=…` del configurador. A 375 px: sin overflow y botón centrado.

## Desvío aceptado (dev/orquestador)

- **CA-7.1 "contenido idéntico" del move**: se agregó `justify-content: center` a `.action` en `frontend/src/features/auth/components/SignInLink.module.css`. Motivo: en `RequireSession` ≤ 34rem el link ocupa 100 % del ancho y "Entrar" quedaba a la izquierda; sin efecto visible en `LearningPathsDashboard`/`MyRouteStatus`. Cubierto por `tokens.static.test.ts`. **No se edita `spec.md`** para no invalidar el sello sha256; este registro es la fuente del desvío.

## Gate visual (CA-4.11)

Aceptada la evidencia existente: `unreachable` y `anonymous` con DEVI en dev, `returnTo` con deep link, 375 px sin overflow y botón centrado tras el fix. No se exigen capturas adicionales a 1280 px.

## Deuda explícita

- **D-1** SSE/WS sin Bearer en localhost; `LivePathModal` global no queda cubierto por el gate.
- **D-2** Globs de `sdd.paths.json` no disparan para `frontend/src/**` (gate de spec no protege este cambio).
- **D-3** Contrato `SessionUser` sin artefacto compartido front↔back.
- **D-4** Timeout general de axios en 30 s.
- **D-5** `UserRouteDiagram` sin estado 401.
- **D-6** Licencia de DEVI sin declarar.
- **D-7** Stryker no configurado: mutation testing del nivel 3 **pendiente**.
- **D-8** Working tree mezclado (ver abajo).
- **Pendiente de verificación**: flujo con sesión real de Discord (`authenticated` → hijos montan) solo cubierto por tests unitarios/DOM.
- Observación: error de hidratación visto una vez tras HMR; no reproduce en recarga limpia. Reabrir si reaparece.

## Commits — hallazgo

Ninguna unidad de `tasks.md` tiene commit. Hay **169 archivos sin commitear** que mezclan 3 ciclos (`ui-devtalles-polish`, `ui-rutas-y-marca`, `auth-gate-rutas`), **~5 439 líneas** de código fuera de specs/lockfiles. El pre-commit exige worktree == index + gates verdes + ≤ 400 líneas, así que hace falta partir en commits/PRs encadenados. **La estrategia la decide el dev**; referencia de orden en spec D7: (1) fix TS2352, (2) ciclos previos, (3) este ciclo por unidad (fix demo-session antes que el gate). Correr `node .cursor/scripts/sdd/verify-receipt.mjs` hasta exit 0 antes de cada commit.

Commits sugeridos para este ciclo (ajustar al corte final):

- `fix(auth): estrechar firmas de local-session con Pick`
- `fix(auth): exigir opt-in explícito para la sesión demo`
- `feat(auth): leer sesión en tres ramas con timeout`
- `feat(auth): exponer sessionStatus en el store e hidratador`
- `refactor(auth): mover SignInLink a features/auth`
- `feat(auth): proteger mis-rutas y configurador con RequireSession`
- `chore(specs): cerrar auth-gate-rutas` (incluye `git mv specs/auth-gate-rutas specs/_done/auth-gate-rutas`)

Antes de cada commit: sin `.env`, credenciales ni archivos de debug en el index.
