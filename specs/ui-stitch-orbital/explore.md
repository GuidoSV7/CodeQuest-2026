# Explore — ui-stitch-orbital

Fecha de inspección: 2026-09-22  
Repositorio inspeccionado: `C:\Users\JSAHONERO\Desktop\CODEQUEST\proyecto\CodeQuest-2026`  
Fuente visual inspeccionada: `C:\Users\JSAHONERO\Desktop\CODEQUEST\proyecto\stitch_devtalles_learning_path_generator`

## Memoria previa consultada

- Sin resultados para `ui-stitch-orbital login auth frontend App Router stitch_devtalles` en `decision`.
- Sin resultados para `ui-stitch-orbital login auth frontend App Router stitch_devtalles` en `discovery`.
- Sin resultados para `ui-stitch-orbital login auth frontend App Router stitch_devtalles` en `bugfix`.
- No hubo memorias útiles para este cambio.

## Inventario de Stitch y mapeo de pantallas

El directorio contiene `orbital_mission_engine/DESIGN.md`, doce `code.html` y doce rutas de `screen.png`. Los `code.html` usan Tailwind por CDN y el contenido de cada pantalla es estático salvo scripts locales de interacción.

Los paths Next siguientes son mapeos recomendados por el nombre/semántica del mockup; no se presentan como rutas ya existentes. Cuando el repo no tiene la ruta, queda marcado como pendiente/desconocido.

| Carpeta y archivo fuente | Pantalla/estado observable en HTML | Ruta o estado Next recomendado | Estado actual en repo |
|---|---|---|---|
| `landing_descubre_tu_ruta/code.html` | Landing de descubrimiento: hero, radar orbital, cuatro puertas de entrada y CTA `configurador-de-ruta`. | `/` como home pública rediseñada; selección de puerta como estado/query del configurador. | `/` existe, pero solo es una home mínima; no existe configurador. |
| `mis_rutas_dashboard/code.html` | Dashboard autenticado con dos rutas: una en progreso y otra sin empezar; CTA de continuar/ver ruta. | `/mis-rutas` o equivalente explícito. | No existe. |
| `mis_rutas_estado_vac_o/code.html` | Estado vacío autenticado: “Aún no tienes rutas” y CTA para descubrir una ruta. | `/mis-rutas` con estado `empty` derivado de datos, no una pantalla separada. | No existe `/mis-rutas`; no existe fuente de datos de learning paths en frontend. |
| `tu_ruta_en_tu_github/code.html` | Integración GitHub: preview de badge, snippet Markdown, copiar y compartir; el HTML contiene estado visual de toast. | `/mis-rutas/[routeId]/github` o `/integraciones/github`; elegir en spec según dominio. | No existe. No hay integración GitHub en el frontend inspeccionado. |
| `detalle_de_ruta_backend_con_nest/code.html` | Detalle de ruta: alerta de atraso, resumen, progreso, cursos colapsados/expandido y marcar sección completada. | `/mis-rutas/[routeId]` con estado de curso/sección. | No existe. |
| `propuesta_de_replanificaci_n/code.html` | Comparación Antes/Después, razones y acciones mantener/aceptar; incluye `{fecha}` literalmente. `{fecha}` es placeholder de mock, no dato verificable. | `/mis-rutas/[routeId]/replanificacion` como estado de propuesta pendiente. | No existe. |
| `boss_check_typescript_mini_quiz/code.html` | Quiz de `readonly`: cuatro opciones, selección y botón inicialmente disabled que se habilita. | `/mis-rutas/[routeId]/checkpoints/typescript` o estado de checkpoint dentro del detalle. | No existe. |
| `cuestionario_calibraci_n_dev_dna/code.html` | Cuestionario Dev DNA: paso 03/12, pregunta situacional y cuatro opciones; el script pretende avanzar a `resultados-de-mision`. | `/configurador-de-ruta` con estado `step=3`; la ruta de resultados queda pendiente de nombre contractual. | No existe configurador ni resultados. |
| `resultados_dev_dna/code.html` | Resultado Dev DNA: radar, arquetipo, afinidad y tres rutas identificadas con CTA para elegir/explorar. | `/configurador-de-ruta/resultados` o `/rutas/recomendadas`; requiere decisión de contrato/ruta. | No existe. |
| `tokens_de_acceso/code.html` | Tokens de acceso: token enmascarado, generar/copiar/revocar y acordeón de IDE; incluye datos de ejemplo y endpoint ficticio visible en el mock. | `/ajustes/tokens` (subruta autenticada). | No existe. No debe copiarse ningún token/endpoint del mock como dato real. |
| `login_inicia_sesi_n_en_tu_misi_n_2/code.html` | Login visual con Discord y, además, formulario correo/contraseña y modo invitado. | `/login`, con variantes de estado si el contrato de auth las soporta. | `/login` existe, pero solo implementa Discord y estados de sesión. |
| `login_inicia_sesi_n_en_tu_misi_n_3/code.html` | HTML byte-a-byte equivalente al anterior en la evidencia leída: mismo título, copy, Discord CTA, formulario y footer. | `/login`, no una segunda pantalla. | `/login` existente. |

