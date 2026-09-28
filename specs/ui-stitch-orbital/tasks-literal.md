# Tareas — ui-stitch-orbital literal

## Reglas de ejecución

- Aplicar una unidad completa y verificable antes de iniciar la siguiente.
- La fuente literal de cada pantalla es el `code.html` indicado; `DESIGN.md` solo resuelve tokens o decisiones que el HTML no expresa.
- Cada captura se toma en `375`, `768` y `1280` CSS px, con animaciones, caret y foco desactivados únicamente durante la captura.
- Cada diff fuente/Next debe ser determinista y `<= 1.0%`; copy, DOM, landmarks, SVG, tokens, iconografía y estados iniciales no admiten sustituciones.
- Los fixtures viven únicamente en `frontend/test/fixtures/ui-stitch-orbital/**`.
- L01–L10 son mock-only: cero `fetch`, Axios, XHR, navegación externa y storage. L11–L12 solo conservan Discord/sesión existentes.
- No se toca `backend/`, OpenAPI, cookies, endpoints, base de datos, persistencia, Tailwind ni una dependencia de iconos.
- Todo dato no verificable queda en `null`, placeholder explícito o “no disponible”; no se copia endpoint, token, URL ni secreto del mock.

## Unidad 0 — Fundación Orbital y caracterización

**Comportamiento entregable:** tokens, fuentes, shell y fixtures quedan preparados sin cambiar contratos ni introducir una superficie nueva.

1. **Fijar la caracterización antes de tocar flujos existentes.**
   - **Archivos:** `frontend/test/src/ui-stitch-orbital/fase-0/**` nuevo; `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`, `frontend/src/features/orbital/components/MissionShell.*` solo como sujetos de prueba.
   - **Fuente `code.html`:** no aplica a la fundación; usar `orbital_mission_engine/DESIGN.md` para tokens y shell.
   - **Interacción:** conservar skip link, landmark principal, encabezado, navegación, foco y footer actuales.
   - **Pruebas DOM:** caracterizar estructura, heading order, nombres accesibles, foco y ausencia de requests/storage; registrar estados de auth que atraviesan el shell.
   - **Capturas/diff:** baseline del shell consumidor en `375/768/1280`; pixel diff solo como baseline, sin declarar equivalencia de pantalla.
   - **Dependencia:** ninguna.
   - **Rollback:** eliminar solo los tests de caracterización nuevos.
   - **Límite:** no aplica mock-only/Discord; no modificar sesión.

2. **Crear la fuente única de fixtures y modos de presentación.**
   - **Archivos:** `frontend/test/fixtures/ui-stitch-orbital/**`; tipos/adaptadores bajo `frontend/src/features/orbital/**` si son necesarios.
   - **Fuente `code.html`:** los doce HTML de `stitch_devtalles_learning_path_generator`; registrar L01–L12 y el duplicado L11/L12.
   - **Interacción:** modelar `anonymous`, `authenticated`, `loading`, `empty`, `error`, `disabled`; dejar `null` para `{fecha}`, endpoint/token, PNG ASCII y datos no verificables.
   - **Pruebas DOM:** validar schema/allowlist de fixture y que ningún test o mock contiene objetos paralelos.
   - **Capturas/diff:** no aplica; dejar manifiesto preparado para las 36 celdas.
   - **Dependencia:** tarea 1.
   - **Rollback:** borrar fixtures/adaptadores sin tocar runtime auth.
   - **Límite:** mock-only estricto; nunca crea sesión ni ejecuta red.

3. **Aplicar tokens, fuentes y superficies Orbital globales.**
   - **Archivos:** `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`, y módulos de fuente estrictamente necesarios.
   - **Fuente `code.html`:** `orbital_mission_engine/DESIGN.md` y clases/tokens observables de L01–L12.
   - **Interacción:** preservar hidratación, foco visible, reduced motion, caret/selection/scrollbar tematizados y navegación existente.
   - **Pruebas DOM:** ejecutar caracterización de tarea 1, TypeScript/ESLint e inspección de imports; comprobar cero Tailwind/CDN y que `layout.tsx` sigue siendo Server Component.
   - **Capturas/diff:** actualizar baseline global en `375/768/1280`; no avanzar si aparece overflow o cambia la semántica.
   - **Dependencia:** tareas 1–2.
   - **Rollback:** revertir únicamente globals, fuentes y cambios de layout; no tocar `auth.service.ts`, cookies ni store.
   - **Límite:** no agrega red; Discord queda intacto.

