# Spec — `ui-devtalles-polish`

⚠️ FLUJOS SIN COBERTURA (revisar antes de aprobar)
- Front `loadCourseCard` → `PathDiagram.loadCourse` (UserRouteDiagram, LivePathScreen): consume el campo nuevo, sin test hoy → se cubre con test nuevo (CA-2.9) antes de tocar el tipo.
- Controller `GET /catalog/courses/:courseId`: su shape de respuesta gana `coverImageUrl`, sin test de controller hoy → se cubre con test de caracterización del comportamiento actual (200 `{ course }`, 404, id inválido) + caso con cover (CA-2.8).
- MCP usuario `get_my_path` (consumidor externo): el test actual no fija el shape de `detail` → se cubre con assert nuevo de shape/paridad (CA-2.10, CA-2.11).
- `LivePathScreen` (presentación): tocado (tokens, cerrar, copy), sin test visual hoy → se cubre con test nuevo del botón cerrar e icono (CA-4.10).
- `login-contract.test.ts`: 2 rojos preexistentes y obsoletos → se reescriben al contrato Discord actual con el porqué declarado (§Tests → asserts que se reescriben).

## Paths en scope

- `decisions/0002-*.md`
- `contracts/**`
- `package-lock.json`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/public/devtalles-tech/**`
- `frontend/src/config/**`
- `frontend/src/app/globals.css`
- `frontend/src/app/(producto)/**`
- `frontend/src/app/(acceso)/**`
- `frontend/src/features/auth/components/**`
- `frontend/src/features/orbital/**`
- `frontend/src/features/learning-paths/**`
- `frontend/src/features/live-path/**`
- `frontend/src/features/integrations/components/**`
- `frontend/src/features/assessment/components/AssessmentResults.*`
- `frontend/src/features/assessment/components/TypescriptCheckpoint.*`
- `frontend/src/features/mcp-docs/**`
- `frontend/src/lib/load-course-card.ts`
- `frontend/path-diagram/src/**`
- `frontend/test/**`
- `backend/src/modules/catalog-scraper/application/course-card.ts`
- `backend/src/modules/catalog-scraper/application/course-card.spec.ts`
- `backend/src/modules/catalog-scraper/nest/*.spec.ts`
- `backend/src/modules/catalog-scraper/test/**`
- `backend/src/modules/learning-paths/learning-paths.service.spec.ts`
- `backend/src/modules/mcp-user/mcp-user-tools.spec.ts`

## Problema

La UI actual es una traducción **literal** de Stitch (memoria #1460, ADR `decisions/0001-ui-stitch-orbital.md`) y eso deja problemas visibles en producción (referencias en `explore.md`):

1. **Shell/auth confuso y en inglés:** sin sesión el header muestra "Login" y "Register" (`ShellAccount.tsx:42-55`), que terminan en el mismo `discordStartUrl`. En mobile el header queda apretado (brand + hamburguesa + 2 botones). La variante `login` del shell no tiene navegación móvil. Nav "Descubre tu ruta" lleva a una página titulada "Configurador de ruta". Footer con "Code Quest 2026" como marca.
2. **Copy terminal y cifras inventadas:** `ALGO // ALGO` en 11 archivos vivos (§2 del explore), títulos en minúscula o en mayúsculas por CSS, y cifras que parecen reales sin serlo ("38 rutas activas" cuando hay 13 en `OFFICIAL_PATH_IDS`, "100% producción", "~4 minutos", "RIASEC.DEV v2.4", "0% spam", "cero deuda técnica", "estructurado por Fernando Herrera") → violan la regla de anti-invención. Mezcla de voseo y tuteo.
3. **Piso de oficio incumplido:** `×` unicode como icono de cerrar (`LivePathScreen.tsx:29`), SVG ad hoc para chrome, `var(--live-display)` inexistente, hex sueltos fuera de tokens (LivePath, MyRouteStatus, MissionShell, landing), `user-select: none` en toda la landing, placeholder "El video va acá" visible (`MyRouteStatus.tsx:199`).
4. **Configurador alineado a la izquierda** en desktop (`MyRouteStatus.module.css:59-69` `justify-self: start` dentro de una columna de 70rem).
5. **Imágenes de curso perdidas:** el scraper guarda `coverImageUrl` (`og:image`) pero `toCourseCard` lo descarta (`course-card.ts:3-46`); además es input externo sin validar.
6. **Sin identidad DevTalles por stack:** ninguna ruta oficial muestra su icono.
7. **Tests rojos preexistentes:** `login-contract.test.ts` (2) fija un `LoginPanel` con password y modo invitado que ya no existe.

Dirección aprobada en `proposal.md` (no se reabre): 4 lotes reversibles; un botón "Entrar"; `/registro` vive; sin fusionar `/configurador-de-ruta` y `/mis-rutas`; voseo; `lucide-react` solo chrome vía ADR 0002; cover solo en `CourseModal` con `<img>` plano; hex de `path-diagram` se mantienen; widget MCP, huérfanos y toast global fuera.

## Contrato — `CourseCard` (TRIAGE: contrato antes que código)

No hay OpenAPI ni paquete de tipos compartidos. El contrato queda escrito **acá** y en un artefacto de ejemplo único `contracts/course-card.example.json` que consumen los tests de backend y de front (contract test contra el mismo artefacto; el nombre exacto del archivo lo puede ajustar design dentro de `contracts/`).

### Shape (idéntico en backend y front)

```ts
export type CourseCard = {
  description: string | null
  instructor: string | null
  lessonCount: number | null
  videoHours: number | null
  previewYoutubeId: string | null
  coverImageUrl: string | null   // NUEVO — aditivo
  prerequisites: string[]
  tags: string[]
  sections: Array<{ title: string; lessons: string[] }>
  url: string
  price: { amount: number; currency: 'USD' } | null
  related: Array<{ title: string; url: string }>
}
```

- Backend: `backend/src/modules/catalog-scraper/application/course-card.ts` (`CourseCard` + `toCourseCard`).
- Front: `frontend/path-diagram/src/model.ts` (`CourseCard`). `coverImageUrl` es **requerido** (`string | null`, sin `?`). `price?`/`related?` siguen opcionales en el front como hoy (no se "arreglan" de paso).

### Regla de allowlist (frontera de confianza: backend, al mapear)

`coverImageUrl` sale de `Course.coverImageUrl` (scraping de `og:image`) y se expone **solo si** se cumple todo:
1. Es string no vacío y `new URL(valor)` no lanza.
2. `protocol === 'https:'`.
3. `hostname === 'import.cdn.thinkific.com'` (igualdad exacta; `import.cdn.thinkific.com.evil.com` o subdominios distintos no pasan).
4. Sin credenciales (`username` y `password` vacíos) y sin puerto explícito.

Si no → `null`. El valor que sale es la URL tal cual (sin reescribir). La validación vive en backend; el front **no** revalida (confía en el tipo ya validado) pero tolera `null`.

### Semántica de negocio

- **Incluye:** la portada del curso publicada por DevTalles en su CDN de Thinkific.
- **Excluye (→ `null`):** cualquier otro host, `http:`, URL malformada, curso sin `og:image`, seed de arranque (`catalog.seed.json` trae `null`).
- **Por qué:** es input externo inyectado en `<img src>`; el allowlist evita hotlink a hosts no confiables.

### Superficies afectadas (todas por `toCourseCard`, cambio aditivo no breaking)

| Superficie | Cómo viaja |
|---|---|
| `GET /catalog/courses/:courseId` | `{ course: CourseCard }` |
| `GET /me/learning-paths/:id` (y respuestas de create/update/addItem/saveGenerated que devuelven detalle) | `LearningPathItemDto.detail: CourseCard \| null` |
| SSE `path.saved` | payload con `toDetail` → `items[].detail` |
| MCP usuario `get_my_path` (consumidor externo: Claude/Cursor) | `...detail` → gana `coverImageUrl` |
| MCP público `get_course` / `search_courses` / `get_official_path` (`catalog-read.ts`) | **NO cambia** (shape propio snake_case, no usa `toCourseCard`). Omisión intencional, no es ❌ de paridad. |

## Scope (MoSCoW) por lote

### Lote 1 — Shell / auth / mobile / Lucide chrome
- **Must:** ADR 0002 aceptado; `lucide-react` versión exacta; header sin sesión con un único "Entrar" → `/login`; "Entrar" a la derecha del hamburguesa en mobile; variante `login` con `MissionShellMobileNav`; nav "Configurador de ruta"; footer DevTalles primero; chrome → Lucide (`Menu`/`X`, `Copy`/`Check`, `X` en LivePath, `ArrowRight`/`ArrowUpRight`/`ExternalLink` en landing); reescribir `login-contract.test.ts` y asserts de shell.
- **Should:** touch target de "Entrar" ≥ 2.75rem de alto (alineado al resto del header), respetando `nowrap`.
- **Won't:** tocar `discordStartUrl`, `authEntryPath`, callback OAuth, cookies, `auth.service`; eliminar `/registro`.

### Lote 2 — Iconos de stack + contrato `coverImageUrl`
- **Must:** 14 SVG vendorizados; mapa ruta→icono en una sola fuente en `frontend/src/config/`; `load-my-routes.ts` lee `sourceCatalogPathId`; iconos en picker y lista de `MyRouteStatus` y cards de `/mis-rutas`; contrato `coverImageUrl` con allowlist; tests de contrato.
- **Won't:** `ICON-LEGACY` en uso (se vendoriza sin consumidor); cover en MCP público.

### Lote 3 — Diagrama / configurador
- **Must:** cover en `CourseModal` con `<img>` plano; configurador centrado ≥64rem; headers de columna de `layoutPath` en oración; quitar "El video va acá".
- **Should:** si la imagen del cover falla al cargar, el bloque se oculta (sin icono roto); `referrerPolicy="no-referrer"` en el `<img>` del cover.
- **Won't:** cover en la card del nodo (cambiaría la geometría de `layoutPath`); `next/image`; tocar hex de `path-diagram`.

### Lote 4 — Copy humanizado + tokens + marca + landing
- **Must:** voseo; sin `//`; títulos en oración; cifras inventadas fuera (única cifra: 13 rutas oficiales derivada de `OFFICIAL_PATH_IDS`); `user-select: none` fuera; `--live-display` reemplazado; hex sueltos de LivePath/MyRouteStatus/MissionShell/landing → tokens; "Esperando que Claude…" → neutral; nota de superación de #1460 (`mem_save` con `supersedes`).
- **Should:** labels del radar (`MissionRadar.tsx:7-14`: `TS_FOUND`, `NEST.SYS`…) reemplazados por nombres de rutas oficiales reales (`PATH_CHOICES`) o eliminados; metadata "Detalle **mock** de una ruta" (`mis-rutas/[routeId]/page.tsx:7`) → texto real; colores `rgb()/rgba()` literales de esos 4 archivos → token o `color-mix()` sobre token.
- **Could:** viñetas unicode decorativas (`✦`, `●`) con `aria-hidden` se mantienen (no son iconos funcionales).

## Won't (global)

- Widget MCP (`registerPathDiagram` dormido): sin covers ni iconos de stack; `widget-bundle.test.ts` sigue exigiendo 0 URLs externas.
- Componentes huérfanos `RouteDetail`, `AssessmentWizard`, `OrbitalDemoBanner` y los fixtures que solo ellos consumen: no se tocan; sus tests siguen verdes sin modificar.
- Toast global (`app/_componentes/notificacion.module.css`, `NotificacionSuperior.tsx`).
- `/registro` no se elimina; `/configurador-de-ruta` y `/mis-rutas` no se fusionan.
- `next/image`, `images.remotePatterns`, `next.config.ts`, CSP del front.
- MCP público (`catalog-read.ts`), `parse-learning-path.ts` (tags siguen en minúscula en datos), scraper.
- Hex de `path-diagram/src/*.module.css` y `MarkerType` `#dcd8ff` (widget standalone sin `globals.css`).
- Logging de debug (no pedido).

## Criterios de aceptación

### Lote 1 — Shell / auth / mobile / Lucide

- **CA-1.1** Existe `decisions/0002-*.md` con estado `accepted` que supera la cláusula "sin librerías de iconos nuevas" del ADR 0001, limitada a iconos de **chrome** (marcas e ilustraciones `role="img"` quedan fuera), antes del primer commit del lote.
- **CA-1.2** `frontend/package.json` declara `lucide-react` con versión exacta (sin `^`/`~`), import por icono nombrado (`import { X } from "lucide-react"`), sin import default ni barrel `*`. Todos los iconos Lucide del cambio usan el mismo `strokeWidth` (valor único definido en un solo lugar o repetido idéntico). Los nombres usados existen en el paquete instalado (typecheck verde).
- **CA-1.3** Sin sesión, en ambas variantes del shell (product y login), el header contiene **exactamente un** link de auth: texto `Entrar`, `href="/login"`. Cero `a[href='/registro']` en el header. Cero ocurrencias de los textos `Login` y `Register` renderizados en el shell (DOM) y en `ShellAccount.tsx`/`MissionShell*.tsx`/`MissionShellMobileNav.tsx`.
- **CA-1.4** `/registro` sigue respondiendo y es alcanzable desde el link "Crear cuenta" de `LoginPanel`. `discordStartUrl`, `authEntryPath` y el callback no cambian (diff vacío en `auth.service.ts` y `auth-entry`; `auth.service.test.ts` y `auth-entry.test.ts` verdes sin modificar).
- **CA-1.5** Mobile (<48rem): el link "Entrar" queda a la derecha del botón hamburguesa, en la misma fila. Se mantienen las restricciones de `header-responsive.characterization.test.ts` y `mobile-nav.test.tsx`: header `min-height: 4rem`, contenido `padding-top: 4rem`, `@media (min-width: 48rem)`, `flex-wrap: nowrap`, sin `max-width: 42rem`, panel no `position: fixed`, `.mobileNav { display: none }` en desktop, `.avatar` nunca `display: none`.
- **CA-1.6** La variante `login` del shell renderiza `MissionShellMobileNav` bajo 48rem con los mismos destinos que la variante product, operable por teclado.
- **CA-1.7** El link de nav hacia `/configurador-de-ruta` dice `Configurador de ruta` (desktop y mobile). Cero ocurrencias de `Descubre tu ruta` como label de nav.
- **CA-1.8** Footer de ambas variantes: "DevTalles" aparece antes que "Code Quest 2026" en el orden del DOM, y "Code Quest 2026" se presenta como crédito (texto secundario), no como marca principal.
- **CA-1.9** Chrome con Lucide: hamburguesa/cerrar del menú móvil (`Menu`/`X`), copiar en `MyRouteStatus` (`Copy`, y `Check` tras copiar), flechas y link externo de la landing (`ArrowRight`/`ArrowUpRight`/`ExternalLink`). Esos `<svg>` ad hoc desaparecen de `MissionShellMobileNav.tsx`, `MyRouteStatus.tsx` y `app/(producto)/page.tsx`. Todo icono sin texto visible tiene nombre accesible en su control (`aria-label`) y el `<svg>` va `aria-hidden`. Logos GitHub/LinkedIn/Discord e ilustraciones (`MissionRadar`, gauge, empty state, insignia, radar hexagonal) siguen siendo SVG propios.
- **CA-1.10** `login-contract.test.ts` verde tras reescribir sus 2 asserts obsoletos al contrato actual (ver §Tests).
- **CA-1.11** Suite front verde (`cd frontend && npx vitest run`): 0 rojos, incluidos los 2 preexistentes.

### Lote 2 — Iconos de stack + contrato `coverImageUrl`

- **CA-2.1** Existen 14 SVG en `frontend/public/devtalles-tech/` (`ICON-JS`, `ICON-REACT`, `ICON-VUE`, `ICON-ANGULAR`, `ICON-NODE`, `ICON-NEST`, `ICON-DART`, `ICON-PYTHON`, `ICON-JAVA`, `2ICON-CSHARP`, `ICON-IA`, `ICON-PHP4`, `ICON-GO`, `ICON-LEGACY`; nombres de archivo pueden normalizarse a kebab-case), cada uno válido `image/svg+xml`, sin `<script>` ni atributos `on*`.
- **CA-2.2** Mapa ruta→icono en **un solo módulo** de `frontend/src/config/`, cerrado sobre los 13 ids de `OFFICIAL_PATH_IDS` (tabla §7 del explore; `programas-fundamentos` → `ICON-JS`). Ningún otro archivo hardcodea rutas a `/devtalles-tech/`. Id desconocido o `null` → sin icono (función devuelve `null`).
- **CA-2.3** El icono se renderiza como `<img>` (nunca SVG inline), con `width`/`height` explícitos. Junto al nombre de la ruta visible → `alt=""` (decorativo); si va solo sin texto → `alt` con el nombre de la ruta.
- **CA-2.4** Iconos visibles en: picker de ruta oficial y lista de rutas del usuario en `MyRouteStatus`, y cards de `/mis-rutas` (`LearningPathsDashboard`). Rutas `custom` o con `sourceCatalogPathId: null` se muestran sin icono y sin hueco roto.
- **CA-2.5** `load-my-routes.ts` expone `sourceCatalogPathId: string | null` en `MyRouteSummary` leyendo el campo que el backend ya devuelve; cero cambios en backend para esto.
- **CA-2.6** `CourseCard` de backend y de front tienen exactamente el shape de §Contrato (`coverImageUrl: string | null` requerido en ambos). Typecheck de backend, front y `path-diagram` verde sin `any` ni casts.
- **CA-2.7** `course-card.spec.ts` usa `toStrictEqual` (o fixture completo explícito) y cubre, como mínimo:
  - cover `https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg` → mismo valor;
  - host no permitido (`https://evil.example.com/a.jpg`) → `null`;
  - no https (`http://import.cdn.thinkific.com/a.jpg`) → `null`;
  - sufijo engañoso (`https://import.cdn.thinkific.com.evil.com/a.jpg`) → `null`;
  - URL malformada / string vacío → `null`;
  - `coverImageUrl: null` en el curso → `null`.
- **CA-2.8** Test del controller `GET /catalog/courses/:courseId`: caracteriza el comportamiento actual (200 `{ course }`, 404 si no existe, rechazo de id que no matchea `^\d{1,12}$` con el status que devuelve hoy) y afirma que `course.coverImageUrl` está presente (valor o `null`).
- **CA-2.9** Test nuevo de `loadCourseCard` (`frontend/src/lib/load-course-card.ts`): respuesta con cover → devuelve el card con `coverImageUrl`; respuesta con `coverImageUrl: null` → `null` en el campo; error HTTP → `null` (fija el comportamiento actual del `catch`).
- **CA-2.10** `learning-paths.service.spec.ts:290-302` actualizado: el `detail` esperado incluye `coverImageUrl` (el fixture trae `null` → se espera `coverImageUrl: null`). Assert con `toEqual`/`toStrictEqual` sobre el objeto completo, sin relajar a `toMatchObject`.
- **CA-2.11** Contract/paridad: un test de backend verifica que `toCourseCard` produce exactamente las claves y tipos de `contracts/course-card.example.json`; un test de front (`path-diagram`) consume el mismo artefacto y lo valida contra `CourseCard` (typecheck con `satisfies CourseCard` o equivalente + render en `CourseModal`). Además, para un mismo snapshot, `GET /catalog/courses/:id`, `detail` de `/me/learning-paths/:id` y `get_my_path` devuelven el mismo `coverImageUrl` para el mismo curso (`mcp-user-tools.spec.ts` gana el assert del campo en `detail`).
- **CA-2.12** MCP público sin cambios: diff vacío en `backend/src/modules/mcp-public/**`; `partial-courses.spec.ts` y `mcp-http.spec.ts` verdes sin modificar.
- **CA-2.13** Suites backend (`cd backend && npx vitest run`) y front verdes (salvo las 2 suites que requieren Postgres local, rojas por entorno en la línea base; si hay Postgres disponible, verdes).

### Lote 3 — Diagrama / configurador

- **CA-3.1** `CourseModal` con `detail.coverImageUrl` string → renderiza un `<img>` con ese `src`, `alt=""` (el título del curso ya está visible en el modal), `width`/`height` explícitos y `loading="lazy"`. Con `coverImageUrl: null` → no existe `<img>` de cover ni contenedor vacío. Test en `path-diagram.modal.test.tsx` para ambos casos.
- **CA-3.2** `path-card` y `layoutPath` sin cambio de dimensiones: `layout-path.test.ts` (13) verde sin modificar valores de geometría.
- **CA-3.3** Headers de columna de `layoutPath` en oración ("Requerido", "Recomendado", "Opcional", "En cualquier momento"), iguales a `verticalLayout`. `path-diagram.module.css` sin `text-transform: uppercase` en `.header,.groupLabel` y en `.dialog h3`. Tags en el modal presentados capitalizados por CSS (`text-transform: capitalize`), sin transformar el string en JS (`path-diagram.modal.test.tsx:74` `toContain("bases")` sigue verde sin modificar).
- **CA-3.4** Configurador (`/configurador-de-ruta`) en viewport ≥64rem: el contenido principal está centrado horizontalmente en la columna (margen izquierdo y derecho del bloque de contenido difieren ≤ 1rem) y el texto de lectura tiene un ancho máximo legible; no queda el bloque pegado a la izquierda con el resto vacío. Se elimina el `justify-self: start` generalizado de `.choice, .form button, .dialog button`. En 375 y 768 no hay scroll horizontal.
- **CA-3.5** Icono de stack junto a cada ruta en el configurador (usa el mapa de CA-2.2).
- **CA-3.6** Cero ocurrencias de `El video va acá` en `frontend/src`; `MyRouteStatus.test.tsx:128` reescrito para afirmar su ausencia.
- **CA-3.7** `cd frontend/path-diagram && npm run build:widget && npx vitest run` verde (incluye `widget-bundle.test.ts` con 0 URLs externas).

### Lote 4 — Copy, tokens, marca, landing

- **CA-4.1** Voseo en todo el copy tocado: cero imperativos/formas de tuteo en los archivos vivos del alcance (p. ej. `Inicia`, `Descubre`, `Selecciona`, `Copia y pega`, `Elige` → `Iniciá`, `Descubrí`, `Seleccioná`, `Copiá y pegá`, `Elegí`). Verificable por grep sobre la lista de archivos vivos.
- **CA-4.2** Cero `//` como separador de copy renderizado en los archivos vivos: `app/(producto)/page.tsx`, `features/orbital/fixtures/landing.fixture.ts`, `features/orbital/components/MissionRadar.tsx`, `features/auth/components/LoginPanel.tsx`, `features/integrations/components/GithubPreview.tsx`, `features/learning-paths/components/ReplanningProposal.tsx`, `features/assessment/components/AssessmentResults.tsx`, `features/assessment/components/TypescriptCheckpoint.tsx` (comentarios de código no cuentan; URLs no cuentan).
- **CA-4.3** Títulos en oración: ningún heading (`h1`–`h3`, título de modal, título de LivePath) de archivos vivos lleva `text-transform: uppercase|lowercase` en CSS ni está escrito íntegro en minúscula/mayúscula en JSX o fixtures (incluye `page.tsx:82-84,125,194`, `landing.fixture.ts:26,40,48,56,64`, `mis-rutas/page.module.css:27`, `LivePathScreen.module.css:20,84`, `AssessmentResults.module.css:176`). El copy terminal en mayúsculas literales de archivos vivos pasa a oración.
- **CA-4.4** Landing sin cifras inventadas: cero ocurrencias de `38 RUTAS`, `100%`, `~4 MINUTOS`, `RIASEC.DEV`, `0% SPAM`, `CERO DEUDA TÉCNICA`, `FERNANDO HERRERA` (case-insensitive) en `page.tsx` y `landing.fixture.ts`. El único número de catálogo permitido es la cantidad de rutas oficiales, **derivada** de `OFFICIAL_PATH_IDS`/`PATH_CHOICES` (`.length`), nunca un literal `13`. Test que lo afirma.
- **CA-4.5** Cero `user-select: none` en `app/(producto)/page.module.css`.
- **CA-4.6** Cero `var(--live-display)` en `frontend/src`; LivePath usa `var(--orbital-font-display)`.
- **CA-4.7** Cero hex literales en `LivePathScreen.module.css`, `MyRouteStatus.module.css`, `MissionShell.module.css` y `app/(producto)/page.module.css`; cada color usa un token `--orbital-*`. Color sin equivalente → token nuevo **nombrado** en `globals.css` (lo propone design), nunca literal. Sin fallbacks hex innecesarios (`var(--orbital-surface, #130c25)` → `var(--orbital-surface)`). Excepción declarada: colores de marca Discord en `LoginPanel.module.css`.
- **CA-4.8** `LivePathScreen.module.css`: el `.page` sin uso se elimina solo si sigue sin referencias; si cambia la duración de la transición, `EXIT_MS` de `LivePathModal.tsx` se ajusta en el mismo commit y la transición queda < 300ms con curva propia (no `ease` genérico).
- **CA-4.9** `LivePathScreen.tsx`: cero `Claude` como único cliente en el texto de espera (neutral: sirve para Claude o Cursor).
- **CA-4.10** Botón cerrar de LivePath: `<button>` con icono Lucide `X` (`aria-hidden`), `aria-label` en español (p. ej. "Cerrar"), sin `×` unicode. Test nuevo que lo afirma.
- **CA-4.11** Nota de superación de #1460 registrada (ADR/nota en `decisions/` o en el ADR 0002 si design lo unifica) y `mem_save` con relación `supersedes`.
- **CA-4.12** Tests de caracterización listados en §Tests reescritos al nuevo copy (mismo tipo de assert, valor nuevo); suite front verde.

### Transversales (gate de verify)

- **CA-T.1 Accesibilidad WCAG AA** en las pantallas tocadas (shell product/login, landing, `/login`, `/configurador-de-ruta`, `/mis-rutas`, `/mis-rutas/[routeId]`, modal de curso, LivePath): contraste ≥ 4.5:1 texto normal y ≥ 3:1 texto grande/iconos de control con los tokens usados; todo control operable por teclado con foco visible; controles de solo icono con nombre accesible; imágenes con `alt` correcto (decorativas `alt=""`); sin cambios de idioma sin `lang`.
- **CA-T.2 Responsive** en 375, 768 y 1280 px: sin scroll horizontal, header en una línea, touch targets ≥ 24×24 px (objetivo 44 px en los controles tocados), textos sin truncado que oculte información.
- **CA-T.3** Typecheck verde en `frontend`, `frontend/path-diagram` y `backend`; sin `any`/casts nuevos para silenciar tipos.
- **CA-T.4** Componentes huérfanos y sus tests sin diff; widget MCP sin diff funcional.

## Disposición de flujos conectados

| Flujo (explore) | Disposición | Evidencia / criterio |
|---|---|---|
| `GET /catalog/courses/:courseId` | **EN SCOPE** | Shape gana `coverImageUrl`. CA-2.7, CA-2.8 (caracterización del controller), CA-2.11. |
| `LearningPathsService.toDetail` → `detail` (REST + create/update/addItem/saveGenerated) | **EN SCOPE** | `detail` gana campo vía alias `LearningPathCourseCardDto = CourseCard` (sin cambio de código en el service). CA-2.10. |
| MCP usuario `get_my_path` (externo) | **EN SCOPE** | Aditivo por `...detail`. CA-2.11 (assert del campo + paridad). |
| SSE `path.saved` / `path.generated` | **EN SCOPE** (indirecto) | Lleva `toDetail`; `live-path.sse.spec.ts` y `live-path-state.test.ts` verdes; paridad cubierta por CA-2.10/2.11 (mismo `toDetail`). |
| MCP público `get_course`/`search_courses`/`get_official_path` | **FUERA / no afectado** | `catalog-read.ts:65` arma shape propio snake_case y no importa `toCourseCard` (codegraph). CA-2.12 diff vacío. |
| Front `loadCourseCard` → `PathDiagram.loadCourse` | **EN SCOPE** | Sin test hoy → CA-2.9 (test nuevo antes de tocar el tipo). |
| Front `loadPathDetail` → `modelFromUserPath` → `CourseModal` | **EN SCOPE** | CA-3.1 (con/sin cover), CA-2.11 (artefacto de contrato). |
| Widget MCP (`registerPathDiagram`) | **FUERA / no afectado** | 0 callers fuera de specs; `widget-bundle.test.ts` verde (CA-3.7). |
| `MissionShell` + `ShellAccount` + `MissionShellMobileNav` | **EN SCOPE** | CA-1.3 a CA-1.9; tests de shell reescritos. |
| Login/registro (`AuthenticatedEntry` → `LoginPanel` → `discordStartUrl`) | **EN SCOPE** (solo copy/UI) | CA-1.4 (OAuth intacto), CA-1.10 (`login-contract` reescrito), `login.test.tsx` reescrito donde cambia el copy. |
| `/configurador-de-ruta` (`MyRouteStatus`) | **EN SCOPE** | CA-2.4, CA-3.4 a CA-3.6; `MyRouteStatus.test.tsx` (5) verde. |
| `/mis-rutas` (`LearningPathsDashboard`, `loadMyRoutes`) | **EN SCOPE** | CA-2.4, CA-2.5; `LearningPathsDashboard.test.tsx`, `routes-dom.test.tsx` verdes. |
| Landing `/` | **EN SCOPE** | CA-4.2 a CA-4.5, CA-1.9; `landing.test.tsx`, `landing-breakpoints…`, `home-auth-status.test.tsx`. |
| `LivePathModal`/`LivePathScreen` | **EN SCOPE** | Sin test visual → CA-4.10 (test nuevo); CA-4.6 a CA-4.9. |
| Toast global | **FUERA / no afectado** | Won't: ni `notificacion.module.css` ni `NotificacionSuperior.tsx` están en Paths en scope. |
| Huérfanos `RouteDetail`/`AssessmentWizard`/`OrbitalDemoBanner` | **FUERA / no afectado** | Ninguna ruta los renderiza (codegraph); no están en Paths en scope; CA-T.4. |
| `parse-learning-path.ts` `extractTags` | **FUERA / no afectado** | Capitalización por CSS (CA-3.3); archivo fuera de Paths en scope. |

## Tests

### Nivel por flujo (constitución → Testing)

| Flujo | Nivel | Tests exigidos |
|---|---|---|
| Mapeo `toCourseCard` + allowlist | **2** | Happy + host inválido + no https + sufijo engañoso + malformada + `null` (CA-2.7) + contrato (CA-2.11) |
| `loadCourseCard` | **2** | Con cover, con `null`, error (CA-2.9) |
| Controller `GET /catalog/courses/:courseId` | **2** | 200/404/id inválido (CA-2.8) |
| Mapa ruta→icono | **2** | Los 13 ids resuelven a un archivo existente en `public/devtalles-tech/`; id desconocido y `null` → `null` (CA-2.2) |
| `CourseModal` con/sin cover | **2** | CA-3.1 |
| Shell/auth (UI, sin lógica OAuth) | **2** | Sin sesión (1 link Entrar), con sesión (avatar/Salir sin cambios), mobile ambas variantes (CA-1.3 a 1.6) |
| Copy/CSS/tokens/landing | **1–2** | Caracterización reescrita + asserts estáticos (CA-4.x) |

### Segundo eje

Ningún flujo es camino crítico (sin dinero, sin lógica de auth; OAuth no se toca). Se declara explícito:
- **Sin concurrencia.**
- **Cruza un contrato: SÍ** (front↔back y back↔clientes MCP) → aunque no es nivel 3, se exige contract test contra el mismo artefacto (CA-2.11) porque el explore lo marcó como deuda de dimensión.
- **No depende del tiempo.**
- **No muta invariante de dinero/estado.**

### Propiedades del cambio

- **Recurrente:** no (el scraper existe y no se toca) → no aplican presupuestos N/T/V ni lock.
- **Consumidor externo:** sí (`get_my_path`) → contrato explícito (§Contrato) + semántica de negocio escrita + test de paridad entre las superficies que usan `toCourseCard` (CA-2.11). El único origen de covers es el snapshot del scraper de DevTalles; no hay otros proveedores. El catálogo vive en Redis (snapshot), no en BD: el test de paridad corre sobre un snapshot fixture, no sobre BD efímera. MCP público excluido por semántica documentada.
- **Volumen que crece:** no (~80 cursos, 13 rutas) → sin fixture de volumen.

### Asserts de caracterización que se REESCRIBEN (no se relajan)

Porqué común: son tests de caracterización del copy/estructura literal de Stitch (#1460). El cambio de copy/estructura es **intencional y aprobado** por el dev en `proposal.md`. Cada assert conserva su tipo y precisión (igualdad exacta sigue siendo igualdad exacta) con el valor nuevo; ninguno pasa a `toMatchObject`, `toBeTruthy` ni se borra.

| Test:línea | Hoy | Pasa a | Lote |
|---|---|---|---|
| `fase-0/dom.test.tsx:73-74` | links "Login" `/login` + "Register" `/registro` (product) | un link "Entrar" `/login`; 0 `/registro` en header | 1 |
| `fase-0/dom.test.tsx:90-91` | ídem (variante login) | ídem | 1 |
| `fase-0/dom.test.tsx:94` | `toContain("Code Quest 2026")` | footer con "DevTalles" antes que "Code Quest 2026" (sigue presente como crédito) | 1 |
| `fase-0/mobile-nav.test.tsx:127-128` | existen `/login` **y** `/registro` | exactamente un `/login` ("Entrar"), 0 `/registro` | 1 |
| `fase-0/mobile-nav.test.tsx:69-71` | 3 links en nav móvil | sigue 3 (auth queda fuera del panel); label "Configurador de ruta" | 1 |
| `fase-0/mobile-nav.test.tsx:130-137` y `header-responsive.characterization.test.ts:20-25` | restricciones CSS | **sin cambio** (se respetan); se agrega assert de MobileNav en variante login | 1 |
| `features/auth/components/ShellAccount.test.tsx:38,64` | título/`toContain("Login")` tras logout | `"Entrar"` | 1 |
| Tests que afirmen el label "Descubre tu ruta" | "Descubre tu ruta" | "Configurador de ruta" | 1 |
| `fase-2/login.test.tsx:43-44` | h1 "Inicia sesión en tu misión" | h1 nuevo en voseo y oración (texto final lo fija design) | 4 |
| `fase-2/login.test.tsx:49-50,70-71,95` | "Crear cuenta"/"Ya tengo cuenta", `@media (max-width: 34rem)` | sin cambio salvo que el copy/CSS cambie; si cambia, mismo tipo de assert | 4 |
| `fase-1/landing.test.tsx:51-58,66` | h1 "descubre tu ruta de"/"aprendizaje ideal", h2 "puertas de acceso a la misión", `#crew-title` "desarrolladores" | textos nuevos en oración | 4 |
| `fase-1/landing.test.tsx:61` | `svg circle` = 13 | conteo nuevo tras reemplazar el icono de protocolo (valor exacto) | 1/4 |
| `fase-1/landing.test.tsx:123-127` | media queries y `var(--orbital-tertiary)` | sin cambio salvo reescritura de CSS | 4 |
| `fase-1/landing-breakpoints.characterization.test.ts:15` | `.location { display: none }` | si se quita la línea `LOC: 09° // …`, el assert pasa a afirmar su ausencia en DOM | 4 |
| `MyRouteStatus.test.tsx:128` | `toContain("El video va acá")` | `not.toContain("El video va acá")` | 3 |
| `MyRouteStatus.test.tsx:84,121,129` | "Quiero hacerlo por…", "Copia y pega esto…" | voseo ("Copiá y pegá…") | 4 |
| `fase-6/github-dom.test.tsx:58,60` | "MARKDOWN COPIADO AL PORTAPAPELES" | texto humanizado en oración | 4 |
| `backend/.../learning-paths.service.spec.ts:290-302` | `detail` sin `coverImageUrl` | con `coverImageUrl: null` (campo nuevo del contrato) | 2 |
| `backend/.../course-card.spec.ts:41-53` | `toEqual` sin cover | `toStrictEqual` con `coverImageUrl` + casos de CA-2.7 | 2 |

**No se tocan** (huérfanos): `fase-4/assessment-dom.test.tsx:64`, `fase-3/routes-dom.test.tsx`, `learning-paths.test.tsx`, `access.characterization.test.tsx` en lo que refiere a `RouteDetail`/`AssessmentWizard`.

### Los 2 rojos obsoletos de `login-contract.test.ts` (declarados)

- **L24-26** esperan que `LoginPanel.tsx` **no** contenga `discordStartUrl`/`auth.service`. Obsoleto: desde que el login es Discord real, `LoginPanel` arma el link con `discordStartUrl(returnTo)` (`auth.service.ts:22-35`). Pasa a: `LoginPanel.tsx` **usa** `discordStartUrl` y no construye URLs de OAuth a mano.
- **L43-45** esperan `type="password"` y `"MODO INVITADO DISPONIBLE"`. Obsoleto: el formulario de contraseña y el modo invitado ya no existen (auth solo por Discord). Pasa a: `LoginPanel` **no** tiene `type="password"` ni modo invitado, y ofrece el botón de Discord.
- No es relajar un assert: el contrato que fijaban fue reemplazado antes de este cambio; se actualizan al contrato vigente con asserts igual de estrictos.

### Tests nuevos

- `course-card.spec.ts`: casos de CA-2.7 con `toStrictEqual`.
- Test de controller `GET /catalog/courses/:courseId` (CA-2.8).
- Contract test backend + front sobre `contracts/course-card.example.json` (CA-2.11) y assert de `coverImageUrl` en `mcp-user-tools.spec.ts`.
- `loadCourseCard` (CA-2.9).
- Mapa ruta→icono (CA-2.2).
- `CourseModal` con/sin cover (CA-3.1).
- Botón cerrar LivePath (CA-4.10).
- Landing sin cifras inventadas + conteo derivado (CA-4.4).
- Asserts estáticos de CA-4.2, CA-4.5, CA-4.6, CA-4.7 sobre los archivos listados (evitan regresión del copy/tokens).

### Comandos

- Front: `cd frontend && npx vitest run`
- Paquete: `cd frontend/path-diagram && npm run build:widget && npx vitest run`
- Backend: `cd backend && npx vitest run`

## Seguridad

- `coverImageUrl` = input externo (scraping) → validado en la frontera (backend) con allowlist (§Contrato). El front no es frontera de confianza.
- `<img>` plano con URL ya validada; sin `dangerouslySetInnerHTML`; SVG de stack como `<img>` (el navegador no ejecuta scripts de un SVG cargado por `<img>`), y además CA-2.1 exige SVG sin `<script>`/`on*`.
- Sin endpoints nuevos, sin cambios en auth/sesión → no aplican rate limiting/CSRF/JWT nuevos.
- Dependencia nueva `lucide-react` con versión exacta y lockfile actualizado (control "dependencias de terceros").

## Requisitos no funcionales de intervalo / SLA

No hay requisito de polling, latencia ni "tiempo real". No aplica.

## Supuestos declarados

- Nombres de iconos Lucide (`Menu`, `X`, `Copy`, `Check`, `ArrowRight`, `ArrowUpRight`, `ExternalLink`) y versión `1.48.0`: se verifican en el paquete instalado antes de usar (CA-1.2 falla por typecheck si no existen).
- `ICON-JS` para `programas-fundamentos` (no hay icono "Fundamentos").
- Las covers de prod usan `import.cdn.thinkific.com` (verificado solo en fixtures).

## Deuda explícita aceptada

- **Licencia de los SVG DevTalles:** el repo origen no declara licencia y son logos de terceros; se asume uso permitido por ser assets publicados por el propio sitio DevTalles. Pendiente confirmar con DevTalles. Costo: retirar los assets si no hay permiso (mapa en una sola fuente → cambio de un archivo + carpeta).
- **Host de covers en prod no verificado:** si difiere, el allowlist devuelve `null` y el cover no se ve (falla segura). Para cerrarlo: leer el snapshot de Redis de prod y ajustar el allowlist.
- **Toast global** (`notificacion.module.css`, paleta Tailwind clara fuera de Orbital, sin tests): queda fuera; se tematiza en otra feature.
- **Ausencia de CSP en el front** (preexistente): el `<img>` externo no se bloquea hoy; cuando se agregue CSP deberá incluir `img-src https://import.cdn.thinkific.com`.
- **Componentes huérfanos** (`RouteDetail`, `AssessmentWizard`, `OrbitalDemoBanner`): conservan copy terminal y sus tests de caracterización; decidir borrarlos o reusarlos en otra feature.
- **Widget MCP:** sin covers ni iconos; si se registra, requiere `_meta.ui.csp.resourceDomains` y SVG inlineados como data URI.
- **`loadCourseCard` traga el error y devuelve `null`** (patrón existente): se caracteriza, no se refactoriza en esta feature.

ADR: decisions/0002-lucide-chrome-icons.md

## Checkpoint

- ✅ **Spec aprobada por el dev vía plan (2026-09-27) — el dev pidió correr el ciclo sin frenar.**
- Sello formal del gate: el dev ejecuta `node .cursor/scripts/sdd/sdd-gate.mjs approve specs/ui-devtalles-polish`; esta fase no escribe fecha ni hash. Necesario antes de commitear el Lote 1 (toca `src/**/auth/**`).
- Siguiente fase: `sdd-design` → ADR 0002, nombres de tokens nuevos, textos finales del copy, ubicación exacta del artefacto en `contracts/`, markup del cover y del icono de stack.

📚 Referencias cargadas: `.cursor/rules/constitution-codigo.mdc`, `.cursor/rules/constitution-fases.mdc`, `CodeQuest-2026/specs/ui-devtalles-polish/explore.md`, `CodeQuest-2026/specs/ui-devtalles-polish/proposal.md`, `.cursor/sdd.readproof.json`, `.cursor/sdd.paths.json`, `CodeQuest-2026/specs/_done/ui-shell-responsive/spec.md` (formato).

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
Lectura: .cursor/rules/constitution-fases.mdc e3160314

Aprobado por dev: 2026-09-27 sha256:6a061768421b
