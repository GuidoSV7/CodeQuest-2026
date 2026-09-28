# Archive — `ui-devtalles-polish`

> Fase: `sdd-archive`. Fecha: 2026-09-27. HEAD `0d1a541`. Base del PR: `0d1a541` (todo el cambio está **sin commitear**: el dev no pidió commits).
> Verify: **PASS con observaciones** (`verify.md`). Ningún defecto funcional, de seguridad ni de accesibilidad; las observaciones son de proceso/tooling.
> Lectura: .cursor/rules/herramientas-detalle.mdc 801a70f1

## 1. Qué cambió y por qué (por lote)

### Lote 1 — Shell / auth / mobile / Lucide chrome (Unidades 1–2)

**Por qué:** el header sin sesión mostraba "Login" y "Register" que iban al mismo `discordStartUrl`; en mobile quedaba apretado; la variante `login` no tenía nav móvil; el label "Descubre tu ruta" no coincidía con la página "Configurador de ruta"; iconos de chrome eran SVG ad hoc y `×` unicode.

- `lucide-react@1.48.0` exacto (`frontend/package.json` + ambos lockfiles) y constante única `CHROME_ICON_STROKE_WIDTH = 2` en `frontend/src/config/chrome-icon.ts`. ADR `decisions/0002-lucide-chrome-icons.md` (`accepted`) acota Lucide a iconos de **chrome**.
- Chrome → Lucide: `Menu`/`X` (menú móvil), `Copy`/`Check` (`MyRouteStatus`, `GithubPreview`), `X` (LivePath), `ArrowRight`/`ArrowUpRight`/`ExternalLink` (landing y assessment). Todos `aria-hidden` con `aria-label` en el control. Se eliminó el icono de protocolo de la landing (`svg circle` 13 → 12).
- `ShellAccount`: un único link "Entrar" → `/login` sin sesión; `/registro` sigue vivo vía "Crear cuenta" de `LoginPanel`. OAuth (`discordStartUrl`, `authEntryPath`, callback) sin diff.
- `MissionShell`: nav "Configurador de ruta", `MissionShellMobileNav` también en variante login, footer "DevTalles • Hecho para Code Quest 2026" (crédito secundario).
- Tests: `login-contract.test.ts` reescrito al contrato Discord vigente (2 rojos obsoletos declarados en spec); asserts de shell reescritos al contrato nuevo; `shell-chrome.static.test.ts` nuevo.

### Lote 2 — Iconos de stack + contrato `coverImageUrl` (Unidades 3–6)

**Por qué:** el scraper guardaba `og:image` pero `toCourseCard` lo descartaba, y es input externo sin validar; ninguna ruta oficial mostraba su identidad DevTalles.

- **Contrato (aditivo, no breaking):** `CourseCard.coverImageUrl: string | null` requerido en backend (`course-card.ts`) y front (`path-diagram/src/model.ts`). Allowlist en la frontera (backend): `URL.canParse` + `https:` + `hostname === 'import.cdn.thinkific.com'` exacto + sin credenciales ni puerto; si no → `null`. Viaja por `GET /catalog/courses/:courseId`, `detail` de learning-paths (REST + SSE) y MCP `get_my_path`. MCP público sin cambios (shape propio).
- Artefacto único `contracts/course-card.example.json` consumido por el contract test de backend (helper `catalog-scraper/test/course-card-example.ts`) y de front (`test/src/contracts/course-card.contract.test.tsx`).
- Tests nuevos/endurecidos: caracterización del controller (200/404×2/400×2 + cover), `course-card.spec.ts` con `toStrictEqual` + 9 casos hostiles, `learning-paths.service.spec.ts` a `toStrictEqual`, paridad MCP ↔ REST ↔ catálogo en `mcp-user-tools.spec.ts`, `load-course-card.test.ts`.
- 14 SVG vendorizados en `frontend/public/devtalles-tech/` (sin `<script>`/`on*`/`javascript:`), mapa único ruta → icono en `frontend/src/config/official-paths.ts`, componente `StackIcon` (`<img>` con `alt=""` junto a texto), `sourceCatalogPathId` en `MyRouteSummary`, iconos en cards de `/mis-rutas` y lista de `MyRouteStatus`.