**Estimación:** 170 líneas cambiadas. **Verificación de unidad:** tests de caracterización + typecheck/lint + auditoría de tokens/imports.
**Commit sugerido:** `feat(orbital): establish literal visual foundation`

## Unidad 1 — Landing pública y shell de producto

**Comportamiento entregable:** `/` reproduce L01 con radar, puertas, CTA y shell product sin inventar recomendaciones.

4. **Implementar el shell product literal.**
   - **Archivos:** `frontend/src/features/orbital/components/MissionShell.*`, CSS Module asociado, `frontend/src/app/layout.tsx` solo para composición.
   - **Fuente `code.html`:** `landing_descubre_tu_ruta/code.html`; shell/header/footer y `orbital_mission_engine/DESIGN.md`.
   - **Interacción:** skip link, navegación `Mis rutas / Descubre tu ruta / Ajustes`, avatar visual, footer y foco; los destinos son UI locales.
   - **Pruebas DOM:** landmarks, orden de headings, enlaces, teclado, foco, contraste y reduced motion; interceptar red/storage.
   - **Capturas/diff:** L01 en `375/768/1280`, con comparación por viewport y umbral `<=1.0%`.
   - **Dependencia:** Unidad 0.
   - **Rollback:** restaurar `MissionShell` anterior y retirar solo sus estilos.
   - **Límite:** mock-only; no interpreta permisos ni consume Discord.

5. **Traducir landing, radar y puertas a JSX/CSS Modules.**
   - **Archivos:** `frontend/src/app/page.tsx`, `frontend/src/app/page.module.css`, `frontend/src/features/orbital/components/LandingOrbital.*`, `MissionRadar.*`.
   - **Fuente `code.html`:** `landing_descubre_tu_ruta/code.html`, sin resumir copy, DOM, SVG ni orden.
   - **Interacción:** cuatro puertas y CTA navegan visualmente a `/configurador-de-ruta`; radar conserva nodos y alternativa accesible.
   - **Pruebas DOM:** comparar árbol observable con la fuente con cero diferencias de copy/roles/labels; probar anónimo, autenticado e hidratando mediante `HomeAuthStatus`.
   - **Capturas/diff:** L01 C01–C03 (`375/768/1280`); registrar viewport, ruta, estado y commit en manifiesto.
   - **Dependencia:** tareas 2–4.
   - **Rollback:** restaurar `page.tsx`/`page.module.css` y retirar componentes landing; conservar base solo si la caracterización sigue verde.
   - **Límite:** mock-only; no convierte puertas en recomendaciones reales ni llama Discord.

6. **Cerrar pruebas responsive y de navegación de landing.**
   - **Archivos:** `frontend/test/src/ui-stitch-orbital/fase-1/**`, `frontend/test/fixtures/ui-stitch-orbital/visual/**`.
   - **Fuente `code.html`:** L01.
   - **Interacción:** activar cada puerta/CTA por teclado y comprobar destino local, sin navegación externa.
   - **Pruebas DOM:** happy path + estados de auth + accesibilidad; comprobar ausencia de requests/storage.
   - **Capturas/diff:** validar C01–C03, sin scroll horizontal/clipping, diff `<=1.0%` y geometría principal dentro de 8 px.
   - **Dependencia:** tarea 5.
   - **Rollback:** retirar solo tests/evidencia de la unidad.
   - **Límite:** mock-only; Discord no participa.

**Estimación:** 260 líneas cambiadas. **Verificación de unidad:** tests DOM/interacción + capturas C01–C03 + diff.
**Commit sugerido:** `feat(orbital): translate landing and product shell`

## Unidad 2 — Login Discord y errores de autenticación

**Comportamiento entregable:** `/login` reproduce L11/L12 en una sola implementación y `/auth/error` conserva el contrato existente.

