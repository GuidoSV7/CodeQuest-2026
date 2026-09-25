# Spec: diagrama interactivo de rutas (web + MCP Apps)

| Campo | Valor |
|---|---|
| Change | `path-diagram` |
| Estado | **SPEC ONLY** (sin código) |
| Método | SDD + TDD |
| Depende de | `specs/mcp-public.spec.md`, `specs/mcp-oauth.spec.md` |
| Librería de grafo | `@xyflow/react` (línea 12; el patch se fija al implementar) |
| SDK de MCP Apps | `@modelcontextprotocol/ext-apps@1.7.5` |

Un solo componente dibuja la ruta. La web lo monta en la página de una ruta. El cliente MCP lo monta dentro de un iframe cuando la tool declara un recurso `ui://`. El texto y el `diagram.mermaid` que las tools ya devuelven se quedan: son el fallback si el cliente no renderiza la app.

## 0. Decisiones cerradas

| Decisión | Valor |
|---|---|
| Layout | Función pura `layoutPath`. Sin dagre, sin elkjs, sin auto-layout |
| Columna | El bucket: `required`, `recommended`, `optional` |
| Fila | La `position` del ítem dentro de su bucket, orden ascendente |
| `anytime` | Nodo grupo debajo de las tres columnas, no una cuarta columna |
| Ancho mínimo del layout de columnas | 720 px de contenedor. Debajo de eso, una sola columna |
| Aristas | Tipo React Flow `smoothstep`, solo las que vienen en `edges`. No se inventan |
| Widget | Un HTML. JS, CSS, fuentes e íconos inline. Cero CDN y cero `fetch` a otro origen |
| `/mcp` | El widget es de solo lectura |
| `/mcp/user` | Solo `get_my_path` ofrece marcar progreso. Llama a `update_course_progress` |
| Schemas de entrada | No cambian |
| Versión del SDK | `1.7.5`. Ver §12 sobre `2.0.0` |

Los ids de ruta que usa el catálogo son `programas-fundamentos` y `ruta-dart` (`OFFICIAL_PATH_IDS` en `backend/src/modules/catalog-scraper/domain/config.ts`).

---

## 1. Dónde vive el componente

El repo es un workspace npm. Dokploy construye la imagen del frontend con contexto `frontend/`, así que el código compartido vive ahí y no en un paquete publicado.

```
frontend/path-diagram/
```
  src/layout-path.ts          # layoutPath, pura, sin React
  src/path-diagram.tsx        # PathDiagram, @xyflow/react
  src/icons.ts                # SVG inline por categoría
  src/model.ts                # PathDiagramModel
  widget/main.tsx             # entry del iframe: App del SDK + PathDiagram
  widget/index.html
  vite.widget.config.ts       # vite-plugin-singlefile
```

`frontend/package.json` depende de `path-diagram` (workspace). La página `frontend/src/app/(producto)/mis-rutas/[routeId]/page.tsx` hoy monta `RouteDetail`. Esa página, y solo el detalle de una ruta, renderiza `<PathDiagram model={...} mode="web" />`.

El build del widget produce un solo archivo `frontend/path-diagram/dist/path-diagram.html`. El Dockerfile del backend lo copia a `backend/dist/mcp-ui/path-diagram.html`. Al arrancar, un provider de Nest lo lee **una vez** y guarda el string en memoria. `resources/read` devuelve ese string. No vuelve a tocar el disco.

Hay un solo HTML para los dos servidores. El modo lo decide el resultado de la tool, no un segundo bundle: si `structuredContent.ui.allow_progress` es `true`, el widget muestra el control de progreso. Ese flag lo pone solo `get_my_path`.

---

## 2. Modelo de entrada

`PathDiagram` no lee el JSON crudo de cada tool. Un adaptador, en el mismo paquete, normaliza `structuredContent` a `PathDiagramModel`.

```ts
type Bucket = "required" | "recommended" | "optional" | "anytime"

type PathDiagramItem = {
  courseId: string
  title: string
  url: string
  bucket: Bucket | null
  position: number
  alreadyKnown: boolean
  partial: boolean
  completed: boolean
  category: "free" | "mini" | "exclusive" | "legacy" | "wip" | null
  lessonCount: number | null
  videoHours: number | null
}

