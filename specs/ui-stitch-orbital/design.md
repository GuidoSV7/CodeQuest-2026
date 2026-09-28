# Diseño técnico — ui-stitch-orbital

## Decisión de alcance

La implementación será una traducción literal de las doce fuentes Stitch, exclusivamente frontend y mock-only para las superficies nuevas. Se conserva sin cambios el backend Nest, OpenAPI, cookies, endpoints, shapes y códigos del flujo Discord existente. La UI Orbital se implementará con CSS Modules y variables CSS; no se agrega Tailwind, CDN, librería de iconos, persistencia ni dependencia de runtime.

La primera unidad implementable es la Fase 0. Las Fases 1–7 quedan diseñadas como slices independientes, cada una con su propio gate y rollback. Ninguna fase posterior convierte un mock en integración real: para eso haría falta otra spec con contrato, autorización, errores y persistencia.

## ADR

No existe un ADR `accepted` en `decisions/` que cubra este cambio. Por el consumidor externo existente (la sesión Discord consumida por el frontend) y el riesgo global de `layout.tsx`/`globals.css`, queda propuesta la siguiente decisión, pendiente de aceptación del dev en este checkpoint:

**ADR propuesta — `ui-stitch-orbital`: identidad frontend escalonada sin modificar contratos**

- **Contexto:** el frontend existente comparte layout, tokens y sesión con todas las rutas; las pantallas Stitch no prueban contratos de learning paths, progreso, GitHub ni tokens.
- **Opciones:** (A) migración visual y de todas las pantallas en un solo cambio; (B) slices frontend reversibles con CSS Modules, tokens CSS únicos y fixtures mock-only; (C) postergar toda la identidad.
- **Decisión propuesta:** elegir B. Mantener la auth real como única frontera externa y tratar todo dato nuevo como fixture local explícitamente mock.
- **Consecuencias:** permite validar identidad, accesibilidad y responsive sin inventar APIs; aumenta la disciplina de fixtures, estados y reversión por fase; deja como deuda el contrato real de producto.
- **Verificación:** diff limitado a los paths de la spec, ausencia de Tailwind/iconos nuevos, tests de estados, `server-only`/RSC respetados, verificación visual en tres viewports y comprobación de que las acciones mock no hacen requests ni persisten.

Hasta que el dev acepte esta ADR propuesta, el diseño no pasa el checkpoint y no se deben generar `tasks.md` ni código.

## Capas afectadas y dependencias

La dirección será `shared/lib → features → app`; ninguna feature importa desde `app` ni otra feature directamente. Para este alcance no se introduce Clean Architecture completa ni Unit of Work porque no hay dominio persistente ni operación transaccional.

- **`app/` — routing y composición fina:** `layout.tsx`, páginas, `loading.tsx`, `error.tsx` y metadata. No contiene lógica de negocio, acceso HTTP, fixtures ni estado interactivo complejo.
- **`features/auth/` — frontera de sesión existente:** conserva `auth.service.ts`, `AuthSessionHydrator`, `HomeAuthStatus` y `LoginPanel`. Solo se modifica presentación y manejo visible de estados; los helpers HTTP existentes siguen siendo la única fuente de auth.
- **`features/learning-paths/` — presentación mock de rutas:** componentes, modelo de fixture y estado efímero de dashboard/detalle/replanificación. No llama al cliente HTTP.
- **`features/catalog/` — composición mock de puertas/recomendaciones:** se usa únicamente si la reutilización entre landing, configurador y resultados queda demostrada; no representa un catálogo backend.
- **`features/assessment/` — cuestionario, resultados y checkpoint:** estado de pasos y selección local, sin algoritmo ni mutación persistente.
- **`features/integrations/` — preview GitHub y tokens mock:** capacidades del navegador (clipboard/share) y estado efímero; no OAuth, secretos ni endpoints.
- **`components/` o `shared/` — solo reutilización comprobada:** `MissionShell` y primitives se extraen únicamente si tienen al menos dos consumidores claros. No se crea un design system general por anticipación.
- **`test/fixtures/ui-stitch-orbital/` — única fuente de datos mock:** los mocks y tests importan estos fixtures; las páginas no inventan objetos inline.
- **`globals.css` — única fuente de tokens Orbital:** contiene color, superficies, tipografía, espaciado, radios, sombras, foco, motion y superficies del navegador. Los CSS Modules solo referencian variables.