7. **Caracterizar LoginPanel, hydrator, auth/error y returnTo antes del rediseño.**
   - **Archivos:** `frontend/test/src/ui-stitch-orbital/fase-2/**`; sujetos `LoginPanel.*`, `AuthSessionHydrator.tsx`, `auth.service.ts`, `app/auth/error/page.tsx`.
   - **Fuente `code.html`:** `login_inicia_sesi_n_en_tu_misi_n_2/code.html` y `_3/code.html`.
   - **Interacción:** Discord, `fetchMe`, logout, loading/hydrating, error de sesión y rechazo de `returnTo` externo.
   - **Pruebas DOM:** anónimo/autenticado/loading/error/logout; contrato de `discordStartUrl`; formulario email/password e invitado deben ser no operativos.
   - **Capturas/diff:** baseline L11/L12 en `375/768/1280`; no alterar contratos para obtener la imagen.
   - **Dependencia:** Unidad 0; tarea 1 cubre caracterización global.
   - **Rollback:** retirar caracterización nueva.
   - **Límite:** Discord es la única red permitida; no agregar proveedores.

8. **Traducir shell login y LoginPanel literalmente sin habilitar métodos nuevos.**
   - **Archivos:** `frontend/src/app/login/page.tsx`, `frontend/src/app/login/page.module.css`, `frontend/src/features/auth/components/LoginPanel.*`, shell login en `MissionShell.*`.
   - **Fuente `code.html`:** `login_inicia_sesi_n_en_tu_misi_n_2/code.html`; `_3` es duplicado byte-a-byte.
   - **Interacción:** CTA Discord llama exactamente al helper existente; logout y returnTo seguro permanecen; email/password e invitado son presentación sin handlers.
   - **Pruebas DOM:** equivalencia L11/L12, roles/labels/landmarks, estados de sesión y no llamadas desde controles no operativos.
   - **Capturas/diff:** L11 C31–C33 y L12 C34–C36; conservar ambas celdas aunque compartan implementación.
   - **Dependencia:** tarea 7.
   - **Rollback:** restaurar solo componentes/módulos visuales; jamás cambiar el servicio auth para corregir un diff.
   - **Límite:** se permiten únicamente requests Discord/session ya existentes; mock-only para el resto.

9. **Traducir `/auth/error` y probar la frontera de sesión.**
   - **Archivos:** `frontend/src/app/auth/error/page.tsx`, `frontend/src/app/auth/error/page.module.css`, tests de fase 2.
   - **Fuente `code.html`:** no hay pantalla Stitch separada; usar shell login y catálogo contractual existente.
   - **Interacción:** razones conocidas/desconocidas, mensaje accesible, sin secretos ni detalles internos.
   - **Pruebas DOM:** hydrator exitoso, fallo y cancelación/unmount; `returnTo` externo rechazado; contrato auth sin cambios.
   - **Capturas/diff:** incluir `/auth/error` en regresión `375/768/1280`; L11/L12 siguen siendo las únicas celdas login.
   - **Dependencia:** tarea 8.
   - **Rollback:** restaurar página/estilos de error y tests de esta tarea.
   - **Límite:** solo Discord/session; no crear endpoint ni sesión demo.

**Estimación:** 290 líneas cambiadas. **Verificación de unidad:** auth/DOM/interacción + C31–C36 + diff y contrato.
**Commit sugerido:** `feat(orbital): translate Discord login and auth errors`

## Unidad 3 — Dashboard, empty y detalle de rutas

**Comportamiento entregable:** `/mis-rutas` deriva dashboard/empty del mismo fixture y el detalle conserva interacción efímera.

10. **Crear caracterización de rutas y guardas mock-only antes de reemplazar componentes.**
   - **Archivos:** `frontend/test/src/ui-stitch-orbital/fase-3/**`; `frontend/test/fixtures/ui-stitch-orbital/learning-paths.fixture.ts`.
   - **Fuente `code.html`:** `mis_rutas_dashboard/code.html`, `mis_rutas_estado_vac_o/code.html`, `detalle_de_ruta_backend_con_nest/code.html`.
   - **Interacción:** loading/empty/error/authenticated/anonymous; cero contenido de ruta para anónimo.
   - **Pruebas DOM:** fixture con rutas vs vacío, retry visual, disabled durante loading, no persistencia al refresh y no red/storage.
   - **Capturas/diff:** preparar L02–L04 en `375/768/1280`.
   - **Dependencia:** Unidad 1.
   - **Rollback:** retirar tests/adaptadores nuevos.
   - **Límite:** mock-only; no importar auth service ni llamar backend.

