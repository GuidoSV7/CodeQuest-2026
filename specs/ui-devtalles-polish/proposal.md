# Proposal — `ui-devtalles-polish`

> Fase: `sdd-propose`. Fuente de verdad: `specs/ui-devtalles-polish/explore.md` (2026-09-27, HEAD `0d1a541`).
> ✅ **Dirección aprobada por el dev vía plan (2026-09-27).** El dev pidió que el ciclo corra sin frenar; este checkpoint queda cubierto por esa aprobación.

## 📐 Propuesta

- **Enfoque:** entrega escalonada en **4 lotes reversibles**, un commit (o PR) por lote, cada uno con su suite verde antes de pasar al siguiente. Se extiende el sistema visual Orbital existente (tokens `--orbital-*`, CSS Modules, `<img>` plano); no se reemplaza ningún patrón.
- **Por qué:** el grueso es presentación (riesgo BAJO), pero tres piezas elevan el riesgo global a MEDIO: el contrato `CourseCard` (consumidor externo MCP `get_my_path`), la UI de auth (gate `src/**/auth/**`) y la ruptura de ~20 asserts de caracterización. Separar por lote aísla cada foco: si falla uno, se revierte solo ese.
- **Complejidad de dominio:** baja (presentación). Sin Clean/DDD ni capas nuevas; la única lógica es el mapeo `toCourseCard` con allowlist y el mapa estático ruta→icono.
- **Riesgo (de explore):** **MEDIO**. No exige plan escalonado obligatorio; se escalona igual por decisión del dev.
- **Componente de runtime nuevo:** ninguno → no aplica `## Evidencia medida`. Solo se suma la dependencia npm `lucide-react` y assets estáticos.

## Alternativa más simple — solo Lotes 1–2

