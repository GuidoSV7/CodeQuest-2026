# Spec — `ui-shell-responsive`

⚠️ FLUJOS SIN COBERTURA (revisar antes de aprobar)
- Composición `RootLayout` + `LoginPage` (anti-doble-shell): tocado, sin test de anidado hoy → se cubre con caracterización / assert “exactamente un `<header>` y un `<footer>`” en `/login` y `/auth/error`
- Header product menú móvil a11y (&lt; ~48rem): tocado, sin test hoy → se cubre con test de teclado/focus (3 destinos + avatar visible)
- Landing LOC + `doorGrid` breakpoints: tocado, sin assert de media queries hoy → se cubre con asserts CSS (o viewport) en suite landing
- Foundation layout: assert actual exige `MissionShell` en root (acoplado al bug) → se actualiza a groups, no se relaja sin criterio

## Paths en scope

- `frontend/src/app/layout.tsx`
- `frontend/src/app/(producto)/**`
- `frontend/src/app/(acceso)/**`
- `frontend/src/app/page.tsx`
- `frontend/src/app/page.module.css`
- `frontend/src/app/login/**`
- `frontend/src/app/auth/**`
- `frontend/src/app/mis-rutas/**`
- `frontend/src/app/configurador-de-ruta/**`
- `frontend/src/app/ajustes/**`
- `frontend/src/features/orbital/components/MissionShell.tsx`
- `frontend/src/features/orbital/components/MissionShell.module.css`
- `frontend/test/src/ui-stitch-orbital/**`

## Problema

El shell Orbital está mal compuesto y desalineado con Stitch en chrome responsive:

1. **Doble `MissionShell` en `/login`:** `RootLayout` (`frontend/src/app/layout.tsx`) envuelve todo en variante product; `login/page.tsx` monta otra vez `variant="login"`. El CSS `:has(#login-content)` oculta el chrome exterior: visualmente “uno”, en DOM hay dos `<header>`/`<footer>` y skip links duplicados (`#orbital-content` + `#login-shell-content`).
2. **`/auth/error` sin shell login:** solo hereda product del root; el design Orbital exigía variante login también ahí.
3. **Header vs Stitch:** `flex-wrap` en nav, breakpoint móvil `42rem` (avatar oculto / nav login oculto sin alternativa), vs Stitch `h-16` (4rem) + una línea y `md` ≈ 48rem.
4. **Landing vs Stitch:** `LOC:` siempre visible; `.doorGrid` desktop-first (4 → 2@64rem → 1@34rem) vs mobile-first 1 / 2@md / 4@lg.
5. **Tests frágiles:** `fase-0/foundation.test.ts` exige `<MissionShell>` en root; los DOM aislados no detectan anidado.

Dirección aprobada (no reabrir): route groups `(producto)` / `(acceso)`; root sin `MissionShell`; un solo header/footer; header 4rem + menú móvil a11y ~48rem; landing LOC/doorGrid Stitch; Discord/backend fuera de scope. Ver `proposal.md`.

## Objetivo

Corregir la composición del shell App Router y alinear header/landing con Stitch de forma reversible, sin cambiar URLs ni contratos de auth.

## Scope (MoSCoW)

### Must

- Root layout: `html` / fuentes / `ProveedoresApp` / `ProveedorNotificaciones` / `{children}` — **sin** `MissionShell`.
- Route group `(producto)` con layout `MissionShell` (product) para `/`, `/mis-rutas/**`, `/configurador-de-ruta/**`, `/ajustes/tokens`.
- Route group `(acceso)` con layout `MissionShell variant="login"` para `/login` y `/auth/error`.
- `login/page`: deja de montar `MissionShell`; borrar reglas `:has(#login-content)`.
- Exactamente un chrome de shell (un `<header>` y un `<footer>` de shell) en `/login` y `/auth/error`, sin anidado.
- Header product: altura **4rem**, una sola línea en viewports **375 / 768 / 1280**; `padding-top` del contenido coherente para que el header fijo no tape contenido.
- Bajo **~48rem**: menú móvil con los **3** destinos actuales (`/mis-rutas`, `/configurador-de-ruta`, `/ajustes/tokens`) operable por teclado y focus; avatar visible; el panel del menú **no** es una segunda barra fija.
- Landing: LOC oculto bajo `md` (~48rem); `doorGrid` **1 / 2@48rem / 4@lg** (mobile-first).
- Actualizar tests foundation (MissionShell en groups, no root); anti-doble-shell; menú a11y; asserts CSS landing.
- Conservar URLs públicas (route groups `()` no cambian path).