11. **Traducir dashboard y empty desde un único recurso fixture.**
   - **Archivos:** `frontend/src/app/mis-rutas/page.tsx`, `page.module.css`, `frontend/src/features/learning-paths/components/LearningPathsDashboard.*`, `LearningPathsEmptyState.*`, `RouteGauge.*`.
   - **Fuente `code.html`:** L02 `mis_rutas_dashboard/code.html` y L03 `mis_rutas_estado_vac_o/code.html`.
   - **Interacción:** cards, gauges, continuar/ver ruta, CTA descubrir; empty sin URL duplicada.
   - **Pruebas DOM:** copy/roles/landmarks exactos; estados data/empty/loading/error/anonymous; links locales y teclado.
   - **Capturas/diff:** L02 C04–C06 y L03 C07–C09; validar breakpoints y ausencia de overflow.
   - **Dependencia:** tarea 10 y Unidad 1.
   - **Rollback:** retirar página/componentes dashboard y empty sin tocar landing/auth.
   - **Límite:** mock-only; no persistencia ni requests.

12. **Traducir detalle, acordeones y confirmación efímera.**
   - **Archivos:** `frontend/src/app/mis-rutas/[routeId]/page.tsx`, `page.module.css`, `frontend/src/features/learning-paths/components/RouteDetail.*`.
   - **Fuente `code.html`:** `detalle_de_ruta_backend_con_nest/code.html`.
   - **Interacción:** cursos/secciones colapsables, selección y transición `REGISTRANDO TELEMETRÍA…` → `SECCIÓN CONFIRMADA ✓`; estado `not available` para fixture faltante.
   - **Pruebas DOM:** happy/error/disabled/loading/authenticated/anonymous, teclado, aria-live, reset en refresh y test negativo de red/storage.
   - **Capturas/diff:** L04 C10–C12; congelar estados iniciales y registrar excepción si el HTML fuente no tiene PNG válido.
   - **Dependencia:** tarea 11.
   - **Rollback:** retirar ruta dinámica y componente; dejar `/mis-rutas` intacta.
   - **Límite:** mock-only; marcar completado nunca muta progreso real.

13. **Cerrar verificación visual y responsive de rutas.**
   - **Archivos:** tests fase 3 y manifiesto visual.
   - **Fuente `code.html`:** L02, L03 y L04.
   - **Interacción:** repetir controles por roles y teclado en los tres estados de ruta.
   - **Pruebas DOM:** comparación literal, accesibilidad AA, foco, reduced motion, cero red/storage y fixtures únicos.
   - **Capturas/diff:** ejecutar C04–C12 en `375/768/1280`, `<=1.0%` cada pareja; no declarar PASS para fuente inválida ausente.
   - **Dependencia:** tareas 11–12.
   - **Rollback:** retirar evidencia y tests sin cambiar implementación base.
   - **Límite:** mock-only; no BD, concurrencia, reloj ni recovery real aplican.

**Estimación:** 360 líneas cambiadas. **Verificación de unidad:** tests DOM/interacción + C04–C12 + auditoría de cero red/storage.
**Commit sugerido:** `feat(orbital): translate learning paths and route detail`

## Unidad 4 — Assessment, resultados y checkpoint

**Comportamiento entregable:** configurador, resultados y quiz reproducen L05/L09/L10 con estado local y accesible.

14. **Crear caracterización de estados y teclado del flujo de assessment.**
   - **Archivos:** `frontend/test/src/ui-stitch-orbital/fase-4/**`; fixtures assessment bajo `frontend/test/fixtures/ui-stitch-orbital/**`.
   - **Fuente `code.html`:** `cuestionario_calibraci_n_dev_dna/code.html`, `resultados_dev_dna/code.html`, `boss_check_typescript_mini_quiz/code.html`.
   - **Interacción:** selección única, Enter/Espacio, avance, disabled inicial, error/retry y fixture ausente.
   - **Pruebas DOM:** loading/empty/error/disabled/anonymous/authenticated aplicables, `aria-live`, foco y cero requests/storage.
   - **Capturas/diff:** preparar L05/L09/L10 en `375/768/1280`.
   - **Dependencia:** Unidad 3 para checkpoint y shell.
   - **Rollback:** retirar tests/fixtures de assessment.
   - **Límite:** mock-only; no algoritmo, persistencia ni Discord.