### Lote 3 — Diagrama / configurador (Unidades 7–8)

**Por qué:** el configurador quedaba pegado a la izquierda en desktop, con un placeholder "El video va acá" visible; headers del diagrama en mayúsculas por CSS.

- `CourseModal`: portada con `<img>` plano (640×360, `alt=""`, `loading="lazy"`, `referrerPolicy="no-referrer"`, `onError` la oculta; sin cover en modo `mcp`).
- Headers de columna de `layoutPath` y títulos del modal en oración; tags con `text-transform: capitalize` (sin tocar datos). Geometría del diagrama sin cambios.
- Configurador centrado (`min(100%, 48rem)`), sin `justify-self: start` generalizado, botones con touch target 2.75rem y estados hover/active/disabled; picker y opciones con `StackIcon`; `PATH_CHOICES` → `OFFICIAL_PATHS`; placeholder de video eliminado.

### Lote 4 — Copy humanizado + tokens + marca + landing (Unidades 9–12)

**Por qué:** copy terminal (`ALGO // ALGO`), mezcla voseo/tuteo, títulos en minúscula/mayúscula por CSS y cifras inventadas ("38 rutas", "100%", "RIASEC.DEV v2.4"…) que violaban anti-invención; hex sueltos y `var(--live-display)` inexistente.

- Landing sin cifras inventadas; única cifra "Rutas oficiales" derivada de `OFFICIAL_PATHS.length`. `user-select: none` fuera. `MissionRadar` con nombres de rutas oficiales reales.
- Voseo y sin `//` en las 13 pantallas vivas (`LoginPanel`, `MyRouteStatus`, `LearningPathsEmptyState`, `GithubPreview`, `ReplanningProposal`, `AssessmentResults`, `TypescriptCheckpoint`, `mis-rutas/*`…). Metadata "mock" → texto real.
- LivePath: tokens Orbital, `--orbital-motion-standard` (240 ms) con `EXIT_MS` sincronizado (280 → 240), cierre accesible, "Esperando que tu IA arme la ruta.".
- Hex/`rgba()` → tokens en `LivePathScreen`, `MyRouteStatus`, `MissionShell` y `page.module.css`; `text-transform: lowercase` de títulos eliminado.
- Engram #1510 `supersedes` #1460 (traducción literal de Stitch).

## 2. Cómo probarlo

### Comandos (desde `CodeQuest-2026/`)

| Comando | Esperado (medido en verify) |
|---|---|
| `cd frontend && npx vitest run` | 47 files / 174 tests verdes |
| `cd frontend/path-diagram && npm run build:widget && npx vitest run` | build OK (~883 kB) · 9 files / 36 tests verdes |
| `cd backend && npx vitest run` | 48 files / 199 tests verdes (24 skipped); **6 archivos rojos por entorno** (`@embedded-postgres/windows-x64` ausente), ninguno en el diff |
| `cd frontend && npx tsc --noEmit` | solo 2 errores preexistentes (`.next/types/validator.ts`, `local-session.test.ts:14`) |
| `cd backend && npx tsc --noEmit` | 29 errores preexistentes (= línea base), ninguno en líneas agregadas |
| `git status --short -- backend/src/modules/mcp-public frontend/src/features/auth/api` | vacío |

### Pasos manuales (`cd frontend && npm run dev`; backend levantado para `/mis-rutas` y modal)