### Separación Server/Client

- Las páginas App Router y `layout.tsx` permanecen Server Components salvo necesidad comprobada.
- Los componentes puramente visuales permanecen server.
- `'use client'` se coloca en la hoja interactiva más baja: selección de respuestas, acordeones, botones mock, clipboard/share y estado local.
- Un Client Component no importa `data.ts`, `server-only`, servicios HTTP ni secretos. En esta feature no se crea DAL porque no hay datos de servidor nuevo.
- `AuthSessionHydrator` conserva su frontera actual. La sesión real determina anónimo/autenticado/hidratando en `/`, `/login` y `/auth/error`; los fixtures no simulan una sesión.
- Las rutas mock no usan `route.ts`, Server Actions ni `fetch` para reusar una UI. Si en el futuro aparece API real, deberá diseñarse como contrato separado.

### Aislamiento Discord / mock

Discord queda encapsulado en `features/auth/api/auth.service.ts`, `AuthSessionHydrator`, `LoginPanel` y el store de sesión existente. Solo `/login`, `/auth/error` y los estados globales de home pueden consumir `discordStartUrl`, `fetchMe`, logout, cookies y `returnTo` seguro. Ninguna feature Orbital importa el servicio de auth para obtener fixtures ni interpreta `user` como autorización de rutas mock.

`learning-paths`, `assessment`, `integrations` y la landing usan exclusivamente `frontend/test/fixtures/ui-stitch-orbital/**` mediante adaptadores de lectura local. Sus Client Components no importan Axios, `fetch`, XHR, storage, SDKs externos ni APIs de backend. `NEXT_PUBLIC_ORBITAL_DEMO_SESSION` solo puede seleccionar un estado visual en desarrollo explícito; no crea sesión, no altera el hydrator y se fuerza a falso en test, preview, staging y producción. Un test negativo intercepta red, navegación externa y storage para hacer cumplir esta separación.

### Variantes de shell

`MissionShell` se conserva como composición visual sin lógica de dominio y expone dos variantes explícitas:

- **`product`**: shell de las pantallas de producto (`/`, `/mis-rutas/**`, `/configurador-de-ruta/**` y `/ajustes/tokens`). Incluye skip link, header fijo/tematizado, marca `DevTalles`, navegación `Mis rutas / Descubre tu ruta / Ajustes`, avatar visual y footer Stitch. La navegación solo usa destinos frontend existentes; no interpreta permisos ni consulta datos.
- **`login`**: shell de `/login` y `/auth/error`. Conserva el header de tres elementos, tarjeta centrada y footer mínimo de las fuentes de login; no muestra banner demo ni navegación de producto. El CTA Discord sigue siendo el único control operativo de identidad.

La variante se decide en `app/` y se pasa como configuración de presentación; `MissionShell` no la deduce de la URL ni del estado de sesión. El contenido de login no se fuerza dentro del shell de producto porque la fuente exige una composición distinta. Ambos shells proporcionan landmark principal y foco inicial sin alterar el orden observable de cada fuente.

### Traducción de utilities Tailwind a CSS Modules y tokens

Las clases de los HTML se tratan como evidencia de intención visual, no como dependencia ejecutable. Cada grupo pasa a una clase semántica local en el `.module.css` correspondiente y cada valor repetido o de sistema pasa a una variable de `globals.css`.