15. **Traducir wizard Dev DNA con avance local controlable.**
   - **Archivos:** `frontend/src/app/configurador-de-ruta/page.tsx`, `page.module.css`, `frontend/src/features/assessment/components/AssessmentWizard.*`.
   - **Fuente `code.html`:** `cuestionario_calibraci_n_dev_dna/code.html`.
   - **Interacción:** `PASO 03 / 12`, 12 puntos, cards situacionales, selección y avance a 320 ms con reloj controlable; Enter/Espacio.
   - **Pruebas DOM:** estado inicial, selección inválida/válida, teclado, error/fixture faltante, refresh sin persistir y no red/storage.
   - **Capturas/diff:** L09 C25–C27; capturar estado inicial requerido y documentar la transición aparte.
   - **Dependencia:** tarea 14.
   - **Rollback:** retirar ruta/componente wizard sin tocar rutas.
   - **Límite:** mock-only; no `setTimeout` para tapar carreras ni endpoint de resultados.

16. **Traducir resultados Dev DNA desde fixture allowlisted.**
   - **Archivos:** `frontend/src/app/configurador-de-ruta/resultados/page.tsx`, `page.module.css`, `frontend/src/features/assessment/components/AssessmentResults.*`.
   - **Fuente `code.html`:** `resultados_dev_dna/code.html`.
   - **Interacción:** radar, arquetipo, afinidad, tres cards y CTA/labels fuente; campos ausentes como `null`/no disponible.
   - **Pruebas DOM:** datos válidos, empty/error/fixture faltante, accesibilidad SVG y cero red/storage.
   - **Capturas/diff:** L10 C28–C30; validar layout 6/6 y breakpoints.
   - **Dependencia:** tarea 14.
   - **Rollback:** retirar resultados y su fixture específico.
   - **Límite:** mock-only; no afirmar algoritmo ni recomendación real.

17. **Traducir checkpoint TypeScript con disabled→confirmación.**
   - **Archivos:** `frontend/src/app/mis-rutas/[routeId]/checkpoints/typescript/page.tsx`, `page.module.css`, `frontend/src/features/assessment/components/TypescriptCheckpoint.*`.
   - **Fuente `code.html`:** `boss_check_typescript_mini_quiz/code.html`.
   - **Interacción:** opciones 01–04, selección única, botón disabled inicial, confirmación, error simulado y retry local.
   - **Pruebas DOM:** roles, teclado, foco, aria-live, estados disabled/loading/error y test negativo de red/storage.
   - **Capturas/diff:** L05 C13–C15; estado inicial disabled y estado seleccionado se verifican por separado.
   - **Dependencia:** tareas 14–15.
   - **Rollback:** retirar checkpoint y sus tests sin afectar detalle base.
   - **Límite:** mock-only; no registra progreso ni usa Discord.

18. **Cerrar gate de assessment y checkpoint.**
   - **Archivos:** tests fase 4 y manifiesto visual.
   - **Fuente `code.html`:** L05, L09 y L10.
   - **Interacción:** ejecutar selección, avance, confirmación y retry en reloj/control de capacidades local.
   - **Pruebas DOM:** comparación literal y a11y AA; confirmar cero red/storage/navegación externa.
   - **Capturas/diff:** ejecutar C13–C15 y C25–C30 en los tres viewports; `<=1.0%`.
   - **Dependencia:** tareas 15–17.
   - **Rollback:** retirar evidencia de la unidad.
   - **Límite:** mock-only; no aplican BD/concurrencia/invariante persistente.

**Estimación:** 350 líneas cambiadas. **Verificación de unidad:** tests de interacción/teclado + C13–C15 y C25–C30 + diff.
**Commit sugerido:** `feat(orbital): translate assessment and checkpoint`

## Unidad 5 — Propuesta de replanificación

**Comportamiento entregable:** preview Antes/Después con acciones locales y fecha no verificable explícita.

