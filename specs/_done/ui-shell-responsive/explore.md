# Explore — `ui-shell-responsive`

Pulido visual del shell App Router y landing: eliminar doble `MissionShell` en login, alinear header/breakpoints con Stitch, y montar shell `login` también en `/auth/error`. **Sin tocar** contrato Discord, `returnTo`, cookies, backend ni pixel-diff 36 celdas.

## Memoria previa consultada

- #1439 Shell Orbital DevTalles → confirma variante mínima login + header/footer DevTalles en `MissionShell.*` y tests fase-0; este cambio corrige el **montaje anidado**, no la marca/nav.
- #1442 Lote literal landing y login Orbital → landing/login ya traducidos a CSS Modules; alinear breakpoints/LOC/doorGrid sin reescribir copy.
- #1423 Fundación Orbital y gate de unidad → `MissionShell` global nació en `app/layout.tsx`; es la causa raíz del anidado con `login/page.tsx`.
- #1430 Pruebas DOM Orbital con jsdom → `fase-0/dom.test.tsx` monta variantes **aisladas**; no detecta anidado RootLayout→LoginPage.
- #1460 Traducción literal Stitch por lotes → objetivo de fidelidad DOM/breakpoints; pixel-diff C01–C36 sigue pendiente (fuera de scope acá).
- bugfix `"MissionShell doble header login"` → sin resultados.

Repo gana sobre memoria: el design previo ya decía que login **no** va dentro del shell de producto; el código actual lo viola.

## Qué existe hoy (evidencia)

### Doble shell en `/login` — confirmado

1. `frontend/src/app/layout.tsx` (`RootLayout`) envuelve **todo** `{children}` en `<MissionShell>` (variante default `product`).
2. `frontend/src/app/login/page.tsx` vuelve a montar `<MissionShell variant="login">` alrededor de `#login-content` + `LoginPanel`.
3. CSS parche en `MissionShell.module.css`:

```css
.shell:has(#login-content) > .header,
.shell:has(#login-content) > .footer { display: none; }
.shell:has(#login-content) > .content { min-height: 100vh; padding-top: 0; }
```

**Efecto:** DOM con dos shells (product + login) → dos headers y dos footers; el chrome del outer se oculta con `:has()`. Visualmente “uno”, estructuralmente anidado. Skip links duplicados (outer `#orbital-content` + login page + login shell `#login-shell-content`).

### Design previo ya lo prohibía

`specs/ui-stitch-orbital/design.md` (variantes):

- `product` vs `login`; la variante se decide en `app/`.
- Contenido de login **no** se fuerza dentro del shell de producto.
- Shell `login` debía cubrir `/login` **y** `/auth/error`.

Hoy `/auth/error` solo recibe el shell product del root (sin variante login).

### Header / responsive shell — confirmado vs Stitch

| Señal | Repo hoy | Stitch (fuente) |
|---|---|---|
| Altura header | `min-height: 4rem` + `padding-top: 4rem` en `.content` | `h-16` (4rem) + `whitespace-nowrap` en landing |
| Wrap nav | `.header nav { flex-wrap: wrap }` | `whitespace-nowrap` (una línea) |
| Móvil product (~42rem) | `.avatar { display: none }` | empty-state: `nav.hidden md:flex`, avatar visible |
| Móvil login (~42rem) | `.loginHeader nav { display: none }` | login HTML: nav siempre en header (sin `hidden md:`) |
| Breakpoint | `max-width: 42rem` (~672px) | Tailwind `md` ≈ 48rem / 768px |

No hay menú móvil (hamburger/drawer) ni en repo ni en empty-state Stitch: ocultar nav sin alternativa = **hueco a11y** si se sigue esa vía.

### Landing — confirmado vs Stitch