Hacer solo shell/auth/mobile/Lucide chrome (Lote 1) + iconos de stack y contrato `coverImageUrl` (Lote 2). Deja fuera configurador/diagrama (Lote 3) y el copy/tokens/landing (Lote 4).
- **Gana:** menos asserts de caracterización que reescribir, ciclo más corto, cero cambio de copy literal (no hace falta superar #1460 todavía).
- **Pierde:** siguen visibles las cifras inventadas de la landing (violación de anti-invención en producción), el placeholder "El video va acá", el configurador alineado a la izquierda, `--live-display` inexistente y `×` unicode como icono (piso de oficio). El cover queda expuesto en el contrato pero **sin consumidor visual** hasta el Lote 3.
- **Recomendación:** plan completo. Si hay que recortar, el corte mínimo aceptable es Lotes 1–2 **más** la quita de cifras inventadas del Lote 4 (es una corrección de anti-invención, no pulido).

## Lotes

### Lote 1 — Shell / auth / mobile / Lucide chrome
- ADR `decisions/0002-lucide-chrome-icons.md` (lo escribe design) supera la cláusula "sin librerías de iconos nuevas" del ADR 0001: `lucide-react` versión fija (sin `^`), import por icono, `strokeWidth` uniforme, **solo chrome** (marcas y las ilustraciones con `role="img"` se quedan).
- Header sin sesión: un único botón **"Entrar"** → `/login`. `/registro` sigue vivo, alcanzable desde "Crear cuenta" del `LoginPanel`. OAuth (`discordStartUrl`, `authEntryPath`, callback) intacto.
- Mobile: "Entrar" a la derecha del hamburguesa. Se respetan las restricciones CSS de los tests (`min-height: 4rem`, `padding-top: 4rem`, `nowrap`, `@media (min-width: 48rem)`, sin `max-width: 42rem`, panel no `fixed`, `.avatar` visible). La variante `login` del shell gana `MissionShellMobileNav`.
- Nav: "Descubre tu ruta" → **"Configurador de ruta"**. `/configurador-de-ruta` y `/mis-rutas` **no** se fusionan.
- Footer: "DevTalles" primero; "Code Quest 2026" solo como crédito.
- Chrome → Lucide: `Menu`/`X` (mobile nav), `Copy`/`Check` (MyRouteStatus), `X` (LivePath, reemplaza `×`), `ArrowRight`/`ArrowUpRight`/`ExternalLink` (landing). Nombres a verificar en el paquete instalado antes de usarlos.
- `login-contract.test.ts` (2 rojos preexistentes, obsoletos): se declaran en spec con el porqué y se actualizan al contrato Discord actual.
- **Rollback:** `git revert <commit-lote-1>` (incluye quitar `lucide-react` de `package.json`/lockfile). Sin datos ni infra.

### Lote 2 — Iconos de stack vendorizados + contrato `coverImageUrl`
- **Iconos de stack:** 14 SVG en `frontend/public/devtalles-tech/`, renderizados como `<img>` (evita colisión de clases `.cls-N`). Mapa en **una sola fuente** en `frontend/src/config/`. `programas-fundamentos` → `ICON-JS`; `ICON-LEGACY` se vendoriza sin uso en v1. Ubicaciones: picker de ruta oficial y lista de rutas en `MyRouteStatus`, cards de `/mis-rutas` (el consumidor `load-my-routes.ts` pasa a leer `sourceCatalogPathId`, que el backend ya devuelve; sin cambio de contrato). `null` → sin icono.
- **Contrato `coverImageUrl`** (TRIAGE: contrato antes que código; no hay openapi → se escribe en `spec.md`/`design.md`):
  - Backend `toCourseCard` copia `coverImageUrl` con **allowlist en la frontera**: solo `https://import.cdn.thinkific.com/`; si no matchea o no es https → `null`.
  - Tipo `CourseCard` gana `coverImageUrl: string | null` en backend (`course-card.ts`) y front (`path-diagram/src/model.ts`), con test de paridad/shape.
  - **No** se agrega al MCP público (`catalog-read.ts`). `get_my_path` lo recibe de forma aditiva (no breaking) por `...detail`.
  - Tests: caso con cover válido / host no permitido / `null` en `course-card.spec.ts` (con `toStrictEqual` o fixture explícito para que el campo no pase en silencio); actualizar `learning-paths.service.spec.ts:290-302`; test nuevo para `loadCourseCard` (hueco del explore).
- **Rollback:** `git revert <commit-lote-2>`. El snapshot en Redis ya contiene el campo; revertir solo vuelve a descartarlo. Los consumidores MCP toleran la ausencia (el campo es aditivo).

### Lote 3 — Diagrama / configurador
- Cover **solo en `CourseModal`** con `<img>` plano (sin tocar `next.config.ts`). No en la card del nodo, para no cambiar la geometría de `layoutPath`. `null` → no se renderiza el bloque de imagen.
- Configurador centrado (composición en `configurador-de-ruta/page.module.css` + `MyRouteStatus.module.css`, fuera del `justify-self: start` generalizado).
- Icono por ruta en el configurador (usa el mapa del Lote 2).
- `path-diagram`: los hex se mantienen (widget standalone sin `globals.css`); se unifica el casing de headers de columna a **oración** (`layout-path.ts` "REQUERIDO"… → "Requerido"…, igual que `verticalLayout`).
- Quitar placeholder "El video va acá".
- **Rollback:** `git revert <commit-lote-3>`. Depende del Lote 2 (tipo); revertir el Lote 3 no obliga a revertir el 2.

### Lote 4 — Copy humanizado + tokens LivePath + marca DevTalles + landing
- Humanizar **supera la memoria #1460** (traducción literal Stitch): ADR/nota + `mem_save` con relación `supersedes`. Los tests de caracterización literal se **reescriben** al nuevo copy (no se borran ni se relajan), declarado en spec.
- Registro: **voseo rioplatense** en todo el copy tocado.
- Quitar el copy terminal `ALGO // ALGO` y el uppercase en títulos (oración).
- **Cifras inventadas de landing** (38 rutas, 100% producción, ~4 minutos, RIASEC.DEV v2.4, cero deuda técnica, 0% spam, "estructurado por Fernando Herrera"): se quitan o se reemplazan por datos verificables (**13 rutas oficiales = `OFFICIAL_PATH_IDS`**). Ninguna cifra plausible inventada.
- Landing: quitar `user-select: none`; títulos en oración; ajustar el conteo `svg circle` de `landing.test` si cambia el icono de protocolo.
- LivePath: `--live-display` → `--orbital-font-display`; hex sueltos de LivePath/MyRouteStatus/MissionShell/landing → tokens `--orbital-*` existentes; sin equivalente → design propone token nuevo **nombrado en `globals.css`** (nunca literal). "Esperando que Claude…" → texto neutral (Claude o Cursor).
- **Rollback:** `git revert <commit-lote-4>`.

## Fuera de alcance (Won't)

- Widget MCP (`registerPathDiagram` dormido): sin covers ni iconos de stack.
- Componentes huérfanos `RouteDetail`, `AssessmentWizard`, `OrbitalDemoBanner`: no se tocan; sus tests deben seguir verdes.
- Toast global (`notificacion.module.css`, paleta Tailwind): deuda anotada.
- `/registro` no se elimina; `/configurador-de-ruta` y `/mis-rutas` no se fusionan.
- `next/image`, `remotePatterns`, CSP del front (ausencia de CSP = deuda preexistente, se anota).

## Riesgos y mitigación

| Riesgo | Lote | Mitigación |
|---|---|---|
| El cover cruza el contrato con un consumidor MCP externo (`get_my_path`) | 2 | Campo aditivo `string \| null`; test de paridad/shape; no se toca el MCP público |
| URL scrapeada (`og:image`) inyectada en `<img src>` | 2 | Allowlist https + host `import.cdn.thinkific.com` en backend al mapear; si no matchea → `null` |
| El host de covers en prod difiere del de los fixtures (supuesto no verificado) | 2–3 | Con allowlist, el peor caso es cover `null` (bloque oculto), nunca una URL no confiable |
| Contradice ADR 0001 (iconos) y #1460 (literal) | 1, 4 | ADR 0002 + nota de superación antes de `apply` |
| ~20 asserts de caracterización rotos | 1, 3, 4 | Se reescriben al nuevo copy en el mismo lote, declarados en spec; nunca se relajan ni se borran |
| Header mobile apretado / restricciones CSS de tests | 1 | Un solo botón "Entrar"; se respetan las restricciones sin renegociar |
| Gate `src/**/auth/**` | 1 | Spec aprobada y sellada con `sdd-gate.mjs approve` antes de commitear |
| Licencia de los SVG DevTalles (repo origen sin licencia) | 2 | **Supuesto/deuda explícita:** son assets que publica el propio sitio DevTalles; confirmar con DevTalles |
| Nombres de iconos Lucide y ausencia de marcas en v1 | 1 | Verificar en el paquete instalado antes de importarlos |
| `ICON-JS` para `programas-fundamentos` | 2 | Supuesto declarado; mapa en una sola fuente, fácil de cambiar |
| `EXIT_MS = 280` acoplado a la transición CSS de LivePath | 4 | Si cambia la duración en CSS, cambiar la constante en el mismo commit |

## Nivel de testing previsto

- Covers (mapeo + allowlist): **nivel 2** (happy + host inválido + no-https + `null`) + test de contrato/paridad (dimensión "cruza un contrato").
- UI de auth (solo copy/estructura, sin lógica OAuth): nivel 2 en shell/login; OAuth sin cambios.
- Resto (copy/CSS/iconos): nivel 1–2, tests de caracterización reescritos.
- Comandos: front `cd frontend && npx vitest run`; paquete `cd frontend/path-diagram && npm run build:widget && npx vitest run`; backend `cd backend && npx vitest run`. Línea base: los 2 rojos de `login-contract` se corrigen en el Lote 1.

📚 Referencias cargadas: `specs/ui-devtalles-polish/explore.md`, `.cursor/rules/constitution-fases.mdc` (e3160314), `.cursor/rules/constitution-codigo.mdc` (2c261a0a).
