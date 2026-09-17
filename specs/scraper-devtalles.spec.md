# Spec: Scraper de catálogo DevTalles

| Campo | Valor |
|---|---|
| Change | `scraper-devtalles` |
| Estado | SPEC ONLY (sin código de producción) |
| Método | SDD + TDD (strict) + RDD (selectores verificados en HTML real) |
| Fuente inspectada | `https://cursos.devtalles.com` — HTML SSR Thinkific, 2026-09-16 |
| Persistencia runtime | Redis versionado |
| Fallback boot | `catalog.seed.json` en el repo |

> Este documento es el contrato. La implementación MUST seguirlo. Los selectores listados fueron observados en HTML real; los sufijos hash de Thinkific (`___abc12`) MUST ignorarse — matchear por prefijo estable de clase.

---

## 0. Flujo SDD + TDD + RDD (esta entrega)

| Fase | Artefacto | Estado en PROMPT 1 |
|---|---|---|
| **RDD** | Inspección HTML live (listados, cursos, rutas) | Hecho — §1 |
| **SDD explore** | `sdd/scraper-devtalles/explore` (Engram) | Hecho |
| **SDD propose** | `sdd/scraper-devtalles/proposal` (Engram) | Hecho |
| **SDD spec** | Este archivo + Engram `sdd/scraper-devtalles/spec` | **Entrega** |
| **SDD design** | Diseño de módulos/adapters | Siguiente (PROMPT 2+) |
| **SDD tasks** | Work units + orden TDD | Tras design |
| **TDD apply** | Fixtures → parsers → fetch → Redis → cron | Tras tasks; Strict TDD ON |
| **SDD verify** | Acceptance scenarios | Tras apply |

Regla TDD del proyecto (`strict_tdd: true`): ningún parser/use-case de producción sin test en rojo primero, con fixtures HTML offline.

---

## 1. Evidencia DOM (RDD) — selectores reales observados

### 1.1 Hechos de plataforma (verificados)

- Sitio: `https://cursos.devtalles.com` (Thinkific).
- Páginas SSR: título, cards, curriculum y rutas están en el HTML inicial → **HTTP GET + parse HTML**. **Prohibido** headless browser.
- Cloudflare delante del sitio (respuestas HTML grandes de página OK con UA de navegador; `robots.txt` devolvió **403** desde este entorno — ver §10).

### 1.2 Listados por categoría

URLs:

| Clave categoría | Path |
|---|---|
| `all` | `/pages/todos-los-cursos` |
| `wip` | `/pages/todos-los-cursos-en-construccion` |
| `free` | `/pages/todos-los-cursos-gratuitos` |
| `mini` | `/pages/todos-los-cursos-minicursos` |
| `exclusive` | `/pages/todos-los-cursos-exclusivos` |
| `legacy` | `/pages/todos-los-cursos-legacy` |

Estructura de card (observada en `todos-los-cursos` y `…-gratuitos`):

```html
<li class="products__list-item manual-pagination-item">
  <a class="card card--published card--curso" href="/courses/{slug}">
    <div class="card__img-container">
      <!-- opcional --> <div class="card__badge--new">NUEVO</div>
      <img class="card__img" src="https://import.cdn.thinkific.com/..." alt="">
    </div>
    <div class="card__body-container">
      <div class="card__body">
        <h3 class="card__name">…</h3>
        <span class="card__product-info">Curso • N lecciones</span> <!-- lecciones opcionales -->
        <p class="card__description">…</p>
      </div>
      <div class="card__price-container">
        <p class="card__price">
          <strong>$60</strong>
          <!-- o gratis: -->
          <span class="card__badge card__badge--free">Gratis</span>
        </p>
      </div>
    </div>
  </a>
</li>
```

Selectores de descubrimiento (prefijos estables):

| Dato | Origen |
|---|---|
| slug / URL relativa | `a.card.card--curso[href^="/courses/"]` |
| título listado | `h3.card__name` |
| descripción corta | `p.card__description` |
| imagen listado | `img.card__img[src]` |
| precio listado | `p.card__price strong` **o** badge gratis `span.card__badge--free` |
| badge nuevo | `div.card__badge--new` (opcional) |

**No** hay `/enroll/{id}` en los listados inspeccionados. El ID canónico solo aparece en la página de detalle.

