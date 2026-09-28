# Tareas de implementación — `ui-shell-responsive`

## Reglas de ejecución

- `sdd-apply` es el único agente autorizado a escribir código de aplicación. Implementa **una unidad completa** por vez; el dev corre el gate y commitea el mensaje sugerido antes de la siguiente.
- Alcance: solo `frontend/` (App Router, CSS Modules, tests Orbital) + artefactos bajo `specs/ui-shell-responsive/`. **Prohibido** tocar `LoginPanel`, `auth.service`, cookies, Discord, backend, OpenAPI, Tailwind, librerías de iconos nuevas.
- Moves de rutas: usar `git mv` para maximizar detección de rename (evita inflar el recibo de 400 líneas con delete+add de `page.module.css`).
- Cada flujo `EN SCOPE` sin cobertura previa lleva su test de caracterización **antes** de mutar ese flujo. Tests de comportamiento nuevo van **pegados** a la implementación (nivel 2: happy + bordes), no en una unidad “si sobra”.
- Señales de test del design: `ui.shell.not_in_root`, `ui.shell.in_groups`, `ui.shell.double_chrome`, `ui.shell.menu_*`, `ui.landing.loc_hidden`, `ui.landing.door_grid`.
- Verificación por unidad (desde raíz del monorepo / `CodeQuest-2026` según scripts del repo):

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

---

## Unidad 1 — Root sin shell + group `(producto)`

Comportamiento entregable: el documento root solo aporta html/fuentes/providers; las rutas de producto reciben un único `MissionShell` product vía `(producto)/layout`; URLs públicas sin cambio; foundation deja de exigir shell en root.

**Flujos EN SCOPE tocados:** `RootLayout` → `MissionShell` (product global); páginas producto vía layout (`/`, mis-rutas, configurador, ajustes).

### Tareas