19. **Crear prueba de caracterización del estado de propuesta.**
   - **Archivos:** `frontend/test/src/ui-stitch-orbital/fase-5/**`; fixture de replanificación.
   - **Fuente `code.html`:** `propuesta_de_replanificaci_n/code.html`.
   - **Interacción:** expandir/comparar y acciones Mantener/Aceptar en loading/éxito/error/retry local.
   - **Pruebas DOM:** copy exacto, `{fecha}` como `null`/no disponible, disabled, aria-live y cero red/storage.
   - **Capturas/diff:** preparar L06 en `375/768/1280`.
   - **Dependencia:** Unidad 3.
   - **Rollback:** retirar test/fixture.
   - **Límite:** mock-only; no muta ruta ni llama Discord.

20. **Traducir propuesta Antes/Después y acciones efímeras.**
   - **Archivos:** `frontend/src/app/mis-rutas/[routeId]/replanificacion/page.tsx`, `page.module.css`, `frontend/src/features/learning-paths/components/ReplanningProposal.*`.
   - **Fuente `code.html`:** `propuesta_de_replanificaci_n/code.html`.
   - **Interacción:** cinco nodos Antes/Después, dos razones, Mantener/Aceptar y estados locales disabled/loading/éxito/error/retry.
   - **Pruebas DOM:** interacción por roles, copy literal, no fecha inventada, reset en refresh y no requests/storage.
   - **Capturas/diff:** L06 C16–C18; documentar cualquier fuente PNG no válida como pendiente/evidencia faltante.
   - **Dependencia:** tarea 19.
   - **Rollback:** retirar subruta/componente sin tocar detalle ni fixture base.
   - **Límite:** mock-only; aceptar no muta progreso.

21. **Cerrar verificación de replanificación.**
   - **Archivos:** tests fase 5 y manifiesto visual.
   - **Fuente `code.html`:** L06.
   - **Interacción:** comprobar ambas acciones y retry con reloj normal, sin persistencia.
   - **Pruebas DOM:** estados y a11y; cero red/storage/navigation externa.
   - **Capturas/diff:** C16–C18, `<=1.0%` por viewport y sin overflow.
   - **Dependencia:** tarea 20.
   - **Rollback:** retirar evidencia/tests.
   - **Límite:** mock-only; no aplican recovery real, BD ni concurrencia.

**Estimación:** 210 líneas cambiadas. **Verificación de unidad:** tests DOM/interacción + C16–C18.
**Commit sugerido:** `feat(orbital): translate replanning preview`

## Unidad 6 — Preview GitHub mock-only

**Comportamiento entregable:** preview de badge/snippet con copiar/compartir local, fallback y toast accesible.

22. **Crear pruebas de capacidades del navegador antes de implementar preview.**
   - **Archivos:** `frontend/test/src/ui-stitch-orbital/fase-6/**`; fixture GitHub.
   - **Fuente `code.html`:** `tu_ruta_en_tu_github/code.html`.
   - **Interacción:** copiar/compartir en éxito, API ausente, permiso denegado y fallback.
   - **Pruebas DOM:** toast accesible de 2.8 s con reloj controlable, contenido sin endpoint/token/URL no verificada, cero red/storage.
   - **Capturas/diff:** preparar L07 en `375/768/1280`.
   - **Dependencia:** Unidad 3.
   - **Rollback:** retirar pruebas/fixture.
   - **Límite:** mock-only; no OAuth, GitHub ni Discord.

23. **Traducir preview README, badge y snippet seguro.**
   - **Archivos:** `frontend/src/app/mis-rutas/[routeId]/github/page.tsx`, `page.module.css`, `frontend/src/features/integrations/components/GithubPreview.*`, ports de clipboard/share.
   - **Fuente `code.html`:** `tu_ruta_en_tu_github/code.html`.
   - **Interacción:** copiar, toast 2.8 s y compartir local/fallback; no usar endpoint ficticio ni secreto.
   - **Pruebas DOM:** roles/labels, éxito/rechazo/ausencia de APIs, aria-live, zero network/storage/navigation externa.
   - **Capturas/diff:** L07 C19–C21; capturar toast inicial y validar estados por separado.
   - **Dependencia:** tarea 22.
   - **Rollback:** retirar preview/adaptadores sin limpiar conexiones porque nunca se crean.
   - **Límite:** mock-only estricto; ninguna llamada a GitHub/Discord.

