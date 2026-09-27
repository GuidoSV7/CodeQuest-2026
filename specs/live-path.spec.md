# Ruta en vivo en la web

| Campo | Valor |
|---|---|
| Método | SDD. Esta entrega es solo el spec. La implementación sigue TDD contra las secciones 2, 4, 5, 7, 8 y 10. |
| Página | `https://codequest-frontend-oiueyi-4bb3e7-31-97-78-167.sslip.io/en-vivo` |
| API | `https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io` |
| Alcance | Solo `/mcp/user` publica eventos. `/mcp` público no. |
| Transporte | SSE. El WebSocket actual `GET` upgrade `/api/me/learning-paths/live` no se extiende. |
| Fuera | No se cambia ningún `inputSchema`. Las opciones de `path.choice_required` no son clicables. No se borra `frontend/path-diagram`. |

## 0. Verificación previa

### Sesión

El frontend no hace de proxy.

- `GET https://codequest-frontend-oiueyi-4bb3e7-31-97-78-167.sslip.io/api/auth/me` responde **404** de Next (`content-type: text/html`, `x-powered-by: Next.js`). No hay rewrite en `frontend/next.config.ts`.
- `GET https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io/api/auth/me` con `Origin` del frontend responde **401** JSON `{ code: "UnauthorizedException", message: "Missing session" }` y estos headers: `access-control-allow-credentials: true`, `access-control-allow-origin: https://codequest-frontend-oiueyi-4bb3e7-31-97-78-167.sslip.io`, `vary: Origin`.
- El cliente HTTP es Axios con `baseURL` = `NEXT_PUBLIC_API_URL` (URL absoluta del backend) y `withCredentials: true` (`frontend/src/lib/axios.ts`, `frontend/src/lib/api-url.ts`).

El stream usa ese mismo cruce: `EventSource` contra el host del API con `withCredentials: true`. El `userId` sale de la cookie de sesión (`cq_session` por defecto; el nombre real es `SESSION_COOKIE_NAME`). Nunca de query ni de body.

La cookie tiene que ser `SameSite=None; Secure` para que el navegador la mande de un host `sslip.io` a otro. El código acepta `lax` o `none` (`SESSION_COOKIE_SAMESITE`). Con `lax` el SSE autenticado no funciona. Ver dudas.

### Frontend y streaming

Next.js `16.3.5`, React `19.3.0`, salida `standalone`, imagen Docker en Dokploy. Como el stream no entra por Next, el runtime de Next no acumula el body. El proxy que sí está en el camino es Traefik del backend.

### Traefik

Config observada del backend (`application-readTraefikConfig`): routers HTTP y HTTPS al host del API, único middleware `redirect-to-https`. El servicio es `loadBalancer` a `http://codequest-backend-zhydji:3000` con `passHostHeader: true`. No hay middleware `compress` ni `responseForwarding.flushInterval`. El middleware global de Dokploy también es solo `redirect-to-https`.

Para `text/event-stream` hace falta, en el servicio del backend:

```yaml
loadBalancer:
  responseForwarding:
    flushInterval: 1ms
```

Sin eso Traefik puede retener el body. La respuesta además manda `Cache-Control: no-cache, no-transform` para que un compresor no le ponga `Content-Encoding`. `X-Accel-Buffering: no` se envía por si aparece un proxy tipo nginx; Traefik no lo interpreta.

Réplicas observadas del backend: `1`. El bus en memoria asume esa única instancia.

## 1. Secuencia

```text
Usuario en Claude                /mcp/user                 bus en proceso              Redis                 página /en-vivo
        |                            |                            |                      |                          |
        | tools/call generate        |                            |                      |                          |
        |--------------------------->|                            |                      |                          |
        |                            | path.generated (payload)   |                      |                          |
        |                            |--------------------------->| SET last TTL 24h     |                          |
        |                            |                            |--------------------->|                          |
        |                            |                            | SSE data             |                          |
        |                            |                            |----------------------------------------------->| dibuja
        | result + live_url          |                            |                      |                          |
        |<---------------------------|                            |                      |                          |

Página abierta después:
        |                            |                            | GET last             |                          |
        |                            |                            |<---------------------|                          |
        |                            |                            | SSE último evento    |                          |
        |                            |                            |----------------------------------------------->| dibuja lo guardado
        |                            |                            | cada ~20 s heartbeat |                          |
```