- `LOC:` en `page.tsx` + `.location` **siempre visible**; Stitch: `hidden md:inline-block`.
- `.doorGrid`: default 4 cols → 2 a `64rem` → 1 a `34rem`. Stitch: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` (mobile-first).

Fuentes Stitch en workspace: `stitch_devtalles_learning_path_generator/` (raíz del monorepo, no bajo `CodeQuest-2026/`).

### Tests que no ven el anidado

- `fase-0/dom.test.tsx`: monta `MissionShell` product/login **aislados**.
- `fase-0/foundation.test.ts`: **exige** `layout`).toContain("<MissionShell>")` en root — se romperá si root deja de envolver.
- `fase-0/root-layout.characterization.test.ts`: providers + home; no afirma MissionShell.
- `fase-1/landing.test.tsx`: copy/landmarks/radar; no breakpoints CSS ni LOC oculto.
- `fase-2/login*.ts(x)` / `auth-error.test.tsx`: contrato Discord / reasons / landmarks de página; no composición de shells.

### Providers (no mover sin necesidad)

`ProveedoresApp` + `AuthSessionHydrator` viven en root y son independientes del shell. Deben permanecer en root layout al sacar `MissionShell`.

## Patrón / arquitectura del proyecto

- **Frontend:** Next.js App Router (`next` **16.3.5**, Active LTS según `versiones-seguridad.md`) + React 19 + CSS Modules + tokens `--orbital-*` en `globals.css`.
- **Runtime:** self-hosted — `output: "standalone"` en `next.config.ts` + `frontend/Dockerfile` multi-stage (`node server.js`). No Vercel.
- **Capas UI:** `app/` (rutas/layouts) → `features/orbital` (shell visual) → `features/auth` (LoginPanel, hydrator; **fuera de scope de lógica**).
- **Sin route groups hoy:** todas las páginas cuelgan del único `app/layout.tsx`.
- **Nest backend** existe pero **fuera de scope**; CodeGraph lo trajo como ruido al explorar “login/auth”.

## Capas que tocaría el cambio (solo mapa — no implementar)

| Capa | Archivos / áreas |
|---|---|
| Root layout | `app/layout.tsx` — html/fuentes/providers; **sacar** MissionShell |
| Route group producto | `(producto)/layout.tsx` + mover `page.tsx`, `mis-rutas/**`, `configurador-de-ruta/**`, `ajustes/**` |
| Route group acceso | `(acceso)/layout.tsx` + mover `login/**`, `auth/**` con `variant="login"` |
| Login page | dejar de importar MissionShell |
| Shell CSS | `MissionShell.module.css` — borrar `:has()`, nowrap/1 línea, breakpoint ~48rem, menú móvil accesible |
| Landing CSS | `page.module.css` — LOC hide &lt; md; doorGrid 1/2/4 |
| Tests | foundation (assert de MissionShell en root), posible nuevo assert anti-anidado; DOM shell; landing breakpoints si se acuerdan |

URLs no cambian (route groups con `()` no afectan path).

## Propiedades del cambio

| Propiedad | Respuesta |
|---|---|
| **Reversible** | Sí — revert de PR restaura layouts; sin migraciones ni datos. |
| **Quién consume** | Nadie externo al repo (no cambia API/eventos). Solo UI Next. Señal “Cruza un contrato” **no** aplica al shell; Discord sigue fuera de scope. |
| **Cuándo corre** | Solo en request de página (render). No cron/cola/listener. |
| **Qué volumen** | N/A (UI). Sin filas de prod. |
| **Dinero / auth / datos sensibles** | Toca **chrome** de `/login` y `/auth/error` (superficie auth) pero **no** `auth.service`, cookies, `returnTo`, JWT ni backend. LoginPanel intacto si se respeta scope. |
| **Infra** | No migraciones/esquema/deploy/Dockerfile. Solo estructura `app/` + CSS + tests. |

## Blast radius (codegraph)

Índice: `.codegraph/` en raíz del workspace (`codegraph.db` presente). CLI + MCP `codegraph_explore` / `codegraph impact`.

### `codegraph impact MissionShell`

```
Impact of changing "MissionShell" — 6 affected symbols:
  MissionShell.tsx (def)
  RootLayout @ layout.tsx:43
  LoginPage @ login/page.tsx:15
  fase-0/dom.test.tsx
```

Callers de montaje: **solo** `layout.tsx` + `login/page.tsx` (+ tests). Ninguna otra página importa `MissionShell` directo — el blast de producto es **indirección vía RootLayout** sobre todas las rutas App Router.