24. **Cerrar verificación de GitHub preview.**
   - **Archivos:** tests fase 6 y manifiesto visual.
   - **Fuente `code.html`:** L07.
   - **Interacción:** repetir copiar/compartir y comprobar fallback.
   - **Pruebas DOM:** a11y, toast temporal, contenido seguro y cero requests/storage.
   - **Capturas/diff:** C19–C21, `<=1.0%`.
   - **Dependencia:** tarea 23.
   - **Rollback:** retirar evidencia/tests.
   - **Límite:** mock-only; no contrato externo.

**Estimación:** 240 líneas cambiadas. **Verificación de unidad:** tests de capacidades + C19–C21.
**Commit sugerido:** `feat(orbital): translate GitHub preview`

## Unidad 7 — Tokens de acceso mock-only

**Comportamiento entregable:** preview autenticada y explícitamente mock de token enmascarado, acordeón y acciones efímeras.

25. **Crear pruebas de seguridad de preview sin credenciales reales.**
   - **Archivos:** `frontend/test/src/ui-stitch-orbital/fase-7/**`; fixture de tokens.
   - **Fuente `code.html`:** `tokens_de_acceso/code.html`.
   - **Interacción:** estado anónimo bloqueado; autenticado mock; generar/copiar/revocar con loading/éxito/error/retry y acordeón exclusivo.
   - **Pruebas DOM:** token siempre enmascarado, no storage, no red, no navegación externa, no sesión demo; matriz de `NODE_ENV` + `NEXT_PUBLIC_ORBITAL_DEMO_SESSION`.
   - **Capturas/diff:** preparar L08 en `375/768/1280`.
   - **Dependencia:** Unidad 0 y caracterización auth de Unidad 2.
   - **Rollback:** retirar tests/fixture.
   - **Límite:** mock-only; nunca usar `AuthSessionHydrator` para autorizar la preview.

26. **Traducir preview de tokens y acordeón de IDE sin exponer secretos.**
   - **Archivos:** `frontend/src/app/ajustes/tokens/page.tsx`, `page.module.css`, `frontend/src/features/integrations/components/TokenPreview.*`.
   - **Fuente `code.html`:** `tokens_de_acceso/code.html`.
   - **Interacción:** acciones iconográficas con texto accesible, copiar/revocar local, acordeón exclusivo Claude/Cursor/VS Code y etiqueta visible de preview/mock.
   - **Pruebas DOM:** estados anónimo/autenticado/disabled/loading/error/retry; valor enmascarado, cero HTTP/XHR/fetch/storage y no endpoint del HTML.
   - **Capturas/diff:** L08 C22–C24; documentar toda evidencia PNG inválida como pendiente, nunca PASS.
   - **Dependencia:** tarea 25.
   - **Rollback:** retirar ruta y feature; no hay credencial ni storage que limpiar.
   - **Límite:** mock-only; no Discord, GitHub, OAuth ni tokens reales.

27. **Cerrar verificación de tokens y demo guard.**
   - **Archivos:** tests fase 7 y manifiesto visual.
   - **Fuente `code.html`:** L08.
   - **Interacción:** generar/copiar/revocar/acordeón y reintentos locales.
   - **Pruebas DOM:** seguridad negativa, a11y, matriz de entorno y ausencia de persistencia.
   - **Capturas/diff:** C22–C24, `<=1.0%`, sin máscaras que cubran decisiones de diseño.
   - **Dependencia:** tarea 26.
   - **Rollback:** retirar evidencia/tests.
   - **Límite:** mock-only; si se pide token real, detener y abrir otra spec de authz.

**Estimación:** 270 líneas cambiadas. **Verificación de unidad:** tests de seguridad/DOM + C22–C24.
**Commit sugerido:** `feat(orbital): translate access-token mock preview`

## Unidad 8 — Gate final de equivalencia literal

**Comportamiento entregable:** evidencia reproducible de las doce fuentes × tres viewports, sin declarar PASS sobre celdas faltantes o inválidas.