Si Redis no responde, el `SET` falla, se loguea `warn` y el evento igual se entrega a las conexiones abiertas. Una página que se abre después no recibe estado previo.

## 2. Contrato SSE

`GET /api/me/learning-paths/events`

Sin cookie válida o con JWT inválido: **401** JSON igual que `/api/auth/me` (`Missing session`). El body del 401 no es `text/event-stream`.

Headers de una conexión aceptada:

| Header | Valor |
|---|---|
| `Content-Type` | `text/event-stream; charset=utf-8` |
| `Cache-Control` | `no-cache, no-transform` |
| `Connection` | `keep-alive` |
| `X-Accel-Buffering` | `no` |

Primera línea de la conexión: `retry: 5000`.

Cada evento es un bloque separado por una línea en blanco. `data` es un solo JSON en una línea. `id` es el identificador monótono del evento (no el del usuario).

Tipos: `path.generated`, `path.choice_required`, `path.saved`, `progress.updated`, `heartbeat`.

El latido se emite a los ~20 s aunque no haya ruta, para que proxies no cierren la conexión:

```text
id: 42
event: heartbeat
data: {"type":"heartbeat","at":"2026-09-27T00:20:00.000Z"}
```

Reconexión: `EventSource` reintenta a los 5 s. El servidor no reproduce un log. Si hay último estado en Redis, lo manda una vez al conectar y sigue con lo nuevo. `Last-Event-ID` no selecciona un delta. Un latido no pisa el último estado de ruta.

### `path.generated`

Se publica cuando `generate_learning_path` en `/mcp/user` armó una ruta. La carga es la respuesta actual de la tool más `type` y `userId` no va en el payload.

```text
event: path.generated
data: {"type":"path.generated","strategy":"official_path","source_path_id":"programas-react","catalog_version":12,"notes":"Ruta oficial …","items":[{"course_id":"1999158","title":"JavaScript Moderno: Guía para dominar el lenguaje","url":"https://cursos.devtalles.com/courses/javascript-moderno","bucket":"recommended","position":0,"already_known":false,"partial":false}],"edges":[{"from_course_id":"3395229","to_course_id":"1959693"}],"edges_meta":{"kind":"linear_required","inferred":true},"diagram":{"mermaid":"flowchart LR"}}
```

`strategy: "catalog_search"` usa la misma forma, con `source_path_id: null`, `bucket: null` en cada item y `edges: []`.

### `path.choice_required`

Si el alias ganador de `matchOfficialPath` empata en longitud con otro `path_id` distinto, la tool no elige. Publica:

```text
event: path.choice_required
data: {"type":"path.choice_required","goal":"frontend","options":[{"path_id":"programas-react","title":"Ruta de aprendizaje React","alias":"react"},{"path_id":"programas-vue","title":"Ruta de aprendizaje Vue","alias":"vue"}]}
```

### `path.saved`

`save_learning_path` al guardar, y `get_my_path` al leer una ruta que existe. La carga alcanza para dibujar: mismos campos de items que `path.generated`, con `path_id` de la ruta persistida.

```text
event: path.saved
data: {"type":"path.saved","path_id":"8d2c0b1a-1111-4111-8111-111111111111","title":"Ruta generada","strategy":"official_path","source_path_id":"programas-react","items":[{"course_id":"3395229","title":"React: de cero a experto","url":"https://cursos.devtalles.com/courses/react-de-cero","bucket":"required","position":1,"already_known":false,"partial":false,"progress":"not_started"}],"edges":[],"edges_meta":{"kind":"linear_required","inferred":true}}
```

### `progress.updated`

Solo el curso afectado. No trae la ruta entera.

```text
event: progress.updated
data: {"type":"progress.updated","path_id":"8d2c0b1a-1111-4111-8111-111111111111","course_id":"3395229","status":"completed"}
```

`status` es `not_started`, `in_progress` o `completed`.

## 3. CORS y cookies

Orígenes distintos. La respuesta SSE lleva:

- `Access-Control-Allow-Origin`: el valor exacto de `FRONTEND_URL` (el host del frontend, sin barra final).
- `Access-Control-Allow-Credentials`: `true`.
- `Vary`: `Origin`.

El preflight `OPTIONS` permite `GET` y el header `Accept`. `EventSource` no manda `Authorization`; la cookie viaja sola. Un `Origin` que no sea `FRONTEND_URL` no recibe `Allow-Credentials`.

## 4. Redis

Clave: `live:path:{userId}`. Valor: el bloque SSE completo del último evento de ruta (`path.generated`, `path.choice_required` o `path.saved`). `progress.updated` se aplica sobre ese JSON en memoria de la clave si existe, y se vuelve a guardar con el TTL renovado. Un latido no se guarda.

TTL: 86400 s. Es descartable. Si `SET` o `GET` lanza, la página conectada sigue recibiendo eventos del bus. Al conectar, si el `GET` falla, no se envía estado previo y la UI queda en «esperando». Log `warn` con `event: live_path_redis_unavailable`, sin el cuerpo de la ruta.

## 5. Tools de `/mcp/user`

Input schemas sin cambios. Publican solo si la tool terminó bien (sin `isError`).

| Tool | Evento |
|---|---|
| `generate_learning_path` | `path.generated`, o `path.choice_required` si hay empate de alias |
| `get_my_path` | `path.saved` |
| `save_learning_path` | `path.saved` |
| `update_course_progress` | `progress.updated` |

`search_courses`, `get_course`, `list_official_paths` y `get_official_path`, aunque estén montadas también en `/mcp/user`, no publican. En `/mcp` ninguna tool publica, tampoco `generate_learning_path`.

Texto agregado al final del `content[].text` (el JSON de la tool no se mezcla con la frase; la frase va en un segundo bloque de texto) y campo de salida `live_url`:

`live_url`: `https://codequest-frontend-oiueyi-4bb3e7-31-97-78-167.sslip.io/en-vivo`

Frase exacta, en el segundo bloque `text`:

`La ruta se muestra en tu página: https://codequest-frontend-oiueyi-4bb3e7-31-97-78-167.sslip.io/en-vivo`

Para `path.choice_required` la frase es:

`Decile a Claude cuál preferís. Las opciones están en tu página: https://codequest-frontend-oiueyi-4bb3e7-31-97-78-167.sslip.io/en-vivo`

## 6. Página `/en-vivo`

Estados:

| Estado | Qué se ve |
|---|---|
| `sin_sesion` | El `EventSource` recibe 401 o el GET de sesión falla. Texto: «Entrá para ver tu ruta en vivo.» Enlace a `/login`. |
| `esperando` | Sesión válida, todavía no hay evento de ruta. Texto: «Esperando que Claude arme la ruta.» |
| `conectado` | El stream está abierto. Indicador «En vivo». |
| `reconectando` | `EventSource` pasó a `CONNECTING` después de haber estado abierto. Indicador «Reconectando». |
| `ruta` | Hay `path.generated` o `path.saved`. Se dibuja el diagrama. |
| `eleccion` | Hay `path.choice_required`. Lista las opciones y el texto «Decile a Claude cuál preferís». Sin botones y sin `onClick`. |

El indicador de conexión es un texto visible, no solo un color: «En vivo» o «Reconectando». Permanece junto al título.

`progress.updated` con un `course_id` que no está en la ruta dibujada se ignora.

## 7. Animación

Orden de aparición: columnas de izquierda a derecha (`required`, `recommended`, `optional`) y, dentro de cada columna, `position` ascendente. Cada tarjeta entra con opacidad 0 a 1 y 8 px de desplazamiento vertical.

| Paso | Duración |
|---|---|
| Cada tarjeta | 180 ms |
| Espera entre tarjetas | 90 ms |
| Aristas, juntas, al terminar la última tarjeta | 220 ms |
| `fitView` | 300 ms, después de las aristas |

Una ruta nueva (`path.generated` o `path.saved` con otro `path_id` o `source_path_id`) sustituye a la anterior: el lienzo baja a opacidad 0 en 200 ms, se monta el layout nuevo y corre la secuencia. `progress.updated` no reinicia la secuencia: cambia solo el badge de estado de esa tarjeta.