type PathDiagramModel = {
  title: string
  pathId: string | null
  items: PathDiagramItem[]
  edges: Array<{ fromCourseId: string; toCourseId: string }>
  allowProgress: boolean
}
```

### 2.1 De dónde sale cada campo

| Campo del modelo | `generate_learning_path` y `get_official_path` | `get_my_path` |
|---|---|---|
| `courseId` | `items[].course_id` o, en la ruta oficial, `path.courses[].course_id` | `items[].courseId` |
| `title` | `title` / `path.courses[].title` | `items[].courseTitle` |
| `url` | `url` | no está hoy; el adaptador usa `""` |
| `bucket` | `bucket` | `items[].bucket`, o `null` si falta |
| `position` | `position` | `items[].position` |
| `alreadyKnown` | `already_known` (en la oficial hoy es siempre `false`) | `false` |
| `partial` | `partial` | `false` |
| `completed` | `false` | `items[].progress.status === "completed"` |
| `pathId` | `null` en generate; `path.id` en la oficial | `id` de la ruta del usuario |
| `allowProgress` | `false` | `true` |
| `edges` | `edges[]` con `from_course_id` / `to_course_id` | Hoy no existen. La tool **agrega** `edges` en la salida, con la misma regla que el MCP público: cadena lineal solo entre ítems `required`, en orden de `position`. El widget no arma esa cadena |

`lessonCount` y `videoHours` no viajan en las tools de hoy. Quedan `null` y el panel dice «No disponible». Agregarlos a la **salida** está permitido. Tocar el schema de **entrada** no.

`get_official_path` devuelve `path.courses` y `path.edges`. `generate_learning_path` devuelve `items` y `edges` en la raíz. El adaptador acepta las dos formas. `diagram.mermaid` no entra al layout.

Un ítem con `bucket: null` se dibuja en la columna `optional` y su badge dice «Sin bucket».

### 2.2 Tarjeta

Cada ítem es un nodo de React Flow, salvo los de `anytime`, que son hijos del grupo.

| Parte | Origen |
|---|---|
| Título | `title`, una línea, ellipsis |
| Badge | Texto del bucket: Requerido, Recomendado, Opcional, En cualquier momento |
| Ícono | SVG inline del paquete, elegido por `category`. El catálogo no trae un ícono de materia: `CourseCategory` es `all`, `wip`, `free`, `mini`, `exclusive`, `legacy`. Si `category` es `null` o `all`, se usa el glifo genérico (un nodo). `wip` comparte el glifo de `partial` |
| Ya visto | Badge de texto «Ya visto» si `alreadyKnown` |
| A medias | Badge de texto «Incompleto» si `partial` |
| Completado | Badge de texto «Completado» si `completed`. Gana sobre «Ya visto» |

Los tres estados también cambian el borde. El texto del badge es obligatorio: el estado no puede depender solo del color.

No se carga `coverImageUrl` ni el iframe de YouTube. Los dos pegan a otro origen.

---

## 3. Algoritmo de layout

```ts
layoutPath(items: PathDiagramItem[], edges: PathDiagramEdge[], width: number): {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
}
```

Misma entrada (ítems, aristas y `width` en el mismo lado del corte de 720) produce las mismas coordenadas. El orden de `items` no importa: se ordena por `position` y, si empatan, por `courseId`.

### 3.1 Medidas, columnas (`width >= 720`)

| Token | Valor |
|---|---|
| `PAD` | 24 |
| `COL_W` | 280 |
| `COL_GAP` | 48 |
| `CARD_W` | 248 |
| `CARD_H` | 96 |
| `ROW_GAP` | 24 |
| `HEADER_H` | 40 |
| `GROUP_PAD` | 16 |
| `GROUP_LABEL_H` | 36 |

Tres columnas, de izquierda a derecha: `required`, `recommended`, `optional`.

```
colX(i) = PAD + i * (COL_W + COL_GAP)          // i = 0, 1, 2
cardX(i) = colX(i) + (COL_W - CARD_W) / 2
headerY  = PAD
cardY(row) = PAD + HEADER_H + row * (CARD_H + ROW_GAP)
```

`row` es el índice del ítem dentro de su bucket después de ordenar, empezando en 0. Dos cursos `required` con `position` 0 y 4 quedan en las filas 0 y 1, pegados. No se reserva la fila del número de `position`.

La base de las columnas es:

```
colsBottom = PAD + HEADER_H + maxRows * CARD_H + max(0, maxRows - 1) * ROW_GAP
```

`maxRows` es el máximo de ítems entre las tres columnas. Si las tres están vacías, `maxRows` es 0 y `colsBottom = PAD + HEADER_H`.

Los encabezados «REQUERIDO», «RECOMENDADO», «OPCIONAL» son nodos no conectables, en `(colX(i), headerY)`, tamaño `COL_W × HEADER_H`.

### 3.2 Grupo `anytime`

Si hay al menos un ítem `anytime`:

```
groupX = PAD
groupY = colsBottom + 32
innerCards = items anytime ordenados
groupW = COL_W * 3 + COL_GAP * 2
groupH = GROUP_PAD + GROUP_LABEL_H + CARD_H + GROUP_PAD
```

Las tarjetas van en una sola fila dentro del grupo. No se wrappean en este layout: el grupo crece a lo ancho si hace falta.

```
childX(k) = GROUP_PAD + k * (CARD_W + 16)
childY    = GROUP_PAD + GROUP_LABEL_H
```

El label del grupo es «EN CUALQUIER MOMENTO», arriba de las tarjetas. El nodo padre tiene `type: "group"`. Los hijos llevan `parentId` de ese grupo y `extent: "parent"`. React Flow suma el origen del padre: las coordenadas de este spec son relativas al grupo.

### 3.3 Layout vertical (`width < 720`)

Una columna. Orden de secciones: Requerido, Recomendado, Opcional, En cualquier momento. Una sección sin ítems no se dibuja.

```
x = PAD
sectionHeaderH = 36
cursor empieza en PAD
por cada sección:
  encabezado en (x, cursor), alto sectionHeaderH
  cursor += sectionHeaderH
  cada tarjeta en (x, cursor), alto CARD_H
  cursor += CARD_H + ROW_GAP