### `codegraph impact RootLayout`

Solo el propio `layout.tsx` (símbolo). El impacto real es estructural: todas las `page.tsx` bajo `app/` heredan el wrapper.

### `codegraph impact LoginPage`

Solo `login/page.tsx`. `LoginPanel` (callers: login page + `fase-2/login.test.tsx`) **no** debe cambiar firma/contrato.

### Dependencias de providers (no impactadas si quedan en root)

- `ProveedoresApp` ← RootLayout
- `AuthSessionHydrator` ← ProveedoresApp (fetchMe / demo session)

### Rutas App Router bajo el shell actual (todas afectadas por mover el wrapper)

| Ruta | Shell esperado post-cambio |
|---|---|
| `/` | product |
| `/mis-rutas`, `/mis-rutas/[routeId]`, `.../replanificacion`, `.../github`, `.../checkpoints/typescript` | product |
| `/configurador-de-ruta`, `/configurador-de-ruta/resultados` | product |
| `/ajustes/tokens` | product |
| `/login` | login (una sola vez) |
| `/auth/error` | login (hoy: product implícito) |

## Tabla de flujos conectados

| Flujo conectado | ¿El cambio lo TOCA? | ¿Tiene test hoy? | Nivel actual / requerido |
|---|---|---|---|
| `RootLayout` → `MissionShell` (product global) | **sí** — se saca del root; composição pasa a route groups | sí (foundation source assert + DOM aislado) | happy path source/DOM / **happy + assert de composición (1 shell)** |
| `LoginPage` → `MissionShell variant=login` anidado | **sí** — deja de montar shell; depende del layout `(acceso)` | sí DOM aislado; **no** test de anidado | happy aislado / **happy + anti-doble-shell** |
| `/auth/error` + shell | **sí** — pasa a shell login (hoy product) | sí (reasons/landmarks source) | happy source / happy + landmark shell login |
| Product pages vía layout (`/`, mis-rutas, configurador, ajustes) | **sí** — mismo wrapper, distinta carpeta de layout | parcial (landing/dashboard DOM; no layout tree) | happy pantallas / regresión shell product en 1 ruta |
| `LoginPanel` + Discord (`discordStartUrl`, returnTo) | **no** (fuera de scope; no debe tocarse) | sí fase-2 contract/login | happy+bordes auth UI / nivel 2 auth — **mantener** |
| `AuthSessionHydrator` / cookies / `fetchMe` | **no** si providers quedan en root | no directos en hop 3 | N/A este cambio |
| Landing LOC + `doorGrid` breakpoints | **sí** — CSS Modules | parcial (landing DOM copy; **no** media queries) | happy copy / happy + asserts CSS o viewport |
| Header 1 línea + nav móvil accesible | **sí** — `MissionShell.module.css` (+ posible markup menú) | no (solo `flex-wrap` actual) | sin tests / happy + a11y teclado en &lt;48rem |
| Backend Identity / Discord OAuth | **no** | N/A | N/A |

**Candidato #1 a romperse en silencio:** composición RootLayout+Login sin test de anidado + `foundation.test.ts` que **exige** MissionShell en root (fallará al mover y hay que actualizarlo a propósito, no “relajar” el assert sin spec).

## Estado de tests — detalle y deuda

| Flujo | Nivel actual | Requerido (naturaleza) | Hueco / deuda |
|---|---|---|---|
| Shell product/login DOM | happy path aislado | flujo con lógica de composición → happy + error/borde (doble shell, landmark único) | **Deuda:** no hay test de árbol anidado ni de “exactamente un header” |
| Foundation layout | source snapshot | actualizar criterio (MissionShell en group, no root) | **Deuda de prueba frágil:** assert actual acoplado al bug |
| Landing | happy DOM copy | CSS responsive = lógica de presentación | **Deuda:** sin assert LOC hidden / doorGrid columns |
| Auth Discord | happy+contract | camino crítico auth — **fuera de scope**; no bajar cobertura | No abrir; no tocar asserts de contrato |
| `/auth/error` shell | source landmarks | + shell login visible | **Deuda:** no verifica header login |