| Utility observable | Destino CSS Modules/tokens | Regla |
|---|---|---|
| `bg-surface`, `bg-surface-container-*`, `text-on-surface*`, `border-*`, `selection:*` | `--orbital-color-*`, `--orbital-surface-*`, `--orbital-border-*`, `::selection` global | Roles de color, nunca literales por componente. |
| `font-headline-*`, `font-body-*`, `font-tech-*`, `font-mono` | Variables de familias/pesos y clases tipográficas locales | Mantener familia, peso, tamaño, interlineado y tracking observables. |
| `max-w-*`, `mx-auto`, `px-gutter`, `py-space-*`, `gap-space-*`, `space-y-*` | `--orbital-container-*`, `--orbital-gutter-*`, `--orbital-space-*` y clases `container/content/stack/cluster` | Conservar gutters y ritmo; no crear un utility framework local. |
| `flex`, `grid`, `grid-cols-*`, `items-*`, `justify-*`, `col-span-*`, `md:*`, `lg:*` | Clases de composición (`header`, `hero`, `resultGrid`, `routeGrid`) con media queries locales | Cada breakpoint observado queda junto a la clase que cambia. |
| `w-*`, `h-*`, `min-h-*`, `max-w-*`, `inset-*`, `top-*`, `left-*` | Variables de dimensión de sistema o propiedades locales de geometría | Las dimensiones del radar/SVG quedan encapsuladas en su componente. |
| `rounded-*`, `shadow-*`, `backdrop-blur-*`, `blur-*`, `opacity-*` | `--orbital-radius-*`, `--orbital-elevation-*`, superficies/halos del módulo | No repetir glassmorphism o glow donde la fuente no lo demuestra. |
| `hover:*`, `focus:*`, `active:*`, `disabled:*`, `transition-*`, `duration-*` | Pseudoestados locales, `:focus-visible`, `[disabled]`, `aria-busy` y tokens de motion | Definir default, hover, focus, active, disabled y loading; nunca `transition: all`. |
| `hidden`, `block`, `pointer-events-none`, `overflow-*`, `whitespace-*`, `truncate` | Clases estructurales y reglas responsive del módulo | Conservar visibilidad, clipping y wrapping; excepciones WCAG/overflow van a verify. |
| Arbitrarios como `bg-[#...]`, `shadow-[...]`, `blur-[...]`, `tracking-[...]` | Token nuevo aprobado o propiedad local trazable | No trasladar literales indiscriminadamente; un token faltante detiene la tarea. |

Los nombres expresan rol (`hero`, `nav`, `routeCard`, `copyAction`, `toast`), no mecanismo (`flexRow`, `mt4`). La auditoría debe encontrar cero CDN Tailwind y cero utilities Tailwind en `className` de las superficies traducidas.

## Contratos e interfaces

No se crean contratos HTTP nuevos ni se versiona la API. Las interfaces internas serán pequeñas y orientadas a presentación:

- `OrbitalFixtureMode`: `anonymous | authenticated | loading | empty | error | disabled`.
- `MockActionResult`: resultado local `success | error`, con código de UI estable y mensaje visible desde catálogo local; no es RFC 9457 ni contrato backend.
- `LearningPathFixture`, `RouteDetailFixture`, `AssessmentFixture`, `GithubPreviewFixture` y `TokenPreviewFixture`: DTOs mock con allowlist de campos, sin secretos ni endpoints.
- `OrbitalDataSource`: fuente local de fixtures que expone lectura por modo y, cuando corresponda, `null`/ausente; no expone métodos HTTP.
- `ClipboardPort` y `SharePort`: capacidades mínimas del navegador inyectables en tests. Su ausencia o rechazo se modela como estado visible.
- `AuthViewModel`: adaptador de lectura de estado ya existente para presentación; no reemplaza `useAuthStore` ni cambia su contrato.

Los nombres concretos y tipos definitivos se fijarán en tasks a partir de los tipos existentes. No se usará `any`, casts para silenciar tipos ni un body completo de una fuente externa.

### Versión del contrato

No hay breaking change: no se eliminan, renombran ni reinterpretan campos de auth, `returnTo`, cookies, endpoints ni errores. Por lo tanto no corresponde bump de API. Las rutas nuevas son URLs de UI mock-only, no endpoints ni contrato para consumidores externos.

## Transacción, persistencia y seguridad

No hay Unit of Work ni límite transaccional: ningún slice escribe en repositorios, DB, storage persistente o backend. Los cambios de checkpoint, progreso, replanificación, copiar/compartir y tokens viven solo en estado de presentación y se pierden al recargar.

La UI nunca mostrará valores sensibles del mock de tokens. El token será una representación enmascarada/no secreta; generar, copiar y revocar no deben crear una credencial. El estado autenticado de la pantalla no equivale a autorización real. Cualquier paso futuro hacia tokens reales dispara una nueva spec de authz, auditoría, idempotencia, revocación y recovery.