1. **`/` sin sesión (375 / 768 / 1280):** un solo "Entrar" en el header, a la derecha de la hamburguesa en 375 y en la misma fila; nav "Mis rutas · Configurador de ruta · MCP"; hero en oración y voseo; "Rutas oficiales: 13"; sin "38 rutas", "100%", "RIASEC", "LOC: 09"; flechas Lucide; se puede seleccionar texto; footer "DevTalles" antes que "Code Quest 2026"; sin scroll horizontal.
2. **`/login` (ventana privada, sin sesión):** h1 "Entrá a CodeQuest"; hamburguesa visible en 375 (abre 3 links, Escape cierra); botón Discord funciona (OAuth intacto); "Crear cuenta" lleva a `/registro` y responde 200.
3. **`/configurador-de-ruta` (con sesión, ≥1024 px):** bloque centrado (márgenes iguales); h1 "Armá tu ruta"; picker con icono de stack en el botón y en las 13 opciones; sin "El video va acá"; "Copiar" alterna `Copy` → `Check`; hover sobre "Crear ruta" deshabilitado no cambia de color.
4. **`/mis-rutas` (con sesión y al menos una ruta oficial):** card con icono de stack junto al título; ruta custom sin icono ni hueco roto; título sin minúsculas forzadas.
5. **Modal de curso con cover:** abrir una ruta guardada → click en una card del diagrama → portada arriba del resumen si el curso tiene `og:image` en `import.cdn.thinkific.com`; curso sin cover → sin imagen ni hueco; forzar un `src` roto en DevTools → el bloque desaparece; headers de columna "Requerido/Recomendado/Opcional/En cualquier momento".
6. **LivePath** (pedir una ruta por MCP): texto de espera neutral, botón cerrar con `X` y `aria-label="Cerrar"`, cierre de 240 ms sin salto.

> No visto en vivo durante verify (cubierto por tests): cards/lista de `/mis-rutas` con iconos, modal con cover real y LivePath abierto — requieren backend y ruta guardada. Recomiendo hacer los pasos 4–6 antes del PR.

## 3. Deuda técnica explícita (no silenciada)

### Observaciones de verify

| # | Deuda | Costo si queda | Para cerrarla |
|---|---|---|---|
| O-1 | Recibo SDD no emitido: nada stageado, y `.cursor/sdd.receipt.json` exige `npm run lint`, `npm run test:pg` y la fase pide `npm run sdd:verify`, scripts que no existen. Además el gate `typecheck` va a salir rojo por los errores preexistentes (2 front + 29 back). | El pre-commit rechaza **todo** commit de esta feature. | Alinear el recibo a los scripts reales (quitar o crear `lint`/`test:pg`; decidir cómo se trata la línea base de `tsc`) y stagear por unidad. Decisión del dev. |
| O-2 | `package-lock.json` (raíz) y `backend/src/modules/catalog-scraper/test/course-card-example.ts` fuera de "Paths en scope" de `spec.md`. | `sdd-gate.mjs` los marca fuera de alcance y bloquea. | Agregar ambos paths a `spec.md` **antes** de sellar. |
| O-3 | Spec sin sellar (`Aprobado por dev: PENDIENTE`) y ADR 0002 sin ratificación formal. | Gate bloquea el commit del Lote 1 (toca `src/**/auth/**`). | `node .cursor/scripts/sdd/sdd-gate.mjs approve specs/ui-devtalles-polish` + ratificar ADR 0002. |
| O-4 | `frontend/src/features/live-path/live-path-state.ts:33` dice "Decile a Claude cuál preferís". | Copy asume un único cliente MCP (mismo criterio que CA-4.9). | Neutralizar en una feature/fix aparte (archivo fuera del diff). |
| O-5 | Los 4 links "Empezar por acá" de la landing comparten nombre accesible. | Indistinguibles en la lista de links del lector de pantalla (cumple AA por contexto). | `aria-describedby` al `h3` de cada puerta. |
| O-6 | `page.module.css:441` conserva `box-shadow: 0 0 0 4px …` (literal preexistente). | Un literal de espaciado fuera de tokens. | Token-lint o token de ring. |
| O-7 | Sin lint, sin token-lint (stylelint) y sin `dependency-cruiser` (arch-guard no ejecutable; `npx` bajó un placeholder). | "Cero literales" solo está fijado en 4 CSS por test; arquitectura sin gate. | Instalar `dependency-cruiser` como devDependency y configurar token-lint (`frontend-reference/references/design-lint.md`). |