Conteo snapshot 2026-09-16 (referencia, no hardcode de producción): `all=72`, `free=6`, `wip=4`, `mini=9`, `exclusive=7`, `legacy=14`, unión ≈ **90** slugs; **15** slugs en más de una categoría.

Slugs con mayúsculas / percent-encoding unicode observados, entre otros: `spring-AI`, `NestJS-Testing`, `Ingenier%C3%ADa-de-prompts` (decodificado `Ingeniería-de-prompts`), `Angular_socket_bun`, `NET-Backend`.

### 1.3 Detalle de curso — `/courses/{slug}`

Páginas inspeccionadas:

| Caso | URL | Enroll ID |
|---|---|---|
| De pago | `/courses/golang-backend-profesional` | `3805831` |
| Gratis | `/courses/visual-studio-code` | `2009621` |
| Unicode / mayúsculas | `/courses/Ingeniería-de-prompts`, `/courses/spring-AI`, `/courses/NestJS-Testing` | `3718763`, `3755151`, `3285600` |

Campos observados:

| Campo | Origen DOM / meta |
|---|---|
| Título | `h2.section__heading` dentro del banner del curso (el `h1.sr-only` es solo “DevTalles”); también `og:title` / `<title>` |
| Etiqueta tipo (opcional) | `span.devtalles-course-subtitle` (ej. `CURSO GRATUITO`, `Mini-curso`) |
| Meta description | `<meta name="description" content="…">` |
| Descripción larga | bloque `course-specs-grid` → columna cuyo `h3.spec-column-title*` contiene el texto `Descripción del curso` → `div.spec-inner-text*` |
| Imagen portada | `meta property="og:image"` (CDN `import.cdn.thinkific.com`) |
| Video preview | `iframe[src*="youtube.com/embed/"]` |
| Precio | `li.course-curriculum-card__details-item` con icono tag → `span` (`$60.00` o `Gratis`); también `h3.pricing-table__list-item-details__price` |
| Nº lecciones | mismo listado de details: texto `N lecciones` |
| Horas de video | texto `N horas de contenido en video` (decimal permitido, ej. `25.5`) |
| Instructor | siguiente `li.course-curriculum-card__details-item` tras horas (texto plano del nombre, ej. `Ricardo Cuéllar`, `Fernando Herrera`) |
| Subtítulos | opcional: details item con texto `Subtítulos disponibles` (visto en curso unicode; ausente en varios de pago) |
| Requisitos previos | `h3` con texto `Requisitos previos` → `div.spec-inner-text*` (HTML/texto libre; **no** arista de grafo) |
| Curriculum | `ol.course-curriculum__chapter-list` → `li.course-curriculum__chapter` → `h3.course-curriculum__chapter-title` → `ol.course-curriculum__chapter-content` → `a.course-curriculum__chapter-lesson` → `div.course-curriculum__lesson-title > p` |
| Prueba gratis | `span.course-curriculum__chapter-lesson--free` con texto `PRUEBA GRATIS` asociado a la lección |
| ID Thinkific | path `/enroll/{id}` (query `?et=free_trial` o `?et=free` MUST ignorarse al extraer id) |
| Cursos relacionados | sección `section.course-cards*` con heading `Cursos que podrían interesarte` → mismas cards `a.card.card--curso` |
| Link a rutas (nav) | anchors a `/pages/programas-*` o `/pages/ruta-*` (en samples: nav genérico “Rutas de aprendizaje” / “Rutas”; **no** se observó un campo estable “esta curso pertenece a la ruta X” en el detalle) |

Fragmento curriculum (pago):

```html
<li class="course-curriculum__chapter …">
  <h3 class="course-curriculum__chapter-title">Sección 1: Bienvenida al curso</h3>
  <ol class="course-curriculum__chapter-content …" id="chapter-1">
    <li>
      <a href="/enroll/3805831?et=free_trial" class="course-curriculum__chapter-lesson …">
        <div class="course-curriculum__lesson-title">
          <p>Bienvenida al curso</p>
          <span class="course-curriculum__chapter-lesson--free …">PRUEBA GRATIS</span>
        </div>
      </a>
    </li>
  </ol>
</li>
```

### 1.4 Rutas oficiales (13)

| Prefijo | Paths |
|---|---|
| `programas-*` | `programas-fundamentos`, `programas-react`, `programas-vue`, `programas-angular`, `programas-node`, `programas-nest` |
| `ruta-*` | `ruta-dart`, `ruta-python`, `ruta-java`, `ruta-c`, `ruta-ia`, `ruta-php`, `ruta-go` |