## Rutas canónicas provisionales

Estas rutas se fijan solo como superficies frontend respaldadas por la spec; no implican existencia de API:

- Canónicas existentes: `/`, `/login`, `/auth/error`.
- Fase 1: `/` landing Orbital.
- Fase 2: `/login` y `/auth/error`.
- Fase 3: `/mis-rutas`; `/mis-rutas/[routeId]`.
- Fase 4: `/configurador-de-ruta`; `/configurador-de-ruta/resultados`; checkpoint dentro de `/mis-rutas/[routeId]/checkpoints/typescript`.
- Fase 5: `/mis-rutas/[routeId]/replanificacion`.
- Fase 6: `/mis-rutas/[routeId]/github`.
- Fase 7: `/ajustes/tokens`.

El estado vacío de rutas no tendrá URL propia: se deriva del mismo recurso/fixture de `/mis-rutas`. La selección de puerta de landing se mantiene como navegación visual hacia `/configurador-de-ruta`, sin query contractual. Si una ruta no puede ser soportada por la composición finalmente implementada, se conservará la superficie canónica y se mostrará el estado `not available`, no una ruta inventada.

## Matriz fuente HTML → ruta → componente

La asignación es única. L11 y L12 son el mismo HTML y comparten implementación; se mantienen como dos entradas de evidencia, no como dos pantallas.

| ID | Fuente Stitch | Ruta/estado Next | Componente | Interacción conservada |
|---|---|---|---|---|
| L01 | `landing_descubre_tu_ruta/code.html` | `/` | `LandingOrbital` + `MissionRadar` + `HomeAuthStatus` | CTA y cuatro puertas a `/configurador-de-ruta`; radar accesible. |
| L02 | `mis_rutas_dashboard/code.html` | `/mis-rutas` + fixture con rutas | `LearningPathsDashboard` + `RouteGauge` | Cards, gauges, continuar y ver ruta. |
| L03 | `mis_rutas_estado_vac_o/code.html` | `/mis-rutas` + fixture vacío | `LearningPathsEmptyState` | Empty, CTA descubrir/configurar y navegación responsive. |
| L04 | `detalle_de_ruta_backend_con_nest/code.html` | `/mis-rutas/[routeId]` | `RouteDetail` | Acordeón, selección y confirmación local. |
| L05 | `boss_check_typescript_mini_quiz/code.html` | `/mis-rutas/[routeId]/checkpoints/typescript` | `TypescriptCheckpoint` | Selección 01–04 y disabled→confirmación. |
| L06 | `propuesta_de_replanificaci_n/code.html` | `/mis-rutas/[routeId]/replanificacion` | `ReplanningProposal` | Antes/Después, `{fecha}` no verificable y acciones locales. |
| L07 | `tu_ruta_en_tu_github/code.html` | `/mis-rutas/[routeId]/github` | `GithubPreview` | Copiar, toast 2.8 s y compartir local/fallback. |
| L08 | `tokens_de_acceso/code.html` | `/ajustes/tokens` | `TokenPreview` | Acordeón exclusivo, copiar y revocar mock-only. |
| L09 | `cuestionario_calibraci_n_dev_dna/code.html` | `/configurador-de-ruta` | `AssessmentWizard` | Selección, Enter/Espacio y avance local de 320 ms. |
| L10 | `resultados_dev_dna/code.html` | `/configurador-de-ruta/resultados` | `AssessmentResults` | Radar, arquetipo, afinidad y tres rutas mock. |
| L11 | `login_inicia_sesi_n_en_tu_misi_n_2/code.html` | `/login` | `LoginPanel` + shell `login` | Discord real; email/password e invitado no operativos. |
| L12 | `login_inicia_sesi_n_en_tu_misi_n_3/code.html` | `/login` (duplicado de L11) | Mismo `LoginPanel` | Equivalencia byte-a-byte; sin ruta adicional. |

Cada componente conserva texto, landmarks, orden de nodos, SVG y estado inicial de su fuente. Las páginas solo pasan ruta, variante y composición; la lógica interactiva permanece en la feature.

## Diseño visual y tokens

### Modo

Se adopta un modo híbrido:

- **Conformidad elevada** para la arquitectura y el flujo auth existentes: se extienden `LoginPanel`, `HomeAuthStatus`, `AuthSessionHydrator` y las páginas existentes sin cambiar su semántica.
- **Creación aprobada** para la identidad Orbital y las nuevas superficies de producto: la spec aprueba sustituir la identidad cian/magenta por una dirección violeta/lime inspirada en `orbital_mission_engine/DESIGN.md`.

`frontend/src/app/globals.css` será la única fuente de tokens. Si durante la implementación aparece una necesidad visual sin token, se detiene la tarea y se agrega el token explícitamente en el diseño/tarea; no se introduce un literal local.

### Cuatro decisiones de creación Orbital

- **Color:** fondo de misión profundo, superficie violeta de panel, texto claro de alta legibilidad, lime como único acento de acción y tokens separados para foco/éxito/error. El lime codifica acción; no se distribuyen acentos decorativos en cada card.
- **Tipografía:** `Outfit` para display y títulos de misión, `Raleway` para texto de lectura y controles, `Space Mono` solo para datos densos/código/identificadores mock. Se cargarán mediante `next/font` y se expondrán como variables; se verificará que los exports estén disponibles en la versión instalada antes de aplicar.
- **Layout:** landing con composición orbital asimétrica y navegación por puertas; producto con shell estable, contenido de lectura primero y paneles de tarea compactos. Mobile-first con Grid/Flex y container queries solo donde un primitive cambie según su contenedor.
- **Elemento signature:** el radar/orbital de la landing, construido como SVG accesible propio cuando un gráfico aporte significado. No se usa emoji, glifo unicode ni librería de iconos nueva.

Autocrítica: el primer riesgo de default sería convertir Orbital en “fondo oscuro + glow neón + tres cards”. Se corrige concentrando la firma en un único radar, reservando el lime para acciones, evitando glassmorphism y no repitiendo cards idénticas como estructura universal. En producto, la marca queda subordinada a legibilidad y tarea.

### MissionShell y primitives

`MissionShell` será un primitive de layout, no un contenedor con lógica de dominio. Sus responsabilidades: navegación visual, skip link, landmark principal, título de vista y slots para contenido/acciones. Primitives candidatos: `OrbitalButton`, `StatusBadge`, `ProgressMeter`, `AccordionSection`, `EmptyState`, `InlineError` y `MissionRadar`. Se crean solo tras comprobar que el rol no existe en `components/` o `features/auth/`.

Cada primitive nuevo debe definir default, hover, focus, active, disabled y loading. El focus será visible con token dedicado; los controles primarios apuntarán a 44px de área táctil y ninguno bajará de 24px. Motion será puntual, inferior a 300ms, con curva explícita y `prefers-reduced-motion`.

## Fases de implementación y reversión

### Fase 0 — fundación Orbital

**Objetivo:** dejar preparada la base sin crear una integración nueva.

- Definir tokens Orbital en `globals.css`, incluyendo superficies del navegador, selección, caret, scrollbar, foco, radios, sombras, spacing, tipografía y motion.
- Migrar `layout.tsx` a las fuentes `next/font` aprobadas y exponerlas como variables sin convertir el layout en Client Component.
- Establecer estructura feature-based y límites de importación; preparar `MissionShell`/primitives solo si la reutilización está demostrada.
- Crear la convención y los fixtures únicos de `frontend/test/fixtures/ui-stitch-orbital/`, con `null` para datos no verificables.
- Definir `DATA_MODE` como configuración de presentación mock-only, con modos `anonymous`, `authenticated`, `loading`, `empty`, `error` y `disabled`. No debe activar fetch, storage ni sesión falsa.
- Añadir caracterización mínima de rutas existentes y verificación visual responsive de layout/globales.

**Rollback:** revertir únicamente `globals.css`, cambios de fuentes/layout y archivos de fundación que no tengan consumidores nuevos. No tocar `auth.service.ts`, endpoints, cookies ni store. Si los tokens fallan visualmente, restaurar la identidad anterior antes de continuar.

### Fase 1 — landing pública

Implementar `/` con hero, radar, cuatro puertas y CTA a `/configurador-de-ruta`; preservar `HomeAuthStatus` en anónimo, hidratando y autenticado. Las puertas son navegación visual, no recomendaciones reales.