### Deuda aceptada en `spec.md`

- **Licencia de los SVG DevTalles sin confirmar** (logos de terceros, repo origen sin licencia). Costo: retirar assets si no hay permiso (un archivo + carpeta).
- **Host de covers en prod no verificado** (`import.cdn.thinkific.com` solo visto en fixtures). Falla segura: `null` y no se ve el cover. Cerrar leyendo el snapshot de Redis de prod.
- **Toast global** (`notificacion.module.css`, `NotificacionSuperior.tsx`) fuera de Orbital y sin tests.
- **Sin CSP en el front** (preexistente): cuando se agregue, incluir `img-src https://import.cdn.thinkific.com`.
- **Componentes huérfanos** (`RouteDetail`, `AssessmentWizard`, `OrbitalDemoBanner`) conservan copy terminal; decidir borrar o reusar.
- **Widget MCP** sin covers ni iconos; si se registra, requiere `_meta.ui.csp.resourceDomains` y SVG como data URI.
- **Errores `tsc` preexistentes:** front 2 (`.next/types/validator.ts` stale por `ajustes/tokens` borrado; cast en `local-session.test.ts:14`), backend 29 en 8 specs.
- **Postgres embebido faltante en Windows** (`@embedded-postgres/windows-x64`): 6 archivos de backend no corren localmente.
- `loadCourseCard` traga el error y devuelve `null` (patrón existente, caracterizado, no refactorizado).

## 4. Commits

### Estado actual

`git log --oneline 0d1a541..HEAD` → **vacío**: ninguna unidad tiene commit. Es esperado (el dev no pidió commits), pero es hallazgo del protocolo: las 12 unidades de `tasks.md` están mezcladas en el working tree.

⚠️ **Varios archivos cruzan unidades** (`MyRouteStatus.tsx`/`.module.css`, `app/(producto)/page.tsx`/`.module.css`, `LivePathScreen.*`, `MissionShell.module.css`, `shell-chrome.static.test.ts`, `tokens.static.test.ts`, `course-card.contract.test.tsx`, `MyRouteStatus.test.tsx`). Commitear "una unidad a la vez" exige `git add -p` por hunk y correr la suite en cada paso con el resto stasheado (`git stash push --keep-index`), o aceptar explícitamente **un commit por lote** como deuda de granularidad.

### Tamaño

Sin lockfiles ni `specs/`: ~1 250 líneas en archivos modificados + ~1 350 en archivos nuevos ≈ **2 600 líneas** → supera 400 holgadamente. Recomiendo **4 PRs encadenados, uno por lote** (plan de `tasks.md`):

| PR | Base | Contenido | Depende de | Fuera de scope |
|---|---|---|---|---|
| #1 Lote 1 | `main` (o rama feature) | U1–U2 + ADR 0002 + lockfiles | — | contrato, iconos de stack |
| #2 Lote 2 | rama del PR #1 | U3–U6 + `contracts/` | #1 (`MyRouteStatus` ya con Lucide) | cover en modal |
| #3 Lote 3 | rama del PR #2 | U7–U8 | #2 (`coverImageUrl`, `StackIcon`, `OFFICIAL_PATHS`) | copy/tokens |
| #4 Lote 4 | rama del PR #3 | U9–U12 | #3 | toast, huérfanos, widget |

Cada uno ≤ ~60 min de lectura. El Lote 4 es el más pesado (~800 líneas, mayormente CSS eliminado); si se quiere, partir U9 (landing) de U10–U12.