```

`anytime` no es un grupo en este modo: es la última sección, con el mismo encabezado. El corte es estricto: `width === 720` usa columnas.

### 3.4 Aristas

Por cada `{ fromCourseId, toCourseId }`:

- Si alguno de los dos ids no está en `items`, la arista se descarta.
- Si está, el edge de React Flow es `{ id: "${from}->${to}", source, target, type: "smoothstep" }`.
- No se agrega una arista entre ítems consecutivos si `edges` no la trae.
- En el modo vertical los handles siguen siendo izquierda/derecha de la tarjeta. React Flow enruta `smoothstep` con la posición que salió del layout.

### 3.5 Ejemplos de salida

El seed del repo no trae los cursos de Fundamentos ni de Dart. Los números de abajo son el contrato del algoritmo sobre dos fixtures mínimas con la forma de esas rutas. El test de implementación congela, además, el `get_official_path` real de `programas-fundamentos` y de `ruta-dart` contra el catálogo de ese día y compara las coordenadas con esta misma función. Si el catálogo cambia, se actualiza el golden, no la fórmula.

**Fixture A, forma Fundamentos.** Dos required, un recommended, un optional, un anytime. `width = 960`.

| Nodo | x | y |
|---|---:|---:|
| header required | 24 | 24 |
| header recommended | 352 | 24 |
| header optional | 680 | 24 |
| required[0] | 40 | 64 |
| required[1] | 40 | 184 |
| recommended[0] | 368 | 64 |
| optional[0] | 696 | 64 |
| grupo anytime | 24 | 312 |
| anytime hijo, relativo al grupo | 16 | 52 |

`cardY(0) = 64`. `cardY(1) = 184`. `colsBottom = 280`. `groupY = 312`.

| Arista | Se dibuja |
|---|---|
| required[0] → required[1] | sí, si viene en `edges` |
| required → recommended | no, si no viene en `edges` |

**Fixture B, forma Dart, `width = 400`.** Un required y un anytime. Layout vertical.

| Nodo | x | y |
|---|---:|---:|
| encabezado Requerido | 24 | 24 |
| required[0] | 24 | 60 |
| encabezado En cualquier momento | 24 | 180 |
| anytime[0] | 24 | 216 |

`60 = 24 + 36`. La tarjeta termina en `60 + 96 = 156`. El siguiente encabezado cae en `156 + 24 = 180`.

---

## 4. Interacción

El canvas de React Flow lleva `panOnDrag`, `zoomOnScroll` y `minZoom` 0.4, `maxZoom` 1.5. Al montar y cuando cambia el conjunto de nodos, `fitView` con `padding: 0.12`.

Clic o Enter en una tarjeta abre un panel al lado del grafo (en el widget, debajo si el ancho es menor a 720). El panel muestra título, bucket, badges de estado, lecciones, horas y la URL del curso. Lecciones y horas en `null` se leen «No disponible». No hay iframe de preview: el preview vive en la página del curso.

Abrir la ficha del curso:

- **Widget.** `app.openLink({ url })` de `@modelcontextprotocol/ext-apps@1.7.5`. Eso manda `ui/open-link`. El host abre el navegador. No se usa `window.open`. Si la promesa resuelve `{ isError: true }`, o si `url` es `""`, el panel muestra la URL como texto seleccionable y no insiste.
- **Web.** Un `<a href={url} target="_blank" rel="noopener noreferrer">`. Navegación normal del browser.

El panel se cierra con Escape y con un botón «Cerrar».

En modo `allowProgress`, el panel de un curso no completado tiene «Marcar completado». El de uno completado tiene «Marcar sin empezar». Ver §5.3.

---

## 5. Integración MCP Apps

Documentación usada: tipos publicados de `1.7.5` (`dist/src/app.d.ts`) y la spec estable `2026-01-26` del mismo repo. El quickstart del sitio de docs todavía está rotulado `v1.1.2`; los nombres de método de abajo se contrastaron con `1.7.5`.

Mime type oficial, constante `RESOURCE_MIME_TYPE`:

`text/html;profile=mcp-app`

URIs:

| Servidor | Tools | URI |
|---|---|---|
| `/mcp` | `generate_learning_path`, `get_official_path` | `ui://codequest/path-diagram.html` |
| `/mcp/user` | las dos anteriores y `get_my_path` | el mismo URI |