`prefers-reduced-motion: reduce` muestra el frame final sin delays (opacidad 1, aristas visibles, un solo `fitView`).

## 8. Layout compartido

Archivo actual: `frontend/path-diagram/src/layout-path.ts`. Hoy `columnOf` manda `null` y `anytime` a la columna opcional, y los tres headers ya comparten `y = 24`, pero la UI del widget no los dejó a la misma altura visual y metió ítems sin bucket en una columna.

Correcciones:

- Los tres encabezados (`REQUERIDO`, `RECOMENDADO`, `OPCIONAL`) comparten la misma `y`. La primera tarjeta de cada columna empieza en la misma `y`, bajo el encabezado, aunque la columna de al lado tenga más tarjetas.
- Si algún item trae `bucket: null`, el modo es búsqueda: grilla de tarjetas, sin encabezados de columna, sin grupo y sin aristas. Prohibido un encabezado «SIN BUCKET».
- `fitView` corre después de que los nodos tienen ancho y alto medidos, y otra vez en el `resize` del contenedor.
- El título de la tarjeta ocupa como máximo dos líneas y después se corta. No se usa `white-space: nowrap` de DevTalles.
- Tipografías de esta pantalla: Space Grotesk y DM Sans, cargadas con `next/font` (archivos en el build). No hay `<link>` a `fonts.googleapis.com` en runtime. El resto del sitio sigue con Outfit, Raleway y Space Mono.
- Debajo de 720 px (`COLUMN_MIN` ya definido en el layout) las columnas oficiales se apilan en vertical, cada encabezado sobre sus tarjetas. La grilla de búsqueda pasa a una columna.

## 9. Estilo, citado del HTML real

Medido el 2026-09-27 en el HTML de `https://cursos.devtalles.com/pages/programas-fundamentos` (448179 bytes) y en los `<style>` de esa página. `https://cursos.devtalles.com/pages/ruta-dart` declara las mismas hojas (Thinkific `custom_site_theme_required`, Space Grotesk y DM Sans). Los valores de abajo salen del bloque `<style>` de Fundamentos, que es el que dibuja `.RutaWrapper`.

| Uso | Selector o llamada | Valor |
|---|---|---|
| Título de la pantalla | `.titulo` | Space Grotesk, mayúsculas, `1rem` (pasa a `1.25rem` en el último bloque de ese selector), `letter-spacing: 2px`, `color: #f0eeff`, margen inferior 50 px, centrado |
| Encabezado de columna | `.encabezado` | DM Sans, `0.688rem` (el media de 480 px lo sube a `0.75rem`), peso 500, mayúsculas, `letter-spacing: 2.5px`, `color: rgba(192, 185, 252, 0.55)`, margen inferior 50 px |
| Grilla | `.RutaWrapper` | `display: grid`, `grid-template-columns: 1fr 1fr 1fr`, `gap: 20px` (`column-gap: 20px` en los media) |
| Tarjeta | `.main-box` | fondo `rgba(28, 24, 41, 0.85)`, borde `1px solid rgba(192, 185, 252, 0.12)`, `border-radius: 20px` (la misma regla declara antes `18px` y lo pisa), padding `10px 15px`, texto `#f0eeff`. Ancho de escritorio: `min-width`/`max-width: 300px`. En `max-width: 768px` el max baja a 200 px; en `max-width: 480px`, a 100 px |
| Hover | `.main-box:hover` | borde `rgba(192, 185, 252, 0.3)`, sombra `0 0 0 1px rgba(192, 185, 252, 0.1), 0 16px 48px rgba(58, 20, 196, 0.32)`, `translateY(-4px)` |
| Título del curso | `.main-text` | DM Sans, `0.875rem`, peso 400, `line-height: 1.5`, `#f0eeff` |
| Badge BASES | `.bases-box` + variable `--basesBOX-color` | fondo `rgba(192, 185, 252, 0.5)`, padding `2px 10px`, `border-radius: 30px`. Texto `.bases-text`: `#f0eeff`, DM Sans, `0.688rem`, peso 500, mayúsculas, `letter-spacing: 1.5px` |
| Badge FRONTEND | `.frontend-box` + `--frontendBOX-color` | fondo `rgba(48, 10, 111, 0.5)`. Texto `.frontend-text`: `#c0b9fc`, misma medida que `.bases-text` |
| Badge BACKEND | `.backend-box` + `--backendBOX-color` | fondo `rgba(58, 20, 196, 0.5)` |
| Badge MÓVIL | `.movil-box` + `--movilBOX-color` | fondo `rgba(200, 221, 9, 0.5)`. Texto `.movil-text`: `#0A0614` |
| Badge WEB | `.web-box` + `--webBOX-color` | fondo `rgba(244, 174, 163, 0.5)` |
| Badge otro | `.otro-box` + `--otroBOX-color` | fondo `rgba(224, 221, 237, 0.5)` |
| Líneas | `new LeaderLine({ color: '#dcd8ff', size: 1, path: 'grid' })` | trazo `#dcd8ff`, grosor 1. En el SVG de la librería, `.leader-line-line-path { fill: none }` |

