---
status: accepted
date: 2026-09-27
decision-makers: dev
---
# 0002 — Lucide para iconos de chrome y copy humanizado sobre la traducción literal de Stitch

> Supera parcialmente a `decisions/0001-ui-stitch-orbital.md`: solo la cláusula "sin librerías de iconos nuevas" (limitada a iconos de chrome) y la paridad literal de copy con Stitch. El resto de 0001 (CSS Modules, tokens Orbital únicos, slices reversibles, mock-only, Discord como única frontera) sigue vigente.
> Aceptado por el dev vía plan del ciclo `ui-devtalles-polish` (2026-09-27), que pidió correr las fases sin frenar.

## Contexto y problema

La UI actual es una traducción literal de 12 pantallas de Stitch (memoria #1460, ADR 0001). En producción eso deja glifos unicode y SVG ad hoc haciendo de iconos de control (`×` en el cierre de LivePath, `⧉`/`✓` al copiar, hamburguesa dibujada a mano), lo que viola el piso de oficio de la constitución ("iconos de un set real, nunca unicode como icono"), y copy terminal en mayúsculas (`ALGO // ALGO`) con cifras que parecen reales sin serlo ("38 rutas activas" cuando `OFFICIAL_PATH_IDS` tiene 13, "100% producción", "~4 minutos"), lo que viola la regla de anti-invención. Evidencia: `specs/ui-devtalles-polish/explore.md` §2, §5 y la línea base de 11 archivos vivos con separador `//`.

## Opciones consideradas

- Mantener ADR 0001 al pie de la letra: SVG propios dibujados a mano para cada icono de chrome y copy literal de Stitch.
- Adoptar una librería de iconos real (`lucide-react`) solo para chrome y humanizar el copy (voseo, oraciones, sin cifras inventadas).
- Material Symbols (mencionado en el addendum de 0001): fuente de iconos por web font; no hay ningún uso en `src/` hoy.

## Decisión

Opción elegida: **`lucide-react` para iconos de chrome + copy humanizado**, porque es un set real con trazo uniforme y tree-shaking por import nombrado (sin web font ni request extra), su peer (`react ^16.5.1 || ^17 || ^18 || ^19`) cubre React 19.3 del repo, y dibujar a mano cada icono de control mantiene el problema que el piso de oficio prohíbe.

Reglas de uso:
- Versión exacta `1.48.0` en `frontend/package.json` (sin `^`/`~`), lockfile actualizado.
- Import nombrado por icono (`import { X } from "lucide-react"`); prohibido `import *` y default import.
- `strokeWidth` único desde `frontend/src/config/chrome-icon.ts` (`CHROME_ICON_STROKE_WIDTH = 2`, el mismo trazo que ya usaba el chrome); tamaño por CSS en `rem` según el contexto; `aria-hidden="true"` en el `<svg>` y nombre accesible en el control.
- **Alcance: solo chrome** (menú, cerrar, copiar/copiado, flechas de acción, link externo). Quedan fuera y siguen como SVG propios: marcas (GitHub, LinkedIn, Discord) e ilustraciones con `role="img"` (radar de la landing, gauge, estado vacío, insignia, radar hexagonal). Los logos de stack de DevTalles son imágenes de marca vía `<img>`, no iconos de chrome.
- **Copy:** voseo rioplatense, títulos en oración, sin separador `//`, sin cifras ni afirmaciones que el repo no respalde. La única cifra de catálogo en la landing se deriva de la lista de rutas oficiales (`frontend/src/config/official-paths.ts`, anclada por test a `OFFICIAL_PATH_IDS` del backend). Las etiquetas pequeñas (kicker, eyebrow, pill de estado) conservan su mayúscula por CSS como identidad Orbital. Esto **supera** la decisión de traducción literal de Stitch (#1460); los tests de caracterización literal se reescriben al copy nuevo con el mismo tipo de assert, no se relajan ni se borran.

## Consecuencias

- Bien, porque el chrome queda en un solo set con el mismo trazo y el cierre/copiado dejan de depender de glifos unicode.
- Bien, porque la landing deja de mostrar cifras inventadas y el copy es coherente (voseo) en todo el front vivo.
- Mal, porque suma una dependencia de runtime al front y ~20 asserts de caracterización deben reescribirse.
- Mal, porque se pierde la paridad literal con Stitch como criterio de verificación visual; el criterio pasa a ser el sistema Orbital (tokens) + el piso de oficio.
- Costo de revertir: `git revert` del lote que introduce Lucide (quitar la dependencia de `package.json`/lockfile y volver a SVG propios en ~6 archivos); el copy se revierte con el lote 4. Sin datos ni contratos involucrados.

## Confirmación

- `frontend/test/src/ui-devtalles-polish/shell-chrome.static.test.ts`: versión exacta `1.48.0`, imports nombrados, `strokeWidth={CHROME_ICON_STROKE_WIDTH}` y `aria-hidden` en cada icono Lucide, sin `<svg>` ad hoc en los archivos de chrome, sin `×` en LivePath.
- `frontend/test/src/ui-devtalles-polish/copy-voice.static.test.ts` y `landing-copy.test.tsx`: sin `//` como separador, voseo, sin cifras inventadas, conteo de rutas derivado.
- Revisión manual en cada feature de UI nueva: un icono de chrome que no sea Lucide, o Lucide usado como marca/ilustración, es desvío de este ADR.