`search_courses`, `get_course` y `list_official_paths` no declaran UI.

En el registro de la tool, sin cambiar el input schema:

```ts
_meta: { ui: { resourceUri: "ui://codequest/path-diagram.html" } }
```

También se escribe el alias legado `_meta["ui/resourceUri"]` con el mismo string. La spec del SDK marca ese alias como deprecado; se deja porque los hosts tienen que leer los dos.

### 5.1 Handshake

1. El host llama a la tool.
2. Ve `resourceUri`, hace `resources/read` y carga el HTML en un iframe (a veces detrás de un sandbox proxy).
3. El script del widget hace `const app = new App({ name: "codequest-path-diagram", version: "1.0.0" }, { autoResize: true })`.
4. Asigna `app.ontoolresult` **antes** de `app.connect()`, para no perder el resultado que ya está listo.
5. `app.connect()` manda `ui/initialize` y, al terminar, `ui/notifications/initialized`.
6. El host contesta el initialize con `hostContext` y, después, manda `ui/notifications/tool-input` y `ui/notifications/tool-result`.
7. `ontoolresult` lee `structuredContent`. Si no viene, parsea el primer `content[]` de tipo `text` como JSON. Si tampoco es JSON, el widget muestra el texto y no dibuja el grafo.

`autoResize: true` es el default del SDK. Un `ResizeObserver` avisa con `ui/notifications/size-changed` (método `app.sendSizeChanged`). No hace falta calcular la altura a mano salvo que un host ignore el aviso: en ese caso el canvas tiene un alto de respaldo de 560 px para que el grafo no colapse a 0.

### 5.2 Tema

`app.getHostContext()?.theme` es `"light"`, `"dark"` o `undefined`. `app.onhostcontextchanged` (y el evento `hostcontextchanged`) vuelve a leerlo cuando el host cambia. El widget llama a `applyDocumentTheme` del mismo paquete y, si `theme` falta, usa el fondo oscuro de CodeQuest (`#0b1020` de fondo, texto claro). No se leen variables de CSS del parent del iframe: el documento del widget no las hereda.

### 5.3 Progreso

Solo si `allowProgress` es true y `pathId` no es null. El clic llama:

```ts
app.callServerTool({
  name: "update_course_progress",
  arguments: {
    path_id: pathId,
    course_id: courseId,
    status: completed ? "not_started" : "completed",
  },
})
```

El input schema de esa tool no se toca: ya pide `path_id`, `course_id` y `status`.

Si `result.isError` es true, la tarjeta no cambia y el panel muestra «No se pudo guardar el progreso». Si no, `completed` se invierte en el estado local. No se espera un segundo `get_my_path`. La tool de actualización responde `{ course_id, status }`, no el diagrama.

`update_course_progress` sigue visible para el modelo. No se le pone `visibility: ["app"]`: Claude la usa también por texto.