28. **Construir manifiesto único y ejecutar las 36 parejas.**
   - **Archivos:** `frontend/test/fixtures/ui-stitch-orbital/visual/**`, manifiesto y scripts de prueba ya existentes; `specs/ui-stitch-orbital/verify.md` solo se actualiza en la fase de verify, no en apply.
   - **Fuente `code.html`:** L01–L12 en `stitch_devtalles_learning_path_generator`; L11/L12 son duplicados exactos.
   - **Interacción:** fijar estado inicial por pantalla; desactivar animación/caret/foco solo en captura; probar interacción y a11y aparte.
   - **Pruebas DOM:** comparación por fuente de landmarks, headings, textos, roles, labels, atributos, SVG y estado inicial con cero sustituciones; test negativo de red/storage L01–L10.
   - **Capturas/diff:** exactamente C01–C36: cada fuente en `375/768/1280`, fuente y Next en directorio único, viewport/ruta/commit/estado/evidencia declarados; diff determinista `<=1.0%` por pareja.
   - **Dependencia:** Unidades 1–7.
   - **Rollback:** eliminar solo artefactos visuales generados; conservar tests de comportamiento.
   - **Límite:** L01–L10 mock-only; L11/L12 permiten únicamente Discord/session existentes; no inventar PASS para `login_*_1` sin `code.html` ni PNG ASCII.

29. **Ejecutar auditoría final de accesibilidad, responsive y límites.**
   - **Archivos:** tests/gates de `frontend/test/src/ui-stitch-orbital/**` y manifiesto visual.
   - **Fuente `code.html`:** las doce fuentes.
   - **Interacción:** teclado, Enter/Espacio, foco visible/lógico, disabled/loading/error, aria-live, reduced motion, clipboard/share y transitions de 320 ms/2.8 s.
   - **Pruebas DOM:** WCAG 2.2 AA, contraste 4.5:1/3:1, no dependencia del color, no overflow/clipping, fixtures únicos, CSS Modules, cero Tailwind/CDN/iconos nuevos.
   - **Capturas/diff:** revisar C01–C36, agregados y excepciones; cualquier captura ausente, fuente inválida o diff no ejecutado queda `PENDIENTE`.
   - **Dependencia:** tarea 28.
   - **Rollback:** corregir/revertir únicamente la unidad que originó el hallazgo; no relajar asserts ni máscaras.
   - **Límite:** Discord continúa siendo la única integración real; el resto no puede crear contratos implícitos.

30. **Preparar recibo y comprobación de reversión por unidad.**
   - **Archivos:** artefactos de verificación permitidos por el pipeline y diff del repositorio; no modificar backend/configuración.
   - **Fuente `code.html`:** matriz L01–L12.
   - **Interacción:** repetir smoke tests de cada unidad y confirmar que cada rollback deja las unidades anteriores operables.
   - **Pruebas DOM:** typecheck/lint, tests completos, imports por capa, contrato Discord intacto, negative network/storage mock-only y 36 comparaciones trazables.
   - **Capturas/diff:** el gate final solo pasa con C01–C36 ejecutadas y `<=1.0%` cada una, además de copy/DOM/a11y conformes.
   - **Dependencia:** tareas 28–29.
   - **Rollback:** revertir la unidad fallida completa, nunca borrar asserts para forzar verde.
   - **Límite:** sin backend, persistencia, API nueva, secrets ni datos plausibles.

**Estimación:** 220 líneas cambiadas, excluyendo capturas, snapshots, lockfiles y `specs/`. **Verificación de unidad:** suite completa + matriz C01–C36 + auditoría de diff permitido.
**Commit sugerido:** `test(orbital): close literal visual equivalence gate`

## Presupuesto y secuencia de commits

- Unidad 0: ~170 líneas.
- Unidad 1: ~260 líneas.
- Unidad 2: ~290 líneas.
- Unidad 3: ~360 líneas.
- Unidad 4: ~350 líneas.
- Unidad 5: ~210 líneas.
- Unidad 6: ~240 líneas.
- Unidad 7: ~270 líneas.
- Unidad 8: ~220 líneas.

Riesgo de presupuesto 400 líneas: Bajo
Unidades que lo superan: ninguna
¿Partir en PRs encadenados?: No

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `specs/ui-stitch-orbital/explore.md`, `specs/ui-stitch-orbital/proposal-literal.md`, `specs/ui-stitch-orbital/spec.md`, `specs/ui-stitch-orbital/design.md`, `stitch_devtalles_learning_path_generator/*/code.html`, `orbital_mission_engine/DESIGN.md`.
