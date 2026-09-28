# Explore — `ui-devtalles-polish`

> Fase: `sdd-explore`. Solo lectura del código de la app; este archivo es la única escritura.
> Fecha: 2026-09-27. Repo: `CodeQuest-2026/` (git limpio en código de app; HEAD `0d1a541`).

## Memoria previa consultada

- `mem_search "ui orbital stitch copy shell login register"` → sin resultados.
- `mem_search "coverImageUrl course card path-diagram widget"` → sin resultados.
- `mem_search "stitch orbital literal copy"` → 3 resultados:
  - **#1460 Traducción literal Stitch por lotes** (architecture, 2026-09-22) → la UI actual es una traducción **literal** de 12 pantallas Stitch (copy, DOM, layout, breakpoints). La dirección "HUMANIZAR" del dev **revierte esa decisión**: el copy terminal (`ALGO // ALGO`, uppercase, "telemetría") es herencia literal de Stitch. La nueva decisión debe registrarse como superadora (ADR + `mem_save` con relación `supersedes` sobre #1460). No es contradicción con el repo; es una decisión nueva del dev.
  - #1443 / #1451 (session summaries de lotes 2 y 4) → confirman que landing/login/assessment/checkpoint copiaron copy literal y son mock-only sin red.
- Hallazgo del repo (no de memoria): **ADR `decisions/0001-ui-stitch-orbital.md` (accepted)** dice textualmente "*sin Tailwind ni librerías de iconos nuevas*" y en *Confirmación*: "*ausencia de Tailwind/iconos nuevos*". Instalar `lucide-react` **contradice un ADR aceptado** → hace falta addendum/ADR 0002 que lo supere antes de `apply`. (El ADR también menciona "Material Symbols Outlined con uso mínimo": no hay ningún uso de Material Symbols en `src/` hoy.)

## Stack y framework detectado

- **Frontend**: Next.js `16.3.5` (App Router) — `16.x` = *Active LTS* según `nextjs-reference/references/versiones-seguridad.md` (verificado 2026-09-22) → versión soportada, sin 🛑. React `19.3.0`. CSS Modules + tokens `--orbital-*` en `frontend/src/app/globals.css`. Tests: vitest `3.2.7` + jsdom (`frontend/vitest.config.ts`, include `test/**`).
- **Runtime front**: self-hosted — `output: "standalone"` en `frontend/next.config.ts` + `Dockerfile`. No hay `next/image` en uso (todo es `<img>` plano: avatar Discord, crew). No hay CSP (ni headers en `next.config.ts`, ni `middleware.ts`/`proxy.ts`).
- **Paquete local** `frontend/path-diagram/` (`"path-diagram": "file:./path-diagram"`, `transpilePackages`): React Flow `@xyflow/react ^12.8.4`, `@modelcontextprotocol/ext-apps 1.7.5`; se consume en la web **y** se compila a widget MCP single-file (`vite.widget.config.ts`, `assetsInlineLimit: 100000000` → assets importados se inlinean como data URI).
- **Backend**: NestJS (vitest también, `npm test` = `vitest run`). No es Angular.
- `lucide-react`: **NO instalado** (ni en `frontend/node_modules` ni en el root hoisted). En registry: `1.48.0`, license ISC, peer `react ^16.5.1 || ^17 || ^18 || ^19` → compatible con React 19.3.
- Gate: `sdd.paths.json` incluye `src/**/auth/**` → tocar `frontend/src/features/auth/**` (ShellAccount, LoginPanel) **exige spec aprobada** para commitear.

## Propiedades del cambio

| Propiedad | Respuesta |
|---|---|
| **Reversible** | Sí en su totalidad: copy, CSS, iconos vendorizados y exposición de `coverImageUrl` se revierten con un revert de PR. No hay migraciones ni datos cambiados (el snapshot del catálogo en Redis ya contiene `coverImageUrl`; solo se deja de descartar). |
| **Quién consume** | **Sí, hay consumidor externo** en el sub-alcance 6 (covers): `CourseCard` viaja en `GET /catalog/courses/:courseId`, dentro de `LearningPathDetailDto.items[].detail` (REST `/me/learning-paths/:id`, SSE `path.saved`) **y** en la tool MCP de usuario `get_my_path` (`mcp-user-tools.ts:156-174` hace `...detail`) → clientes MCP externos (Claude, Cursor). Agregar un campo es aditivo (no breaking), pero **cruza un contrato**. El resto del alcance (copy/CSS/iconos) no tiene consumidor externo. |
| **Cuándo corre** | No aplica: nada nuevo recurrente. (El scraper que llena `coverImageUrl` ya existe y no se toca.) |
| **Qué volumen** | Catálogo ~80 cursos (fixture `listing-all.html` tiene 80 covers `import.cdn.thinkific.com`; `minCourses: 50`); 13 rutas oficiales; 14 SVG de stack (844 B–4.3 KB c/u). Crece lento (decenas/año). No requiere fixture de volumen. |
| **Dinero / auth / datos sensibles** | Toca **UI de auth** (ShellAccount/LoginPanel: copy y botones), **no** la lógica OAuth (`discordStartUrl`, `authEntryPath`, callback). Sin dinero. Avatar Discord ya se muestra hoy. |
| **Infra** | Mínima: agrega dependencia npm (`lucide-react`) y assets estáticos en `public/`. Si se usara `next/image` para covers → `images.remotePatterns` en `next.config.ts` (arranque/build) + `sharp` en standalone. Con `<img>` plano (patrón existente) no hay cambio de infra. |

## Riesgo

