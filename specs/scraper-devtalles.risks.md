# Riesgos y hallazgos del scraper DevTalles

Fecha de investigación en vivo: **2026-09-16** (PROMPT 7).  
Dry-run completo de `syncCatalog` **no completó**: abortó al parsear el listado WIP.

## 1. Bloqueador del dry-run / sync real

| Hallazgo | Detalle |
|---|---|
| Página | `/pages/todos-los-cursos-en-construccion` |
| Error | `Unrecognized price: ` en `parseCourseListing` → `parseMoney` |
| Cursos afectados (sin `card__price` / sin Gratis) | `patrones-diseno-agentico`, `kafka-springboot-event-driven`, `codex`, `go-microservicios` |
| Impacto | El orquestador falla en la fase de listados; **no** llega a detalles ni rutas |

**Propuesta (pendiente de confirmación):** tratar precio ausente en listados WIP como `null` o `{ amount: 0 }` / omitir card sin tumbar el listing completo. No se aplicó fix en PROMPT 7.

## 2. Conteos vs esperado

| Métrica | Esperado | Observado (investigación) | Notas |
|---|---|---|---|
| Cursos únicos (unión 6 listados) | ~75 | **90** | `all=72`, `wip=4`, `free=6`, `mini=9`, `exclusive=7`, `legacy=14` |
| Rutas oficiales | 13 | **13** | Las 13 páginas parsearon con `parseLearningPath` |

Desviación de cursos: **+15** respecto a ~75. No es infra-conteo; el catálogo público actual es más grande (legacy + overlaps). El sync productivo no pudo confirmar el conteo post-detalle por el bloqueador WIP.

## 3. Páginas de ruta con estructura distinta entre sí

| Ruta | Diferencia estructural |
|---|---|
| `programas-react` | **Dos** grids / encabezados duplicados (React web + bloque RN). Extra: encabezado libre `"En caso de dar mantenimiento a una aplicación de RN usando CLI"` (no es bucket). ANYTIME presente. |
| `programas-fundamentos`, `programas-angular` | 4 buckets con `EN CUALQUIER MOMENTO`. |
| `programas-vue`, `programas-node`, `programas-nest`, `ruta-python`, `ruta-java`, `ruta-ia` | Solo 3 encabezados; **sin** ANYTIME. |
| `ruta-dart` | Encabezados vacíos `""` intercalados; entradas duplicadas (`dart-cero-hasta-detalles`, `flutter-Intermedio`). |
| `ruta-c` | Encabezado vacío primero; falta label `RECOMENDADO` explícito en texto; parser asignó `REQUIRED: 0`. |
| `ruta-php`, `ruta-go` | Encabezados vacíos; pocas entradas (2); `REQUIRED: 0` vía prefijos `mi*`/`ri*`. |

Convención `le`/`mi`/`ri` → bucket sigue siendo frágil cuando el DOM no alinea ids con columnas.

## 4. Cursos sin video preview

Dry-run de detalle **no ejecutado** (bloqueo en listados).  
Evidencia previa (fixtures / RDD):

- Caso sintético de tests: `course-no-preview.html` (iframe YouTube eliminado).
- En HTML real de samples previos, la mayoría de landings traían `youtube.com/embed/...`; no hay inventario completo live en esta corrida.

**Pendiente:** tras arreglar WIP listing, re-correr sync y listar `previewYoutubeId === null`.

## 5. Cursos referenciados en rutas no presentes en ningún listado

Slug en rutas pero **ausente** de la unión de los 6 listados (descubrimiento por cards):

- `Vue-intermedio`

WIP-only / listados frágiles (aparecen en rutas y en WIP, pero el parser de listing revienta antes de registrar categoría `wip`):

- `patrones-diseno-agentico`, `kafka-springboot-event-driven`, `codex`, `go-microservicios`

Sin sync completo no hay mapa `courseId` resuelto; estos quedarían como warnings de path orphan o no descubiertos.

## 6. Selectores frágiles

| Selector / regla | Riesgo |
|---|---|
| `p.card__price strong` / badge free | Falla si Thinkific omite el bloque de precio (WIP). |
| Prefijos `id` de `main-box` (`le`/`mi`/`ri`) | Sin CSS `grid-column`; ids duplicados; encabezados vacíos en C#/PHP/Go/Dart. |
| Múltiples `.RutaWrapper` / `.encabezado` | React duplica bloques; texto libre no-bucket contamina encabezados. |
| Instructor vía orden de `course-curriculum-card__details-item` | Depende del orden del listado de details. |
| Lecciones locked como `<span>` vs preview `<a>` | Ya manejado; puede cambiar el markup Thinkific. |
| Sufijos hash `___xxxxx` en clases | Hay que matchear por prefijo; OK hoy, frágil si renombran el prefijo estable. |

## 7. Infra de la corrida PROMPT 7

- Redis externo: **no disponible** (`redis-cli` ausente / sin ping).
- Persistencia real y refresh de `catalog.seed.json`: **no ejecutadas** (dry-run no limpio + sin Redis).
- Scripts efímeros usados: `backend/scripts/prompt7-*.ts` (diagnóstico; no funcionalidad de producto).