### Should

- Skip link único y coherente con el landmark de contenido de la variante activa (sin duplicar targets de shells anidados).
- Regresión visual/DOM de shell product en al menos una ruta de producto (p. ej. `/` o `/mis-rutas`).

### Could

- Ajustar copy/ARIA del control que abre el menú móvil si Stitch no lo define (texto accesible mínimo, sin emoji-como-icono).

### Won't

- Discord / `LoginPanel` / `returnTo` / cookies / `auth.service` / shapes de sesión.
- Backend Nest, OpenAPI, migraciones, deploy, Dockerfile.
- Pixel-diff C01–C36 / reescritura de copy Stitch / tokens globales nuevos.
- Alternativa pathname client-side o “solo CSS con `:has()`” (rechazadas en `proposal.md`).

## Disposición de flujos conectados

| Flujo (explore) | Disposición | Evidencia / criterio |
|---|---|---|
| `RootLayout` → `MissionShell` (product global) | **EN SCOPE** | Se saca del root; foundation deja de exigir MissionShell en root; providers permanecen. |
| `LoginPage` → `MissionShell variant=login` anidado | **EN SCOPE** | Page sin shell; layout `(acceso)`; test anti-doble-shell. |
| `/auth/error` + shell | **EN SCOPE** | Pasa a shell login vía `(acceso)`; un header/footer login. |
| Product pages vía layout (`/`, mis-rutas, configurador, ajustes) | **EN SCOPE** | Mismo chrome product vía `(producto)`; URLs sin cambio; regresión shell en ≥1 ruta. |
| `LoginPanel` + Discord (`discordStartUrl`, returnTo) | **FUERA DE SCOPE / no afectado** | No se editan `LoginPanel.*` ni contratos fase-2; paths de scope no los incluyen. |
| `AuthSessionHydrator` / cookies / `fetchMe` | **FUERA DE SCOPE / no afectado** | Providers siguen en root; no se toca hydrator ni `auth.service`. |
| Landing LOC + `doorGrid` | **EN SCOPE** | CSS Modules landing + asserts. |
| Header 1 línea + nav móvil accesible | **EN SCOPE** | `MissionShell.*` + tests a11y &lt;48rem. |
| Backend Identity / Discord OAuth | **FUERA DE SCOPE / no afectado** | Sin cambios en `backend/**`. |

## Criterios de aceptación (verificables)

1. **Un solo chrome en acceso:** Tras render (DOM o árbol de layout de tests), en rutas `/login` y `/auth/error` hay **exactamente un** `<header>` y **exactamente un** `<footer>` pertenecientes al shell (sin shell product anidado; sin `:has(#login-content)` en CSS).
2. **Shell por group:** Las rutas de producto listadas usan solo `MissionShell` product desde `(producto)/layout`; `/login` y `/auth/error` usan solo `variant="login"` desde `(acceso)/layout`. `app/layout.tsx` **no** contiene `<MissionShell>`. Paths públicos sin cambio (`/`, `/login`, `/auth/error`, `/mis-rutas`, etc.).
3. **Header 4rem / una línea:** En viewports **375, 768 y 1280**, el header product tiene altura efectiva **4rem** y la fila de chrome no wrappea a segunda línea de nav; el contenido principal tiene `padding-top` (u offset equivalente) ≥ altura del header para que el header fijo no lo tape.
4. **Menú móvil a11y (~48rem):** Con viewport &lt; ~48rem, los 3 destinos (`Mis rutas`, `Descubre tu ruta`, `Ajustes`) son alcanzables y activables por teclado con foco visible; el avatar permanece visible; el panel/drawer del menú **no** se implementa como segunda barra `position: fixed` apilada bajo el header (no doble chrome fijo).
5. **Landing Stitch breakpoints:** En CSS de landing, LOC (`.location` o equivalente) está oculto bajo `md` (~48rem) y visible desde `md`; `.doorGrid` es **1 columna** por defecto, **2** desde ~48rem, **4** desde `lg` (mobile-first).
6. **Contrato auth intacto:** Diff de feature sin cambios en `LoginPanel`, `discordStartUrl` / `returnTo`, cookies, `auth.service`, ni asserts de contrato Discord fase-2 (siguen verdes sin modificar su semántica).
7. **Tests:**
   - Foundation: **no** exige `MissionShell` en root; **sí** en layouts de `(producto)` y/o `(acceso)`.
   - Anti-doble-shell: assert de un solo header/footer de shell en `/login` (y `/auth/error` o source equivalente).
   - Menú a11y: happy + borde teclado/focus bajo ~48rem.
   - Landing: asserts CSS (o viewport) para LOC oculto y columnas `doorGrid`.