Estructura observada (`programas-react`, `ruta-python`):

- Contenedor: `div.RutaWrapper` con CSS `display: grid; grid-template-columns: 1fr 1fr 1fr`.
- Cabeceras de columna: `div.encabezado` con textos exactos:
  - `REQUERIDO`
  - `RECOMENDADO`
  - `OPCIONAL PERO MUY ÚTIL`
- Cursos: `a[href*="/courses/"]` envolviendo `div.main-box` + `p.main-text`.
- IDs de caja observados: prefijos `le`, `mi`, `ri` + dígito (ej. `le1`, `mi2`, `ri4`). Convención inferida por alineación con las 3 columnas del grid:
  - `le*` → columna **REQUERIDO** (left)
  - `mi*` → columna **RECOMENDADO** (middle)
  - `ri*` → columna **OPCIONAL PERO MUY ÚTIL** (right)
- Cuarto bucket: `div.encabezado` con texto `EN CUALQUIER MOMENTO`, seguido de cajas adicionales (ej. `le2` / Next.js en React).
- Spacers de layout: `div.emptySpace`, `div.empty-box` (no son cursos).
- Links frecuentemente con `?coupon=learn-01` (también `LEARN-01`, y ruido `%20learn-01`).
- Nav entre rutas: `section.rutas-sec` / `div.prog-nav.rutas-nav` / `a.prog-link`.

**Riesgo**: los `id` de `main-box` **no son únicos** en la página (ej. dos `ri2` en React). El parser MUST NO asumir unicidad global de `id`; MUST asociar cada `a`+`main-box` a un bucket por prefijo de id y/o posición relativa al bloque `encabezado` “EN CUALQUIER MOMENTO”.

Título de ruta: `div.titulo` dentro de `div.rich-text__container` (ej. `Ruta de aprendizaje React`, `Ruta de aprendizaje Python`).

---

## 2. Modelo de datos canónico

Tipos en TypeScript de especificación (no implementación).

### 2.1 Enums / unions

```ts
type CourseCategory =
  | "all" | "wip" | "free" | "mini" | "exclusive" | "legacy";

type PathBucket =
  | "REQUIRED"          // REQUERIDO
  | "RECOMMENDED"       // RECOMENDADO
  | "OPTIONAL"          // OPCIONAL PERO MUY ÚTIL
  | "ANYTIME";          // EN CUALQUIER MOMENTO

type Money = {
  amount: number;       // 0 si Gratis
  currency: "USD";      // ver §4 — símbolo $ observado; ISO no siempre literal junto al precio
};
```

### 2.2 `Course`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `number` | **Sí** (canónico) | `/enroll/{id}` en página detalle |
| `slug` | `string` | **Sí** | path `/courses/{slug}` (URL-decoded) |
| `title` | `string` | **Sí** | `h2.section__heading` / `og:title` |
| `subtitleLabel` | `string \| null` | No | `span.devtalles-course-subtitle` |
| `metaDescription` | `string \| null` | No | meta description |
| `description` | `string \| null` | No | specs grid “Descripción del curso” |
| `coverImageUrl` | `string \| null` | No | `og:image` |
| `previewYoutubeId` | `string \| null` | No | id de `youtube.com/embed/{id}` |
| `price` | `Money` | **Sí** | details / pricing-table; `Gratis`→0 |
| `lessonCount` | `number \| null` | No | details “N lecciones” |
| `videoHours` | `number \| null` | No | details “N horas de contenido en video” |
| `instructor` | `string \| null` | No | details (nombre) |
| `hasSubtitles` | `boolean` | **Sí** (default `false`) | presencia de “Subtítulos disponibles” |
| `prerequisitesText` | `string \| null` | No | “Requisitos previos” (texto informativo) |
| `categories` | `CourseCategory[]` | **Sí** (≥1) | en qué listados apareció el slug |
| `relatedCourseIds` | `number[]` | **Sí** (puede `[]`) | cards relacionadas resueltas a IDs tras el crawl |
| `relatedSlugs` | `string[]` | No (intermedio) | slugs de relacionados antes de resolver |
| `sections` | `Section[]` | **Sí** (puede `[]` solo si validación lo permite — ver §5) | curriculum |
| `sourceUrl` | `string` | **Sí** | URL absoluta canónica sin query |
| `scrapedAt` | `string` (ISO-8601) | **Sí** | clock del job |

