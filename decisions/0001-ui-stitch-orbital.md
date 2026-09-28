---
status: accepted
date: 2026-09-22
decision-makers: dev
---
# 0001 — Identidad Orbital frontend escalonada sin modificar contratos
 
## Addendum — paridad visual y demo local

La paridad con Stitch se implementará por slices reversibles: `MissionShell`,
tokens Orbital alineados al `DESIGN.md`, Material Symbols Outlined con uso
mínimo y repintado pantalla a pantalla. Las pantallas sin contrato backend
seguirán siendo mock-only y no harán requests ni persistirán estado.

Mientras el backend no esté disponible, `NEXT_PUBLIC_ORBITAL_DEMO_SESSION=1`
podrá habilitar una sesión de demostración únicamente en `development`.
Discord continúa siendo la única frontera de autenticación real; el modo demo
no se habilita en producción ni modifica contratos, cookies o endpoints.

La conformidad se verificará en 375, 768 y 1280 px, con landmarks, foco
visible, reduced motion y contraste WCAG AA. Los fixtures de
`frontend/test/fixtures/ui-stitch-orbital/` siguen siendo la única fuente de
datos mock.

## Contexto y problema

El frontend actual es un scaffold Next.js con una identidad visual cian/magenta, mientras que los exports de Stitch definen la identidad Orbital de DevTalles. La exploración de `specs/ui-stitch-orbital/explore.md` confirmó que las pantallas nuevas no tienen contratos backend verificables y que `layout.tsx`/`globals.css` afectan toda la superficie existente.

## Opciones consideradas

- Migrar todas las pantallas y tooling en un único cambio.
- Implementar slices frontend reversibles con CSS Modules, tokens CSS únicos y fixtures mock-only.
- Postergar toda la identidad visual.

## Decisión

Opción elegida: implementar slices frontend reversibles con CSS Modules y variables CSS Orbital, sin Tailwind ni librerías de iconos nuevas. Se conserva Discord como única frontera externa real; las superficies nuevas son mock-only hasta que exista un contrato separado.

## Consecuencias

- Bien, porque permite validar fidelidad visual, accesibilidad y responsive sin inventar APIs ni persistencia.
- Bien, porque cada fase puede revertirse sin migraciones ni cambios de backend.
- Mal, porque exige mantener fixtures únicos, estados mock explícitos y una futura segunda especificación para conectar producto real.
- El costo de revertir es acotado a los archivos de la fase y no requiere reescritura de contratos ni migración de datos.

## Confirmación

La decisión se verifica mediante revisión de paths en scope, ausencia de Tailwind/iconos nuevos, tests de estados, verificación responsive/a11y y comprobación de que las acciones mock no hacen requests ni persisten datos.
