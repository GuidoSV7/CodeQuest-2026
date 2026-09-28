# Design — `ui-shell-responsive`

Diseño técnico de la composición App Router del shell Orbital y del chrome responsive alineado a Stitch. Sin backend, sin cambio de contrato Discord. Spec y propuesta: **aprobadas** por el plan del usuario; este diseño no reabre route groups vs pathname vs solo-CSS.

## ADR: no aplica (puerta de doble sentido)

Explore: **Reversible = sí**, sin consumidor externo, sin componente de runtime nuevo (cola/cache/realtime/scheduler). El menú móvil es estado de presentación local (isla cliente), no infra. Revert de PR restaura layouts/CSS/tests. No se crea ADR.

## Versión del contrato

**Sin bump.** No hay OpenAPI ni shape HTTP tocado. Props públicas de `MissionShell` (`children`, `variant?: "product" | "login"`) se mantienen. URLs públicas sin cambio (route groups `()`).

## Capas afectadas y dirección de dependencias

Solo frontend. Dependencias hacia adentro (presentación → features → nada de HTTP en el shell).

```
app/layout.tsx                    (Server — html/fonts/providers)
  └─ {children}
       ├─ (producto)/layout.tsx   (Server — monta MissionShell product)
       │    └─ pages producto
       └─ (acceso)/layout.tsx     (Server — monta MissionShell login)
            └─ login | auth/error

features/orbital/components/
  MissionShell.tsx                (Server Component — chrome + landmark)
  MissionShellMobileNav.tsx       (Client island — disclosure menú <48rem)
  MissionShell.module.css         (tokens --orbital-*)

app/(producto)/page.module.css    (landing LOC + doorGrid)
test/.../ui-stitch-orbital/fase-0|fase-1  (asserts composición / CSS / a11y)
```

| Capa | Rol | Qué vive ahí |
|---|---|---|
| Root layout | Frontera documento | `html`, fuentes, `ProveedoresApp`, `ProveedorNotificaciones`, `{children}`. **Sin** `MissionShell`. |
| Layout `(producto)` | Orquestación de chrome producto | Un solo `<MissionShell>{children}</MissionShell>`. |
| Layout `(acceso)` | Orquestación de chrome acceso | Un solo `<MissionShell variant="login">{children}</MissionShell>`. |
| Páginas `app/(producto\|acceso)/**` | Presentación de ruta | Contenido de pantalla; **no** montan shell. Login deja de importar `MissionShell`. |
| `MissionShell` | Presentación shell (server) | Header/footer/skip/landmarks; renderiza isla cliente del menú en variante product. |
| `MissionShellMobileNav` | Estado UI local (client) | Abierto/cerrado del disclosure; teclado; Escape; focus visible. |
| CSS Modules | Presentación | Header 4rem / nowrap / breakpoint 48rem; borrar `:has()`; landing mobile-first. |
| Tests | Caracterización | Foundation, anti-doble-shell, menú a11y, asserts CSS landing. |

**Fuera de capas:** `LoginPanel`, `auth.service`, cookies, hydrator, backend Nest — no se tocan.

## Mapa de archivos (moves + edits)

### Root — editar

- `frontend/src/app/layout.tsx` — quitar import y wrapper `<MissionShell>`; conservar providers y fuentes.

### Route group producto — crear + mover

- **Crear** `frontend/src/app/(producto)/layout.tsx` → `<MissionShell>{children}</MissionShell>`.
- **Mover** (URLs iguales):
  - `app/page.tsx` + `app/page.module.css` → `app/(producto)/`
  - `app/mis-rutas/**` → `app/(producto)/mis-rutas/**`
  - `app/configurador-de-ruta/**` → `app/(producto)/configurador-de-ruta/**`
  - `app/ajustes/**` → `app/(producto)/ajustes/**`

Quedan en root (no producto): `globals.css`, `providers.tsx`, `_componentes/`, `sitemap.ts`, `robots.ts`.

### Route group acceso — crear + mover

- **Crear** `frontend/src/app/(acceso)/layout.tsx` → `<MissionShell variant="login">{children}</MissionShell>`.
- **Mover**:
  - `app/login/**` → `app/(acceso)/login/**`
  - `app/auth/**` → `app/(acceso)/auth/**`

### Login page — editar tras el move

- Quitar import/montaje de `MissionShell`.
- Quitar skip link de página (el shell login ya aporta uno a `#login-shell-content`) → **un solo skip** (Should de spec).
- Conservar `#login-content` alrededor de `LoginPanel` solo si aporta landmark local; **no** usarlo para CSS `:has()` (se borra). No cambiar `returnTo` / `LoginPanel`.

### Shell — editar + isla nueva

- `MissionShell.tsx` — product: insertar control disclosure + panel; login: sin disclosure obligatorio (nav en header; ver abajo). Sin `'use client'` en el shell server.
- **Crear** `MissionShellMobileNav.tsx` (`'use client'`) — botón + panel con los 3 `Link` existentes.
- `MissionShell.module.css` — borrar bloque `:has(#login-content)`; `flex-wrap` → `nowrap` / una fila 4rem; breakpoint **48rem** mobile-first; avatar visible en móvil product; estilos panel (no `position: fixed` apilado como segunda barra).