### 2.3 `Section`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `index` | `number` | Sí | orden 0..n-1 |
| `title` | `string` | Sí | `h3.course-curriculum__chapter-title` (texto limpio, sin iconos) |
| `lessons` | `Lesson[]` | Sí | hijos del chapter |

### 2.4 `Lesson`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `index` | `number` | Sí | orden dentro de la sección |
| `title` | `string` | Sí | `div.course-curriculum__lesson-title > p` |
| `isFreePreview` | `boolean` | Sí | presencia de `span.course-curriculum__chapter-lesson--free` |

### 2.5 `LearningPath`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `id` | `string` | Sí | slug de página (`programas-react`, `ruta-python`, …) |
| `title` | `string` | Sí | `div.titulo` o `<title>` |
| `pagePath` | `string` | Sí | `/pages/{id}` |
| `entries` | `PathEntry[]` | Sí | cajas del `RutaWrapper` |
| `scrapedAt` | `string` | Sí | ISO-8601 |

### 2.6 `PathEntry`

| Campo | Tipo | Obligatorio | Origen |
|---|---|---|---|
| `bucket` | `PathBucket` | Sí | encabezado / prefijo id `le\|mi\|ri` / bloque ANYTIME |
| `courseId` | `number \| null` | No hasta resolución | resuelto vía slug→id del catálogo |
| `courseSlug` | `string` | Sí | href `/courses/{slug}` sin query |
| `label` | `string` | Sí | `p.main-text` |
| `position` | `number` | Sí | orden de aparición en el path |

### 2.7 Snapshot de catálogo

```ts
type CatalogSnapshot = {
  version: number;
  generatedAt: string;          // ISO-8601
  source: "scraper" | "seed";
  courses: Course[];
  paths: LearningPath[];
  stats: {
    courseCount: number;
    pathCount: number;
    categoryCounts: Record<CourseCategory, number>;
  };
};
```

---

## 3. Inventario de URLs y descubrimiento

### 3.1 Semilla fija (config)

1. **6 listados** (§1.2) — descubrimiento de slugs + categorías.
2. **13 rutas** (§1.4) — `PathEntry` por slug.
3. **N detalles** — una URL por slug único: `https://cursos.devtalles.com/courses/{slug}` (slug tal cual aparece en el href, respetando mayúsculas; decode `%XX` al normalizar el campo `slug`).

### 3.2 Algoritmo

1. Fetch de los 6 listados (concurrencia limitada).
2. Por cada card `a.card.card--curso`: extraer slug; añadir categoría de la página al set del slug.
3. Deduplicar por **slug** en fase descubrimiento; la deduplicación canónica final es por **`id` numérico** tras el detalle.
4. Fetch de cada detalle único; extraer `id`, curriculum, precio, etc.
5. Si dos slugs distintos resolvieran al mismo `id` (no observado, pero posible): **merge** categorías y fallar ruidoso si títulos conflictivos.
6. Fetch de las 13 rutas; parsear entries; resolver `courseSlug` → `courseId` con el mapa del catálogo.
7. Resolver `relatedSlugs` → `relatedCourseIds` (omitir slugs no encontrados en catálogo y registrar warning; si la tasa de miss > umbral — ver §5 — fallar).

### 3.3 Orden recomendado

Listados → detalles de curso → rutas (las rutas necesitan el mapa slug→id).

---

## 4. Reglas de normalización

| Entrada | Regla |
|---|---|
| Links | Strip de query/hash (`?coupon=…`, `?et=…`). Conservar path y host canónico `https://cursos.devtalles.com`. |
| Slug | `decodeURIComponent`; conservar case. Campo secundario; **no** es PK. |
| ID curso | Primer grupo de `/enroll/(\d+)`; MUST ser el mismo en todos los enroll links de la página. |
| YouTube | De `…/embed/([A-Za-z0-9_-]+)` → `previewYoutubeId`. |
| Precio | `Gratis` / badge free → `{ amount: 0, currency: "USD" }`. `$60`, `$60.00`, `$9.00` → parse float; moneda **USD** (símbolo `$` observado; no siempre aparece el literal “USD” junto al precio del curso). |
| Lecciones / horas | Extraer número con regex de los spans de details. |
| HTML text | Decode entidades (`&amp;`, `&nbsp;`, …); colapsar whitespace; trim. Títulos de sección: quitar nodos icono. |
| `prerequisitesText` | Texto/HTML atexto plano informativo; **no** crear edges del grafo aunque contenga links a otros cursos. |
| Coupons en rutas | Descartar; no persistir. |
| Path bucket | Mapear textos ES → enum EN (§2.1). Prefijos `le`/`mi`/`ri` → REQUIRED/RECOMMENDED/OPTIONAL; nodos tras encabezado `EN CUALQUIER MOMENTO` → ANYTIME. |

