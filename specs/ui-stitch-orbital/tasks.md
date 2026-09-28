# Tareas de implementación — ui-stitch-orbital

## Reglas de ejecución

- `sdd-apply` es el único agente autorizado a escribir código de aplicación. Implementará una unidad completa por vez; después de cada unidad, el dev ejecutará el gate y hará el commit sugerido.
- El alcance queda limitado a `frontend/`: Next.js App Router, CSS Modules y variables CSS. No se agregan Tailwind, librerías de iconos, backend, API, DB, Redis, storage persistente ni dependencias de runtime.
- Los únicos datos mock viven en `frontend/test/fixtures/ui-stitch-orbital/`. Todo dato no verificable debe ser `null`, ausente o un estado explícito de no disponibilidad.
- No usar `any`, casts para silenciar tipos, estilos inline de layout, emoji/unicode como iconografía, requests, Server Actions, `route.ts` ni cambios al contrato Discord.
- Cada tarea debe terminar con sus tests ejecutados. Los tests de flujos nuevos van pegados a la implementación de ese flujo; no se dejan para una unidad final.
- Las tareas que dicen “caracterización” deben fijar el comportamiento actual antes de modificar el flujo indicado.

### Comandos existentes de verificación

Ejecutar desde la raíz del repositorio:

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

La configuración existente es `frontend/vitest.config.ts` (`environment: node`, tests bajo `frontend/test/**/*.{test,spec}.{ts,tsx}`). Si una prueba de UI requiere un entorno o helper no disponible, la tarea debe resolverlo usando las capacidades ya instaladas o detenerse en checkpoint; no debe instalar dependencias nuevas por iniciativa.

---

## Unidad 0 — Fundación Orbital y red de seguridad global

Comportamiento entregable: la identidad Orbital queda disponible sin alterar el contrato de autenticación y los flujos existentes quedan caracterizados antes de tocar layout, estilos o auth.

### Fase 0 — Fundación Orbital