En `/mcp` público la tool no existe. El flag `allow_progress` no se envía, así que el botón no se renderiza aunque alguien reutilice el HTML.

---

## 6. Accesibilidad

- Cada tarjeta es un `button` con nombre accesible: título, bucket y badges, en ese orden. Ejemplo: «React Hooks, Requerido, Incompleto».
- El orden de tabulación es el de `layoutPath`: columnas de izquierda a derecha y, dentro, de arriba a abajo. En vertical, el orden de las secciones.
- Enter y Espacio abren el panel. Escape lo cierra y devuelve el foco a la tarjeta.
- El panel es un `dialog` con foco atrapado mientras está abierto.
- Los badges son texto, no solo color.
- `prefers-reduced-motion`: `fitView` sin animación.

---

## 7. Build y servicio del HTML

Herramienta: Vite más `vite-plugin-singlefile`, el mismo patrón del quickstart del SDK. El entry es `widget/index.html`. React, `@xyflow/react` y su CSS quedan inline. Nada de Google Fonts: la tipografía es la pila del sistema.

Objetivo de tamaño: el HTML resultante pesa como máximo **2 MB** sin comprimir. Si el build se pasa, se recorta el bundle (tree-shaking de React Flow) antes de subir el techo. No se cumple el límite sacando el runtime a un CDN.

Al boot, Nest lee el archivo con `readFile` una vez, dentro de `OnModuleInit`, y lo deja en un string. Si el archivo no está, el proceso arranca igual y `resources/read` de ese URI responde el error de recurso del SDK; las tools de texto siguen respondiendo. `resources/read` no llama a `readFile`.

El servidor lista el recurso en `resources/list` aunque la spec de MCP Apps permita omitir los recursos `ui://`. Este proyecto lo lista para poder testearlo.

`resources/read` devuelve:

```json
{
  "contents": [
    {
      "uri": "ui://codequest/path-diagram.html",
      "mimeType": "text/html;profile=mcp-app",
      "text": "<!DOCTYPE html>..."
    }
  ]
}
```

---

## 8. Plan de tests

### 8.1 `layoutPath`

| Caso | Espera |
|---|---|
| Misma entrada dos veces | Mismos `x`, `y`, ids |
| Tres buckets con un ítem cada uno, `width` 960 | Columnas en 24, 352 y 680 |
| Dos required | Filas 64 y 184, misma x |
| Un anytime | Existe un nodo grupo; el hijo es relativo |
| `width` 719 | Un solo x de tarjetas, 24 |
| `width` 720 | Vuelve a tres columnas |
| Arista cuyo extremo no está en `items` | No aparece |
| Arista entre dos ids presentes | Una arista `smoothstep` |
| `position` desordenado | La fila la define el sort, no el orden del array |
| `edges` vacío | Cero aristas, aunque haya required consecutivos |

Fixtures A y B de §3.5 son los casos de Fundamentos y de Dart en forma corta. Un tercer test, de integración de datos, corre `layoutPath` sobre la salida real de `getOfficialPath` para `programas-fundamentos` y `ruta-dart` y solo verifica columnas y el grupo, no los títulos, para no acoplar el golden al texto del catálogo.

### 8.2 Componente

Con `@xyflow/react` montado en jsdom, o con el view env de Testing Library si hace falta un polyfill de `ResizeObserver`.

- Un ítem `partial` muestra el texto «Incompleto».
- Un ítem `alreadyKnown` muestra «Ya visto».
- Un ítem `completed` muestra «Completado» y no «Ya visto».
- Clic en la tarjeta abre el diálogo con el título.
- `mode="web"`: el enlace es un `<a href>`. No se llama a ningún `openLink`.
- `mode="mcp"` con `openLink` mockeado: el enlace llama `openLink({ url })` y no `window.open`.
- `allowProgress` false: no hay botón de progreso.
- `allowProgress` true: el botón llama `callServerTool` con `name: "update_course_progress"` y los tres argumentos. Si el mock devuelve `isError: false` y `status: "completed"`, el badge pasa a «Completado». Si `isError: true`, el badge no cambia.

### 8.3 Servidor

Sobre el servidor MCP público y sobre `/mcp/user`, en los tests que ya levantan la app:

- `tools/list`: `generate_learning_path` y `get_official_path` tienen `_meta.ui.resourceUri === "ui://codequest/path-diagram.html"`.
- En `/mcp/user`, `get_my_path` también. `search_courses` no.
- `resources/list` incluye ese URI.
- `resources/read` devuelve `mimeType` `text/html;profile=mcp-app`.
- El HTML no contiene `http://` ni `https://` fuera de un comentario de versión, ni `cdn`, ni `fonts.googleapis`, ni `unpkg`. Un allowlist vacío: cualquier URL absoluta falla el test.
- El `inputSchema` de las tres tools queda igual que antes de este cambio (snapshot del schema).

---

## 9. Verificación manual

Cuando el código exista, contra un catálogo con `programas-fundamentos` y `ruta-dart`:

1. **Claude Desktop.** Conectar `/mcp`. Pedir la ruta de fundamentos. El chat muestra el texto y el Mermaid, y debajo el diagrama de tres columnas. Clic en una tarjeta y «Abrir curso» sale del iframe por el host.
2. **Claude.ai.** El mismo pedido con el conector ya desplegado. Si el producto no muestra el iframe, el texto y el Mermaid tienen que seguir alcanzando para leer la ruta. Se anota la versión del cliente.
3. **Cursor.** El servidor `/mcp/user`, con la sesión ya hecha. `get_my_path` muestra el diagrama. Marcar un curso completado y volver a pedirlo: el badge queda. La página web ` /mis-rutas/[id] ` de esa misma ruta muestra el mismo layout.
4. **Cliente sin MCP Apps.** `tools/list` sigue siendo usable. La respuesta de texto incluye el Mermaid. No hay error si el host ignora `resourceUri`.

Si un host no manda `tool-result` al iframe pero sí muestra el HTML vacío, el widget deja el canvas con «Esperando la ruta…» y no inventa nodos.

---

## 10. Dudas / supuestos

1. **`@modelcontextprotocol/ext-apps@2.0.0`** es el `latest` de npm al 2026-09-25 y declara peer `@modelcontextprotocol/server@^2` y `@modelcontextprotocol/core@^2`. Este backend usa `@modelcontextprotocol/sdk@1.30.1`. El spec fija **1.7.5**, que es la 1.x con la que el propio repo de ext-apps todavía prueba interoperabilidad. Subir a 2.0.0 implica cambiar el paquete de servidor y no entra en este spec.
2. **`openLink` en 1.7.5** devuelve `{ isError }` y manda `ui/open-link`. Confirmado en `dist/src/app.d.ts` de esa versión. El host puede negar la URL. No está documentado qué dominios acepta Claude.ai.
3. **`onhostcontextchanged`** está deprecado en 1.7.5 a favor de `addEventListener("hostcontextchanged")`. El comportamiento del tema (`"light" | "dark" | undefined` en `getHostContext()`) sí está confirmado. `applyDocumentTheme` se exporta del entry del paquete. No se confirma que Claude rellene `hostContext.styles.variables`.
4. **`resources/list`.** La spec de MCP Apps dice que el servidor puede omitir los recursos `ui://`. Este spec elige listarlos, para el test de §8.3. Si un host se confunde al listar HTML al modelo, se saca de `resources/list` y se deja solo `resources/read` por el URI. Eso sería un cambio de este spec.
5. **`get_my_path` no tiene `edges` ni `url` hoy.** La cadena de required se agrega a la salida de esa tool, calculada en el servidor con la misma regla que `catalog-read.ts`. El widget no la inventa. Es un cambio de salida, no de input.
6. **Categoría e ícono.** El ítem de la tool no trae categoría. Hasta que la salida la incluya, todas las tarjetas usan el glifo genérico. Los SVG por `free | mini | exclusive | legacy | wip` existen en el paquete para cuando el campo aparezca.
7. **Página web de la ruta oficial pública.** El diagrama de la web entra en `/mis-rutas/[routeId]`, que es una ruta del usuario. Una ruta oficial vista solo por MCP no tiene página nueva en este spec.
8. **React Flow y el iframe.** Hace falta un alto explícito del contenedor. `autoResize` informa la altura del documento. Si el host fija el iframe y no escucha `size-changed`, el respaldo es 560 px. No se sabe si Claude.ai honra ese aviso.
9. **`fitView` al marcar progreso** no se redispara si solo cambia un badge. Sí se redispara si entra o sale un nodo.
10. **El paquete compartido** asume que el widget y Next pueden depender de React 19, que es el de `frontend/`. `@xyflow/react` v12 lo admite.