---

## 5. Validación del catálogo (antes de persistir)

El job MUST fallar (exit ≠ 0, **sin** avanzar `catalog:current`) si alguna falla:

| Check | Regla |
|---|---|
| V1 | `courses.length >= MIN_COURSES` (default **50**; configurable; basado en snapshot ~90) |
| V2 | `paths.length === 13` |
| V3 | Todo `Course`: `id`, `slug`, `title`, `price`, `categories.length >= 1`, `sourceUrl` presentes |
| V4 | Todo `id` único; todo `slug` único |
| V5 | Todo `PathEntry.courseSlug` existe en el catálogo (tras resolución, `courseId` no null) |
| V6 | Ningún curso con `id` inválido (`NaN`, `<= 0`) |
| V7 | Si se parsearon listados OK pero `courses.length === 0` → fallar (catálogo vacío) |
| V8 | Si falló el fetch/parse de **> MAX_FAIL_RATIO** de detalles (default **5%**) → fallar (parcial) |
| V9 | `stats.courseCount === courses.length` y coherencia de `categoryCounts` |

Warnings (no bloquean salvo umbral): relacionados no resueltos; ausencia de YouTube; `sections=[]` en un curso puntual.

**Fail ruidoso**: log estructurado con conteos, URLs fallidas y check id; **nunca** persistir snapshot vacío/parcial como `current`.

---

## 6. Persistencia Redis versionada

### 6.1 Claves

| Clave | Valor |
|---|---|
| `catalog:v{n}` | payload serializado del `CatalogSnapshot` con `version = n` |
| `catalog:current` | string `"v{n}"` (puntero) |
| `catalog:previous` | string `"v{n-1}"` opcional, para rollback operativo |
| `catalog:lock` | lock del job (TTL) para evitar crons solapados |

### 6.2 Switch atómico

1. `GET catalog:current` → `v{k}` (o vacío).
2. `n = k + 1` (si vacío, `n = 1`).
3. `SET catalog:v{n}` con el snapshot **solo tras validación OK**.
4. `SET catalog:previous` = valor anterior de current (si existía).
5. `SET catalog:current` = `v{n}` (el puntero es el switch; lectores siempre leen `current` → clave versionada).
6. Retener al menos la versión anterior; política de GC: borrar `v{n-2}` y anteriores (conservar ≥1 previa).

### 6.3 Serialización

- Formato: **JSON UTF-8** (un solo blob por versión).
- Alternativa permitida si se documenta en design: JSON + compresión (`gzip`) con prefijo mágico; el seed del repo permanece JSON legible.
- Lectores de la app: `GET catalog:current` → `GET catalog:{pointer}`. Si miss → cargar seed.

---

## 7. Resiliencia

| Control | Requisito |
|---|---|
| Rate limit | ≤ **1 req/s** sostenido al host (configurable); burst ≤ 2 |
| Concurrencia | max **3** requests in-flight |
| Timeout | connect 10s / total 45s por request |
| Reintentos | hasta **3** con backoff exponencial + jitter (ej. 1s, 2s, 4s) en 429/5xx/timeouts de red |
| User-Agent | string realista de Chrome estable (mismo perfil que en RDD) |
| Headers | `Accept: text/html`, `Accept-Language: es-ES,es;q=0.9` |
| robots.txt | intentar `GET /robots.txt`; si 200, respetar `Disallow`/`Crawl-delay`. Si 403/bloqueo CF (observado), log warning y aplicar rate limit conservador (§10) |
| Idempotencia | lock Redis; no dos writers |
| Partial failure | ver V8 — no publicar parcial |

**Prohibido**: Playwright/Puppeteer/Selenium u otro headless.

---

## 8. Fallback obligatorio — `catalog.seed.json`