El mapeo de `bucket` a badge: `required` y el texto de categoría «bases» usan `.bases-box`; frontend, backend y móvil usan su caja. Un item de búsqueda (`bucket: null`) no lleva badge de columna; si el curso no trae categoría, no se inventa una.

Las líneas del producto son las aristas `smoothstep` del layout, con el color y el grosor de LeaderLine (`#dcd8ff`, 1 px), no un `<script>` de LeaderLine.

## 10. Plan de tests

Unitarios de layout (`layout-path`):

- Tres headers con la misma `y`, y la primera tarjeta de cada columna con la misma `y`.
- Un item `bucket: null` no crea columna ni arista.
- Con solo buckets oficiales, las aristas siguen saliendo de los edges de entrada cuyos ids existen.

Backend:

- Sin cookie, `GET /api/me/learning-paths/events` es 401 y no abre el stream.
- Un query `user_id` no cambia el usuario: solo cuenta la sesión.
- Al conectar, si Redis tiene un evento, ese es el primer evento de ruta.
- Redis caído: la conexión igual abre y no hay estado previo.
- Llega un `heartbeat` antes de 25 s.
- Cada tool de la tabla de la sección 5 publica su evento y agrega `live_url` y la frase. Un error de tool no publica.
- `generate_learning_path` en `/mcp` no publica.
- El `tools/list` de `/mcp` y de `/mcp/user` no trae `_meta.ui` ni `_meta["ui/resourceUri"]`, y `resources/list` no incluye `ui://codequest/path-diagram.html`.

Frontend:

- Reducir una secuencia de eventos deja el último dibujo y el progreso del curso correcto.
- Con `prefers-reduced-motion: reduce` no hay delays: el estado final aparece en el primer frame.
- Al pasar el `EventSource` a reconexión, el indicador dice «Reconectando» y, al abrir de nuevo, se conserva la ruta.

Playwright, fixtures reales (React oficial, Fundamentos, Dart, búsqueda con `bucket: null`, elección pendiente) en anchos 380, 768 y 1280. Cada captura afirma el indicador «En vivo», que no exista el texto «SIN BUCKET», y que la elección muestre «Decile a Claude cuál preferís» sin botones.

## 11. Dudas / supuestos

- No se leyó el valor vivo de `SESSION_COOKIE_SAMESITE` en el contenedor, para no sacar el resto del entorno. El spec exige `None` y `Secure` porque el navegador llama a otro host. Si producción sigue en `lax`, el 401 del stream es esperado hasta cambiar esa variable.
- DevTalles deja tres columnas incluso en `max-width: 480px` y recorta el título a una línea (`white-space: nowrap`). Aquí se apila bajo 720 px y el título llega a dos líneas, porque eso es lo que pide el producto; los colores y radios sí salen de esa hoja.
- El badge de columna usa «bases / frontend / backend / móvil» según el bucket y la categoría del curso. Si un curso no trae categoría, no se inventa el texto.
- `get_my_path` republica `path.saved` cada vez que la tool responde bien, aunque la página ya tenga esa ruta. La animación completa solo corre si cambia `path_id` o `source_path_id`.
- El bus no cruza réplicas. `replicas: 1` hoy. Redis no reemplaza al bus.
- El WebSocket `/api/me/learning-paths/live` queda fuera de este contrato. La página nueva no lo abre.