### Segundo eje (flujos críticos existentes — solo lectura)

| Flujo crítico | Concurrencia | Cruza contrato | Depende del tiempo | Muta invariante dinero/estado |
|---|---|---|---|---|
| Discord login (`LoginPanel` → `discordStartUrl`) | N/A UI | **Sí** (OAuth) — **no tocado** | no | no |
| `AuthSessionHydrator` / sesión cookie | N/A | sesión JWT via API | mount once | setUser/hydrated |

Ninguna dimensión del segundo eje se abre **si** el cambio se limita a layouts/CSS. Si apply toca `LoginPanel`/`auth.service` → fuera de explore y dispara triage de contrato.

## Tamaño vs riesgo vs complejidad de dominio

| Eje | Valor | Nota |
|---|---|---|
| **Tamaño** | **Mediana** | Varios archivos App Router + CSS + tests; no es 1-archivo trivial. Route groups = flujo de composición nuevo. |
| **Complejidad de dominio** | **Baja** | Presentación/layout/CSS; sin reglas de negocio nuevas. |
| **Riesgo** | **MEDIO** | Reversible y sin backend; pero: (1) reestructura layouts que envuelven **todas** las rutas, (2) superficie auth (`/login`, `/auth/error`) aunque sin contrato Discord, (3) a11y nav móvil, (4) tests foundation acoplados al estado roto. No ALTO: no dinero, no schema, no cambio de API. |

Justificación en una línea: **fallo = chrome roto o doble/ausente shell en auth/producto; no pérdida de sesión ni OAuth si se respeta el scope.**

No es refactor de legacy de alto acoplamiento de dominio; sí es **corrección estructural** alineada al design ya escrito → `propose` puede ser corto (dirección ya clara); plan escalonado solo si se mezcla con pixel-diff o auth contract (ambos fuera de scope).

## Dirección propuesta (solo documentar blast — no implementar)

1. Root: html + fonts + `ProveedoresApp` + `ProveedorNotificaciones` + `{children}`.
2. `(producto)/layout.tsx` → `<MissionShell>{children}</MissionShell>`.
3. `(acceso)/layout.tsx` → `<MissionShell variant="login">{children}</MissionShell>` para `/login` y `/auth/error`.
4. `login/page.tsx` sin `MissionShell`; borrar reglas `:has(#login-content)`.
5. Header una línea 4rem (`nowrap` / sin wrap); breakpoint móvil ~48rem; **menú accesible** si se oculta nav.
6. Landing: LOC `hidden` &lt; md; doorGrid 1 / md:2 / lg:4 (mobile-first preferible).

## Fuera de scope (explícito)

Discord contract, `returnTo`, cookies, backend, pixel-diff 36 celdas, reescritura de copy Stitch, tokens globales nuevos, Nest Identity.

## Framework / skills para el resto del pipeline

- Next.js App Router → `nextjs-reference` (+ `rol-por-archivo.md` al codear layouts).
- UI/CSS responsive + a11y → `frontend-reference` (`css-responsive`, `accessibility`, `design-language` en conformidad).
- No Angular / no Nest en este feature (salvo no tocar backend).
- Database skill: **no aplica** (sin schema/jobs).

## 📚 Referencias cargadas

- `.cursor/rules/constitution-codigo.mdc`
- `.cursor/rules/herramientas-detalle.mdc`
- `.cursor/skills/nextjs-reference/SKILL.md`
- `.cursor/skills/nextjs-reference/references/versiones-seguridad.md` (Next 16.3.5 = Active LTS)
- `.cursor/skills/nextjs-reference/references/deploy-runtime.md` (self-hosted / standalone)
- `.cursor/skills/frontend-reference/SKILL.md`
- `.cursor/skills/frontend-reference/references/css-responsive.md`
- `specs/ui-stitch-orbital/design.md` (variantes shell)
- Fuentes Stitch: `stitch_devtalles_learning_path_generator/landing_descubre_tu_ruta`, `login_..._2`, `mis_rutas_estado_vacío`

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
Lectura: .cursor/rules/herramientas-detalle.mdc 801a70f1