**Rollback:** retirar la composición Orbital y restaurar `page.tsx`/`page.module.css` anteriores; conservar tokens/layout solo si la caracterización confirma que no dependen de la landing. No modificar auth.

### Fase 2 — auth y errores

Rediseñar `/login` y `/auth/error` con CSS Modules, conservando exactamente Discord, `discordStartUrl`, logout, `fetchMe`, cookies, redirect y validación de `returnTo`. El formulario de correo/contraseña y modo invitado del mock no se implementan.

**Rollback:** restaurar solo componentes/módulos visuales de login/error. El servicio auth y la sesión permanecen en la versión anterior; un fallo de render no se corrige cambiando el contrato.

### Fase 3 — mis rutas y detalle

Crear `features/learning-paths/` y `/mis-rutas` como dashboard/empty derivados del mismo fixture; crear el detalle dinámico con progreso, acordeones y marcado local. La entrada anónima no revela contenido de ruta.

**Rollback:** eliminar la ruta y feature nuevas, dejando landing/auth intactas. No se requiere migración porque no hay persistencia.

### Fase 4 — configurador, resultados y checkpoint

Crear `features/assessment/`, cuestionario multi-step, resultados mock y checkpoint TypeScript. El botón permanece disabled sin selección válida; error, retry, fixture faltante y refresh tienen estados explícitos.

**Rollback:** retirar las rutas de assessment/checkpoint y sus imports; conservar `learning-paths` y los tokens. El dashboard no debe depender de resultados ni de una respuesta del cuestionario.

### Fase 5 — replanificación

Crear la preview de `/mis-rutas/[routeId]/replanificacion` con Antes/Después, razones y Mantener/Aceptar. Fechas no verificables permanecen `null`/“no disponible”; las acciones solo cambian estado local.

**Rollback:** retirar la subruta/composición de replanificación sin tocar el detalle base. No cambiar progreso ni fixtures de rutas existentes salvo eliminar el fixture específico.

### Fase 6 — preview GitHub

Crear `features/integrations/` y `/mis-rutas/[routeId]/github` como preview de badge/snippet. Copiar y compartir cubren éxito, API ausente, permiso denegado y feedback accesible; no muestran URL no verificada, token ni endpoint.

**Rollback:** retirar únicamente la preview y sus adaptadores de capacidades del navegador. No revocar conexiones ni limpiar datos porque nunca se crean.

### Fase 7 — tokens mock-only

Crear `/ajustes/tokens` como preview autenticada y claramente etiquetada como mock. El valor permanece enmascarado; generar/copiar/revocar modelan loading, éxito, error y retry local.

**Rollback:** retirar la ruta y feature de tokens. No hay credenciales, storage ni migración que revertir. Si se solicita token real, detenerse y abrir una spec de backend/auth separada.

## Testing y verificación

La estrategia sigue Testing Trophy y el nivel 2 de la spec:

- **Estático:** TypeScript/ESLint, comprobación de imports y auditoría de CSS Modules; confirmar que no aparece Tailwind ni dependencia de iconos.
- **Integración UI:** Testing Library/configuración existente del frontend, interactuando por roles, nombres y texto visible. Los fixtures se consumen desde una sola ubicación.
- **Auth:** caracterización de home/login/error, hidratando/anónimo/autenticado, fallo de sesión, logout, Discord y `returnTo` externo seguro. No se altera el contrato.
- **Mock-only:** verificar que rutas nuevas no hacen requests ni escriben storage; cubrir loading, empty, error, disabled y authenticated/anonymous aplicables.
- **Interacción:** teclado, foco, selección única, acordeón, retry, clipboard/share ausente o rechazado y anuncios `aria-live` sin duplicación.
- **Responsive/visual:** inspección en móvil, intermedio y desktop; sin scroll horizontal, truncado ni saltos de layout. Verificar contraste AA (4.5:1 texto normal, 3:1 texto grande), foco, reduced motion y superficies del navegador.
- **Navegación:** tras cambio de ruta, el foco se mueve al contenido principal o encabezado; existe skip link y landmarks semánticos.
- **No aplican en esta feature:** BD/concurrencia, Unit of Work, mutation testing de camino crítico, reloj inyectable para expiración y recovery de fallo parcial real, porque las nuevas acciones son efímeras y mock-only. Si una fase introduce persistencia/API, deja de aplicar esta excepción y requiere nuevo diseño.