1. **Caracterizar el comportamiento actual del layout y de las rutas conectadas**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-0/root-layout.characterization.test.ts`, `frontend/test/src/ui-stitch-orbital/fase-0/auth.characterization.test.ts`, y los paths existentes bajo `frontend/src/app/layout.tsx`, `frontend/src/app/login/page.tsx`, `frontend/src/app/auth/error/page.tsx`, `frontend/src/features/auth/components/AuthSessionHydrator.tsx`, `frontend/src/features/auth/components/HomeAuthStatus.tsx`, `frontend/src/features/auth/components/LoginPanel.tsx`.
   - Dependencias: ninguna; es requisito previo de las tareas 0.2–0.7.
   - Terminado cuando: quedan fijados los landmarks, títulos, estados anónimo/hidratando/autenticado, navegación Discord, logout, `returnTo` seguro y presentación de errores que existen hoy; ningún test cambia el contrato ni relaja un assert.
   - Tests: ejecutar la caracterización con `npm --prefix frontend test`; si el harness actual no permite montar componentes, cubrir primero los adaptadores y funciones observables con las APIs ya instaladas y documentar el límite en el test.

2. **Inventariar y congelar la frontera de fixtures mock-only**
   - Paths: `frontend/test/fixtures/ui-stitch-orbital/index.ts`, `frontend/test/fixtures/ui-stitch-orbital/modes.ts`, `frontend/test/fixtures/ui-stitch-orbital/auth.fixture.ts`, `frontend/test/fixtures/ui-stitch-orbital/README.md`.
   - Dependencias: tarea 0.1.
   - Terminado cuando: existen tipos explícitos para `anonymous`, `authenticated`, `loading`, `empty`, `error` y `disabled`, sin secretos, endpoints, URLs no verificadas ni valores plausibles inventados; los tests posteriores importan esta ubicación y no declaran objetos de pantalla paralelos.
   - Tests: test de forma/allowlist que rechace campos sensibles o fuentes HTTP y confirme que los campos no verificables son `null` o ausentes.

3. **Definir la fuente local de modo de presentación**
   - Paths: `frontend/src/features/orbital/lib/data-source.ts`, `frontend/src/features/orbital/types/orbital.types.ts`, `frontend/src/features/orbital/lib/data-source.test.ts`.
   - Dependencias: tarea 0.2.
   - Terminado cuando: `DATA_MODE` y `OrbitalDataSource` solo leen fixtures locales, no acceden a `fetch`, Axios, cookies, Zustand de auth, storage ni endpoints; los modos inválidos y la ausencia de fixture tienen resultado tipado y visible.
   - Tests: ejecutar casos válidos, `empty`, `error`, `disabled`, fixture ausente y prueba negativa de ausencia de requests/storage.

4. **Definir tokens CSS y superficies globales Orbital**
   - Paths: `frontend/src/app/globals.css`.
   - Dependencias: tareas 0.1–0.3.
   - Terminado cuando: color, superficies, tipografía, espaciado, radios, sombras, foco, estados, selección, caret, scrollbar y motion están definidos como variables; los tokens tienen contraste previsto AA; no quedan literales Orbital duplicables para los módulos.
   - Tests: auditoría textual/estática de variables y ausencia de clases Tailwind; ejecutar `npm --prefix frontend run build`.

5. **Migrar las fuentes del layout sin convertirlo en Client Component**
   - Paths: `frontend/src/app/layout.tsx`.
   - Dependencias: tarea 0.4; verificar exports disponibles en la versión instalada antes de usar `next/font`.
   - Terminado cuando: se exponen las variables de `Outfit`, `Raleway` y `Space Mono` según el diseño, se conserva la composición de providers/auth y `layout.tsx` sigue siendo Server Component.
   - Tests: build del frontend y caracterización de la tarea 0.1; comprobar que no se modificaron endpoints, cookies ni `AuthSessionHydrator`.

6. **Establecer límites de capas y primitives reutilizables mínimos**
   - Paths: `frontend/src/features/orbital/**`, `frontend/src/components/**` solo si existe reutilización demostrada, `frontend/src/features/README.md` solo si hace falta registrar la feature.
   - Dependencias: tareas 0.3–0.5.
   - Terminado cuando: se documenta y respeta `shared → features → app`, `app/` queda delgado, no hay imports entre features y solo se crean primitives con dos consumidores claros; cada control creado define default, hover, focus, active, disabled y loading.
   - Tests: typecheck/build y auditoría estática de imports; no crear un design system general por anticipación.

7. **Verificar responsive y accesibilidad de la fundación**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-0/foundation.test.ts`, más los paths modificados en 0.4–0.6.
   - Dependencias: tareas 0.4–0.6.
   - Terminado cuando: skip link, landmark principal, foco visible, reduced motion, áreas táctiles y superficies globales quedan verificadas en móvil, intermedio y desktop; no existe scroll horizontal accidental.
   - Tests: `npm --prefix frontend test`, `npm --prefix frontend run build` y revisión visual manual en tres viewports. No avanzar si la caracterización global está roja.

**Rollback:** revertir únicamente globals, fuentes, layout y fundación sin consumidores de fases posteriores; no tocar `auth.service.ts`, endpoints, cookies ni store.

**Estimación de diff:** 250–350 líneas; dentro del presupuesto de 400.

**Commit sugerido:** `feat(ui-stitch-orbital): establish orbital frontend foundation`

---

## Unidad 1 — Landing pública Orbital

Comportamiento entregable: `/` muestra la landing pública Orbital y conserva los tres estados de sesión existentes.

### Fase 1 — Landing pública

1. **Implementar el modelo visual de la landing**
   - Paths: `frontend/src/features/catalog/**` solo si la reutilización queda demostrada, `frontend/src/features/orbital/components/MissionRadar.tsx`, `frontend/src/features/orbital/components/MissionRadar.module.css`, `frontend/src/app/page.tsx`, `frontend/src/app/page.module.css`.
   - Dependencias: Unidad 0 completa.
   - Terminado cuando: `/` tiene hero, radar SVG accesible, cuatro puertas, CTA a `/configurador-de-ruta`, navegación visual y ningún dato inline fuera de fixtures; no usa iconos nuevos ni emoji/unicode.
   - Tests: render feliz y ausencia de request/persistencia; roles, nombres accesibles y SVG con alternativa textual.

2. **Conservar y presentar los estados de HomeAuthStatus**
   - Paths: `frontend/src/features/auth/components/HomeAuthStatus.tsx`, `frontend/src/features/auth/components/HomeAuthStatus.module.css`, `frontend/test/src/ui-stitch-orbital/fase-1/home-auth-status.test.tsx`.
   - Dependencias: tarea 1.1 y caracterización 0.1.
   - Terminado cuando: anónimo, hidratando y autenticado mantienen la semántica actual; durante hidratación no se muestran datos de usuario inventados.
   - Tests: los tres estados, error de hydrator si aplica al comportamiento existente y navegación por teclado.

3. **Verificar landing responsive y navegación**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-1/landing.test.tsx`.
   - Dependencias: tareas 1.1–1.2.
   - Terminado cuando: CTA y puertas tienen nombres, foco y destino correctos; no hay overflow, contraste insuficiente ni motion obligatorio.
   - Tests: `npm --prefix frontend test`, build y revisión visual móvil/intermedia/desktop.

**Rollback:** restaurar `frontend/src/app/page.tsx` y `page.module.css`; conservar foundation solo si la caracterización demuestra independencia de la landing.

**Estimación de diff:** 180–280 líneas; dentro del presupuesto de 400.

**Commit sugerido:** `feat(ui-stitch-orbital): add orbital public landing`

---

## Unidad 2 — Autenticación y errores Orbital

Comportamiento entregable: `/login` y `/auth/error` tienen identidad Orbital sin cambiar Discord, sesión, cookies, redirect ni catálogo contractual.

### Fase 2 — Auth y errores

1. **Cubrir la frontera existente de sesión antes del rediseño**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-2/auth-session-hydrator.test.ts`, `frontend/test/src/ui-stitch-orbital/fase-2/login-contract.test.ts`, `frontend/src/features/auth/api/auth.service.ts` solo lectura.
   - Dependencias: Unidad 0 y caracterización 0.1.
   - Terminado cuando: quedan cubiertos `fetchMe`, fallo de sesión, unmount/cancelación si existe, `discordStartUrl`, logout, shapes, cookies y `returnTo` seguro; no se cambia `auth.service.ts` por estética.
   - Tests: happy path, error, usuario autenticado/anónimo, `returnTo` externo rechazado y ausencia de métodos de login no respaldados.

2. **Rediseñar LoginPanel con Discord como único método operativo**
   - Paths: `frontend/src/app/login/page.tsx`, `frontend/src/app/login/page.module.css`, `frontend/src/features/auth/components/LoginPanel.tsx`, `frontend/src/features/auth/components/LoginPanel.module.css`.
   - Dependencias: tarea 2.1.
   - Terminado cuando: solo Discord es accionable; loading, hydrating, anónimo, autenticado, fallo de inicio y logout son visibles; no hay formulario operativo de correo/contraseña ni modo invitado.
   - Tests: estados, click que usa exactamente el helper existente, foco, error asociado y ausencia de requests distintos de los ya contractuales.

3. **Rediseñar la página de error de auth**
   - Paths: `frontend/src/app/auth/error/page.tsx`, `frontend/src/app/auth/error/page.module.css`.
   - Dependencias: tarea 2.1.
   - Terminado cuando: razones conocidas y desconocidas usan el catálogo local existente, no exponen detalles internos y mantienen navegación accesible.
   - Tests: query `reason` conocida/desconocida, ausencia de secretos y foco en el contenido principal.

4. **Verificar auth responsive y contrato**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-2/login.test.tsx`, `frontend/test/src/ui-stitch-orbital/fase-2/auth-error.test.tsx`.
   - Dependencias: tareas 2.2–2.3.
   - Terminado cuando: pasan caracterización, estados y contrato sin cambios en backend/OpenAPI; la UI cumple teclado, contraste AA y responsive.
   - Tests: `npm --prefix frontend test`, build y revisión visual en tres viewports.

**Rollback:** restaurar solo componentes/módulos visuales de login/error; preservar servicio de auth y sesión.

**Estimación de diff:** 220–340 líneas; dentro del presupuesto de 400.

**Commit sugerido:** `feat(ui-stitch-orbital): restyle authentication surfaces`

---

## Unidad 3 — Dashboard y detalle de rutas mock

Comportamiento entregable: dashboard, empty state y detalle de ruta funcionan desde el mismo fixture, con estado efímero y sin API.

### Fase 3 — Mis rutas y detalle

1. **Definir fixtures y tipos de learning paths**
   - Paths: `frontend/test/fixtures/ui-stitch-orbital/learning-paths.fixture.ts`, `frontend/src/features/learning-paths/types/learning-path.types.ts`, `frontend/src/features/learning-paths/lib/learning-paths-data.ts`.
   - Dependencias: Unidad 0; reutilizar `OrbitalDataSource`.
   - Terminado cuando: el mismo modelo representa datos, cero rutas, loading, error, disabled y fixture faltante; no contiene fechas/IDs/porcentajes no verificables como hechos.
   - Tests: validación de shape, `null`/no disponible y prohibición de request/storage.

2. **Caracterizar/crear contrato visual del acceso autenticado a rutas**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-3/access.characterization.test.tsx`.
   - Dependencias: tarea 3.1.
   - Terminado cuando: queda explícito que anónimo no revela contenido y autenticado puede ver el fixture mock; no se introduce sesión falsa.
   - Tests: anónimo, authenticated, loading y error de acceso.

3. **Implementar dashboard y empty derivado**
   - Paths: `frontend/src/app/mis-rutas/page.tsx`, `frontend/src/app/mis-rutas/page.module.css`, `frontend/src/features/learning-paths/components/LearningPathsDashboard.tsx`, `frontend/src/features/learning-paths/components/LearningPathsDashboard.module.css`, `frontend/src/features/learning-paths/components/LearningPathsEmptyState.tsx`.
   - Dependencias: tareas 3.1–3.2 y primitives de Unidad 0.
   - Terminado cuando: datos y cero rutas salen del mismo recurso; continuar/ver ruta navegan a rutas existentes de UI; estados loading/error/retry/disabled son visibles y no hay ruta empty duplicada.
   - Tests: happy path, empty, loading, error, retry visual, anónimo y no requests.

4. **Implementar detalle dinámico y estado local de secciones**
   - Paths: `frontend/src/app/mis-rutas/[routeId]/page.tsx`, `frontend/src/app/mis-rutas/[routeId]/page.module.css`, `frontend/src/features/learning-paths/components/RouteDetail.tsx`, `frontend/src/features/learning-paths/components/RouteDetail.module.css`, `frontend/src/features/learning-paths/lib/route-detail-state.ts`.
   - Dependencias: tareas 3.1–3.3.
   - Terminado cuando: resumen, progreso, acordeones, sección completada local, fixture faltante/not-found, loading/error y disabled funcionan; refresh reinicia estado y anónimo no revela la ruta.
   - Tests: expandir/colapsar, marcar, refresh/remount, fixture faltante, retry, disabled y ausencia de fetch/storage.

5. **Verificar dashboard y detalle**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-3/learning-paths.test.tsx`.
   - Dependencias: tareas 3.3–3.4.
   - Terminado cuando: rutas de dashboard y detalle cumplen teclado, foco, aria-live sin duplicación, contraste y responsive.
   - Tests: `npm --prefix frontend test`, build y revisión visual en tres viewports.

**Rollback:** eliminar rutas/features nuevas de learning paths sin tocar landing/auth.

**Estimación de diff:** 300–390 líneas; dentro del presupuesto de 400.

**Commit sugerido:** `feat(ui-stitch-orbital): add mock learning paths surfaces`

---

## Unidad 4 — Configurador, resultados y checkpoint

Comportamiento entregable: cuestionario, resultado y checkpoint son un flujo local verificable, con selección, errores y retry sin persistencia.

### Fase 4 — Assessment y checkpoint

1. **Definir fixtures y tipos del assessment**
   - Paths: `frontend/test/fixtures/ui-stitch-orbital/assessment.fixture.ts`, `frontend/src/features/assessment/types/assessment.types.ts`, `frontend/src/features/assessment/lib/assessment-data.ts`.
   - Dependencias: Unidad 0; no duplicar fixtures en tests.
   - Terminado cuando: pasos, opciones, resultados, radar/arquetipo, rutas recomendadas y checkpoint tienen allowlist; desconocidos son `null`/no disponible y no se afirma algoritmo real.
   - Tests: fixture válido, vacío, ausente y error simulado.

2. **Implementar cuestionario multi-step**
   - Paths: `frontend/src/app/configurador-de-ruta/page.tsx`, `frontend/src/app/configurador-de-ruta/page.module.css`, `frontend/src/features/assessment/components/AssessmentWizard.tsx`, `frontend/src/features/assessment/components/AssessmentWizard.module.css`, `frontend/src/features/assessment/lib/assessment-state.ts`.
   - Dependencias: tarea 4.1.
   - Terminado cuando: paso visible, selección única, botón disabled sin respuesta válida, avance, loading/error/fixture faltante y remount sin persistencia funcionan.
   - Tests: teclado, foco, selección, disabled/enabled, respuesta inválida, error, retry y ausencia de request/storage.

3. **Implementar resultados mock**
   - Paths: `frontend/src/app/configurador-de-ruta/resultados/page.tsx`, `frontend/src/app/configurador-de-ruta/resultados/page.module.css`, `frontend/src/features/assessment/components/AssessmentResults.tsx`, `frontend/src/features/assessment/components/AssessmentResults.module.css`.
   - Dependencias: tareas 4.1–4.2.
   - Terminado cuando: radar/arquetipo/afinidad/recomendaciones muestran únicamente fixture; campos desconocidos muestran no disponible; estados empty/error son explícitos.
   - Tests: datos válidos, `null`, empty, error y navegación accesible.

4. **Implementar checkpoint TypeScript mock-only**
   - Paths: `frontend/src/app/mis-rutas/[routeId]/checkpoints/typescript/page.tsx`, `frontend/src/app/mis-rutas/[routeId]/checkpoints/typescript/page.module.css`, `frontend/src/features/assessment/components/TypescriptCheckpoint.tsx`, `frontend/src/features/assessment/components/TypescriptCheckpoint.module.css`.
   - Dependencias: tareas 4.1–4.3 y Unidad 3.
   - Terminado cuando: selección, confirmación disabled inicial, loading local, éxito, error simulado, retry y marcado local funcionan; no se registra progreso real.
   - Tests: selección por teclado, feedback `aria-live`, error/retry, refresh y prueba negativa de request/storage.

5. **Verificar el flujo completo de assessment**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-4/assessment.test.tsx`, `frontend/test/src/ui-stitch-orbital/fase-4/checkpoint.test.tsx`.
   - Dependencias: tareas 4.2–4.4.
   - Terminado cuando: el orden de pasos, focus management, responsive, contraste y reduced motion pasan sin contrato backend.
   - Tests: `npm --prefix frontend test`, build y revisión visual en tres viewports.

**Rollback:** retirar configurador, resultados y checkpoint sin hacer depender dashboard/detalle de sus fixtures.

**Estimación de diff:** 300–390 líneas; dentro del presupuesto de 400.

**Commit sugerido:** `feat(ui-stitch-orbital): add local assessment flow`

---

## Unidad 5 — Replanificación mock

Comportamiento entregable: la propuesta Antes/Después se visualiza y sus acciones solo cambian estado local.

### Fase 5 — Replanificación

1. **Definir fixture y estado de propuesta**
   - Paths: `frontend/test/fixtures/ui-stitch-orbital/replanning.fixture.ts`, `frontend/src/features/learning-paths/types/replanning.types.ts`, `frontend/src/features/learning-paths/lib/replanning-state.ts`.
   - Dependencias: Unidad 3.
   - Terminado cuando: Antes/Después y razones salen del fixture; fecha no verificable permanece `null`/no disponible; no muta el fixture base.
   - Tests: fixture, fecha ausente, estado disabled/loading/success/error y no request/storage.

2. **Implementar la preview de replanificación**
   - Paths: `frontend/src/app/mis-rutas/[routeId]/replanificacion/page.tsx`, `frontend/src/app/mis-rutas/[routeId]/replanificacion/page.module.css`, `frontend/src/features/learning-paths/components/ReplanningProposal.tsx`, `frontend/src/features/learning-paths/components/ReplanningProposal.module.css`.
   - Dependencias: tarea 5.1.
   - Terminado cuando: comparación, razones, Mantener y Aceptar tienen estados locales disabled/loading/éxito/error/retry y no cambian progreso ni llaman API.
   - Tests: acciones, teclado, anuncios accesibles, remount y prueba negativa de side effects.

3. **Verificar replanificación responsive**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-5/replanning.test.tsx`.
   - Dependencias: tarea 5.2.
   - Terminado cuando: no se inventan fechas, no hay overflow y se mantiene foco/contraste/reduced motion.
   - Tests: `npm --prefix frontend test`, build y revisión visual en tres viewports.

**Rollback:** retirar solo la subruta y composición de replanificación.

**Estimación de diff:** 150–240 líneas; dentro del presupuesto de 400.

**Commit sugerido:** `feat(ui-stitch-orbital): add mock replanning preview`

---

## Unidad 6 — Preview GitHub sin integración externa

Comportamiento entregable: la preview de GitHub permite copiar/compartir de forma segura y accesible, sin OAuth, requests ni URLs no verificadas.

### Fase 6 — Integraciones

1. **Definir fixture y puertos de capacidades del navegador**
   - Paths: `frontend/test/fixtures/ui-stitch-orbital/github.fixture.ts`, `frontend/src/features/integrations/types/github.types.ts`, `frontend/src/features/integrations/lib/browser-capabilities.ts`.
   - Dependencias: Unidad 0.
   - Terminado cuando: el contenido copiable no contiene token, endpoint ficticio, secreto ni URL no verificada; `ClipboardPort` y `SharePort` modelan disponible/ausente/rechazado con tipos explícitos.
   - Tests: shape/allowlist y casos de capability ausente o rechazada sin tocar navegador real.

2. **Implementar la preview de GitHub**
   - Paths: `frontend/src/app/mis-rutas/[routeId]/github/page.tsx`, `frontend/src/app/mis-rutas/[routeId]/github/page.module.css`, `frontend/src/features/integrations/components/GithubPreview.tsx`, `frontend/src/features/integrations/components/GithubPreview.module.css`.
   - Dependencias: tarea 6.1 y Unidad 3.
   - Terminado cuando: badge/snippet seguro, copiar, compartir, feedback accesible y alternativa visual funcionan; no existe OAuth, `fetch` a GitHub ni publicación externa.
   - Tests: éxito, API clipboard ausente, permiso denegado, share ausente, alternativa y ausencia de contenido sensible.

3. **Verificar preview GitHub**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-6/github-preview.test.tsx`.
   - Dependencias: tarea 6.2.
   - Terminado cuando: acciones operables por teclado, feedback `aria-live` sin duplicación, contraste y responsive pasan.
   - Tests: `npm --prefix frontend test`, build y revisión visual en tres viewports.

**Rollback:** retirar preview y adaptadores de capacidades; no limpiar ni revocar datos porque nunca se crean.

**Estimación de diff:** 180–280 líneas; dentro del presupuesto de 400.

**Commit sugerido:** `feat(ui-stitch-orbital): add safe github preview`

---

## Unidad 7 — Tokens mock-only

Comportamiento entregable: `/ajustes/tokens` demuestra estados de token sin crear, almacenar, copiar o revocar credenciales reales.

### Fase 7 — Tokens mock-only

1. **Definir fixture enmascarado y máquina de estados local**
   - Paths: `frontend/test/fixtures/ui-stitch-orbital/tokens.fixture.ts`, `frontend/src/features/integrations/types/token.types.ts`, `frontend/src/features/integrations/lib/token-state.ts`.
   - Dependencias: Unidad 0; reutilizar estado de auth real solo como entrada de presentación.
   - Terminado cuando: el fixture nunca contiene secreto real, el valor siempre está enmascarado y los estados generar/copiar/revocar cubren loading/success/error/retry; no hay storage ni endpoint.
   - Tests: allowlist sin secretos, modos anónimo/autenticado y prueba negativa de request/storage.

2. **Implementar pantalla autenticada de tokens mock**
   - Paths: `frontend/src/app/ajustes/tokens/page.tsx`, `frontend/src/app/ajustes/tokens/page.module.css`, `frontend/src/features/integrations/components/TokenPreview.tsx`, `frontend/src/features/integrations/components/TokenPreview.module.css`.
   - Dependencias: tarea 7.1 y Unidad 2.
   - Terminado cuando: anónimo queda bloqueado sin revelar panel, autenticado ve una preview claramente etiquetada; generar/copiar/revocar solo actualizan estado efímero; acordeón IDE, disabled, loading, error y retry son visibles.
   - Tests: auth states, enmascarado, acciones locales, teclado, foco, aria-live y remount sin persistencia.

3. **Verificar que tokens no se confundan con autorización real**
   - Paths: `frontend/test/src/ui-stitch-orbital/fase-7/token-preview.test.tsx`.
   - Dependencias: tarea 7.2.
   - Terminado cuando: no se exponen secretos, endpoints ni permisos; la pantalla no hace requests y el copy permanece enmascarado.
   - Tests: `npm --prefix frontend test`, build, auditoría estática de `fetch`/storage y revisión visual en tres viewports.

**Rollback:** retirar ruta y feature de tokens; si se solicita token real, detener la implementación y abrir una spec separada de authz, auditoría, revocación e idempotencia.

**Estimación de diff:** 180–280 líneas; dentro del presupuesto de 400.

**Commit sugerido:** `feat(ui-stitch-orbital): add mock token preview`

---

## Cierre transversal de Fases 0–7

Estas comprobaciones se ejecutan después de cada unidad y nuevamente antes de entregar a `sdd-verify`; no constituyen una unidad de implementación ni habilitan a saltarse los tests de la unidad:

1. `npm --prefix frontend test`
2. `npm --prefix frontend run build`
3. Revisar que el diff se limita a `frontend/` y `specs/ui-stitch-orbital/`, sin backend, OpenAPI, DB, Redis, deploy, Tailwind ni librería de iconos.
4. Revisar imports `shared → features → app`, ausencia de `any`/casts silenciadores, CSS Modules, variables CSS y fixtures únicos.
5. Verificar manualmente móvil, intermedio y desktop; teclado, foco, landmarks, contraste AA y `prefers-reduced-motion`.

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `.cursor/rules/sdd-pipeline.mdc`, `specs/ui-stitch-orbital/spec.md`, `specs/ui-stitch-orbital/explore.md`, `specs/ui-stitch-orbital/design.md`, `decisions/0001-ui-stitch-orbital.md`, `.cursor/skills/nextjs-reference/SKILL.md`, `.cursor/skills/frontend-reference/SKILL.md`.

Riesgo de presupuesto 400 líneas: Medio
Unidades que lo superan: ninguna
¿Partir en PRs encadenados?: No
