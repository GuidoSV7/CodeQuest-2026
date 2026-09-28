# Propuesta — `ui-shell-responsive`

Corregir el montaje anidado de `MissionShell` y alinear header/landing con Stitch, sin tocar contrato Discord, cookies, backend ni pixel-diff.

## Estado de aprobación

**Dirección APROBADA** por el plan del usuario (plan adjunto + "Implement the plan"). Este documento sella esa dirección para el pipeline; no reabre la decisión. Siguiente fase: **`sdd-spec`** → `spec.md`.

## Propuesta

- **Enfoque (opción elegida):** route groups App Router + layouts de variante; root sin shell; CSS/header/landing según Stitch.
- **Por qué:** dominio de presentación **baja** (explore); el design Orbital ya exigía `product` vs `login` decidido en `app/`; el bug es composición (root + `login/page`), no marca. Route groups son el patrón nativo de Next para layouts por segmento sin cambiar URLs. Complejidad de dominio no justifica capas extra ni DDD.
- **Alternativa más simple:** ver sección abajo (rechazada).
- **Riesgo (de explore):** **MEDIO** — reversible, sin backend/API; blast en todos los layouts; superficie auth chrome; tests foundation acoplados al estado roto. No ALTO → plan claro y reversible, no big-bang innecesario.

### Opción elegida (detalle)

1. **Root layout** (`app/layout.tsx`): solo `html` / fuentes / `ProveedoresApp` (+ notificaciones si ya están) / `{children}`. **Sin** `MissionShell`.
2. **Route group `(producto)`** con layout `MissionShell` variante product para:
   - `/`
   - `/mis-rutas/**`
   - `/configurador-de-ruta/**`
   - `/ajustes/tokens`
3. **Route group `(acceso)`** con layout `MissionShell variant="login"` para:
   - `/login`
   - `/auth/error`
4. **`login/page`**: deja de importar/montar `MissionShell`; **borrar** CSS `:has(#login-content)` en `MissionShell.module.css`.
5. **Header:** una sola línea, altura **4rem**; bajo **~48rem** menú móvil **accesible** (3 destinos), avatar visible; el panel **no** es una segunda barra fija.
6. **Landing:** LOC `hidden` bajo `md`; `doorGrid` **1 / 2@48rem / 4@lg**, alineado a Stitch (mobile-first).

Providers permanecen en root (independientes del shell). URLs no cambian (`()` no afecta el path).

### Fuera de scope (explícito)

Discord contract, `returnTo`, cookies, backend, pixel-diff 36 celdas, reescritura de copy, tokens globales nuevos, Nest Identity, cambios a `LoginPanel` / auth service.

## Alternativa más simple — documentada y rechazada

### A) Pathname client-side en `MissionShell` (o wrapper)

Mantener un solo `MissionShell` en root y elegir `variant` / chrome según `usePathname()` (`/login`, `/auth/error` → login; resto → product). Quitar el montaje de `login/page` y el `:has()`.

**Por qué se rechaza:**

- La variante quedaría acoplada a una lista de paths en el cliente; fácil de desincronizar con rutas nuevas.
- No cumple el design ya escrito (`specs/ui-stitch-orbital/design.md`): la variante se decide en `app/` por layout, no por if de pathname.
- `/auth/error` seguiría dependiendo de lógica frágil; route groups lo resuelven con el mismo layout de acceso.
- El root seguiría “sabiendo” de producto vs acceso; los groups separan responsabilidades sin runtime extra.

### B) Solo CSS (seguir con `:has()` + ajustes responsive)

Alinear header/LOC/doorGrid y menú móvil **sin** mover layouts; dejar el anidado y el parche `:has(#login-content)`.

**Por qué se rechaza:**

- No elimina el bug estructural (doble shell, skip links duplicados).
- El design Orbital ya prohibía forzar login dentro del shell product.
- Foundation/tests seguirían validando un layout incorrecto; la deuda de composición quedaría.

→ **Elegida:** route groups (opción del plan aprobado). A y B quedan como alternativas explícitamente descartadas.

## Plan reversible (riesgo MEDIO — no big-bang)

| Paso | Incremento | Rollback |
|---|---|---|
| **1** | Sacar `MissionShell` del root; crear `(producto)/layout` + mover páginas de producto; actualizar assert de `foundation` (MissionShell en group, no root) | Revert del move/layouts; restaurar wrapper en root |
| **2** | Crear `(acceso)/layout` login; mover `login` + `auth/error`; quitar shell de `login/page`; borrar `:has(#login-content)`; assert anti-doble-shell | Revert del group acceso; restaurar montaje en page + CSS `:has` si hace falta |
| **3** | Header 1 línea 4rem; breakpoint ~48rem; menú móvil a11y (3 destinos) + avatar visible; panel no-segunda-barra-fija | Revert solo CSS/markup de header/menú |
| **4** | Landing: LOC hidden < md; doorGrid 1 / 2@48rem / 4@lg | Revert solo `page.module.css` (+ asserts CSS si se agregaron) |

**Orden:** 1→2 de-riesgan auth/producto (un solo shell) antes de tocar responsive; 3→4 son presentación aislada. No mezclar con pixel-diff ni contrato Discord.

## Tests (dirección para spec)

- Actualizar foundation: **no** exigir `MissionShell` en root; sí en layout de `(producto)` / `(acceso)`.
- Nuevo criterio: exactamente un chrome de shell en `/login` (anti-anidado).
- Shell product: regresión en al menos una ruta de producto.
- Header/menú: a11y teclado bajo ~48rem (happy + borde).
- Landing: asserts de LOC oculto / columnas doorGrid si se acuerdan en spec (CSS o viewport).
- **No** tocar asserts de contrato Discord / `LoginPanel`.

Escala: flujo con lógica de composición → happy + bordes (doble shell, landmark). No camino crítico de dinero; auth contract fuera de scope.

## Anti-sobreingeniería

- Sin runtime nuevo (cola/cache/realtime): N/A — no aplica sección Evidencia medida.
- Sin Tailwind, sin redesign de tokens, sin abstracciones de shell nuevas: reusar `MissionShell` y CSS Modules existentes.
- Boy scout: solo la rebanada de layouts/CSS/tests del objetivo.

## Checkpoint

Dirección **ya aprobada** por el plan del usuario. El orquestador **no** debe re-pedir aprobación de enfoque; debe avanzar a:

1. **`sdd-spec`** — criterios de aceptación verificables (composición, a11y menú, landing breakpoints, tests a actualizar/crear, fuera de scope).
2. Luego design/tasks; apply después de spec aprobada.

## Referencias cargadas

- `.cursor/rules/constitution-fases.mdc`
- `.cursor/rules/constitution-codigo.mdc`
- `CodeQuest-2026/specs/ui-shell-responsive/explore.md`
- Memoria/explore: design Orbital variantes; foundation acoplado al bug; Stitch md≈48rem

Lectura: .cursor/rules/constitution-fases.mdc e3160314
Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