La verificación visual no sustituye tests de comportamiento ni a11y manual: las rutas de interacción nuevas deben probarse también con teclado y, cuando corresponda, lector de pantalla.

## Estrategia de capturas y pixel diff

La evidencia visual se genera por cada fuente y ruta emparejada, en el mismo navegador y con el mismo CSS viewport. La matriz obligatoria conserva 36 parejas: 12 fuentes × `375`, `768` y `1280` CSS px. Cada pareja guarda fuente y Next en `frontend/test/fixtures/ui-stitch-orbital/visual/` con un manifiesto que identifica `sourceId`, ruta, viewport, commit, estado inicial y si la fuente es PNG válida o HTML.

Antes de capturar se desactivan animaciones, caret y foco únicamente en el contexto de captura; accesibilidad y estados de foco se verifican por separado. No se aplican máscaras a copy, DOM, layout, color, iconografía, SVG o breakpoints. Solo puede existir una máscara explícita para contenido inevitablemente variable, con área y razón en el manifiesto. Capturas inválidas o ausentes permanecen `PENDIENTE`, nunca `PASS`.

El diff debe ser determinista, comparar dimensiones iguales y reportar porcentaje por celda y agregado. El umbral literal es `<= 1.0%` de píxeles por viewport; además se revisan landmarks, geometría principal con tolerancia máxima de 8 px, textos exactos, orden, SVG, contraste y overflow. Un diff bajo no compensa copy sustituido ni requests no permitidos. L11/L12 se capturan dos veces para conservar las 36 celdas y demostrar que son duplicados; `login_..._1/screen.png` y los PNG ASCII se registran como evidencia no válida.

Las pruebas de interacción fijan el estado inicial antes de capturar: quiz disabled→enabled, wizard a 320 ms con reloj controlable, toast GitHub a 2.8 s, acordeón exclusivo, confirmación de detalle y capacidades clipboard/share/revoke. En L01–L10 se interceptan `fetch`, Axios, XHR, navegación externa y storage y se exige cero actividad; L11/L12 permiten únicamente la frontera Discord/session existente.

## Deuda y límites de aceptación

- El contrato real de learning paths, recomendaciones, progreso, GitHub y tokens queda desconocido y no debe inferirse de Stitch.
- Las rutas nuevas son provisionales de UI y no constituyen contrato de backend.
- La ADR propuesta y los tokens/fuentes deben aprobarse antes de `sdd-tasks`.
- Si falta una capacidad existente para tests o verificación visual, se documenta en tasks como prerequisito; no se instala una dependencia ajena a la decisión aprobada sin un nuevo checkpoint.
- El diseño queda bloqueado hasta confirmar que la ADR propuesta es aceptada.

## Checkpoint de aprobación

Solicito aprobación explícita del dev para:

1. La ADR propuesta: identidad Orbital escalonada, CSS Modules + variables CSS, sin Tailwind ni iconos nuevos.
2. La Fase 0 como primer slice y el mapa reversible de Fases 1–7.
3. Las rutas canónicas provisionales de UI y la ausencia de rutas duplicadas para estados vacíos.
4. `DATA_MODE` y fixtures únicos mock-only, con separación estricta Server/Client.
5. La estrategia de tokens/fuentes `next/font`, `MissionShell`/primitives bajo reutilización comprobada y verificación visual/a11y.

No avanzar a `sdd-tasks` ni a implementación hasta recibir ese checkpoint.

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `specs/ui-stitch-orbital/spec.md`, `specs/ui-stitch-orbital/explore.md`, `specs/ui-stitch-orbital/proposal.md`, `.cursor/skills/nextjs-reference/references/rol-por-archivo.md`, `.cursor/skills/nextjs-reference/references/estructura.md`, `.cursor/skills/frontend-reference/references/design-language.md`, `.cursor/skills/frontend-reference/references/accessibility.md`, `.cursor/skills/frontend-reference/references/css-responsive.md`, `.cursor/skills/frontend-reference/references/testing.md`, `.cursor/templates/adr.md`.