## Testing — escala y segundo eje

### Clasificación por flujo nuevo/tocado

| Flujo | Nivel | Tests exigidos (criterio) |
|---|---|---|
| Composición route groups + un shell | **2** (lógica de composición) | Happy + borde anti-anidado (doble shell) + foundation actualizado |
| Header responsive + menú móvil | **2** | Happy ≥48rem una línea; borde &lt;48rem teclado/focus/avatar; panel no-segunda-barra-fija |
| Landing LOC / doorGrid | **2** (lógica de presentación CSS) | Happy + asserts de media/columnas |
| Discord / sesión | **Fuera** — no abrir nivel 3 aquí | Mantener suite fase-2 existente; cero cambio de contrato |

### Segundo eje (camino crítico)

Ningún flujo de **esta** feature es camino crítico de dinero/fulfillment/webhook. Auth Discord es crítico en el producto pero **fuera de scope** y no se reabre:

- **Sin concurrencia** (UI/layout).
- **No cruza contrato** nuevo front↔back (se declara: no tocar artefacto Discord/sesión).
- **No depende del tiempo** (sin TTL/expiry en el cambio).
- **No muta invariante de dinero/estado**.

Si apply toca `LoginPanel` / `auth.service` / cookies → incumple esta spec y dispara triage de contrato (SDD nuevo).

### Propiedades del cambio (explore)

- **No recurrente** (no cron/cola/poll) → no aplican presupuestos N/T/V ni lock de corridas.
- **No consumidor externo** → no OpenAPI nuevo ni test de paridad de API.
- **Sin volumen que crece** (UI) → no fixture de volumen de filas.

### Seguridad / a11y situacional

- Superficie auth chrome: no se debilitan controles existentes; no endpoints nuevos.
- WCAG AA: menú operable por teclado, foco visible, landmarks semánticos (`header`/`nav`/`footer`); sin emoji como único icono del control de menú.

## Requisitos no funcionales de intervalo / SLA

No hay requisito de polling, latencia ni “tiempo real”. N/A la pregunta de negocio sobre dato tardío.

## Riesgos y deuda explícita

- Riesgo **MEDIO** (explore): reestructura layouts que envuelven todas las rutas; mitigación = pasos reversibles de `proposal.md` (groups primero, responsive después).
- Pixel-diff 36 celdas: **deuda fuera de scope** (explícita).
- Markup exacto del control de menú (disclosure vs dialog): lo fija **design**; esta spec fija comportamiento observable (3 destinos, teclado, no segunda barra fija).

## Checkpoint

- **Decisión de producto / dirección:** **APROBADA** por el plan del usuario (“Implement the plan”) — alineada a `proposal.md`. No reabrir route groups vs pathname vs solo-CSS.
- **Sello formal del gate** (`Aprobado por dev: YYYY-MM-DD sha256:…`): el orquestador/dev ejecuta `node .cursor/scripts/sdd/sdd-gate.mjs approve` sobre esta feature cuando el contenido de `spec.md` quede sellado; **no** se inventa fecha ni hash en esta fase.
- **Siguiente fase:** **`sdd-design`** → `design.md` (layouts de groups, markup menú, CSS breakpoints, plan de tests).

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `.cursor/rules/constitution-codigo.mdc`, `CodeQuest-2026/specs/ui-shell-responsive/explore.md`, `CodeQuest-2026/specs/ui-shell-responsive/proposal.md`, `.cursor/skills/frontend-reference/SKILL.md` (a11y/css-responsive vía constitución-fases), `.cursor/skills/nextjs-reference/SKILL.md` (App Router / route groups — para design).

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
Lectura: .cursor/rules/constitution-fases.mdc e3160314

Aprobado por dev: PENDIENTE