### PNG y evidencia de integridad

Se encontraron estos archivos:

- `landing_descubre_tu_ruta/screen.png`
- `login_inicia_sesi_n_en_tu_misi_n_1/screen.png`
- `login_inicia_sesi_n_en_tu_misi_n_2/screen.png`
- `mis_rutas_dashboard/screen.png`
- `mis_rutas_estado_vac_o/screen.png`
- `tu_ruta_en_tu_github/screen.png`
- `propuesta_de_replanificaci_n/screen.png`
- `tokens_de_acceso/screen.png`
- `boss_check_typescript_mini_quiz/screen.png`
- `detalle_de_ruta_backend_con_nest/screen.png`
- `cuestionario_calibraci_n_dev_dna/screen.png`
- `resultados_dev_dna/screen.png`

La inspección binaria detectó como PNG válido solamente:

- `detalle_de_ruta_backend_con_nest/screen.png` — 1280×1277
- `landing_descubre_tu_ruta/screen.png` — 1280×1503
- `login_inicia_sesi_n_en_tu_misi_n_2/screen.png` — 1280×773
- `resultados_dev_dna/screen.png` — 1280×1101

Los otros `screen.png` fueron detectados como texto ASCII, no como imágenes PNG válidas; por eso no se infiere contenido visual adicional de ellos. En particular, `login_inicia_sesi_n_en_tu_misi_n_1` no contiene `code.html`: no hay tres HTML de login disponibles. Los archivos `_2` y `_3` son estados/pantallas duplicados, no estados distintos observables. El supuesto tercer login debe quedar como evidencia faltante, no como pantalla inventada.

## Frontend actual y arquitectura

### App Router y rutas presentes

El frontend es Next `16.3.5` con App Router (`frontend/src/app`). Las páginas encontradas son:

- `frontend/src/app/page.tsx` → `/`
- `frontend/src/app/login/page.tsx` → `/login`
- `frontend/src/app/auth/error/page.tsx` → `/auth/error`
- `frontend/src/app/layout.tsx` → root layout
- `frontend/src/app/sitemap.ts` y `robots.ts` → metadata/rutas técnicas

No existen rutas para `/mis-rutas`, configurador, resultados, detalle de ruta, GitHub, replanificación, quiz ni tokens.

`layout.tsx` carga `Space_Grotesk` y `JetBrains_Mono` mediante `next/font/google`, importa `globals.css`, envuelve con `QueryClientProvider`, `AuthSessionHydrator` y `ProveedorNotificaciones`. El runtime de Next es self-hosted/standalone (`frontend/next.config.ts` contiene `output: "standalone"`).

### Estilos y fuentes

`frontend/src/app/globals.css` actualmente define variables cian/magenta y superficies mixtas:

- `--fondo: #040f12`
- `--primario: #00f2ff`
- `--secundario: #00ebf7`
- `--estado-exito: #aef400`
- `--estado-error: #f500dc`

El body usa `Space Grotesk`/fallback y el código usa `JetBrains Mono`. Las páginas existentes usan CSS Modules:

- `app/page.module.css`
- `app/login/page.module.css`
- `app/auth/error/page.module.css`
- `features/auth/components/*.module.css`

El mock orbital define otra identidad: superficies violeta oscuro, lime como CTA único, `Outfit`, `Raleway`, `Space Mono`, `Source Code Pro`, y Material Symbols. `orbital_mission_engine/DESIGN.md` es la fuente visual más completa del mock y contiene tokens, tipografía, layout y reglas de interacción.

### Dependencias y arquitectura de features

`frontend/package.json` contiene Next, React, React Query, Axios, Zod y Zustand; no contiene `tailwindcss`, `@tailwindcss/postcss`, `postcss`, librería de iconos ni Testing Library.

`frontend/src/features/README.md` documenta la regla:

`shared (components/ui, lib, stores, types) → features/<domain> → app/`

La feature `auth` existe como stub y usa:

- `features/auth/api/auth.service.ts`
- `features/auth/components/LoginPanel.tsx`
- `features/auth/components/HomeAuthStatus.tsx`
- `features/auth/components/AuthSessionHydrator.tsx`
- `features/auth/types/auth.types.ts`
- `stores/auth-session.ts`

`app/` compone páginas y `features/` debe alojar nueva UI de dominio. Las features `learning-paths` y `catalog` están documentadas como planned, no implementadas.

## Tailwind v4 versus CSS Modules/CSS variables

No conviene instalar ni introducir Tailwind v4 dentro de esta exploración. El repo no tiene dependencia/configuración Tailwind y los HTML de Stitch usan `https://cdn.tailwindcss.com`, que no es una integración de build válida para el Next actual.

Decisión recomendada para la primera implementación:

1. Usar CSS variables en `frontend/src/app/globals.css` como fuente única de tokens orbitales, una vez aprobada la sustitución o compatibilidad con los tokens actuales.
2. Usar CSS Modules para estilos de páginas y componentes, siguiendo el patrón existente.
3. Mantener `app/` delgado y llevar paneles, cards, navegación y estados interactivos a `features/` o a un shared UI si se demuestra reutilización.
4. No copiar clases Tailwind, `onclick` inline ni scripts globales de los mocks.

Tailwind v4 sería una decisión de tooling y una migración transversal: requeriría dependencias, configuración PostCSS, estrategia de tokens y decidir si se migra la UI existente. Sin instalar nada ni ampliar scope, CSS Modules + variables CSS minimiza el blast radius y respeta la arquitectura existente. El `@theme`/Tailwind solo debería evaluarse en una propuesta separada.

## Blast radius (codegraph)

El índice `.codegraph/` existe y fue consultado antes de leer fuentes.

### Layout y globals

- `RootLayout` en `frontend/src/app/layout.tsx` importa `globals.css`, `next/font/google`, `ProveedoresApp` y `ProveedorNotificaciones`; impacta todas las rutas actuales y todas las rutas nuevas.
- `globals.css` es importado por `RootLayout`; cualquier cambio de variables, body, fuentes, color-scheme o reset afecta globalmente `/`, `/login`, `/auth/error` y futuras páginas.
- `ProveedoresApp` renderiza `AuthSessionHydrator` y todo `children`; cualquier cambio al provider afecta hidratación y render de autenticación global.

### Home

- `HomePage` (`app/page.tsx`) renderiza `HomeAuthStatus`.
- `HomeAuthStatus` depende de `useAuthStore` y no tiene tests encontrados dentro de tres saltos de callers.
- El cambio de home toca `page.tsx`, `page.module.css`, globals/layout y la frontera visual con auth.

### Login/auth

- `LoginPage` (`app/login/page.tsx`) renderiza `LoginPanel`.
- `LoginPanel` depende de `discordStartUrl`, `logoutSession` y `useAuthStore`; no tiene tests encontrados dentro de tres saltos.
- `AuthSessionHydrator` llama `fetchMe`, actualiza `useAuthStore` y es montado globalmente por `providers.tsx`; no tiene tests encontrados dentro de tres saltos.
- `auth.service.ts` consume `/api/auth/me`, `/api/auth/logout` y `/api/auth/discord/start` contra el backend; su test existente solo cubre `discordStartUrl`.
- `AuthErrorPage` consume `reason` de query string y muestra un catálogo local; cualquier cambio de auth/error toca este contrato de navegación.

### Features y backend conectado

- El frontend auth cruza con Nest mediante cookie de sesión y el backend `backend/src/modules/identity/presentation/session-auth.guard.ts`.
- No existe todavía un flujo de learning paths en el frontend; el README de features marca `/me/learning-paths*` como planned.
- Las pantallas de Stitch de rutas, catálogo, checkpoints, replanificación, GitHub y tokens no tienen símbolos frontend actuales consumidores en el grafo; sus dependencias son nuevas y no deben asumirse existentes.

## Propiedades del cambio

| Propiedad | Evaluación |
|---|---|
| **Reversible** | El rediseño visual y la creación de rutas pueden revertirse en Git, pero una futura persistencia de rutas, checkpoints, tokens o progreso podría crear estado de usuario no reversible. Para este explore, no se detecta migración ni escritura de datos existente. |
| **Quién consume** | La UI existente consume el backend Nest de auth vía Axios/cookies. Las nuevas pantallas no tienen consumidores externos verificados. El contrato front↔back de auth sí está involucrado; externos adicionales: desconocido. |
| **Cuándo corre** | El hydrator de sesión corre automáticamente al montar providers y llama `fetchMe`; no se detectan cron, cola, poll ni worker del cambio visual. Jobs de learning paths: desconocido/no implementados. |
| **Qué volumen** | No hay filas/ítems de learning paths implementados en el frontend: volumen actual `null/desconocido`, volumen a 12 meses `null/desconocido`. Los mockups muestran cantidades de ejemplo, pero no son datos de producción. |
| **Dinero / auth / datos sensibles** | Sí: auth/sesión existente. Tokens de acceso del mock serían datos sensibles si se implementan, pero el repositorio no evidencia un flujo real de tokens. Riesgo alto para auth; la pantalla de tokens requiere análisis específico antes de implementarse. |
| **Infra** | No se propone tocar migraciones, esquema, arranque ni deploy en esta exploración. `next.config.ts` ya usa `output: "standalone"` y sería afectado solo si se decide cambiar tooling/build. |

## Complejidad y riesgo

### Tamaño y complejidad

- Tamaño: grande. Hay una superficie visual de doce mockups, al menos diez flujos nuevos, cambios globales de layout/tokens/fuentes y nuevos componentes interactivos.
- Complejidad de dominio: inicialmente media/alta. No es solo CSS: incluye sesión, rutas persistidas, progreso, cuestionarios, replanificación, checkpoints, integraciones GitHub y tokens.
- Complejidad de UI: alta. Hay estados vacíos, progreso, selección, disabled/loading/toast, acordeón, copiar/revocar y navegación multi-step.
- Intervención legacy: sí, en el sentido de que se reemplaza una home/login mínimos y un sistema global de tokens existente por una identidad visual distinta. No se debe hacer una migración big-bang sin checkpoints.