### Landing — editar CSS

- `app/(producto)/page.module.css` — `.location` oculto &lt; md; `.doorGrid` 1 / 2@48rem / 4@lg mobile-first (reemplazar desktop-first actual 4→2@64rem→1@34rem solo en columnas; otros media del hero pueden quedar si no contradicen CA).

### Tests — editar / agregar

- `fase-0/foundation.test.ts`
- `fase-0/dom.test.tsx` (+ casos menú / a11y)
- Nuevo o extensión: anti-doble-shell (source o árbol) para `/login` y `/auth/error`
- `fase-1/landing.test.tsx` (o hermano CSS): asserts LOC / doorGrid
- **No** tocar semántica de asserts Discord fase-2 / `LoginPanel`

## Contratos / interfaces

| Contrato | Cambio |
|---|---|
| HTTP / OpenAPI / Discord / sesión | **Ninguno** |
| `MissionShellProps` | Sin cambio de firma |
| Props isla `MissionShellMobileNav` | Nuevas, solo UI: p. ej. `links: { href, label }[]` (los 3 destinos fijos) — sin datos de servidor |
| IDs landmark | Product: `#orbital-content`. Login: `#login-shell-content`. Skip único por variante |

No hay Unit of Work ni repositories.

## Límite de transacción

**N/A** — sin mutaciones de datos ni varios repositorios.

## Menú móvil — decisión de markup (spec lo delegó al design)

**Patrón: disclosure in-flow** (no `dialog` modal, no segunda barra `position: fixed` bajo el header).

- En viewport **&lt; ~48rem** (product):
  - Nav desktop (`header nav` de links en fila) **oculto**.
  - Botón en el header (`aria-expanded`, `aria-controls` → id del panel) con **SVG inline** (mismo patrón que el CTA de landing; no emoji; no librería nueva — el repo no tiene Lucide/Phosphor en orbital).
  - Panel: contenedor **en el flujo del documento** bajo la fila del header (o anclado al bloque `headerActions` con `position: absolute` relativo al header, **sin** crear un segundo elemento `fixed` full-width que compita como chrome). Los 3 destinos: `/mis-rutas`, `/configurador-de-ruta`, `/ajustes/tokens`.
  - Avatar **visible** en la misma fila del header.
- En viewport **≥ ~48rem**: botón y panel ocultos; nav en una línea (`white-space: nowrap`, sin `flex-wrap`).
- **Login:** Stitch mantiene nav en header; no se oculta sin alternativa. Mantener nav login visible en una línea; **no** exigir el disclosure en login salvo que el apply detecte overflow real — default: sin menú hamburguesa en variante login (CA4 de spec apunta a header **product**).

### Estados de presentación (menú)

| Estado | Comportamiento observable |
|---|---|
| **Cerrado (default)** | `aria-expanded="false"`; panel no visible / no enfocable; 3 destinos no en tab order del panel |
| **Abierto** | `aria-expanded="true"`; panel visible; 3 links + foco visible; Escape → cerrado; elegir link → navegación (cierre implícito al unmount/route) |
| **Hover** (botón) | Color vía token existente (`--orbital-lime` / ink-muted), misma familia que links del header |
| **Focus** | Outline global `--orbital-focus` (ya en `globals.css`); no silenciar |
| **Active** | Feedback breve; sin `transition: all` |
| **Disabled** | N/A (control siempre disponible en &lt;48rem product) |
| **Loading** | N/A (sin fetch) |

Motion: abrir/cerrar panel ≤ 240ms con `--orbital-motion-fast` o `--orbital-motion-standard`; respetar `prefers-reduced-motion`.

## Flujo feliz + errores de presentación

### Flujo feliz — producto

1. Request a `/`, `/mis-rutas`, etc. → Root (providers) → `(producto)/layout` → un `MissionShell` product → página.
2. ≥48rem: header 4rem una línea; 3 links + avatar; contenido con `padding-top: 4rem`.
3. &lt;48rem: botón menú + avatar; abrir → 3 destinos por teclado; sin doble chrome fijo.

### Flujo feliz — acceso

1. `/login` o `/auth/error` → Root → `(acceso)/layout` → un `MissionShell` login → página **sin** segundo shell.
2. Exactamente un `<header>` y un `<footer>` de shell; un skip a `#login-shell-content`.
3. `LoginPanel` / `returnTo` / Discord sin cambios.

### Errores / bordes de presentación (no HTTP)

