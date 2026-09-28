# Propuesta: ui-stitch-orbital

## Enfoque recomendado

Implementar la identidad Orbital de forma escalonada, conservando la arquitectura actual:

- CSS Modules para páginas y componentes.
- Variables CSS en `frontend/src/app/globals.css` como fuente única de tokens visuales.
- No introducir Tailwind: los mocks usan CDN y el proyecto no tiene integración Tailwind.
- Mantener `app/` delgado y ubicar UI reutilizable en `features/` o `shared/` solo cuando exista reutilización comprobada.
- Mantener Discord como único método de login hasta contar con contrato backend aprobado.
- No copiar endpoints, tokens, datos ni scripts de los mocks.
- No crear rutas nuevas solo para replicar nombres visuales: las rutas canónicas deben estar respaldadas por contratos existentes o aprobados.

La primera entrega debe limitarse a la identidad visual pública y al flujo de autenticación existente. Las pantallas de rutas, configurador, GitHub, replanificación, checkpoints y tokens quedan condicionadas a contratos, estados y datos verificables.

## Alternativa más simple

Implementar únicamente el rediseño visual de `/` y `/login`, sin crear nuevas rutas ni abstraer componentes compartidos inicialmente. Mantener los tokens actuales y agregar solo los cambios orbitales necesarios dentro de los módulos existentes.

Esta alternativa minimiza el blast radius, pero posterga la validación de patrones visuales para estados autenticados y flujos de producto.

## Resoluciones de alcance

### CSS Modules y variables versus Tailwind

Se recomienda CSS Modules + variables CSS. Tailwind implicaría dependencias, configuración de build, estrategia de tokens y una migración transversal no justificada por la evidencia actual.

### Scope visual inicial

Incluye:

- `/`
- `/login`
- `/auth/error`
- layout, fuentes, superficies y tokens globales
- estados anónimo, autenticado, hidratando, loading y error

No incluye todavía nuevas rutas de learning paths, GitHub, tokens, checkpoints ni replanificación.

### Rutas canónicas

Solo están respaldadas actualmente:

- `/`
- `/login`
- `/auth/error`

`/mis-rutas`, `/configurador-de-ruta`, resultados, detalle, GitHub y tokens son propuestas provisionales. No deben implementarse hasta cerrar contrato y modelo de estados.

### Autenticación

El login será exclusivamente Discord. El formulario de correo/contraseña y el modo invitado de los mocks no se implementarán porque no existe evidencia de contrato o backend que los soporte.

### Pantallas sin backend verificable

- GitHub: no implementar integración real; solo podrá diseñarse tras definir contrato externo y seguridad.
- Tokens: excluir de la primera entrega. Requiere autorización por objeto, exposición segura, revocación, auditoría, idempotencia y recuperación ante fallos.
- Replanificación: excluir hasta definir contrato de propuesta, aceptación/rechazo y mutación de progreso.
- Checkpoints: excluir hasta definir persistencia, contrato de respuestas y reglas de progreso.
- Datos faltantes o no verificables: usar `null` en fixtures; nunca inventar fechas, tokens, endpoints o estados persistidos.

## Plan escalonado y rollback

### Paso 1 — Tokens y superficie pública

Implementar tokens Orbital, layout visual y landing `/`.

Rollback: revertir únicamente los cambios de globals, layout y home; conservar intactos auth y endpoints existentes.

### Paso 2 — Login y errores de autenticación

Rediseñar `/login` y `/auth/error` respetando exactamente el contrato Discord actual. No modificar endpoints por razones visuales.

Rollback: restaurar los módulos visuales anteriores manteniendo el servicio de auth y la sesión sin cambios.

### Paso 3 — Vertical slice de rutas

Antes de crear `/mis-rutas`, definir contrato compartido, estados de loading/vacío/error/datos y fuente única de fixtures. Implementar dashboard y estado vacío como estados del mismo recurso, no como pantallas duplicadas.

Rollback: retirar la ruta y feature nuevas sin tocar auth ni la identidad pública.

### Paso 4 — Configurador, resultados y checkpoint

Solo después de aprobar el contrato de cuestionario, recomendaciones y checkpoint. Implementar selección, disabled, error, retry, refresh y persistencia definida.

Rollback: desactivar o retirar el slice de evaluación y conservar el dashboard de rutas.

### Paso 5 — Replanificación, GitHub y tokens

Implementar cada integración como slice independiente, en este orden:

1. Replanificación.
2. GitHub.
3. Tokens.

Cada slice requiere contrato, autorización, errores y pruebas antes de pasar al siguiente.

## Fixtures y tests

Los fixtures deben vivir en una única ubicación del repositorio y ser reutilizables por mocks y tests. Mientras no exista contrato de learning paths, el dato de producción permanece desconocido y no se simula como real.

Por rebanada se requieren:

- Home: anónimo, hidratando y autenticado.
- Login: loading, éxito Discord, error, logout y `returnTo` seguro.
- UI: responsive, accesibilidad WCAG AA y estados disabled/error.

Auth y cualquier mutación de estado requieren pruebas de contrato front-back. Progreso, checkpoints, replanificación y tokens requerirán además pruebas de concurrencia, invariantes y recovery cuando el contrato confirme esas mutaciones.

## Checkpoint de aprobación

¿Aprueba el dev:

1. CSS Modules + variables CSS, sin Tailwind.
2. Primera entrega limitada a identidad pública, login Discord y errores de auth.
3. Rutas nuevas solo después de contrato y fixtures únicos.
4. Plan escalonado con rollback por rebanada.
5. Exclusión temporal de GitHub, tokens, replanificación y checkpoints hasta contar con backend verificable?

No debe iniciarse `spec` hasta recibir esta aprobación.

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `specs/ui-stitch-orbital/explore.md`, `.cursor/rules/sdd-pipeline.mdc`, referencias de Next.js y frontend.