### Commits sugeridos por unidad

| Unidad | Commit |
|---|---|
| U1 | `feat(ui): usar lucide-react para los iconos de chrome (ADR 0002)` |
| U2 | `feat(shell): dejar un solo "Entrar", nav móvil en login y footer DevTalles` |
| U3 | `feat(catalog): exponer coverImageUrl validado en CourseCard` |
| U4 | `feat(path-diagram): agregar coverImageUrl al contrato CourseCard del front` |
| U5a | `chore(assets): vendorizar los 14 iconos de stack de DevTalles` (377 líneas de SVG, separado por presupuesto) |
| U5b | `feat(ui): agregar el mapa único de rutas oficiales a iconos` |
| U6 | `feat(learning-paths): mostrar el icono de stack en mis rutas` |
| U7 | `feat(path-diagram): mostrar la portada del curso en el modal y headers en oración` |
| U8 | `feat(configurador): centrar el layout, sumar iconos de stack y quitar el placeholder de video` |
| U9 | `feat(landing): pasar el copy a voseo sin cifras inventadas y radar con rutas reales` |
| U10 | `feat(ui): humanizar el copy en voseo en las pantallas vivas` |
| U11 | `feat(live-path): aplicar tokens Orbital, motion estándar y cierre accesible` |
| U12 | `style(ui): llevar colores y espaciados a tokens Orbital` |
| Cierre | `docs(specs): cerrar ui-devtalles-polish y archivar la spec` (incluye `git mv specs/ui-devtalles-polish specs/_done/ui-devtalles-polish`) |

### Higiene verificada

- Sin credenciales ni `.env` en el cambio (`frontend/.env` y `backend/.env` no aparecen en `git status`).
- Sin archivos de debug ni `console.log` en el diff (verify §3).
- `specs/_bypass.log` está vacío y sin trackear: no incluir.

## 5. Pasos previos al commit (en orden)

1. **Paths en scope (O-2):** agregar a `spec.md` `package-lock.json` y `backend/src/modules/catalog-scraper/test/**`.
2. **Sellar la spec (O-3):** `node .cursor/scripts/sdd/sdd-gate.mjs approve specs/ui-devtalles-polish` (después del paso 1: el sello cubre el contenido) y ratificar ADR 0002.
3. **Alinear el recibo (O-1):** ajustar `.cursor/sdd.receipt.json` a los scripts reales y decidir cómo se trata la línea base de `tsc`.
4. **Stagear `specs/ui-devtalles-polish/` y `decisions/`** con el primer commit (el gate necesita la spec en el índice). Ojo: `decisions/0001-ui-stitch-orbital.md` y `decisions/README.md` también están sin trackear y pertenecen al ciclo `ui-stitch-orbital`; 0002 referencia a 0001 → commitearlos en un `docs(decisions)` propio **antes** del PR #1, no mezclados en una unidad de esta feature.
5. **No mezclar features:** `specs/ui-stitch-orbital/`, `specs/_done/ui-shell-responsive/` y `specs/README.md` están sin trackear y son de otros ciclos → fuera de estos commits.
6. Hacer los pasos manuales 4–6 de §2 con backend levantado.
7. Por cada unidad: stagear sus hunks, `git stash push --keep-index`, correr la suite de la unidad, `git stash pop`, commitear.
8. Último commit: `git mv specs/ui-devtalles-polish specs/_done/ui-devtalles-polish` (el gate ignora `specs/_*`; si la spec queda en `specs/` sigue aprobando commits futuros que matcheen sus globs). **No se movió todavía** porque no hay commits y el paso 2 necesita la spec en su ruta actual.

📚 Referencias cargadas: `specs/ui-devtalles-polish/spec.md`, `tasks.md`, `verify.md`, `.cursor/sdd.receipt.json`, `decisions/0002-lucide-chrome-icons.md`, `git status`/`git diff --numstat`.