- Archivo versionado en el repo (ruta propuesta: `backend/src/modules/catalog/data/catalog.seed.json` o `data/catalog.seed.json` — fijar en design).
- Mismo schema `CatalogSnapshot` con `source: "seed"`, `version: 0` (o timestamp fijo documentado).
- La aplicación MUST arrancar y servir catálogo **sin** ejecutar el scraper y **sin** Redis poblado, leyendo el seed.
- El scraper, tras un run exitoso, MAY regenerar el seed en CI opcional (out of scope PROMPT 1); el seed committed MUST actualizarse cuando el contrato de datos cambie.

---

## 9. Plan de fixtures y tests (TDD)

### 9.1 Fixtures HTML (guardar bajo `…/fixtures/devtalles/`, nombres estables)

| Fixture | Origen | Cubre |
|---|---|---|
| `listing-all.html` | `/pages/todos-los-cursos` | cards pago, badge NUEVO, slugs mixed-case |
| `listing-free.html` | `/pages/todos-los-cursos-gratuitos` | badge `Gratis`, pocas cards |
| `course-paid.html` | `golang-backend-profesional` | precio `$60.00`, curriculum con `PRUEBA GRATIS`, relacionados, enroll id |
| `course-free.html` | `visual-studio-code` | precio `Gratis`, enroll `?et=free`, subtitleLabel |
| `course-unicode.html` | `Ingeniería-de-prompts` | slug unicode, subtítulos, mini-curso |
| `path-programas-react.html` | `programas-react` | 3 columnas + ANYTIME + coupons |
| `path-ruta-python.html` | `ruta-python` | variante `ruta-*`, menos entries |

Los fixtures MUST ser HTML real recortado solo si se preservan los nodos de parseo (preferible snapshot completo).

### 9.2 Suites (orden TDD)

1. **Unit — `parseListing(html, category)`**  
   - Extrae N cards; slug/title/price; free badge → amount 0.  
   - Given listing-free When parse Then 6 courses con `price.amount === 0`.

2. **Unit — `parseCourseDetail(html, slug)`**  
   - id desde enroll; price; lessonCount; videoHours; instructor; youtube id; sections/lessons/isFreePreview; prerequisitesText; relatedSlugs.  
   - Given course-unicode When parse Then slug decoded + `hasSubtitles === true`.

3. **Unit — `parseLearningPath(html, pathId)`**  
   - buckets correctos para sample react/python; strip coupon; ignore emptySpace.  
   - Given path-react When parse Then entry React `react-de-cero` en `REQUIRED` (`le*`).

4. **Unit — `normalize*` / money / youtube / url**  
   - Tabla de casos: `Gratis`, `$9.00`, coupon URLs, entidades HTML.

5. **Unit — `validateCatalog(snapshot)`**  
   - Rechaza vacío, path huérfano, id duplicado; acepta snapshot mínimo sintético válido.

6. **Integration (sin red)** — pipeline: fixtures listados + detalles + paths → snapshot → validate OK.

7. **Integration Redis** — testcontainer o mock: escribe `v1`, switch current, escribe `v2`, previous=v1, current=v2.

8. **Contract seed** — app bootstrap lee seed sin Redis.

**Prohibido en CI unitario**: hits a `cursos.devtalles.com`. Un job manual/nightly “smoke live” MAY existir separado y no bloquear merge.

---

## 10. Riesgos y comportamiento ante cambio de DOM

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Thinkific cambia clases / layout de cards | Listados vacíos | V1/V7 fail ruidoso; no switch Redis |
| Curriculum markup cambia | `sections` incompletas | umbral de fail; alert |
| Rutas redesign (sin `RutaWrapper` / ids `le|mi|ri`) | buckets incorrectos | V2/V5; tests de fixture en rojo |
| Cloudflare challenge / 403 | crawl incompleto | retries; V8; conservar `catalog:current` previo |
| robots.txt ilegible (403 observado) | compliance incierta | rate limit estricto + documentar; reintentar robots en cada run |
| Precio multi-moneda futuro | money mal parseado | validar símbolo; fallar si formato desconocido |
| IDs `main-box` duplicados | mal bucket | no indexar por id global; asociar por nodo |
| “Link a ruta” por curso no estable en detalle | campo path en Course ambiguo | **no** inventar; paths son fuente de pertenencia vía `PathEntry` |
| Requisitos con links a cursos | tentación de grafo | texto only (§4) |