1. **Caracterizar composición actual del root y ausencia de shell en páginas producto** (antes de mover)
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-0/foundation.test.ts` (lectura/extensión mínima), opcional hermano `fase-0/root-shell.characterization.test.ts` si conviene no mezclar con el assert a reemplazar.
   - Dependencias: ninguna.
   - Flujo: `RootLayout` → `MissionShell` (EN SCOPE).
   - Terminado cuando: queda fijado que `src/app/layout.tsx` **hoy** contiene `<MissionShell>`; que `page.tsx` / mis-rutas / configurador / ajustes **no** importan `MissionShell`; providers (`ProveedoresApp`, `ProveedorNotificaciones`) siguen en root. No se relaja el assert existente sin el reemplazo de la tarea 1.3.
   - Tests: suite fase-0 foundation/caracterización en verde **antes** de editar layouts.

2. **Sacar `MissionShell` del root y crear layout `(producto)`**
   - Paths: `frontend/src/app/layout.tsx`; **crear** `frontend/src/app/(producto)/layout.tsx`.
   - Dependencias: tarea 1.1.
   - Terminado cuando: root solo tiene `html` / fuentes / providers / `{children}` y **no** importa ni monta `MissionShell`; `(producto)/layout.tsx` es Server Component que monta exactamente `<MissionShell>{children}</MissionShell>` (variant default product).
   - Tests: typecheck/build parcial; foundation aún puede fallar hasta 1.3 — no cerrar la unidad sin 1.3–1.4.

3. **Mover páginas de producto al group `(producto)`**
   - Paths (`git mv`):
     - `app/page.tsx` + `app/page.module.css` → `app/(producto)/`
     - `app/mis-rutas/**` → `app/(producto)/mis-rutas/**`
     - `app/configurador-de-ruta/**` → `app/(producto)/configurador-de-ruta/**`
     - `app/ajustes/**` → `app/(producto)/ajustes/**`
   - Quedan en root: `globals.css`, `providers.tsx`, `_componentes/`, `sitemap.ts`, `robots.ts`, `login/**`, `auth/**`.
   - Dependencias: tarea 1.2.
   - Terminado cuando: las URLs públicas `/`, `/mis-rutas`, `/configurador-de-ruta`, `/ajustes/tokens` siguen resolviendo; no hay imports rotos de CSS Modules relativos; no se toca Discord/auth.
   - Tests: build frontend; tests que lean paths de fuente actualizan rutas a `(producto)/…` solo donde lean filesystem.

4. **Actualizar foundation + regresión shell producto** (CA2, Should)
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-0/foundation.test.ts`; extensión en `fase-0/dom.test.tsx` o test fuente hermano para landmarks product.
   - Dependencias: tareas 1.2–1.3.
   - Terminado cuando:
     - `ui.shell.not_in_root`: root **no** contiene `<MissionShell>`.
     - `ui.shell.in_groups` (parcial): `(producto)/layout.tsx` **sí** contiene `<MissionShell>`.
     - Se conservan asserts de fuentes / no `'use client'` en root.
     - Regresión: al menos una ruta producto (source o DOM aislado de `MissionShell` product) sigue exponiendo header/footer/skip `#orbital-content`.
   - Tests: `npm --prefix frontend test` (fase-0 + afectados) en verde.

5. **Cerrar unidad 1**
   - Terminado cuando: suite frontend relevante verde; `npm --prefix frontend run build` OK; diff sin backend/LoginPanel.
   - Tests: comandos de verificación de la unidad.

**Rollback:** restaurar wrapper en root; revert moves/layouts `(producto)`; restaurar assert foundation de MissionShell en root.

**Estimación de diff:** ~120–220 líneas netas con `git mv` + rename detection; **alerta:** si el recibo cuenta move de `page.module.css` (~560) como delete+add, puede superar 400 → no partir el group a medias; pedir `SDD_SIZE_EXCEPTION=1` solo para esa unidad si el gate lo exige.

**Commit sugerido:** `fix(ui-shell-responsive): move product routes into (producto) group`

---

## Unidad 2 — Group `(acceso)` + un solo chrome + sin `:has`

Comportamiento entregable: `/login` y `/auth/error` usan solo `MissionShell variant="login"` desde `(acceso)/layout`; la page de login no monta shell; CSS sin `:has(#login-content)`; exactamente un `<header>` y un `<footer>` de shell; skip único a `#login-shell-content`.

**Flujos EN SCOPE tocados:** `LoginPage` → shell anidado; `/auth/error` + shell; composición route groups (cierre).

### Tareas

1. **Caracterizar estado post–unidad 1 de login/auth y parche `:has`** (antes de mutar acceso)
   - Paths: source tests nuevos o extensión — p. ej. `frontend/test/src/ui-stitch-orbital/fase-0/acceso-shell.characterization.test.ts`; lectura de `MissionShell.module.css`, `login/page.tsx`, `auth/error/page.tsx`.
   - Dependencias: Unidad 1 completa.
   - Flujo: `LoginPage` + `/auth/error` (EN SCOPE, sin cobertura de composición hoy).
   - Terminado cuando queda fijado el comportamiento **actual**:
     - `login/page.tsx` aún monta `<MissionShell variant="login">`.
     - `auth/error` **no** vive bajo layout login (sin `(acceso)` todavía).
     - CSS aún contiene `:has(#login-content)`.
   - Tests: caracterización en verde **antes** de crear `(acceso)`.

2. **Crear `(acceso)/layout` y mover login + auth**
   - Paths: **crear** `frontend/src/app/(acceso)/layout.tsx`; `git mv` `app/login/**` → `app/(acceso)/login/**`, `app/auth/**` → `app/(acceso)/auth/**`.
   - Dependencias: tarea 2.1.
   - Terminado cuando: layout acceso monta `<MissionShell variant="login">{children}</MissionShell>`; URLs `/login` y `/auth/error` sin cambio de path.
   - Tests: build; paths de tests que lean filesystem actualizados.

3. **Quitar shell (y skip duplicado) de `login/page`**
   - Paths: `frontend/src/app/(acceso)/login/page.tsx` (+ CSS de page solo si hace falta).
   - Dependencias: tarea 2.2.
   - Terminado cuando: la page **no** importa/monta `MissionShell`; no hay skip link de página que duplique el del shell; `#login-content` puede quedar como landmark local alrededor de `LoginPanel` pero **sin** uso para `:has`; `LoginPanel` / `returnTo` intactos (CA6).
   - Tests: fase-2 `login.test.tsx` / `login-contract.test.ts` siguen verdes **sin** cambiar semántica de asserts Discord.

4. **Borrar reglas `:has(#login-content)` del CSS del shell**
   - Paths: `frontend/src/features/orbital/components/MissionShell.module.css`.
   - Dependencias: tarea 2.3 (si se borra antes, el anidado residual no debe existir).
   - Terminado cuando: no queda selector `:has(#login-content)` ni reglas asociadas que oculten chrome exterior.
   - Tests: assert fuente en el test anti-doble-shell (tarea 2.5).

5. **Tests anti-doble-shell + foundation group acceso** (CA1, CA7)
   - Paths: nuevo o extensión — p. ej. `frontend/test/src/ui-stitch-orbital/fase-0/anti-doble-shell.test.ts(x)`; `foundation.test.ts` (completar `ui.shell.in_groups` para `(acceso)`).
   - Dependencias: tareas 2.2–2.4.
   - Terminado cuando:
     - `ui.shell.double_chrome`: composición acceso (source y/o árbol) → **exactamente un** `<header>` y **exactamente un** `<footer>` de shell en `/login` y `/auth/error` (o source equivalente de page+layout).
     - CSS sin `:has(#login-content)`.
     - `(acceso)/layout` contiene `variant="login"` / `<MissionShell variant="login">`.
     - Skip único coherente con `#login-shell-content` (Should).
   - Tests: fase-0 anti-doble-shell + foundation; no editar contrato fase-2 Discord.

6. **Cerrar unidad 2**
   - Terminado cuando: suite frontend verde; build OK; auth chrome login en `/auth/error` vía group.
   - Tests: verificación de la unidad + confirmar que fase-2 Discord no cambió semántica.

**Rollback:** revert group `(acceso)`; restaurar montaje en `login/page` + CSS `:has` si hace falta; quitar asserts anti-doble-shell nuevos.

**Estimación de diff:** ~140–220 líneas.

**Commit sugerido:** `fix(ui-shell-responsive): isolate login shell in (acceso) group`

---

## Unidad 3 — Header 4rem + menú móvil a11y (~48rem)

Comportamiento entregable: header product una línea a 4rem en 375/768/1280; bajo ~48rem disclosure in-flow con 3 destinos operable por teclado, avatar visible, sin segunda barra `fixed`; login sin hamburguesa por defecto.

**Flujos EN SCOPE tocados:** Header 1 línea + nav móvil accesible.

### Tareas

1. **Caracterizar CSS/markup actual del header product** (antes de menú/responsive)
   - Paths: asserts fuente sobre `MissionShell.module.css` / `MissionShell.tsx` — p. ej. en `fase-0/dom.test.tsx` o `header-responsive.characterization.test.ts`.
   - Dependencias: Unidad 2.
   - Flujo: header responsive (EN SCOPE, sin menú ni assert 48rem hoy).
   - Terminado cuando queda fijado el estado **actual**: `flex-wrap: wrap` (o equivalente), media `max-width: 42rem`, avatar oculto en ese media, **sin** control disclosure.
   - Tests: caracterización verde antes de editar shell.

2. **Crear isla cliente `MissionShellMobileNav`**
   - Paths: **crear** `frontend/src/features/orbital/components/MissionShellMobileNav.tsx` (+ CSS module colocalizado solo si el design lo necesita; preferir clases en `MissionShell.module.css`).
   - Dependencias: tarea 3.1.
   - Terminado cuando: Client Component con props UI (`links: { href, label }[]`); botón `aria-expanded` / `aria-controls`; panel in-flow; Escape cierra; SVG inline (no emoji, no librería nueva); estados cerrado/abierto según design; respeta `prefers-reduced-motion` / tokens `--orbital-motion-*`.
   - Tests: unitarios/DOM del isla (closed / open / Escape) pegados a esta tarea o a 3.4.

3. **Integrar menú en `MissionShell` product + CSS 4rem / 48rem / nowrap**
   - Paths: `MissionShell.tsx`, `MissionShell.module.css`.
   - Dependencias: tarea 3.2.
   - Terminado cuando (CA3, CA4):
     - Header product: `min-height: 4rem`; content `padding-top: 4rem`; fila `nowrap` / sin wrap de nav ≥48rem.
     - Breakpoint mobile-first `min-width: 48rem` (reemplaza bloque `42rem` para product).
     - &lt;48rem: nav desktop oculto; botón+panel visibles; avatar **visible**; panel **no** es segunda barra `position: fixed` full-width apilada.
     - ≥48rem: botón/panel ocultos; 3 links en una línea.
     - Variante login: nav en header en una línea; **sin** disclosure obligatorio.
     - Firma pública `MissionShellProps` sin cambio.
   - Tests: build; asserts CSS fuente (altura, 48rem, ausencia de segundo fixed chrome).

4. **Tests a11y menú + regresión product** (CA4, CA7)
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-0/dom.test.tsx` (extensión) y/o `fase-0/mobile-nav.test.tsx`.
   - Dependencias: tarea 3.3.
   - Terminado cuando:
     - `ui.shell.menu_closed` / `menu_open` / `menu_escape`: teclado + foco visible; 3 destinos `/mis-rutas`, `/configurador-de-ruta`, `/ajustes/tokens`.
     - `ui.shell.menu_not_second_fixed_bar`: falla si hay segundo chrome fixed apilado.
     - Avatar visible en viewport estrecho (mock/media o clase no-`display:none`).
     - Happy ≥48rem: una línea (assert CSS/source).
   - Tests: fase-0 menú + dom product en verde.

5. **Cerrar unidad 3**
   - Terminado cuando: suite verde; build OK; sin tocar landing breakpoints (unidad 4).
   - Tests: verificación de la unidad.

**Rollback:** revert solo `MissionShell*` + `MissionShellMobileNav` + tests de menú.

**Estimación de diff:** ~220–340 líneas (isla + CSS + tests). Dentro del presupuesto si no se reescribe el CSS completo del shell.

**Commit sugerido:** `feat(ui-shell-responsive): add accessible product mobile nav`

---

## Unidad 4 — Landing LOC + `doorGrid` Stitch

Comportamiento entregable: LOC oculto bajo `md` (~48rem); `.doorGrid` mobile-first **1 / 2@48rem / 4@lg (64rem)**; asserts en suite landing.

**Flujos EN SCOPE tocados:** Landing LOC + `doorGrid`.

### Tareas

1. **Caracterizar CSS actual de LOC y `doorGrid`** (antes de breakpoints)
   - Paths: extensión de `frontend/test/src/ui-stitch-orbital/fase-1/landing.test.tsx` o `landing-breakpoints.characterization.test.ts`; lee `app/(producto)/page.module.css`.
   - Dependencias: Unidad 3 (o al menos Unidad 1 para path `(producto)`).
   - Flujo: landing breakpoints (EN SCOPE, sin assert media hoy).
   - Terminado cuando queda fijado: `.location` visible sin hide &lt; md; `.doorGrid` desktop-first actual (4 → 2@64rem → 1@34rem) documentado en el test.
   - Tests: caracterización verde antes de editar CSS.

2. **Alinear `page.module.css` a Stitch (LOC + doorGrid)**
   - Paths: `frontend/src/app/(producto)/page.module.css` (solo breakpoints de LOC/doorGrid; no reescribir copy ni hero completo).
   - Dependencias: tarea 4.1.
   - Terminado cuando (CA5):
     - `.location` (o equivalente) oculto bajo `md` (`max-width` &lt; 48rem o mobile-first hide + `min-width: 48rem` show).
     - `.doorGrid`: 1 col default; 2 desde `48rem`; 4 desde `64rem` (lg); se elimina el esquema desktop-first contradictorio de columnas.
   - Tests: build; asserts de la tarea 4.3.

3. **Asserts landing LOC / doorGrid** (CA5, CA7)
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-1/landing.test.tsx` (o hermano CSS).
   - Dependencias: tarea 4.2.
   - Terminado cuando: `ui.landing.loc_hidden` y `ui.landing.door_grid` verifican media/columnas (source CSS o viewport según harness existente); no se tocan fixtures Discord.
   - Tests: fase-1 landing en verde; caracterización 4.1 actualizada o reemplazada por asserts objetivo (sin relajar sin criterio).

4. **Cerrar unidad 4**
   - Terminado cuando: suite verde; build OK.
   - Tests: verificación de la unidad.

**Rollback:** revert solo `page.module.css` + asserts landing de breakpoints.

**Estimación de diff:** ~80–160 líneas.

**Commit sugerido:** `fix(ui-shell-responsive): align landing LOC and doorGrid breakpoints`

---

## Unidad 5 — Suite verde + notas verify browser

Comportamiento entregable: la suite Orbital relevante está verde de punta a punta; quedan notas explícitas para `sdd-verify` en viewports **375 / 768 / 1280** (no automatiza pixel-diff).

**No** abre flujos nuevos de código de producto.

### Tareas

1. **Correr suite frontend completa del alcance y fase-2 Discord sin editar contrato**
   - Paths: ninguno de app (solo ejecución); si hace falta fix de path roto por moves, volver a la unidad que lo introdujo — no “arreglar” asserts Discord.
   - Dependencias: Unidades 1–4.
   - Terminado cuando: `npm --prefix frontend test` y `npm --prefix frontend run build` en verde; CA6 intacto (sin diff semántico en `LoginPanel` / `login-contract` / `auth.service`).
   - Tests: comandos anteriores ejecutados (rojo = unidad no cerrada).
   - **Apply (2026-09-22):** `npm --prefix CodeQuest-2026/frontend test` → 30 files / 70 tests passed. `npm run build` → OK tras limpiar `.next` stale post-move. URLs públicas `/`, `/login`, `/auth/error`, `/mis-rutas`, etc. sin cambio. Discord/LoginPanel sin diff semántico.

2. **Dejar checklist de verify manual en este artefacto** (para `sdd-verify`)
   - Paths: solo `specs/ui-shell-responsive/tasks.md` (esta sección) — **no** código app.
   - Terminado cuando el verify puede copiar esta lista:

#### Checklist browser (manual) — 375 / 768 / 1280

| Viewport | Qué mirar | Pass |
|---|---|---|
| 375 | Product: header ~4rem, avatar visible, menú abre 3 destinos por teclado, panel no es 2.ª barra fija | ☐ |
| 375 | `/login` y `/auth/error`: un solo header/footer shell; skip único | ☐ |
| 375 | Landing: LOC oculto; doorGrid 1 columna | ☐ |
| 768 | Product: header una línea 4rem; nav desktop o menú según breakpoint 48rem | ☐ |
| 768 | Landing: LOC visible; doorGrid 2 columnas | ☐ |
| 1280 | Product: nav 3 links + avatar una línea; sin wrap | ☐ |
| 1280 | Landing: doorGrid 4 columnas | ☐ |
| Todos | Sin scroll horizontal accidental; foco visible; `prefers-reduced-motion` no rompe | ☐ |

   - Tests: N/A (manual en verify).

3. **Checkpoint hacia `sdd-verify`**
   - Terminado cuando: apply declara unidades 1–5 implementadas en sesión (orquestador: commits según preferencia del dev; no se esperó commit entre unidades por instrucción del orquestador); esta unidad no agrega deuda de composición; pixel-diff C01–C36 sigue **fuera de scope**.
   - Tests: suite re-ejecutada en apply (verde).

**Rollback:** N/A (sin código). Si la suite falla, no archivar — volver a la unidad culpable.

**Estimación de diff:** ~0 líneas de app (solo posible ajuste menor de test path). Dentro del presupuesto.

**Commit sugerido:** *(opcional, solo si hubo fixes de test harness)* `test(ui-shell-responsive): confirm suite after shell layout`

Si no hay cambios de archivos: **no** crear commit vacío; pasar directo a `sdd-verify`.

---

## Orden y dependencias (resumen)

```
U1 root+(producto)+foundation
  → U2 (acceso)+anti-doble-shell+:has
    → U3 header+MissionShellMobileNav
      → U4 landing LOC/doorGrid
        → U5 suite + notes verify
```

Alineado a `proposal.md` pasos 1→4 + cierre verify.

## Fuera de scope (no crear tareas)

Discord / `LoginPanel` / cookies / `auth.service` / backend / OpenAPI / pixel-diff C01–C36 / tokens globales nuevos / pathname client-side / conservar `:has()`.

---

## Pronóstico de presupuesto de revisión (400 líneas / unidad)

| Unidad | Estimación (add+del, excl. lock/specs/snapshots) | Notas |
|---|---|---|
| 1 | 120–220 (o ≫400 si rename no detecta `page.module.css`) | Preferir `git mv`; excepción solo si el gate cuenta el move entero |
| 2 | 140–220 | Layout + page + CSS `:has` + tests |
| 3 | 220–340 | Isla + CSS + a11y — la más densa; aún ≤400 |
| 4 | 80–160 | CSS landing + asserts |
| 5 | 0–40 | Sin app code esperado |

```
Riesgo de presupuesto 400 líneas: Medio
Unidades que lo superan: ninguna (condicional: Unidad 1 solo si el recibo ignora rename de page.module.css)
¿Partir en PRs encadenados?: No
```

🔔 Si al commitear la Unidad 1 el gate reporta &gt;400 por el move de `page.module.css`, **no** partir el group a medias: el dev acepta `SDD_SIZE_EXCEPTION=1` para esa unidad o se investiga rename detection — partir dejaría `/` o CSS huérfanos.

---

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `.cursor/rules/constitution-codigo.mdc`, `CodeQuest-2026/specs/ui-shell-responsive/explore.md`, `CodeQuest-2026/specs/ui-shell-responsive/proposal.md`, `CodeQuest-2026/specs/ui-shell-responsive/spec.md`, `CodeQuest-2026/specs/ui-shell-responsive/design.md`, `CodeQuest-2026/specs/ui-stitch-orbital/tasks.md` (formato), `.cursor/skills/frontend-reference/SKILL.md` (a11y/responsive vía design), `.cursor/skills/nextjs-reference/SKILL.md` (route groups)

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a  
Lectura: .cursor/rules/constitution-fases.mdc e3160314