### Nivel de riesgo: ALTO

Justificación: el blast radius global incluye `layout.tsx` y `globals.css`; el flujo de auth cruza con cookies y backend Nest; el mock introduce rutas/estados que no tienen contrato ni datos en el repo; y el alcance visual es grande con tests de UI ausentes. El riesgo no proviene solo de cantidad de archivos: auth y futuras mutaciones de progreso/tokens elevan el riesgo aunque la primera rebanada sea visual.

`propose` debería plantear un plan escalonado con rollback: primero tokens/layout y una pantalla pública, luego auth/login, después un vertical slice de rutas con contrato/datos, y finalmente integraciones/checkpoints/tokens. No se recomienda implementar los doce mockups en un único big-bang.

## Flujos conectados y estado de testing

| Flujo conectado | ¿El cambio lo TOCA? (contrato/firma/evento/fila-clave compartida) | ¿Tiene test hoy? | Nivel actual / requerido |
|---|---|---|---|
| `RootLayout` / `globals.css` | Sí: layout, fuentes, variables y superficies consumidas por todas las páginas. | No hay test de render visual/global encontrado. | Sin tests / happy path de render + verificación visual responsive requerida. |
| `/` `HomePage` + `HomeAuthStatus` | Sí: cambia contenido y estado autenticado visible en home; comparte store de auth. | No. | Sin tests / happy path + estado hidratando + autenticado + anónimo requerido. |
| `/login` `LoginPage` + `LoginPanel` | Sí: rediseño de UI y estados `hydrated`, usuario activo, logout y redirect Discord; cruza contrato auth. | Parcial: solo `discordStartUrl` en `auth.service.test.ts`. | Happy path de helper / happy + errores, loading, logout y returnTo seguro requerido. |
| `/auth/error` `AuthErrorPage` | Potencialmente sí: navegación de error y catálogo `reason` consumido por auth. | No. | Sin tests / happy path + razones conocidas/desconocidas requerido. |
| `AuthSessionHydrator` + `fetchMe` | Sí: todas las nuevas pantallas autenticadas dependen de sesión hidratada. | No hay test de hydrator; el helper captura errores devolviendo `null`. | Sin tests / happy + fallo de sesión + cancelación/unmount requerido. |
| Backend `identity` / cookie session | Sí si se cambia login o estados de auth; firma HTTP no debe inventarse. | El frontend tiene solo test de URL; cobertura backend no fue parte del cambio visual. | Desconocido / contrato front-back + auth/error tests requeridos. |
| `/mis-rutas` dashboard | Sí: flujo nuevo, datos de learning paths inexistentes hoy. | No. | Sin tests / loading + vacío + datos + error requerido. |
| `/mis-rutas` estado vacío | Sí: mismo endpoint/estado que dashboard; candidato a romperse si se separa como ruta artificial. | No. | Sin tests / estado vacío derivado del contrato requerido. |
| `/mis-rutas/[routeId]` detalle | Sí: progreso, sección completada, estado de ruta y mutación de estado. | No. | Sin tests / happy + errores + recovery; camino crítico de estado requiere concurrencia/invariantes si se implementa. |
| `/mis-rutas/[routeId]/replanificacion` | Sí: propuesta y aceptación mutan ruta/progreso. | No. | Sin tests / happy + rechazo/error + recovery; contrato y mutación de estado requieren segundo eje. |
| `/configurador-de-ruta` cuestionario | Sí: estado multi-step y respuestas. | No. | Sin tests / selección, teclado, avance, refresh/error y persistencia requerida. |
| `/configurador-de-ruta/resultados` | Sí: resultado y selección de ruta. | No. | Sin tests / datos válidos, vacío/error y contrato de recomendaciones requerido. |
| checkpoint TypeScript | Sí: selección y confirmación de respuesta; puede registrar progreso. | No. | Sin tests / selección, disabled, error y reintento requerido. |
| integración GitHub | Sí: copiar/share y eventual contrato de badge/README. | No. | Sin tests / copiar/fallo clipboard + contrato externo requerido. |
| `/ajustes/tokens` | Sí: crear/copiar/revocar credenciales sería auth/dato sensible. | No. | Sin tests / prohibido considerar hecho sin authz, exposición segura, revocación/idempotencia y recovery. |

### Segundo eje en caminos críticos existentes o potenciales

- **Auth/sesión:** cruza contrato front↔Nest y depende del tiempo/expiración de sesión; no se encontró contract test ni test de reloj/expiración en frontend.
- **Progreso/checkpoints/replanificación:** mutan estado y podrían tocar la misma ruta/sección en paralelo; no hay BD/contrato/test de concurrencia porque los flujos no existen todavía.
- **Tokens:** manejaría un secreto/credencial y mutaría estado de autorización; no existe flujo ni cobertura, por lo que concurrencia, revocación/replay, autorización por objeto y recovery están descubiertos como deuda futura.
- **Cuestionario:** depende de una secuencia de pasos, pero no se verificó persistencia ni contrato; tiempo y recuperación ante refresh son desconocidos.