**Política**: preferir **fallar el job** a publicar basura. El sistema sigue sirviendo la versión Redis anterior o el seed.

---

## 11. Acceptance scenarios (Given / When / Then)

### REQ-DISC-1 — Descubrimiento desde listados
- **Given** fixtures de los 6 listados con cards conocidas  
- **When** corre la fase de descubrimiento  
- **Then** cada slug tiene el set de categorías correcto y no hay requests a detalle todavía

### REQ-DETAIL-1 — ID canónico Thinkific
- **Given** `course-paid.html`  
- **When** se parsea el detalle  
- **Then** `id === 3805831` y `slug === "golang-backend-profesional"`

### REQ-DETAIL-2 — Curso gratis
- **Given** `course-free.html`  
- **When** se parsea  
- **Then** `price.amount === 0` y `price.currency === "USD"`

### REQ-PATH-1 — Buckets
- **Given** `path-programas-react.html`  
- **When** se parsea  
- **Then** existen entries en REQUIRED/RECOMMENDED/OPTIONAL/ANYTIME y ningún href conserva `coupon`

### REQ-VAL-1 — Path huérfano
- **Given** un snapshot donde un `PathEntry.courseSlug` no está en `courses`  
- **When** `validateCatalog`  
- **Then** falla y no se escribe Redis current

### REQ-REDIS-1 — Switch versionado
- **Given** `catalog:current = v1` válido  
- **When** un scrape OK produce snapshot  
- **Then** existe `catalog:v2`, `catalog:current = v2`, y `v1` sigue legible

### REQ-SEED-1 — Boot sin scraper
- **Given** Redis vacío y `catalog.seed.json` presente  
- **When** arranca la app  
- **Then** el módulo de catálogo expone cursos del seed sin error fatal

### REQ-RES-1 — Sin headless
- **Given** la implementación del scraper  
- **When** se revisa el design/código  
- **Then** no hay dependencia de browser automation

---

## 12. Dudas / supuestos

1. **robots.txt**: desde este entorno respondió 403 (página “request is blocked”). No se pudo confirmar `Disallow`/`Crawl-delay`. Supuesto: aplicar rate limit conservador y reintentar robots en cada run.
2. **Moneda**: el precio del curso aparece como `$60.00` / `Gratis` sin “USD” adyacente en el details item; “USD” aparece en otras zonas de la página. Supuesto: currency = `USD`.
3. **Mapeo `le`/`mi`/`ri` → buckets**: no hay reglas CSS `grid-column` por id en el HTML; la asignación es **inferida** por prefijo + grid de 3 columnas alineado a los tres `encabezado`. Debe validarse visualmente en design/QA; si DevTalles cambia la convención de ids, el parser romperá a propósito.
4. **Pertenencia curso→ruta en la página de detalle**: solo se vio nav genérico a rutas, no un vínculo semántico estable “este curso ∈ ruta X”. Supuesto: la pertenencia canónica vive solo en `LearningPath.entries`.
5. **Instructor**: no hay clase `instructor__name` en el landing inspeccionado; el nombre sale del 4º item de `course-curriculum-card__details-item`. Frágil si reordenan el listado.
6. **`lessonCount` del listado vs detalle**: el listado a veces muestra “• N lecciones” y a veces no; la fuente de verdad es el detalle.
7. **Cursos solo en rutas y no en listados**: no observado en el sample; si aparece, V5 fallaría hasta incluir otra fuente de descubrimiento — hoy **MUST** descubrirse vía listados.
8. **`MIN_COURSES=50`**: calibrado al snapshot ~90; ajustar si el catálogo real crece/encoge de forma estable.
9. **Comunidad / products no-curso**: links a `/products/communities/…` existen en nav; el scraper MUST ignorarlos (solo `a.card.card--curso` y hrefs `/courses/`).
10. **Paginación de listados**: las cards vistas usan `manual-pagination-item` pero el HTML inicial ya traía el set completo del listado (72 en “todos”). Supuesto: no hay segunda página server-side necesaria; si en el futuro el HTML nace truncado, el spec deberá extenderse (sin headless: buscar links de paginación en el HTML).

---

## 13. Non-goals (PROMPT 1)

- Código de producción, cron real, módulo NestJS.
- Tests ejecutables (solo el plan).
- Grafo de requisitos previos.
- Headless browser / bypass de Cloudflare.
- Modificar código existente del monorepo fuera de este spec.