**Global: MEDIO** — el grueso (copy, CSS, iconos) es BAJO y reversible, pero (a) el sub-alcance de covers cruza un contrato consumido por clientes MCP externos, (b) toca pantallas de auth (gate `src/**/auth/**`), (c) contradice un ADR aceptado (iconos) y una decisión de arquitectura previa (#1460 literal), y (d) rompe ~20 asserts de tests de caracterización que fijan copy/CSS literal.

| Área | Riesgo | Justificación |
|---|---|---|
| 1. Shell/auth (ShellAccount, MissionShell, MobileNav) | **MEDIO** | UI de auth en todas las páginas; tests de caracterización fijan CSS (`nowrap`, `48rem`, sin `max-width: 42rem`) y links `/login` + `/registro`. Lógica OAuth no se toca. |
| 2. Copy `//` | BAJO | Strings estáticos; sin consumidores externos. |
| 3. `text-transform` | BAJO | CSS local; ojo con tags (lowercase en datos). |
| 4. Hex sueltos / `user-select` | BAJO (web) / **MEDIO** (path-diagram) | En `path-diagram/` los hex son deliberados: el widget MCP no carga `globals.css`, reemplazarlos por `var(--orbital-*)` sin fallback deja el widget sin colores. |
| 5. SVG → Lucide | BAJO-MEDIO | Nueva dependencia contra ADR 0001; cambia conteo de `svg circle` en landing.test. |
| 6. Covers (`coverImageUrl`) | **MEDIO** | Cambio de contrato aditivo con consumidor externo (MCP `get_my_path`), backend + front + paquete; hotlink a CDN de terceros; URL scrapeada = input externo sin validar hoy. |
| 7. Icono por ruta oficial | BAJO | Mapa estático cerrado de 13 ids; front-only si se usa `sourceCatalogPathId` que el backend ya devuelve. |
| 8. Layout configurador | BAJO | CSS del page + MyRouteStatus. |
| 9. LivePath tokens | BAJO | CSS; token `--live-display` inexistente hoy. |

- Tipo: intervención sobre UI existente (acoplamiento medio con tests de caracterización), no refactor de legacy de dominio → **no** requiere plan escalonado de `refactor-legacy.md`, pero conviene lotes por área (reversibles) como ya se hizo en ui-stitch-orbital.
- Complejidad de dominio: **baja** (presentación). Sin DDD/Clean; el único punto con lógica es el mapeo de covers (backend `toCourseCard`) y el mapa ruta→icono.
- Tamaño: ~35–45 archivos de front, 2–4 de backend, ~15 de tests.

## Blast radius (codegraph)

`.codegraph/` existe en la raíz del workspace. Salidas de `codegraph_explore` resumidas (consumidores + archivos):

- **`toCourseCard`** (`backend/src/modules/catalog-scraper/application/course-card.ts:17`) — 5 callers en `catalog-scraper/nest/catalog-scraper.service.ts` (`getCourseCard:68` → controller `GET /catalog/courses/:courseId`) y `learning-paths/learning-paths.service.ts` (`courseCard:62` → `toItemDto:501` → `toDetail:456` → `getById/create/update/addItem/saveGenerated` + `announce` SSE). Test: `course-card.spec.ts`.
- **`CourseCard` (backend type)** — 3 refs: `learning-paths.service.ts` (`LearningPathCourseCardDto = CourseCard`, `LearningPathItemDto.detail`), `course-card.ts`. Tested via `course-card.spec.ts`.
- **`courseCard` / `LearningPathItemDto.detail`** — consumido por `frontend/path-diagram/src/path-diagram.tsx` (vía `modelFromUserPath` → `DiagramItem.detail`), tests `path-diagram.drag/progress/modal/flow.test.tsx`.
- **`LearningPathCourseCardDto`** — 2 refs internas en `learning-paths.service.ts`; sin tests directos. Se serializa además en `mcp-user/mcp-user-tools.ts:156-174` (`get_my_path` → `...detail`) — **consumidor externo**.
- **`loadCourseCard`** (`frontend/src/lib/load-course-card.ts:4`) — 2 callers: `features/learning-paths/components/UserRouteDiagram.tsx`, `features/live-path/components/LivePathScreen.tsx`; *no tests within 3 caller hops*.
- **`CourseCard` (front type)** (`frontend/path-diagram/src/model.ts:5`) — usado por `load-course-card.ts`, `load-path-detail.ts`, `model.ts` (`DiagramItem.detail`, `modelFromToolResult`, `modelFromUserPath`), `path-diagram.tsx` (`withCard`, `CourseModal`).
- **`getCourse` MCP público** (`mcp-public/catalog-read.ts:65`) — **no** usa `toCourseCard`; arma su propio shape snake_case sin cover. 2 callers en `register-mcp-tools.ts`.
- **`layoutPath`** (`path-diagram/src/layout-path.ts:254`) — 4 callers (`path-diagram.tsx`, `index.ts`); test `layout-path.test.ts` (13 tests).
- **`LivePathModal`** — 2 callers en `MissionShell.tsx`; tested via `fase-0/dom.test.tsx`, `fase-0/mobile-nav.test.tsx`.
- **`MissionRadarLive`** — `app/(producto)/page.tsx`; tested via `fase-1/landing.test.tsx`.
- **`UserRouteDiagram`** — `app/(producto)/mis-rutas/[routeId]/page.tsx`; test `UserRouteDiagram.test.tsx`.
- **`LearningPathsDashboard`** — `app/(producto)/mis-rutas/page.tsx`; tests `LearningPathsDashboard.test.tsx`, `fase-0/dom.test.tsx`, `fase-3/routes-dom.test.tsx`.
- **`ShellAccount`** — `MissionShell.tsx` (2 variantes: product y login); test `ShellAccount.test.tsx`, `fase-0/dom.test.tsx`, `mobile-nav.test.tsx`.
- **`registerPathDiagram`** (`mcp-public/path-diagram-resource.ts:24`) — **0 callers fuera de specs**: el widget MCP **no está registrado hoy** (y `mcp-user/path-diagram-ui.spec.ts` afirma que el MCP de usuario no anuncia `_meta.ui`). El widget está dormido.

Componentes **huérfanos** (ninguna ruta los renderiza; solo los usan tests): `RouteDetail.tsx`, `AssessmentWizard.tsx`, `OrbitalDemoBanner.tsx` (este ni siquiera en tests). Concentran gran parte del copy `//`.

---

## 1. Shell / auth

- `frontend/src/features/auth/components/ShellAccount.tsx:42-55` — sin sesión muestra dos links: **"Login"** (`authEntryPath("login")` → `/login`) y **"Register"** (`/registro`, `authButtonPrimary`). Ambas páginas renderizan `AuthenticatedEntry` → `LoginPanel` que apunta al **mismo** `discordStartUrl(returnTo)` (`auth.service.ts:22-35`; comentario L32: "*Same Discord OAuth for both screens. Register creates the user on first callback*"). Redundante y en inglés.
- Con sesión (L58-78): botón avatar+nombre, panel con "Salir". `.accountPanel` usa `background: #121028` y `border-radius: 12px` (`MissionShell.module.css:90-101`).
- `MissionShell.tsx:12-16` — `PRODUCT_LINKS`: "Mis rutas" `/mis-rutas`, **"Descubre tu ruta"** `/configurador-de-ruta`, "MCP" `/docs/mcp`.
  - Variante `product` (L50-83): header fijo; `desktopNav` (≥48rem) + `MissionShellMobileNav` + `ShellAccount` en `headerActions` (nowrap). Footer: "DevTalles • **Code Quest 2026**" (L76-80).
  - Variante `login` (L22-47): header grid `1fr auto` en mobile, `nav` `display:none` <48rem y **no hay MobileNav** → en mobile la variante login no ofrece navegación. Footer "DevTalles • Code Quest 2026".
- `MissionShellMobileNav.tsx` — panel con los 3 links; **auth queda fuera del menú** (a la derecha del botón hamburguesa, `authActions` con 2 botones de `min-height: 2rem`, `font-size: 0.6875rem`) → header mobile apretado: brand + hamburguesa + Login + Register en `nowrap`. Icono ad hoc `<svg>` hamburguesa/cerrar (L45-51).
- Touch target: `.authButton` `min-height: 2rem` (32px) — cumple ≥24px pero es menor al `2.75rem` del resto del header.
- Naming inconsistente del destino: nav "Descubre tu ruta" → `configurador-de-ruta/page.tsx:5` metadata title "**Configurador de ruta**" → `MyRouteStatus.tsx:80-83` kicker "**Mis rutas**" + h1 "**Tus rutas**". Además `/mis-rutas` (LearningPathsDashboard) también lista las rutas del usuario → dos páginas muestran "tus rutas". El CTA de landing (`landing.fixture.ts:31-32`) y las 4 "puertas" apuntan todas a `/configurador-de-ruta`.
- `LoginPanel.tsx:20` — `TERMINAL DE ACCESO // AUTH` (`.terminalLabel`, uppercase en CSS L28). h1 "Inicia sesión en tu misión" / "Creá tu cuenta"; mezcla voseo ("Creá", "entrás", "tenés") con tuteo ("Inicia", "Descubre", "Selecciona", "Copia y pega") en todo el front → decisión de registro pendiente.
- `LoginPanel.module.css:77,89,98` — `#5865f2`/`#4752c4`/`#fff` = colores de marca Discord (se quedan; son marca).

## 2. Inventario de copy `//` (frontend/src)

Viven (ruta renderizada):
| Archivo:línea | Texto |
|---|---|
| `app/(producto)/page.tsx:78` | `LOC: 09° // LAT 12° \| ESTADO: ACTIVO` |
| `app/(producto)/page.tsx:100` | `0% SPAM // ALINEADO CON LA INDUSTRIA TECH` |
| `app/(producto)/page.tsx:128` | `DISPATCH MODE // 04 STRATEGIC ENTRYPOINTS` |
| `app/(producto)/page.tsx:137` | `DOOR // {01..04}` |
| `app/(producto)/page.tsx:138` | `SYS.REF // {01}-{START}` |
| `features/orbital/fixtures/landing.fixture.ts:25` | `SISTEMA DE NAVEGACIÓN Y CALIBRACIÓN DE CARRERA // DEV_PATH_ORBITAL` |
| `features/orbital/components/MissionRadar.tsx:33` | `VECTOR DISPLAY // POLAR MATRIX` |
| `features/auth/components/LoginPanel.tsx:20` | `TERMINAL DE ACCESO // AUTH` |
| `features/integrations/components/GithubPreview.tsx:72` | toast `MENSAJE PARA DISCORD COPIADO // LISTO PARA PEGAR` |
| `features/integrations/components/GithubPreview.tsx:112` | `VISTA PREVIA EN ESCALA 1:1 // INYECCIÓN VECTORIAL` |
| `features/learning-paths/components/ReplanningProposal.tsx:81` | `LINEAL // BASELINE` |
| `features/learning-paths/components/ReplanningProposal.tsx:156` | `MOD // POST-DESPLIEGUE` / `MOD // CORE VINCULANTE` |
| `features/assessment/components/AssessmentResults.tsx:28` | `✦ DIAGNÓSTICO TELEMÉTRICO // SÍNTESIS` |
| `features/assessment/components/TypescriptCheckpoint.tsx:70,71,73,75` | `[SYS.EVAL // CHK-TS-01]`, `COORD: +42.08 // SEC.B`, `REG.ID // 0x98A1`, `✦ REQUISITO DE DESPEGUE // VERIFICACIÓN SINTÁCTICA` |

Huérfanos (solo tests): `RouteDetail.tsx:139,141,174,175,198,208,214` (`SYS.REG // DOSSIER 01`, `MISSION FILE // RUTA 01`, `START // BASELINE`, `END // DEPLOY`, `✦ TRAYECTORIA DE APRENDIZAJE // 4 HITOS SECUENCIALES`, `CURSO 02 // NODO EN EJECUCIÓN`…); `AssessmentWizard.tsx:75` (`✦ ESCENARIO SITUACIONAL // VECTOR DE INTERÉS`).

`path-diagram/` y `widget/`: **sin** copy `//`.

Copy terminal **sin** `//` (mismo estilo, a humanizar según la dirección): `landing.fixture.ts:33-35` (`MOTOR / RIASEC.DEV v2.4`, `TAXONOMÍA / 38 RUTAS ACTIVAS`, `CERTIFICACIÓN / 100% PRODUCCIÓN`), `:76-78` (`ESTRUCTURADO POR FERNANDO HERRERA`, `TELEMETRÍA EN TIEMPO REAL`, `CERO DEUDA TÉCNICA`), `page.tsx:99,122,149` (`CALIBRACIÓN ESTIMADA: ~4 MINUTOS`, `SELECCIONA TU PUNTO DE PARTIDA…VECTOR`, `CALIBRAR ESTE PUNTO`), `MissionRadar.tsx:8-13,93,95` (`TS_FOUND`, `NEST.SYS`, `PROPULSIÓN: DIRECTA`, `SIMULACIÓN: READY`), `GithubPreview.tsx:49,87,93,97,98,115,116`, `AssessmentResults.tsx:65,71,79,80,96`, `TypescriptCheckpoint.tsx:22,72,96,102`, `ReplanningProposal.tsx:84,90`, `assessment.fixture.ts:88-142`, `learning-paths.fixture.ts:52-89`.

⚠️ **Anti-invención (hallazgo, no pedido)**: varios textos de landing son **cifras/afirmaciones inventadas** que parecen reales: "38 RUTAS ACTIVAS" (el catálogo tiene **13** rutas oficiales, `OFFICIAL_PATH_IDS`), "100% PRODUCCIÓN", "RIASEC.DEV v2.4", "~4 MINUTOS", "ESTRUCTURADO POR FERNANDO HERRERA", "CERO DEUDA TÉCNICA", "0% SPAM". Humanizar el copy es la oportunidad de quitarlas o reemplazarlas por datos verificables — decisión del dev.

Otros textos de UI a revisar al humanizar: `MyRouteStatus.tsx:199` placeholder visible en prod **"El video va acá"**; `LivePathScreen.tsx:37` "Esperando que **Claude** arme la ruta" (el flujo también sirve para Cursor, ver `MyRouteStatus.tsx:223`); `mis-rutas/[routeId]/page.tsx:7` metadata "Detalle **mock** de una ruta" y la página no tiene `<h1>` con el nombre de la ruta.

## 3. `text-transform` en CSS

`uppercase` salvo indicación. (★ = aplica a un **título/heading**.)

- `path-diagram/src/path-diagram.module.css:53` `.header,.groupLabel` (headers de columna; además `layout-path.ts:45-47,108` ya trae los labels **en mayúsculas literales** "REQUERIDO"/"RECOMENDADO"/"OPCIONAL"/"EN CUALQUIER MOMENTO", mientras `verticalLayout` usa "Requerido"… → inconsistente entre desktop y mobile); `:96` `.kicker` (bucket en el modal); ★`:143` `.dialog h3` ("Video de introducción", "Temas", "Requisitos"…); `:192` `.tags li`.
- `path-diagram/src/path-card.module.css:116` `.start` ("Empieza aquí"), `:125` `.status`.
- `app/(producto)/page.module.css:554` `.social`, `:581` `.crewList span`.
- `features/auth/components/LoginPanel.module.css:19` `.eyebrow`, `:28` `.terminalLabel`, `:140` `.field label`.
- `app/(acceso)/auth/error/page.module.css:43` `.eyebrow`.
- `features/learning-paths/components/MyRouteStatus.module.css:14` `.kicker` ("Mis rutas").
- `features/learning-paths/components/LearningPathsDashboard.module.css:47,373` `.routeLabel`, `:166` `.gaugeOrbit`, `:202,395` `.telemetry`, `:319` `.cardStatus`.
- ★`app/(producto)/mis-rutas/page.module.css:27` `.heading h1` → **`lowercase`**.
- `features/live-path/components/LivePathScreen.module.css:20` ★`.kicker,.title` (título de la ruta en vivo en mayúsculas), `:44` `.connection`, ★`:84` `.notes h2`.
- `features/mcp-docs/components/McpDocs.module.css:15` `.kicker`.
- `features/integrations/components/GithubPreview.module.css:17,193,220`.
- `features/learning-paths/components/ReplanningProposal.module.css:36,199`.
- `features/assessment/components/AssessmentResults.module.css:22,282,352` + ★`:176` `.archetypeHeader > span` **lowercase**.
- `features/assessment/components/TypescriptCheckpoint.module.css:31`.
- Huérfanos: `AssessmentWizard.module.css:57,220,276,294,361,398`; `RouteDetail.module.css:41,233,279,353` + ★`:248,405,456` **lowercase** (h2/h3); `OrbitalDemoBanner.module.css:18`.
- Títulos escritos en minúscula **en el JSX** (no por CSS): `page.tsx:82-84` h1 "descubre tu ruta de / aprendizaje ideal", `:125` h2 "puertas de acceso a la misión", `:194` h2 "desarrolladores"; `landing.fixture.ts:26,40,48,56,64` (title + labels de puertas en minúscula).
- **Tags del catálogo**: `backend/.../parse-learning-path.ts:127-140` `extractTags` guarda `t.toLowerCase()` de clases `bases|frontend|backend|movil|mobile` → datos en minúscula ("bases", "backend"). El front los muestra con `.tags li { text-transform: uppercase }`. Para oración/capitalizado hace falta un mapeo de presentación en el front (no tocar backend) — ojo: `path-diagram.modal.test.tsx:74` hace `toContain("bases")` (case-sensitive) → si el label se transforma en JS, rompe; si se usa CSS `text-transform: capitalize`, no.

## 4. Hex sueltos y `user-select`

Tokens relevantes existentes (`globals.css:2-64`): `--orbital-surface #121125`, `--orbital-cosmos #09081c`, `--orbital-night #110c30`, `--orbital-surface-container-lowest #0d0c20`, `--orbital-surface-container-low #1a192e`, `--orbital-lime #c8dd0b`, `--orbital-ink #fff`, `--orbital-on-surface #e3dffc`, `--orbital-primary #d3bbff`, `--orbital-border`, `--orbital-header-border`, `--orbital-radius-md 0.75rem`, `--orbital-shadow-panel`. **No existen** tokens para `#130c25`, `#121028`, `#16122c`, `#171228`, `#1c1829`, `#f0eeff`, `#dcd8ff`, `#8eb6ff`, `#c0b9fc`, `#e7c27a` → mapearlos al token más cercano o crear token = decisión de spec (regla "token faltante → PARÁ y avisá").

- `features/live-path/components/LivePathScreen.module.css:4-5,41,85,137-138,186-187,194-195` — `#130c25`, `#f0eeff`, `#c8dd0b`, `#1c1829`; además `rgba(192,185,252,…)`, `border-radius: 20px/30px/16px`, `padding: 32px 24px`, `max-width: 1200px`, `transition: … 280ms ease` (curva sin carácter), y **`var(--live-display)` que no está definido en ningún lado** (cae a `sans-serif`). `.page` (L1-7) no se usa en `LivePathScreen.tsx`. Botón cerrar usa **`×` unicode como icono** (`LivePathScreen.tsx:29`) → viola el piso "nunca unicode como icono".
- `features/learning-paths/components/MyRouteStatus.module.css:86` `#16122c` (picker), `:105` `#121028` (menú), `:142` `var(--orbital-surface, #130c25)` (fallback innecesario); radios `12px/16px/8px` literales; `rgb(200 221 11 / …)` = lime con alpha literal.
- `features/orbital/components/MissionShell.module.css:99` `.accountPanel` `#121028`, `box-shadow: 0 12px 32px rgb(0 0 0 / 35%)`, `border-radius: 12px`; `:334` `rgb(120 94 172 / 20%)`; `:351` `rgb(255 255 255 / 80%)`.
- `app/(producto)/page.module.css:525` `#171228`, `:549` `#f0eeff`, `:564-565` `#c8dd0b`.
- `app/_componentes/notificacion.module.css:9,27,36,56` — `#fff`, `#0284c7`, `#0f172a`, gradiente `#0284c7→#22d3ee`: toast global con **paleta Tailwind clara**, fuera de Orbital (se usa en todo el sitio vía `ProveedorNotificaciones` del root layout). No estaba en la lista del pedido.
- `path-diagram/src/path-diagram.module.css` (10 hex) y `path-card.module.css` (21 hex): **deliberados** porque el paquete se compila a widget standalone sin `globals.css`. Opciones: dejar hex, o `var(--orbital-x, #hex)` con fallback. Además `MarkerType` color `#dcd8ff` hardcodeado en `path-diagram.tsx:340` (JS).
- `LoginPanel.module.css:77,89,98` — marca Discord, se queda.
- **`user-select: none`**: único caso `app/(producto)/page.module.css:11` sobre `.page` (toda la landing) → impide seleccionar/copiar texto de la landing (a11y/UX). Ningún test lo fija.

## 5. SVG ad hoc — chrome vs marca/ilustración

| Archivo:línea | Qué es | Clasificación | Equivalente Lucide (a verificar en el paquete) |
|---|---|---|---|
| `MissionShellMobileNav.tsx:45-51` | hamburguesa / cerrar | **chrome** | `Menu` / `X` |
| `MyRouteStatus.tsx:214-219` | copiar | **chrome** | `Copy` (+ `Check` al copiar) |
| `LivePathScreen.tsx:29` | `×` unicode (no svg) | **chrome** | `X` |
| `app/(producto)/page.tsx:92-94` | flecha CTA | **chrome** | `ArrowRight` |
| `app/(producto)/page.tsx:150-152` | flecha diagonal "calibrar" | **chrome** | `ArrowUpRight` |
| `app/(producto)/page.tsx:57-62` (`SocialIcon` "web") | link externo | **chrome** | `ExternalLink` |
| `app/(producto)/page.tsx:166-169` | icono de protocolo (círculo+ejes) | chrome decorativo | `Globe`/`Orbit` — **tiene `<circle>` → cambia el conteo de landing.test L61** |
| `app/_componentes/NotificacionSuperior.tsx:98-106` | alerta (círculo + !) | **chrome** | `CircleAlert` (también tiene circle; no afecta landing) |
| `RouteDetail.tsx:126-128` (huérfano) | triángulo alerta | chrome | `TriangleAlert` |
| `app/(producto)/page.tsx:38-44` / `:48-53` | GitHub / LinkedIn | **marca** → se queda | (Lucide v1 no garantiza iconos de marca — supuesto a verificar) |
| `LoginPanel.tsx:40-45` | logo Discord | **marca** → se queda | — |
| `MissionRadar.tsx:36…` | radar (role=img, title/desc) | **ilustración** → se queda | — |
| `LearningPathsDashboard.tsx:128…` | gauge de progreso (role=img) | **ilustración/dato** → se queda | — |
| `LearningPathsEmptyState.tsx:8` | ilustración estado vacío | **ilustración** → se queda | — |
| `GithubPreview.tsx:101` | insignia (role=img) | **ilustración** → se queda | — |
| `AssessmentResults.tsx:33` | radar hexagonal (role=img) | **ilustración** → se queda | — |

Otros "iconos" unicode decorativos: `✦`, `●`, `✓`, `•` en ~32 líneas `.tsx` (mayoría `aria-hidden`). El piso de oficio prohíbe unicode **como icono**; `✦` usado como viñeta decorativa es decisión de spec.

## 6. Pipeline de imágenes de curso (`coverImageUrl`)

Origen → pérdida → consumidores:

1. **Scraper**: `backend/.../parsers/parse-course-page.ts:68` `coverImageUrl: metaContent($, 'og:image')` → `domain/models.ts:47` `Course.coverImageUrl: string | null` → `CatalogCourse` (`domain/catalog.ts:11`) → snapshot en Redis. Test `parse-course-page.spec.ts:21` `toContain('thinkific.com')`.
2. **Se pierde** en `backend/.../application/course-card.ts:3-15` (type `CourseCard` sin cover) y `:28-46` (`toCourseCard` no lo copia).
3. Consumidores de `CourseCard` backend:
   - `catalog-scraper/nest/catalog-scraper.controller.ts:13-21` `GET /catalog/courses/:courseId` → `{ course }` (valida `^\d{1,12}$`). Front: `frontend/src/lib/load-course-card.ts:6` (`/api/catalog/courses/:id`).
   - `learning-paths/learning-paths.service.ts:48` `LearningPathCourseCardDto = CourseCard` → `LearningPathItemDto.detail` (L59) → REST `GET /me/learning-paths/:id` (front `features/learning-paths/lib/load-path-detail.ts`) y eventos SSE vía `announce` (LivePathModal).
   - `mcp-user/mcp-user-tools.ts:156-174` tool **`get_my_path`** → `...detail` → **clientes MCP externos**.
   - **No** consumen `CourseCard`: `mcp-public/catalog-read.ts` (`getCourse`, `searchCourses`, `getOfficialPath`) y `live-path` tools → arman shapes propios snake_case sin cover. Si se quisiera cover en MCP público es cambio aparte.
4. Front: type duplicado **a mano** en `frontend/path-diagram/src/model.ts:5-17` (`CourseCard`, `price?`/`related?` opcionales) → `DiagramItem.detail` → `path-diagram.tsx:77-86` `withCard`, `:99-231` `CourseModal` (hoy **no** muestra imagen), `path-card.tsx` (card del nodo, 248×96 / 248×156 px — no hay lugar para cover sin cambiar dimensiones de layout).
5. **Contrato compartido**: **no hay openapi ni paquete de tipos compartidos** (búsqueda `openapi*` sin resultados). Backend y front duplican `CourseCard` a mano → el TRIAGE de contrato exige que la spec declare el contrato (dónde queda escrito) antes del código.
6. **Seed** `backend/.../data/catalog.seed.json:13` — 1 curso, `coverImageUrl: null` → en boot sin scraper la UI debe tolerar `null` (fallback visual).
7. **Host de covers**: `https://import.cdn.thinkific.com/<siteId>/<hash>_<NOMBRE>.jpg` (ej. fixture `course-free.html`: `https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg`). Los 9 fixtures muestran solo ese host para og:image (80 ocurrencias en `listing-all.html`). **No verificado contra prod** (Redis) → supuesto.
8. `next.config.ts`: no tiene `images` (no hay `remotePatterns`). Nadie usa `next/image`; el patrón existente es `<img>` plano → con `<img>` no hace falta tocar `next.config.ts`; con `next/image` sí (+ `sharp` en standalone).
9. **CSP**: el front no define CSP → `<img>` externo no se bloquea hoy. (Ausencia de CSP = deuda preexistente respecto al piso de seguridad frontend.)
10. **Widget MCP**: `path-diagram-resource.ts` registra el recurso con `mimeType text/html;profile=mcp-app` **sin `_meta.ui.csp`**; bajo la spec MCP Apps el host aplica CSP restrictiva por defecto → imágenes externas **bloqueadas** salvo declarar `resourceDomains` (supuesto a verificar en la versión de ext-apps). Además `scripts/finalize-widget.mjs` **borra toda URL http(s)** literal del HTML final y `widget-bundle.test.ts` exige 0 URLs externas. Datos en runtime (tool result) no se borran, pero la CSP del host los bloquearía. Hoy **`registerPathDiagram` no se invoca** → widget dormido; covers en widget = fuera de alcance salvo decisión.
11. **Seguridad**: `og:image` es input externo (scraping) que hoy se guarda sin validar host/esquema. Exponerlo a `<img src>` exige allowlist en la frontera (backend al mapear, p.ej. solo `https://import.cdn.thinkific.com/`) → si no matchea, `null`.

## 7. Mapa ruta oficial → icono de stack

Fuentes de ids: `backend/.../domain/config.ts:19-33` `OFFICIAL_PATH_IDS` (13), `mcp-public/path-aliases.json` (alias por id), front `MyRouteStatus.tsx:15-28` `PATH_CHOICES` (mismos 13 ids + label). Seed de catálogo: `paths: []`.

Mapa propuesto (derivado de alias + `alt` de cada `<img>` en `cursos.devtalles.com/pages/cuponera-otros`, descargado y verificado 2026-09-27):

| `path_id` | Label front | Alias backend | Icono DevTalles (`alt`) |
|---|---|---|---|
| `programas-fundamentos` | Fundamentos | fundamentos, javascript, js | `ICON-JS.svg` (JavaScript) — **supuesto**: no hay icono "Fundamentos"; JS es el alias |
| `programas-react` | React | react | `ICON-REACT.svg` |
| `programas-vue` | Vue | vue | `ICON-VUE.svg` |
| `programas-angular` | Angular | angular | `ICON-ANGULAR.svg` |
| `programas-node` | Node | node | `ICON-NODE.svg` |
| `programas-nest` | NestJS | nest | `ICON-NEST.svg` |
| `ruta-dart` | Dart y Flutter | dart, flutter, movil | `ICON-DART.svg` |
| `ruta-python` | Python | python | `ICON-PYTHON.svg` |
| `ruta-java` | Java | java | `ICON-JAVA.svg` |
| `ruta-c` | C# y .NET | csharp, dotnet, c | `2ICON-CSHARP.svg` (C#) |
| `ruta-ia` | Inteligencia artificial | ia, llm | `ICON-IA.svg` |
| `ruta-php` | PHP | php | `ICON-PHP4.svg` |
| `ruta-go` | Go | go, golang | `ICON-GO.svg` |
| — (sin ruta) | — | — | `ICON-LEGACY.svg` → candidato para cursos `category: "legacy"` (`DiagramCategory`, `model.ts:3,65`) o sin uso |

Verificaciones de los SVG: los 14 responden `200 image/svg+xml` en `raw.githubusercontent.com/Nleivas/Backgrounds/refs/heads/main/`. El repo **no declara licencia** (`license: null` en la API de GitHub) y son logos de marcas de terceros → decisión de dev sobre derecho de uso. Los SVG traen `<style>` interno con clases genéricas `.cls-1`, `.cls-2` → **si se inlinean en el DOM colisionan entre sí**; usarlos como `<img src>` (o pasar por un optimizador que prefije ids) evita el choque. En `path-diagram` un `import` del SVG se inlinearía como data URI en el widget (sin URL externa → compatible con `widget-bundle.test.ts`).

Dónde se muestra una ruta en el front (ubicación del icono):
- `MyRouteStatus.tsx:94-102` lista de rutas del usuario (solo `id`, `title`) y `:122-151` picker de ruta oficial (tiene `choice.id` → icono directo).
- `LearningPathsDashboard.tsx:72-112` cards de `/mis-rutas` (usa `MyRouteSummary`).
- `UserRouteDiagram.tsx` / `mis-rutas/[routeId]` (sin heading de ruta hoy).
- `LivePathScreen.tsx:60,76-83` título de ruta en vivo y "También te puede interesar" (`relatedPaths` con `pathId`).
- `MissionRadar.tsx:7-14` nodos del radar: labels **inventados** (`TS_FOUND`, `NEST.SYS`, `REACT_ARC`, `DOCKER/K8S`…) sin relación con ids reales.
- Dato disponible: el backend ya devuelve `sourceCatalogPathId` en `LearningPathSummaryDto` (`learning-paths.service.ts:76`), pero el front lo **descarta** en `load-my-routes.ts:3-9,39-48` (`MyRouteSummary` = id/title/counts). Usarlo es cambio de **consumidor** (leer un campo ya existente), no de contrato. `kind: custom|generated` → `sourceCatalogPathId` puede ser `null` → fallback sin icono.

## 8. Layout del configurador — por qué todo queda a la izquierda

- `configurador-de-ruta/page.module.css:7-11` `.shell { width: min(100%, 70rem); margin: 0 auto }` → columna centrada de 70rem (1120px).
- Dentro, `MyRouteStatus.module.css:1-6` `.panel { display: grid }` sin columnas ni `justify-items`, y `:59-69` `.choice, .form button, .dialog button { justify-self: start }` → kicker, h1, lista, botones y formulario se alinean al borde izquierdo de una columna de 1120px; no hay composición (sin grid de 2 columnas, sin max-width de lectura, sin centrado) → en desktop queda un bloque angosto a la izquierda y el resto vacío. En mobile no se nota.
- Mismo patrón en `mis-rutas/[routeId]/page.module.css` (70rem, el diagrama ocupa el ancho).
- Diagrama (`path-diagram`): `layoutPath` posiciona desde `PAD=24` en x (izquierda) y `FitWhenMeasured` + `fitView({ padding: 0.12 })` centra el grafo en el canvas (`.canvas { height: 560px }`, 320px/46vh <40rem). React Flow limita zoom (min 0.5 / max 2 por defecto, no configurado) → con pocos nodos el zoom tope deja el grafo centrado pero chico; con muchos nodos en <720px usa `verticalLayout` (una columna, x=PAD). `width` solo decide columnas vs vertical (`COLUMN_MIN 720`). No hay alineación izquierda forzada en el diagrama.
- Placeholder `El video va acá` (`MyRouteStatus.tsx:199`) y link `docsUrl` como texto plano (L226).

## 9. LivePath

- `LivePathScreen.tsx` + `LivePathScreen.module.css` (ver §4): 100% literales (px, hex, rgba, 280ms ease), `--live-display` inexistente, título uppercase con `letter-spacing: 2px`, cerrar con `×`.
- `LivePathModal.tsx:14` `EXIT_MS = 280` acoplado a la transición CSS de 280ms (cambiar la duración en CSS exige cambiar la constante; motion < 300ms del piso se cumple por poco).
- `.dialog .canvas { height: min(560px, 60vh) }` y mobile `min(320px, 46vh)`.
- Tests que lo tocan: `test/src/features/live-path/live-path-state.test.ts` (12, estado puro) — no fija CSS/copy visual; `fase-0/dom.test.tsx` y `mobile-nav.test.tsx` renderizan `MissionShell` (incluye `LivePathModal`).

## 10. Tests que fijan copy/layout (se romperán)

**Comandos**: front `cd frontend && npx vitest run` (o `npm test`); paquete `cd frontend/path-diagram && npm run build:widget && npx vitest run`; backend `cd backend && npx vitest run` (`npm test`). Root: `npm run test:frontend` / `npm run test:backend`.

**Línea base ejecutada hoy (2026-09-27)**:
- Front: **96/98 verdes; 2 rojos preexistentes** en `test/src/ui-stitch-orbital/fase-2/login-contract.test.ts` (L24-26 esperan que `LoginPanel.tsx` NO contenga `discordStartUrl`/`auth.service`; L43-45 esperan `type="password"` y `"MODO INVITADO DISPONIBLE"`) → asserts **obsoletos** respecto al LoginPanel actual (Discord real). No es culpa de este cambio, pero el verify del ciclo no puede quedar verde sin decidir qué hacer con ellos (declararlos en spec con el porqué antes de tocarlos).
- `path-diagram`: 30/30 verdes; `widget-bundle.test.ts` falla porque `dist/` no está construido (requiere `npm run build:widget` antes).
- Backend (catalog-scraper, learning-paths, mcp-public, live-path, mcp-user): 156 verdes, 8 skipped; 2 suites rojas por falta de Postgres local (`learning-path.repositories.spec.ts`, `postgres-oauth-server.model.spec.ts`) — entorno, no código.

**Asserts que este cambio rompe (según la opción elegida)**:

| Test:línea | Assert | Lo rompe |
|---|---|---|
| `test/src/ui-stitch-orbital/fase-0/dom.test.tsx:73-74` | `a[href='/login']` text `"Login"`, `a[href='/registro']` text `"Register"` (shell product) | Unificar/traducir auth |
| `…/fase-0/dom.test.tsx:90-91` | ídem (shell login) | Unificar/traducir auth |
| `…/fase-0/dom.test.tsx:94` | `toContain("Code Quest 2026")` | Cambiar footer |
| `…/fase-0/mobile-nav.test.tsx:127-128` | existen `a[href='/login']` **y** `a[href='/registro']` | Quitar Register |
| `…/fase-0/mobile-nav.test.tsx:69-71` | `nav[aria-label='Navegación móvil'] a` tiene N=3 links | Mover auth al panel móvil |
| `…/fase-0/mobile-nav.test.tsx:130-137` | CSS: `min-height: 4rem`, `padding-top: 4rem`, `@media (min-width: 48rem)`, `flex-wrap: nowrap`, sin `max-width: 42rem`, panel no `position: fixed`, `.mobileNav{display:none}` | Rediseño del header móvil (restricciones a respetar o renegociar) |
| `…/fase-0/header-responsive.characterization.test.ts:20-25` | mismas restricciones CSS + `.avatar` nunca `display:none` + `MissionShellMobileNav`/`PRODUCT_LINKS` en el shell | Rediseño del header |
| `test/src/features/auth/components/ShellAccount.test.tsx:64` | tras logout `toContain("Login")` (y título L38) | Traducir "Login" |
| `…/fase-2/login.test.tsx:43-44` | h1 `"Inicia sesión en tu misión"` | Humanizar título login |
| `…/fase-2/login.test.tsx:49-50,70-71` | links `"Crear cuenta"` / `"Ya tengo cuenta"` | Solo si cambia ese copy |
| `…/fase-2/login.test.tsx:95` | CSS `@media (max-width: 34rem)` en LoginPanel | Solo si se reescribe el CSS |
| `…/fase-1/landing.test.tsx:51-58` | h1 contiene `"descubre tu ruta de"`, `h1 span` = `"aprendizaje ideal"`, primer h2 = `"puertas de acceso a la misión"` | Títulos en oración |
| `…/fase-1/landing.test.tsx:66` | `#crew-title` = `"desarrolladores"` | Títulos en oración |
| `…/fase-1/landing.test.tsx:61` | `svg circle` = **13** | Cambiar el icono de protocolo (su `<circle>`) o el radar |
| `…/fase-1/landing.test.tsx:123-127` | CSS con `@media (max-width: 64rem|34rem)`, `(min-width: 48rem|64rem)`, `var(--orbital-tertiary)` | Solo si se reescribe el CSS |
| `…/fase-1/landing-breakpoints.characterization.test.ts:15` | `.location { display: none }` | Quitar la línea `LOC: 09° // …` y su CSS |
| `test/src/features/learning-paths/components/MyRouteStatus.test.tsx:128` | `toContain("El video va acá")` | Quitar placeholder |
| `…/MyRouteStatus.test.tsx:84,121,129` | `"Quiero hacerlo por un formulario"`, `"Quiero hacerlo por MCP"`, `"Copia y pega esto a tu IA para conectarte"` | Solo si se reescribe ese copy |
| `…/fase-6/github-dom.test.tsx:58,60` | `"MARKDOWN COPIADO AL PORTAPAPELES"` | Humanizar toasts |
| `…/fase-4/assessment-dom.test.tsx:64` | `"CALIBRANDO SIGUIENTE ESCENARIO"` (AssessmentWizard **huérfano**) | Humanizar componente huérfano |
| `…/fase-3/routes-dom.test.tsx`, `learning-paths.test.tsx`, `access.characterization.test.tsx` | renderizan/leen `RouteDetail` (**huérfano**) | Humanizar o borrar huérfano |
| `frontend/path-diagram/src/path-card.test.tsx:38,51,55,59,85` | `"Requerido"`, `"Ya visto"`, `"Incompleto"`, `"Completado"`, `"Empieza aquí"` | Solo si cambia ese copy (ya está en oración) |
| `frontend/path-diagram/src/path-diagram.modal.test.tsx:74` | `toContain("bases")` (tag en minúscula) | Capitalizar tags en JS (no si es CSS) |
| `frontend/path-diagram/src/path-diagram.modal.test.tsx:72-78,119-126` | textos del modal | Si se agrega cover no rompe; si cambian títulos de bloque, sí |
| `frontend/path-diagram/src/widget-bundle.test.ts:10` | 0 URLs `https?://` en el bundle | Si el widget referencia covers/iconos por URL literal |
| `backend/.../learning-paths/learning-paths.service.spec.ts:290-302` | `detail` `toEqual({...})` sin `coverImageUrl`; el fixture (`:39`) trae `coverImageUrl: null` → al exponerlo aparece `coverImageUrl: null` y **`toEqual` falla** (null ≠ ausente) | Exponer cover |
| `backend/.../catalog-scraper/application/course-card.spec.ts:41-53` | `toEqual` del card; el fixture no trae `coverImageUrl` → saldría `undefined` y `toEqual` **pasa en silencio** → hay que agregar el caso con cover (si no, el campo queda sin test) | Exponer cover |
| `test/src/ui-stitch-orbital/fase-0/foundation.test.ts:15-24,54` | tokens en `globals.css`, `allowedDevOrigins` en `next.config.ts` | Solo si se tocan esos archivos |

## Tabla de flujos conectados

| Flujo conectado | ¿El cambio lo TOCA? | ¿Tiene test hoy? | Nivel actual / requerido |
|---|---|---|---|
| `GET /catalog/courses/:courseId` (`CatalogScraperController.course` → `getCourseCard` → `toCourseCard`) | **Sí** — shape de respuesta `{ course }` gana `coverImageUrl` | Parcial (`course-card.spec.ts` unit; controller sin test) | happy path / nivel 2 (lógica de mapeo + validación de host) → **hueco** |
| `LearningPathsService.toDetail` → `LearningPathItemDto.detail` (REST `/me/learning-paths/:id`, create/update/addItem/saveGenerated) | **Sí** — `detail` gana campo | Sí (`learning-paths.service.spec.ts`, `learning-paths.controller.spec.ts`) | happy + errores / nivel 2 → OK; L290 debe actualizarse |
| MCP usuario `get_my_path` (`mcp-user-tools.ts:156-174`, `...detail`) — **consumidor externo** | **Sí** — el JSON devuelto a Claude/Cursor gana `coverImageUrl` | Sí (`mcp-user-tools.spec.ts:197-204`, no fija shape de `detail`) | happy / nivel 2 + "cruza un contrato" → **deuda de dimensión** (sin test de paridad del shape) |
| SSE `path.saved` / `path.generated` (`announce` → `LivePathModal`) | Sí (indirecto: `path.saved` lleva `toDetail`) | `live-path.sse.spec.ts`, `live-path-state.test.ts` | happy / nivel 2 → OK |
| MCP público `get_course` / `search_courses` / `get_official_path` (`catalog-read.ts`) | **No** (shapes propios, no usan `toCourseCard`) | Sí (`partial-courses.spec.ts`, `mcp-http.spec.ts`) | nivel 2 → OK |
| Front `loadCourseCard` → `PathDiagram.loadCourse` (UserRouteDiagram, LivePathScreen) | Sí — consume el campo nuevo | **No** (*no tests within 3 caller hops*) | sin tests / happy path → **hueco, candidato #1 a romperse en silencio** |
| Front `loadPathDetail` → `modelFromUserPath` → `DiagramItem.detail` → `CourseModal` | Sí — tipo `CourseCard` (duplicado a mano en `model.ts`) | Sí (`model.test.ts`, `path-diagram.modal.test.tsx`, `UserRouteDiagram.test.tsx`) | happy + bordes / nivel 2 → OK para modal; sin caso `coverImageUrl: null` |
| Widget MCP (`path-diagram/widget`, `registerPathDiagram`) | No hoy (no registrado); sí si se decide mostrar covers/iconos en widget | `widget-bundle.test.ts`, `widget-status.test.ts` | happy / happy → OK (dormido) |
| `MissionShell` + `ShellAccount` + `MissionShellMobileNav` (todas las páginas) | **Sí** — copy auth, estructura mobile, iconos | Sí (`dom.test.tsx`, `mobile-nav.test.tsx`, `header-responsive…`, `ShellAccount.test.tsx`) | happy + estados / nivel 2 → OK (se romperán asserts de copy) |
| Login/registro (`/login`, `/registro`, `AuthenticatedEntry` → `LoginPanel` → `discordStartUrl`) | Sí — copy/UI; **no** la URL OAuth | Sí (`login.test.tsx`, `auth-entry.test.ts`, `auth.service.test.ts`); `login-contract.test.ts` **rojo preexistente** | nivel 2 / nivel 2 (UI de auth, lógica OAuth fuera) → hueco: tests rojos obsoletos |
| `/configurador-de-ruta` (`MyRouteStatus`: lista, crear ruta oficial `POST /me/learning-paths`, diálogo MCP) | Sí — layout, copy, iconos, (icono por ruta) | Sí (`MyRouteStatus.test.tsx`, 5 tests) | happy + error de carga / nivel 2 → OK |
| `/mis-rutas` (`LearningPathsDashboard`, `loadMyRoutes`) | Sí si se agrega icono (leer `sourceCatalogPathId`) y copy uppercase | Sí (`LearningPathsDashboard.test.tsx`, `routes-dom.test.tsx`) | happy + error / nivel 2 → OK |
| Landing `/` (`page.tsx`, `landing.fixture.ts`, `MissionRadarLive`) | Sí — copy, títulos, iconos, `user-select` | Sí (`landing.test.tsx`, `landing-breakpoints…`, `home-auth-status.test.tsx`) | happy / nivel 1-2 → OK (se romperán asserts) |
| `LivePathModal`/`LivePathScreen` | Sí — tokens, icono cerrar, copy | Estado sí (`live-path-state.test.ts`); visual no | happy / nivel 1 (presentación) → OK |
| Toast global `ProveedorNotificaciones`/`NotificacionSuperior` | Sí si se tematiza/iconiza (no pedido explícitamente) | No | sin tests / nivel 1 → hueco menor |
| Componentes huérfanos `RouteDetail`, `AssessmentWizard`, `OrbitalDemoBanner` | Depende de la decisión (humanizar vs borrar vs ignorar) | Solo tests de caracterización | — |
| `parse-learning-path.ts` `extractTags` (lowercase) | **No** (se resuelve en presentación) | Sí (`parse-learning-path.spec.ts`) | OK |

## Estado de tests — deuda visible

- **Hueco de nivel**: `loadCourseCard` sin tests (flujo que consume el cambio de contrato); controller `GET /catalog/courses/:courseId` sin test (validación `^\d{1,12}$`, 404); toast global sin tests; `login-contract.test.ts` rojo y obsoleto.
- **Deuda de dimensión — "Cruza un contrato"**: `CourseCard` está duplicado a mano (backend `course-card.ts` / front `path-diagram/src/model.ts`) sin contrato escrito ni test de paridad; `get_my_path` expone ese shape a clientes MCP externos sin test que fije el shape de `detail`. Ningún flujo crítico de dinero/auth-lógica cambia → no aplica concurrencia/tiempo/invariantes.
- `course-card.spec.ts` usa `toEqual` con fixture sin `coverImageUrl` → un campo nuevo omitido pasaría en silencio; conviene `toStrictEqual` o fixture explícito (decisión de spec, no se toca acá).
- No hay test de UI que verifique ausencia de hex/uppercase/`//` (si se quiere que no vuelva, sería un test estático nuevo — decisión de spec).

## Decisiones abiertas (para `propose`/`spec`)

1. **ADR 0001 vs Lucide**: aprobar ADR 0002 / addendum que supere "sin librerías de iconos nuevas". Fijar versión (`lucide-react@1.48.0`), import por icono (tree-shaking) y un solo stroke (`strokeWidth` uniforme).
2. **Superar #1460 (literal Stitch)**: registrar que el copy deja de ser literal; ¿qué pasa con los tests de caracterización literal (reescribir vs borrar)?
3. **Auth en shell**: ¿un único botón ("Entrar con Discord" / "Entrar") que va a `/login`, y `/registro` queda como ruta secundaria o se elimina? (Si se elimina `/registro`, `LoginPanel intent="register"`, `authEntryPath("register")` y sus tests cambian; hoy crea usuario en el primer callback igual que login.)
4. **Mobile**: ¿auth dentro del panel móvil o a la derecha con un solo botón? Respetar o renegociar las restricciones CSS de `header-responsive`/`mobile-nav` tests (4rem, nowrap, 48rem, sin 42rem). Variante `login` hoy **sin** navegación móvil.
5. **Nombres del destino**: unificar "Descubre tu ruta" / "Configurador de ruta" / "Mis rutas"/"Tus rutas"; ¿se fusionan `/configurador-de-ruta` y `/mis-rutas` o se diferencian por propósito (crear vs seguir)?
6. **Registro lingüístico**: voseo ("Creá", "tenés") vs tuteo ("Inicia", "Descubre") — hoy mezclado.
7. **Cifras inventadas de landing** ("38 rutas", "100%", "~4 minutos", "RIASEC.DEV v2.4", "Estructurado por Fernando Herrera"): ¿quitar, reemplazar por datos verificables (13 rutas oficiales del catálogo) o `null`?
8. **Covers**: (a) `<img>` plano (patrón existente, sin tocar `next.config.ts`) vs `next/image` + `remotePatterns` (`import.cdn.thinkific.com`) + `sharp` en standalone; (b) allowlist de host en backend al mapear (recomendado por "input externo en la frontera"); (c) ¿dónde se ve? modal (`CourseModal`) y/o card del nodo (cambia dimensiones de `layoutPath` y rompe geometría/tests); (d) contrato: dónde queda escrito el campo nuevo (no hay openapi) — el TRIAGE exige contrato antes que código; (e) ¿exponerlo también en MCP público `get_course`? (hoy no usa `CourseCard`); (f) fallback cuando `null` (seed y cursos `partial`).
9. **Widget MCP**: fuera de alcance mientras `registerPathDiagram` no se invoque; si entra, requiere `_meta.ui.csp.resourceDomains` para covers y los SVG de stack inlineados (data URI).
10. **Iconos de stack**: licencia/derecho de uso (repo sin licencia, logos de terceros); `programas-fundamentos` → `ICON-JS` (supuesto); uso de `ICON-LEGACY`; renderizar como `<img>` (evita colisión `.cls-N`) o optimizar; ubicación (picker, lista de rutas, dashboard, live path); el front debe empezar a leer `sourceCatalogPathId` (ya viene del backend).
11. **path-diagram hex**: mantener hex (widget standalone) o `var(--orbital-*, #fallback)`; tokens inexistentes (`#130c25`, `#121028`, `#16122c`, `#f0eeff`, `#8eb6ff`, `#c0b9fc`, `#e7c27a`) → mapear a tokens existentes o crear tokens nuevos.
12. **Componentes huérfanos** (`RouteDetail`, `AssessmentWizard`, `OrbitalDemoBanner`): humanizar, borrar o dejar fuera del alcance.
13. **Toast global** (`notificacion.module.css`, paleta Tailwind clara): ¿entra en el alcance del pulido?
14. **Tests rojos preexistentes** `login-contract.test.ts` (2): declarar en spec con el porqué y corregir, o dejarlos como deuda explícita.
15. **`--live-display`** inexistente en LivePath: definir token o usar `--orbital-font-display`.

## Supuestos no verificados

- Las covers de prod usan el mismo host `import.cdn.thinkific.com` que los fixtures (no se leyó Redis de prod).
- La CSP por defecto del host MCP Apps bloquea imágenes externas sin `resourceDomains` (no se verificó en los tipos de `@modelcontextprotocol/ext-apps 1.7.5`).
- Nombres exactos de iconos Lucide (`Menu`, `X`, `Copy`, `Check`, `ArrowRight`, `ArrowUpRight`, `ExternalLink`, `CircleAlert`, `TriangleAlert`) y ausencia de iconos de marca en v1: verificar en el paquete instalado antes de usarlos.
- `ICON-JS` como icono de `programas-fundamentos`.

📚 Referencias cargadas: `.cursor/rules/constitution-codigo.mdc` (completa), `.cursor/rules/herramientas-detalle.mdc` (completa), `.cursor/rules/frontend-layers.mdc` (adjunta por glob), `.cursor/rules/patterns-by-layer.mdc` (adjunta por glob), `.cursor/skills/nextjs-reference/references/versiones-seguridad.md` (parcial: política de soporte). Para el resto del pipeline cargar: `nextjs-reference/SKILL.md` + `references/rol-por-archivo.md` + `references/deploy-runtime.md` (Next self-hosted standalone), `frontend-reference/references/design-language.md` (modo conformidad elevada, iconos de set real) y `accessibility.md`, `nestjs-reference/SKILL.md` (sub-alcance covers en backend), `error-contract/SKILL.md` no aplica (no cambian errores).

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
Lectura: .cursor/rules/herramientas-detalle.mdc 801a70f1