## Paths concretos en scope

### Scope mínimo seguro para una primera rebanada

- `frontend/src/app/layout.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/app/page.tsx`
- `frontend/src/app/page.module.css`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/login/page.module.css`
- `frontend/src/app/auth/error/page.tsx`
- `frontend/src/app/auth/error/page.module.css`
- `frontend/src/features/auth/components/LoginPanel.tsx`
- `frontend/src/features/auth/components/LoginPanel.module.css`
- `frontend/src/features/auth/components/HomeAuthStatus.tsx`
- `frontend/src/features/auth/components/HomeAuthStatus.module.css`
- `frontend/src/features/auth/components/AuthSessionHydrator.tsx`
- `frontend/src/features/auth/api/auth.service.ts` solo si el diseño exige cambios de contrato; no cambiar endpoints por estética.
- `frontend/src/features/README.md` solo si se aprueba agregar `learning-paths`/`catalog` como features reales.

### Scope futuro, condicionado a spec/contrato

- Nuevas páginas bajo `frontend/src/app/mis-rutas/**`
- `frontend/src/app/configurador-de-ruta/**`
- `frontend/src/app/ajustes/tokens/**`
- Nuevos componentes bajo `frontend/src/features/learning-paths/**`, `catalog/**`, `assessment/**`, `integrations/**`
- Tests bajo `frontend/test/src/**`
- Contratos compartidos/openapi/types del backend antes de endpoints nuevos o cambios de shape

No se debe crear ninguna de esas rutas futuras solo para hacer coincidir nombres de mockups: primero se debe cerrar el contrato y el modelo de estados.

## Decisión recomendada

1. Aprobar una implementación escalonada de la identidad orbital, con conformidad elevada sobre la UI existente para auth y una decisión de creación explícita solo para la nueva superficie de producto.
2. Adoptar CSS variables + CSS Modules en el stack actual; no instalar Tailwind v4 en esta feature.
3. Extraer navegación/header/footer y primitives solo cuando haya evidencia de reutilización; respetar `shared → features → app/`.
4. Mantener Discord como el único flujo de auth verificado. El formulario correo/contraseña del mock no debe implementarse hasta que exista contrato/backend aprobado; el HTML de Stitch no prueba que ese método exista.
5. Tratar empty, loading, error, authenticated/anonymous y disabled como estados de producto, no como HTML estático.
6. Implementar primero landing/home + login como una rebanada reversible; validar visualmente y con tests de UI; después diseñar el vertical slice `/mis-rutas` con contrato de datos.

## Preguntas y checkpoints pendientes

- ¿La primera entrega incluye solo home/login o todas las doce pantallas?
- ¿Cuál es la ruta canónica de `mis-rutas`, configurador, resultados y ajustes? Los slugs sugeridos arriba son recomendaciones, no contratos existentes.
- ¿Se aprueba reemplazar la identidad actual cian/magenta de `globals.css` por la orbital violeta/lime, o deben coexistir por área?
- ¿Se aprueban `Outfit`, `Raleway`, `Space Mono` y Material Symbols? El repo usa otras fuentes y no tiene librería de iconos instalada.
- ¿El login seguirá siendo exclusivamente Discord? El formulario correo/contraseña de los dos HTML disponibles podría ser una variante conceptual, pero no hay evidencia de backend.
- ¿Qué contrato y persistencia existen para learning paths, catálogo, progreso, quiz y replanificación? Actualmente son desconocidos/planned.
- ¿GitHub será una integración real o solo una preview local? Si es real, requiere contrato y seguridad antes de UI.
- ¿Tokens de acceso son parte de esta feature? Si sí, se debe detener la implementación visual y diseñar authz, exposición, revocación, auditoría y tests.
- Checkpoint `propose`: aprobar enfoque escalonado y rollback por rebanada.
- Checkpoint `spec`: cerrar scope, rutas canónicas, estados y contratos.
- Checkpoint `design`: aprobar tokens visuales, fuentes, iconos, responsive y composición de features.

📚 Referencias cargadas: `.cursor/rules/sdd-pipeline.mdc`, `.cursor/rules/constitution-fases.mdc`, `.cursor/skills/nextjs-reference/SKILL.md`, `.cursor/skills/nextjs-reference/references/rol-por-archivo.md`, `.cursor/skills/frontend-reference/SKILL.md`, `.cursor/skills/frontend-reference/references/design-language.md`.

---

## Addendum de auditoría — traducción literal Stitch (2026-09-22)

### Nueva dirección y límite operativo

La dirección aprobada reemplaza el objetivo anterior de “paridad visual” por una **traducción literal** de los doce `code.html` disponibles en `stitch_devtalles_learning_path_generator`. No basta conservar la temática orbital ni reinterpretar los datos: deben conservarse, por ruta y estado, la jerarquía DOM observable, textos, tokens, composición, breakpoints y microinteracciones locales del HTML fuente.

Se mantiene el límite de arquitectura: Next App Router y CSS Modules; no Tailwind en runtime ni cambios backend. Discord conserva su redirección/sesión real existente. Las rutas de learning paths, cuestionario, GitHub, replanificación, checkpoint y tokens permanecen `mock-only`: sus controles deben reproducir la interacción visual del HTML sin inventar llamadas HTTP, persistencia o contratos.

### Memoria previa consultada

- #1431 `Paridad visual Orbital mock-only` → confirma que la implementación actual ya es mock-only salvo Discord y que la evidencia visual manual 375/768/1280 estaba pendiente; esta decisión queda sustituida en alcance visual por la traducción literal, no por nuevos contratos.
- #1430 `Pruebas DOM Orbital con jsdom` → existe un patrón sin dependencias nuevas para assertions estructurales; no cubre regresión por captura de pantalla.
- Sin resultados para `ui stitch orbital` en `bugfix`.

### Hallazgo principal

Los doce HTML tienen equivalente de ruta actual (los dos de login comparten `/login` y son byte-a-byte iguales), pero **ninguna superficie alcanza equivalencia literal**. La implementación actual usa los mismos dominios/rutas y algunas interacciones mock, pero cambió copy, estructura, shell, componentes, estados y responsive. Es una reinterpretación, no una traslación.

Discrepancias transversales:

- El shell actual `MissionShell` muestra marca `CQ / CodeQuest`, enlaces `Inicio / Mis rutas / Configurar ruta` y banner demo; Stitch exige marca `DevTalles`, `Mis rutas / Descubre tu ruta / Ajustes`, avatar y footer por pantalla. El banner no existe en ningún HTML fuente.
- Los tokens actuales son cercanos en paleta, pero no son completos ni consistentes con los tokens fuente (`#121125`, `#0d0c20`, `#1a192e`, `#1e1d32`, `#29283d`, `#343248`, lavanda `#d3bbff`, borde `#785eac`, lime `#bdd100`) ni con sus familias `Outfit`, `Raleway`, `Space Mono` y, cuando corresponde, `Source Code Pro`.
- Los HTML fuente cambian la composición a `md`/`lg` (por ejemplo grids 1→2 y 1→12 columnas); los CSS Modules actuales simplifican esos layouts. No se verificó ningún breakpoint 375/768/1280 de la implementación actual.
- Los componentes actuales añaden copy de seguridad/mock y estados de error/retry que no están en el HTML fuente. Deben preservarse como comportamiento local accesible cuando aplique, pero no sustituir el estado visual fuente inicial.

### Inventario y matriz HTML → Next

| Fuente Stitch | Ruta Next actual | Estado de semejanza | Componentes/CSS a reemplazar literalmente | DOM, texto, estados e interacción fuente que faltan o difieren |
|---|---|---|---|---|
| `landing_descubre_tu_ruta/code.html` | `/` | No se parece | `app/page.tsx`, `app/page.module.css`, `features/orbital/components/MissionRadar.*`, `MissionShell.*` | Hero de dos columnas, radar SVG de seis nodos, rail de telemetría, cuatro puertas, bloque protocolo y footer; CTA y las cuatro puertas navegan al configurador. |
| `mis_rutas_dashboard/code.html` | `/mis-rutas` | Parcial semántico, no literal | `LearningPathsDashboard.*`, `LearningPathsEmptyState.*`, `app/mis-rutas/page.module.css`, shell | Dos cards exactas (Nest 34% y React 0%), gauges, telemetría horas/bloques, CTA lime/ghost, título y copy fuente; no el “Mock local” ni el panel actual. |
| `mis_rutas_estado_vac_o/code.html` | `/mis-rutas` con fixture vacío | No se parece | `LearningPathsEmptyState.*`, `LearningPathsDashboard.*` | Panel centrado con SVG orbital, texto “Aún no tienes rutas”, CTA, nav responsivo `hidden md:flex` y footer fuente. |
| `detalle_de_ruta_backend_con_nest/code.html` | `/mis-rutas/[routeId]` | Parcial funcional, no literal | `RouteDetail.*`, página y CSS de ruta | Alerta “Te atrasaste 4 días”, resumen 12 columnas, progreso 48.2%, timeline de cuatro cursos y tres secciones skeleton; CTA temporal “REGISTRANDO TELEMETRÍA…” → “SECCIÓN CONFIRMADA ✓”. |
| `boss_check_typescript_mini_quiz/code.html` | `/mis-rutas/[routeId]/checkpoints/typescript` | Parcial funcional, no literal | `TypescriptCheckpoint.*`, CSS de página | Frame dossier con coordenadas, cuatro botones numerados 01–04 en grid 2×2, selección lavanda, estado textual de telemetría y confirmación disabled→lime. |
| `propuesta_de_replanificaci_n/code.html` | `/mis-rutas/[routeId]/replanificacion` | Parcial funcional, no literal | `ReplanningProposal.*`, CSS de página | Título y copy exacto, columnas “Antes / Después” con cinco nodos y `{fecha}`, dos razones exactas, botones “Mantener mi ruta actual” y “Aceptar nueva planificación”. |
| `tu_ruta_en_tu_github/code.html` | `/mis-rutas/[routeId]/github` | Parcial funcional, no literal | `GithubPreview.*`, CSS de página | Ventana README, SVG badge real, snippet Markdown exacto, icono/botón copiar, toast temporizado 2.8s y acción “Compartir en Discord” que copia texto local. |
| `tokens_de_acceso/code.html` | `/ajustes/tokens` | Parcial funcional, no literal | `TokenPreview.*`, CSS de página | Fila de token con acciones iconográficas, toast, confirmación local al revocar, acordeón exclusivo Claude/Cursor/VS Code y snippets de configuración fuente. Sigue mock-only: jamás emitir/revocar token real. |
| `cuestionario_calibraci_n_dev_dna/code.html` | `/configurador-de-ruta` | Parcial funcional, no literal | `AssessmentWizard.*`, CSS de página | Barra “PASO 03 / 12” con 12 puntos, back ghost, cuatro cards situacionales, selección y avance automático local tras 320 ms; conservar activación Enter/Espacio. |
| `resultados_dev_dna/code.html` | `/configurador-de-ruta/resultados` | Parcial semántico, no literal | `AssessmentResults.*`, CSS de página | Layout 6/6, radar hexagonal completo, arquetipo “Investigador que shipea”, afinidad 94.2%, tres cards de ruta y CTA/labels fuente. |
| `login_inicia_sesi_n_en_tu_misi_n_2/code.html` | `/login` | No se parece | `LoginPanel.*`, `app/login/page.module.css`, shell específico de login | Header de tres elementos, tarjeta 460px, copy “Inicia sesión en tu misión”, CTA Discord, divisor, formulario visual correo/contraseña, modo invitado y footer mínimo. Discord debe seguir usando `discordStartUrl`; el formulario es únicamente presentación local sin endpoint. |
| `login_inicia_sesi_n_en_tu_misi_n_3/code.html` | `/login` (misma pantalla) | Duplicado exacto de `_2` | Mismos archivos de login | No se crea ruta ni componente adicional: es la segunda copia del mismo estado fuente. |

### Matriz de reemplazo por capas

| Área | Archivos actuales afectados | Sustitución requerida |
|---|---|---|
| Shell compartido | `features/orbital/components/MissionShell.*`, `app/layout.tsx`, `app/globals.css` | Header/fondo/footer fuente y tokens CSS globales; permitir variante específica de login sin banner demo. |
| Landing | `app/page.*`, `MissionRadar.*` | Traducir el SVG, hero, cuatro puertas, protocolo y CTA a JSX/CSS Modules sin alterar rutas. |
| Rutas | `features/learning-paths/components/{LearningPathsDashboard,LearningPathsEmptyState,RouteDetail,ReplanningProposal}.*`, `app/mis-rutas/**/page.module.css` | Conservar los fixtures/estado local actuales, reemplazar markup y CSS con cada composición Stitch correspondiente. |
| Assessment | `features/assessment/components/{AssessmentWizard,AssessmentResults,TypescriptCheckpoint}.*`, páginas y CSS | Mantener selección/avance local, traducir todos los estados visuales fuente y sus breakpoints. |
| Integraciones mock | `features/integrations/components/{GithubPreview,TokenPreview}.*`, páginas/CSS | Mantener clipboard/share local y simulaciones; reproducir badge, terminal, toasts, acordeón y confirmación fuente sin solicitudes de red. |
| Login real Discord | `features/auth/components/LoginPanel.*`, `app/login/page.module.css` | Traducir el formulario visual sin habilitar email/password; la única acción de identidad sigue siendo Discord. |

### Blast radius (codegraph)

CodeGraph confirma los puntos de entrada y consumidores:

- `MissionShell` es renderizado desde `app/layout.tsx`; tocarlo impacta cada ruta App Router. Tiene cobertura DOM en `frontend/test/src/ui-stitch-orbital/fase-0/dom.test.tsx`.
- `LearningPathsDashboard` es consumido por `/mis-rutas` y tiene cobertura DOM parcial; su estado empty y sus links afectan el dashboard, detalle y fixture de rutas.
- `LoginPanel` es consumido por `/login`, sin tests de caller encontrados; contiene la redirección Discord y logout, que no deben cambiar de contrato.
- Las rutas `/mis-rutas/[routeId]`, `github`, `replanificacion`, `checkpoints/typescript`, configurador, resultados y tokens ya existen y montan, respectivamente, `RouteDetail`, `GithubPreview`, `ReplanningProposal`, `TypescriptCheckpoint`, `AssessmentWizard`, `AssessmentResults` y `TokenPreview`.

| Flujo conectado | ¿El cambio lo TOCA? | ¿Tiene test hoy? | Nivel actual / requerido |
|---|---|---|---|
| `RootLayout` → `MissionShell` | Sí: shell, tokens, header/footer y responsive global. | Sí, DOM parcial. | Happy path DOM / happy + regresión visual 375/768/1280. |
| `/` landing y radar | Sí: estructura y CTA cambian completamente. | DOM parcial indirecto. | Happy path parcial / DOM + regresión visual y navegación. |
| `/login` → `LoginPanel` → Discord | Sí: el markup cambia; `discordStartUrl` se conserva. | No para `LoginPanel`; helper aislado existente. | Helper happy path / DOM de estados + enlace Discord + regresión visual. |
| `/mis-rutas` dashboard/empty | Sí: ambos estados pasan a composición fuente. | Sí, DOM parcial. | Happy path parcial / datos, vacío, anónimo y regresión visual. |
| Detalle/replanificación/checkpoint | Sí: markup, estados locales y botones se traducen. | No localizado para toda la interacción. | Sin tests o parcial / happy + errores/bordes locales + regresión visual. |
| Configurador/resultados | Sí: selector, avance y resultados cambian visualmente. | No localizado para captura visual. | Parcial lógico / teclado, avance y regresión visual. |
| GitHub/tokens mock | Sí: clipboard, toast, acordeón, revocación local cambian de UI. | No localizado para todas las superficies. | Parcial lógico / éxito/fallo de capacidades + regresión visual. |

### Propiedades del cambio (actualizadas)

| Propiedad | Evaluación |
|---|---|
| **Reversible** | Sí por revert de frontend; no se autorizan migraciones ni mutaciones reales. |
| **Quién consume** | Discord/auth es contrato existente front↔backend y no se cambia. Las restantes superficies continúan con fixtures locales, sin consumidor externo verificado. |
| **Cuándo corre** | No hay cron/cola/listener nuevo. La hidratación de sesión actual se mantiene. |
| **Qué volumen** | UI fixture-only; volumen actual y a 12 meses: `null/no aplica` para este cambio visual. |
| **Dinero / auth / datos sensibles** | Sí, `/login` y preview de tokens. Discord sigue como única frontera real; tokens son representación local enmascarada. |
| **Infra** | No aplica: no toca esquema, migraciones, arranque, deploy ni backend. |

### Riesgo y decisión de alcance

**Tamaño: grande. Riesgo: ALTO.** Aunque no hay cambios de backend, el reemplazo modifica todas las rutas orbitales, el shell global y el login conectado a Discord. El blast radius incluye todas las superficies de UI y los flujos de clipboard/estado local; un cambio accidental de `LoginPanel` puede romper inicio/cierre de sesión. La segunda fuente de riesgo es la literalidad: una “mejora” de copy, jerarquía o layout incumple por definición.

No hay pantalla fuente sin ruta equivalente; el problema es de fidelidad, no de cobertura. El duplicado de login debe permanecer una sola ruta porque ambos HTML son iguales.

### Criterio medible de equivalencia literal y regresión visual

Una ruta/estado solo se considera equivalente si cumple **todos**:

1. Renderizado a `375×altura completa`, `768×altura completa` y `1280×altura completa`, comparado con el `code.html` fuente en el mismo navegador y con animaciones, caret y foco desactivados.
2. Diferencia de píxeles ≤ **1.0%** por viewport tras una única máscara documentada para contenido que necesariamente varía (ninguna máscara para copy, layout, color, iconos o SVG).
3. Textos visibles, orden de landmarks, encabezados, botones/enlaces, labels y estado inicial son idénticos al HTML fuente; tolerancia: **0** sustituciones u omisiones.
4. Todos los breakpoints fuente se conservan: grid/orden/visibilidad `md` y `lg`, header/nav, CTA y footer deben coincidir en las tres capturas.
5. Cada interacción local del HTML fuente tiene una prueba: selección/disabled del quiz, avance accesible del cuestionario, transición temporal del detalle, copiar/toast/fallback de GitHub, acordeón/copy/revocar local de tokens y botones de replanificación. Discord se prueba como enlace a `discordStartUrl`, sin simular un segundo proveedor.

Estrategia de prueba: capturar baseline de cada `code.html` y su ruta Next emparejada en los tres viewports; almacenar las 36 parejas de screenshots bajo un único directorio de fixtures visuales; ejecutar diff determinista y adjuntar el porcentaje por captura al `verify.md`. Complementar con las pruebas DOM/jsdom existentes para semántica y con pruebas de interacción de las superficies mock. No se agrega Tailwind ni se ejecutan servicios backend para obtener estas capturas.

📚 Referencias cargadas: `.cursor/rules/sdd-pipeline.mdc`, `.cursor/rules/constitution-fases.mdc`, `.cursor/skills/nextjs-reference/SKILL.md`, `.cursor/skills/nextjs-reference/references/rol-por-archivo.md`, `.cursor/skills/frontend-reference/SKILL.md`, memoria Engram #1431 y #1430.