| Situación | Código / señal de test | Resultado esperado |
|---|---|---|
| Anidado root+login (regresión) | `ui.shell.double_chrome` | Fail: &gt;1 header/footer de shell en `/login` o `/auth/error` |
| Menú cerrado + Tab | `ui.shell.menu_closed` | Destinos del panel no alcanzables; chrome header sí |
| Menú abierto + teclado | `ui.shell.menu_open` | 3 destinos activables; foco visible |
| Escape con menú abierto | `ui.shell.menu_escape` | Vuelve a cerrado |
| Panel como 2.ª barra fixed | `ui.shell.menu_not_second_fixed_bar` | Fail si hay segundo `position: fixed` full-width apilado como chrome |
| LOC &lt;48rem | `ui.landing.loc_hidden` | `.location` no visible |
| doorGrid columnas | `ui.landing.door_grid` | 1 / 2@48rem / 4@lg |
| MissionShell en root | `ui.shell.not_in_root` | `layout.tsx` root sin `<MissionShell>` |
| MissionShell en groups | `ui.shell.in_groups` | Presente en layouts `(producto)` y `(acceso)` |

No hay códigos RFC 9457: no hay API.

## Lenguaje visual — conformidad

- **Modo:** conformidad elevada (UI Orbital / tokens `--orbital-*` ya en `globals.css`).
- **Superficie:** producto (shell + landing existente); no modo creación.
- **Componentes que se extienden:**
  - `features/orbital/components/MissionShell.tsx` + `.module.css`
  - Isla nueva solo para estado del disclosure (no shell paralelo)
  - Landing: solo `page.module.css` (breakpoints)
- **Tokens consumidos (existentes, sin literales nuevos de marca):**
  - Color/superficie: `--orbital-header-surface`, `--orbital-header-border`, `--orbital-ink`, `--orbital-ink-muted`, `--orbital-lime`, `--orbital-cosmos`, `--orbital-night`, `--orbital-primary`, `--orbital-focus`, `--orbital-surface`
  - Espacio/radio/sombra: `--orbital-space-*`, `--orbital-gutter`, `--orbital-gutter-mobile`, `--orbital-radius-sm`, `--orbital-shadow-header`
  - Motion/tipo: `--orbital-motion-fast` / `--orbital-motion-standard`, `--orbital-font-display` / `--orbital-font-telemetry` / `--orbital-font-body`
- **Token faltante:** ninguno identificado para este scope. Si apply necesitara un valor no tokenizado → pedido incompleto (no inventar en implementación).
- **Icono del menú:** SVG inline propio (stroke alineado a iconos ya usados en landing), color heredado/token; nunca emoji.
- **Estados de interacción** del control nuevo: ver tabla del menú arriba (default/hover/focus/active; disabled/loading N/A).

## Breakpoints CSS (criterio apply)

| Señal Stitch | Valor de diseño |
|---|---|
| `md` | `min-width: 48rem` |
| `lg` (doorGrid 4 cols) | `min-width: 64rem` (lg Tailwind típico; alinea al CA “4 desde lg”) |
| Header altura | `min-height: 4rem`; content `padding-top: 4rem` |
| Nav product ≥ md | `flex-wrap: nowrap`; `white-space: nowrap` en links/fila |
| Media shell | Preferir **mobile-first** (`min-width`) al reescribir el bloque actual `@media (max-width: 42rem)` |

## Plan de tests (para `sdd-tasks` / apply)

1. **foundation:** `expect(root layout).not.toContain("<MissionShell>")`; sí en `(producto)/layout` y `(acceso)/layout`; conservar fonts / no `'use client'` en root.
2. **Anti-doble-shell:** source o DOM — en composición acceso, un `header` y un `footer`; CSS sin `:has(#login-content)`.
3. **dom product:** regresión landmarks + avatar visible en viewport estrecho mockeado; menú: closed/open/Escape/focus.
4. **landing:** source/CSS — `.location` con hide &lt; md; `.doorGrid` columnas mobile-first.
5. **fase-2 Discord:** correr sin editar asserts de contrato.

Escala: nivel 2 composición/presentación (spec). Sin segundo eje de camino crítico en esta feature.

## Orden de implementación sugerido (alineado a proposal)

1. Root sin shell + `(producto)` + moves + foundation.
2. `(acceso)` + login sin shell + borrar `:has()` + anti-doble-shell.
3. Header 4rem / nowrap / 48rem + `MissionShellMobileNav`.
4. Landing LOC + doorGrid + asserts.

## Fuera de scope (recordatorio)

Discord / `LoginPanel` / cookies / backend / pixel-diff C01–C36 / tokens globales nuevos / pathname client-side / conservar `:has()`.

## Checkpoint

Diseño **alineado al plan del usuario** (route groups + menú disclosure product + landing Stitch).  
**Aprobado para avanzar a `sdd-tasks`** según instrucción del orquestador (“Checkpoint: aprobado por el plan del usuario; siguiente sdd-tasks”).  
El orquestador no debe reabrir la dirección; siguiente artefacto: `tasks.md`.

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `.cursor/rules/constitution-codigo.mdc`, `CodeQuest-2026/specs/ui-shell-responsive/explore.md`, `CodeQuest-2026/specs/ui-shell-responsive/proposal.md`, `CodeQuest-2026/specs/ui-shell-responsive/spec.md`, `.cursor/skills/nextjs-reference/references/rol-por-archivo.md`, `.cursor/skills/frontend-reference/references/design-language.md`, `.cursor/skills/frontend-reference/references/css-responsive.md`

Lectura: .cursor/rules/constitution-fases.mdc e3160314  
Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
