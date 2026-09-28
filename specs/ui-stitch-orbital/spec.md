⚠️ FLUJOS SIN COBERTURA (revisar antes de aprobar)
- `RootLayout`/`globals.css`: tocado por el cambio, sin test global existente → se cubre con caracterización y verificación visual responsive.
- `/` y `HomeAuthStatus`: tocado por el cambio, sin test existente → se cubre con caracterización de anónimo, hidratando y autenticado.
- `/login`, `/auth/error` y `AuthSessionHydrator`: tocados por el cambio, cobertura insuficiente → se cubre con caracterización y tests de estados/contrato.
- Nuevas pantallas Orbital: no existen tests previos → se cubren con tests de estados, interacción, a11y y responsive por fase.

## Paths en scope

- `frontend/src/app/layout.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/app/page.tsx`
- `frontend/src/app/page.module.css`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/login/page.module.css`
- `frontend/src/app/auth/error/page.tsx`
- `frontend/src/app/auth/error/page.module.css`
- `frontend/src/app/mis-rutas/**`
- `frontend/src/app/configurador-de-ruta/**`
- `frontend/src/app/ajustes/tokens/**`
- `frontend/src/features/auth/components/LoginPanel.tsx`
- `frontend/src/features/auth/components/LoginPanel.module.css`
- `frontend/src/features/auth/components/HomeAuthStatus.tsx`
- `frontend/src/features/auth/components/HomeAuthStatus.module.css`
- `frontend/src/features/auth/components/AuthSessionHydrator.tsx`
- `frontend/src/features/orbital/**`
- `frontend/src/features/learning-paths/**`
- `frontend/src/features/catalog/**`
- `frontend/src/features/assessment/**`
- `frontend/src/features/integrations/**`
- `frontend/test/fixtures/ui-stitch-orbital/**`
- `frontend/test/src/ui-stitch-orbital/**`
- `specs/ui-stitch-orbital/spec.md`

## Problema

El frontend actual tiene una home y un login mínimos, una identidad global cian/magenta y no representa la experiencia Orbital mostrada en las pantallas Stitch. Las pantallas de rutas, configurador, resultados, checkpoints, GitHub, replanificación y tokens tampoco existen como superficie frontend.

La evidencia disponible no demuestra contratos ni endpoints para learning paths, progreso, recomendaciones, GitHub o tokens. Los HTML de Stitch contienen Tailwind por CDN, scripts locales, datos de ejemplo y un endpoint ficticio visible en la pantalla de tokens; no son contratos de producción. El login existente sí tiene un flujo Discord y contratos de sesión consumidos por el frontend, por lo que ese contrato debe conservarse.

La feature debe trasladar la experiencia visual de Stitch al frontend existente de forma escalonada y reversible, usando CSS Modules y variables CSS Orbital como fuente única de tokens, sin introducir Tailwind ni convertir mockups en mutaciones reales.

## Objetivo y no-scope

### Objetivo

Implementar la superficie visual Orbital completa por fases reversibles, con estados de producto verificables, accesibilidad WCAG 2.2 AA, comportamiento responsive y fixtures mock-only de fuente única. Cada fase debe poder revertirse sin tocar las fases anteriores ni introducir persistencia.

### No-scope obligatorio

- No se modifica `backend/`, OpenAPI, tipos compartidos de backend, contratos HTTP, Redis, base de datos, migraciones, seed, deploy ni configuración de runtime.
- No se crean endpoints nuevos ni se cambian endpoints, shapes, cookies, `returnTo` ni códigos de error existentes del flujo Discord.
- No se implementan login por correo/contraseña ni modo invitado: el único método de login es Discord.
- No se implementan mutaciones reales de progreso, checkpoints, replanificación, GitHub ni tokens.
- GitHub, tokens, replanificación y checkpoint son pantallas/interacciones mock-only: copiar, compartir, aceptar, revocar, marcar completado o avanzar solo cambian estado local efímero de presentación y no envían requests ni persisten datos.
- Las pantallas mock-only no hacen ningún request de red, ni siquiera a endpoints internos, durante render, interacción, navegación o manejo de errores. La única frontera real permitida es la autenticación Discord ya existente y sus requests contractuales de sesión; esa frontera no se reutiliza para simular datos Orbital.
- `NEXT_PUBLIC_ORBITAL_DEMO_SESSION` solo puede habilitar un modo de demostración en `NODE_ENV === "development"` y con valor explícito `"true"`. En test, preview, staging y producción se ignora como falso; nunca crea una sesión, sustituye cookies, altera `fetchMe` ni se usa como autorización.
- No se copian secretos, tokens, credenciales, endpoints ficticios, URLs no verificadas ni datos plausibles de los mockups. Un dato no verificable se representa como `null`, placeholder explícito o estado no disponible.
- No se instala Tailwind ni una librería de iconos. El único recurso tipográfico de iconos aprobado es `Material Symbols Outlined`, usado mínimamente para acciones o estados que ya tienen nombre textual; no se usa para decoración, reemplazar texto, navegación completa ni información crítica. No se usan emojis/unicode como iconos.
- No se inventan rutas canónicas de backend. Las rutas frontend nuevas son únicamente superficies mock-only de esta feature y no constituyen contrato de API.

## Fuente visual y reglas de implementación

- La referencia visual es `orbital_mission_engine/DESIGN.md` y las pantallas válidas de Stitch inspeccionadas en `stitch_devtalles_learning_path_generator`.
- La paridad visual se mide contra la pantalla Stitch correspondiente a 1280 px de ancho mediante captura comparable y checklist de geometría, jerarquía, color, tipografía, iconografía y estados. La coincidencia literal se subordina a WCAG 2.2 AA, responsive, reduced motion y semántica accesible.
- `MissionShell` es el shell visual común cuando exista más de un consumidor: skip link, landmark principal, encabezado de vista, navegación y slots de contenido/acciones. No contiene lógica de dominio ni acceso a red.
- Los tokens Orbital se expresan sobre una escala compatible con Material Design 3 (roles de color, tipografía, espaciado, forma, elevación, foco y motion). Los CSS Modules consumen variables; no duplican literales de token.
- `frontend/src/app/globals.css` es la fuente única de variables CSS Orbital: color, superficies, tipografía, espaciado, radios, sombras, foco y motion. Los módulos no deben duplicar valores de token.
- Las páginas deben ser delgadas; la UI reutilizable vive en `features/` y solo se extrae a shared cuando exista reutilización comprobada.
- Todos los estilos de páginas y componentes son CSS Modules. No se agregan clases Tailwind, `style` inline para layout ni scripts inline de los HTML.
- Los iconos Material Symbols Outlined se limitan a controles con texto visible o a estados con alternativa accesible; cada instancia define `aria-hidden="true"` cuando es decorativa y nunca es el único nombre de un control.
- Los fixtures mock-only viven únicamente en `frontend/test/fixtures/ui-stitch-orbital/**` y son consumidos por mocks y tests. No se crean fixtures paralelos por pantalla.
- Los fixtures no contienen secretos ni endpoints. Incluyen `null` para datos no verificables y distinguen explícitamente `anonymous`, `authenticated`, `loading`, `empty`, `error` y `disabled` cuando corresponda.
- La sesión real existente sigue siendo la fuente de verdad para anónimo/autenticado en `/`, `/login` y `/auth/error`; las demás fases usan fixtures locales y no simulan una sesión ni una API.
- El modo `NEXT_PUBLIC_ORBITAL_DEMO_SESSION=true` puede mostrar estados de demo únicamente durante desarrollo local y solo como entrada de presentación; no puede habilitar la frontera Discord ni desbloquear contenido que requiera autorización real.

## Alcance por fases (MoSCoW)

### Must — Fase 1: identidad Orbital y landing pública

Incluye la pantalla `landing_descubre_tu_ruta` en `/`, tokens Orbital globales, layout, navegación y composición responsive.

- Renderizar hero, radar/visual orbital, cuatro puertas de entrada y CTA hacia el configurador como navegación visual.
- Soportar estados anónimo, autenticado e hidratando sin romper `HomeAuthStatus`.
- Mantener la home funcional aunque no exista una sesión cargada, sin inventar datos de usuario.
- Revertir la fase restaurando los módulos de home/layout/tokens sin alterar el servicio de auth.

### Must — Fase 2: autenticación y errores

Incluye `login_inicia_sesi_n_en_tu_misi_n_2`, `login_inicia_sesi_n_en_tu_misi_n_3` como una sola pantalla `/login` y `/auth/error`.

- Rediseñar login conservando exclusivamente el CTA Discord y los contratos actuales de `discordStartUrl`, logout, `fetchMe`, cookies, redirect y `returnTo` seguro.
- Mostrar estados `loading`, `hydrating`, usuario autenticado, anónimo, error de inicio de sesión, error de sesión y logout.
- Mantener fuera de la UI funcional el formulario de correo/contraseña y modo invitado presentes en el mock.
- Representar razones conocidas y desconocidas en `/auth/error` sin inventar códigos ni modificar el catálogo contractual.
- Revertir la fase sin retirar ni cambiar el servicio de auth.

### Must — Fase 3: mis rutas y detalle

Incluye `mis_rutas_dashboard`, `mis_rutas_estado_vac_o` y `detalle_de_ruta_backend_con_nest` como superficies mock-only:

- `/mis-rutas` muestra dashboard con rutas mock, progreso, continuar y ver ruta.
- El estado vacío se deriva del mismo recurso visual y fixture, no de una pantalla/ruta duplicada.
- `/mis-rutas/[routeId]` muestra resumen, progreso, cursos/secciones colapsables y acción de marcar sección como completada solo local/efímera.
- Cubrir `loading`, `empty`, `error`, `disabled`, `authenticated` y acceso anónimo según corresponda. El estado anónimo no debe revelar contenido de una ruta.
- No guardar cambios en refresh, no llamar a backend y no afirmar persistencia.

### Must — Fase 4: cuestionario, resultados y checkpoint

Incluye `cuestionario_calibraci_n_dev_dna`, `resultados_dev_dna` y `boss_check_typescript_mini_quiz` como flujo visual local:

- `/configurador-de-ruta` presenta pasos, selección de respuesta, progreso y botón disabled hasta que la selección sea válida.
- La navegación de pasos y resultados usa fixture local; refresh, respuesta inválida y fixture faltante muestran estados definidos sin persistencia.
- La pantalla de resultados representa radar/arquetipo/afinidad y rutas recomendadas sin afirmar que el resultado proviene de un algoritmo o backend real.
- El checkpoint representa selección, confirmación, error simulado y reintento; marcar completado solo actualiza el estado visual local.
- Cubrir teclado, foco, selección única, disabled, loading, empty/error y usuario anónimo/autenticado donde la composición lo requiera.

### Should — Fase 5: propuesta de replanificación

Incluye `propuesta_de_replanificaci_n` como `/mis-rutas/[routeId]/replanificacion` o composición equivalente dentro del slice de rutas, sujeto a la decisión de ruta canónica en design.

- Mostrar comparación Antes/Después, razones y acciones Mantener/Aceptar.
- Reemplazar `{fecha}` por estado `null`/no disponible o fixture explícitamente mock; nunca inventar una fecha real.
- Las acciones son mock-only, con estados `disabled`, loading local, éxito visual y error simulado/reintento; no mutan progreso ni llaman API.

### Should — Fase 6: preview GitHub

Incluye `tu_ruta_en_tu_github` como preview local, sin integración externa:

- Mostrar preview de badge/snippet Markdown, copiar y compartir como interacciones locales.
- Copiar debe contemplar `navigator.clipboard` no disponible, permiso denegado, éxito y feedback accesible; compartir debe contemplar API no disponible y alternativa visual.
- No mostrar ni copiar endpoint ficticio, token ni URL no verificada.
- No abrir OAuth, crear repositorios, publicar Gists ni ejecutar requests a GitHub.

### Should — Fase 7: tokens de acceso mock-only

Incluye `tokens_de_acceso` únicamente como pantalla de demostración visual, preferentemente bajo `/ajustes/tokens` si design confirma esa ruta:

- Mostrar token enmascarado generado desde fixture no secreto, estados de copiar, revocar y acordeón de IDE.
- Generar/copiar/revocar solo cambia estado local efímero y nunca crea una credencial, llama endpoint, escribe storage persistente o muestra un secreto real.
- El estado anónimo no muestra ni permite operar el panel; el estado autenticado se limita al mock local.
- Indicar de forma visible que la pantalla es una preview/mock cuando una acción pueda confundirse con una operación real.

### Could

- Microinteracciones Orbital adicionales, mientras respeten motion menor a 300 ms, prefers-reduced-motion y no agreguen dependencia de runtime.
- Variantes visuales no presentes en las pantallas Stitch, únicamente después de cubrir los estados obligatorios y sin alterar contratos.

### Won't

- Tailwind, backend/API/Redis/DB, persistencia real, OAuth GitHub, emisión/revocación real de tokens, mutación real de progreso, recomendaciones reales, correo/contraseña, modo invitado, polling, SSE, webhooks o una tercera pantalla de login no respaldada por evidencia.

## Criterios de aceptación verificables

### Criterios comunes de todas las fases

1. `npm`/Next compila el frontend con las dependencias existentes; no aparece Tailwind ni una dependencia de iconos nueva.
2. Una inspección del diff confirma que solo se modifican los paths declarados en `## Paths en scope`; no se toca `backend/` ni configuración de DB/Redis/API.
3. Cada pantalla tiene tests de render de su estado feliz y de los estados aplicables: `loading`, `empty`, `error`, `disabled`, `anonymous` y `authenticated`.
4. Los tests usan únicamente `frontend/test/fixtures/ui-stitch-orbital/**`; no hay datos de pantalla duplicados en mocks y tests.
5. Un test negativo común intercepta `fetch`, Axios, `XMLHttpRequest`, navegación externa y APIs de storage para demostrar cero requests/persistencia en cada pantalla mock-only; solo `/login`, `AuthSessionHydrator` y `/auth/error` pueden ejercer los requests Discord/session ya existentes.
6. La condición de demo se comprueba con una matriz de entorno: solo `NODE_ENV=development` + `NEXT_PUBLIC_ORBITAL_DEMO_SESSION=true` habilita el estado visual de demo; cualquier otra combinación queda deshabilitada y no altera auth.
7. La auditoría de estilos confirma CSS Modules para estilos locales, variables CSS MD3/Orbital como tokens y ausencia de clases Tailwind.
8. `MissionShell` conserva skip link, landmark principal, encabezado de vista y slots sin lógica de dominio; si hay un solo consumidor, se documenta por qué no se extrae.
9. La navegación y controles operables por teclado tienen foco visible, nombre accesible, orden de foco lógico y no dependen solo de color.
10. La verificación visual compara cada pantalla Stitch disponible en 1280 px con una captura de la implementación: estructura y alineación de shell/contenido toleran como máximo 8 px de desplazamiento, el orden/jerarquía de bloques coincide y cada color/tipo/espaciado usado proviene de tokens MD3/Orbital. Donde no exista PNG válido, se usa el `code.html` como referencia y se declara la evidencia faltante.
11. La verificación responsive se ejecuta exactamente en 375, 768 y 1280 CSS px. En los tres viewports no hay scroll horizontal, clipping de contenido ni controles inaccesibles; los breakpoints y reflujo pueden diferir de Stitch si preservan jerarquía y tarea.
12. El contraste de texto, controles, estados y foco cumple WCAG 2.2 AA: 4.5:1 para texto normal, 3:1 para texto grande y componentes gráficos/controles; los mensajes de error se asocian programáticamente y los cambios relevantes se anuncian sin duplicación.
13. La UI no usa emoji/unicode como iconografía. `Material Symbols Outlined` aparece solo en acciones/estados con alternativa textual y nunca es el único nombre accesible; iconos decorativos son `aria-hidden`.
14. Se verifica `prefers-reduced-motion`: las transiciones no son necesarias para entender ni operar la pantalla y ninguna supera 300 ms cuando está habilitada.

### Criterios obligatorios de traducción literal Stitch

15. La fuente normativa de cada pantalla es su `code.html` correspondiente en `stitch_devtalles_learning_path_generator`; `DESIGN.md` solo aporta tokens y reglas cuando el HTML no alcanza a expresar una decisión. No se acepta resumir, corregir, mejorar, traducir, reordenar o reemplazar copy, nombres, atributos, landmarks, jerarquía DOM, clases semánticamente observables, SVG, estados iniciales o microinteracciones de la fuente.
16. Para cada una de las doce fuentes/rutas se conserva una asignación única y verificable:

| ID | Fuente literal | Ruta/estado Next | Interacción mínima que debe conservarse |
|---|---|---|---|
| L01 | `landing_descubre_tu_ruta/code.html` | `/` | CTA y cuatro puertas navegan visualmente al configurador; radar conserva nodos y alternativa accesible. |
| L02 | `mis_rutas_dashboard/code.html` | `/mis-rutas` con fixture de rutas | Cards, gauges, CTA continuar y CTA ver ruta conservan estados y destinos locales. |
| L03 | `mis_rutas_estado_vac_o/code.html` | `/mis-rutas` con fixture vacío | Empty derivado del mismo recurso, CTA descubre ruta y navegación responsive. |
| L04 | `detalle_de_ruta_backend_con_nest/code.html` | `/mis-rutas/[routeId]` | Acordeón, selección de sección y transición local de “REGISTRANDO TELEMETRÍA…” a “SECCIÓN CONFIRMADA ✓”. |
| L05 | `boss_check_typescript_mini_quiz/code.html` | `/mis-rutas/[routeId]/checkpoints/typescript` | Selección única 01–04, disabled inicial y confirmación habilitada con selección válida. |
| L06 | `propuesta_de_replanificaci_n/code.html` | `/mis-rutas/[routeId]/replanificacion` | Comparación Antes/Después, `{fecha}` literal o placeholder/null y acciones locales Mantener/Aceptar. |
| L07 | `tu_ruta_en_tu_github/code.html` | `/mis-rutas/[routeId]/github` | Copiar, toast de 2.8 s y compartir local; no integración GitHub. |
| L08 | `tokens_de_acceso/code.html` | `/ajustes/tokens` | Acordeón exclusivo, copiar, revocar y confirmación local; nunca token real. |
| L09 | `cuestionario_calibraci_n_dev_dna/code.html` | `/configurador-de-ruta` | Paso 03/12, 12 puntos, selección, avance local a 320 ms y activación Enter/Espacio. |
| L10 | `resultados_dev_dna/code.html` | `/configurador-de-ruta/resultados` | Radar, arquetipo, afinidad, tres cards y CTA/labels fuente. |
| L11 | `login_inicia_sesi_n_en_tu_misi_n_2/code.html` | `/login` | CTA Discord real; formulario correo/contraseña y modo invitado solo presentación no operativa. |
| L12 | `login_inicia_sesi_n_en_tu_misi_n_3/code.html` | `/login` (misma pantalla que L11) | Debe probarse equivalencia byte-a-byte con L11; no se crea ruta ni pantalla adicional. |

17. La implementación debe incluir una prueba por fuente que compare el árbol DOM observable con el `code.html`: mismo orden de landmarks, encabezados, textos visibles, labels, roles, botones/enlaces, atributos de accesibilidad, SVG y estado inicial. La comparación no puede aceptar sustituciones u omisiones de copy (`0` diferencias); los datos dinámicos no verificables se comparan contra `null`, placeholder explícito o “no disponible”, nunca contra un valor plausible.
18. Cada interacción local de la fuente tiene prueba de éxito, estado inicial y borde aplicable. La prueba debe demostrar que la acción opera sobre el mismo control/rol y produce el mismo estado visual o temporal: 320 ms del cuestionario, 2.8 s del toast GitHub, disabled→enabled del quiz, acordeón exclusivo de tokens, confirmación del detalle, acciones de replanificación y copy/share/revoke locales. Las duraciones se prueban con reloj controlable, sin `setTimeout` para ocultar carreras.
19. La verificación de breakpoints compara los estilos y el DOM computado de cada fuente y ruta en `375`, `768` y `1280` CSS px. Se conservan exactamente los cambios de visibilidad, orden, columnas, gutters, header/nav, CTA, footer, `md` y `lg` que existan en la fuente; un reflujo distinto solo es válido cuando evita overflow o satisface WCAG AA y debe quedar documentado como excepción verificable, no como PASS literal.
20. La matriz de capturas obligatoria contiene exactamente 36 parejas fuente/Next, sin inventar PASS:

| Fuente/ruta | 375 px | 768 px | 1280 px |
|---|---|---|---|
| L01 landing `/` | C01 | C02 | C03 |
| L02 dashboard `/mis-rutas` | C04 | C05 | C06 |
| L03 empty `/mis-rutas` | C07 | C08 | C09 |
| L04 detalle `/mis-rutas/[routeId]` | C10 | C11 | C12 |
| L05 checkpoint TypeScript | C13 | C14 | C15 |
| L06 replanificación | C16 | C17 | C18 |
| L07 GitHub preview | C19 | C20 | C21 |
| L08 tokens | C22 | C23 | C24 |
| L09 cuestionario | C25 | C26 | C27 |
| L10 resultados | C28 | C29 | C30 |
| L11 login `_2` | C31 | C32 | C33 |
| L12 login `_3` (duplicado de L11) | C34 | C35 | C36 |

Cada `Cxx` debe guardar la captura de la fuente y la captura Next en un directorio único de fixtures visuales, con viewport, ruta, commit, fuente y estado declarados. El diff determinista por pareja debe ser `<= 1.0%` de píxeles; copy, DOM, tokens, color, iconografía, SVG, breakpoints e interacción no tienen tolerancia de sustitución. Una captura ausente, una fuente inválida o un diff no ejecutado es `PENDIENTE`, nunca `PASS`. Cuando L11 y L12 sean el mismo HTML, se conservan las 36 celdas y se prueba la duplicación explícitamente, sin inventar una tercera pantalla.
21. Para cada `Cxx`, las animaciones, caret y foco se desactivan solo durante la captura; la accesibilidad se verifica por separado. La captura no puede usar máscaras para copy, layout, color, iconos o SVG. Solo se admite una máscara documentada para contenido necesariamente variable y esa máscara no puede cubrir una decisión de diseño ni convertir una diferencia en PASS.
22. La auditoría de accesibilidad se ejecuta para las doce fuentes/rutas y sus tres viewports: WCAG 2.2 AA, landmarks y heading order, nombre accesible de cada control, foco visible y lógico, teclado incluyendo Enter/Espacio, estados disabled/loading/error anunciados, contraste 4.5:1/3:1, no dependencia exclusiva del color, skip link, `aria-live` sin duplicación y `prefers-reduced-motion`. Un conflicto entre literalidad y accesibilidad se resuelve a favor de accesibilidad y se registra como excepción de literalidad con evidencia.
23. Un test negativo intercepta `fetch`, Axios, XHR, navegación externa y storage en L01–L10 y confirma cero requests/persistencia en render, interacción, navegación y error. Los fixtures mock-only viven exclusivamente en `frontend/test/fixtures/ui-stitch-orbital/**`; no se crean datos paralelos ni contratos implícitos. La única excepción de red es L11/L12 mediante `discordStartUrl`, `fetchMe`, logout, cookies y `returnTo` seguro ya existentes.
24. Discord sigue siendo la única integración real: el CTA debe invocar exactamente el helper/contrato actual y sus pruebas cubren anónimo, loading, autenticado, logout, error de sesión y `returnTo` externo rechazado. El formulario correo/contraseña y modo invitado de L11/L12 son markup/presentación no operativa: no tienen handler de autenticación, no llaman endpoint, no crean sesión y no alteran el contrato. GitHub, tokens, progreso, checkpoint, replanificación, recomendaciones y cuestionario permanecen mock-only incluso cuando un control se rotula “copiar”, “compartir”, “revocar”, “aceptar” o “completar”.
25. Los datos fuente no verificables se documentan literalmente como `null`, placeholder explícito o “no disponible”: `login_inicia_sesi_n_en_tu_misi_n_1/screen.png` no tiene `code.html`; los PNG declarados como texto no son evidencia visual válida; L11/L12 son duplicados; `{fecha}` no es una fecha verificable; el endpoint/token del mock no es contrato ni secreto utilizable; cantidades, IDs, URLs y resultados de ejemplo no se convierten en datos de producción. El verify debe listar estas limitaciones y no marcarlas como PASS.

### Criterios específicos de Fase 1

1. `/` renderiza el hero, radar, cuatro puertas y CTA Orbital en anónimo, autenticado e hidratando.
2. El CTA de configurador navega a una superficie frontend definida sin afirmar que exista un endpoint.
3. `HomeAuthStatus` conserva la semántica de la sesión existente y no muestra datos de usuario mientras el hydrator está pendiente.
4. Existe test de caracterización de la home anterior a la modificación y tests de los tres estados de sesión.
5. La captura de `/` en 1280 px conserva la composición Stitch: hero, radar, cuatro puertas y CTA en el mismo orden; cualquier diferencia geométrica de los bloques principales es de hasta 8 px y el radar tiene alternativa textual accesible.

### Criterios específicos de Fase 2

1. `/login` ofrece Discord como único método operativo; no existen campos operativos de correo/contraseña ni modo invitado.
2. El click de Discord usa exactamente el helper/contrato existente y conserva un `returnTo` seguro; un `returnTo` externo no se navega.
3. Se verifican loading, fallo de inicio, sesión ya autenticada, logout, hydrator fallido y estado anónimo.
4. El frontend mantiene los shapes y endpoints auth existentes; cualquier cambio de servicio auth requiere evidencia contractual previa y queda fuera de esta spec.
5. `/auth/error` cubre razones conocidas y desconocidas y no expone secretos ni detalles internos.
6. La captura de login conserva la jerarquía de Stitch sin activar formulario correo/contraseña ni invitado; el único icono Material Symbols permitido es auxiliar a una acción/estado con nombre textual.

### Criterios específicos de Fase 3

1. El dashboard y el vacío de `/mis-rutas` se obtienen del mismo modelo fixture; cero rutas produce empty y rutas mock produce dashboard.
2. El detalle no es accesible sin estado autenticado; el fixture faltante muestra not-found/error sin inventar ruta.
3. Expandir, colapsar y marcar una sección actualiza solo el estado local del test/render y se reinicia al recargar.
4. Se prueban error de carga, retry visual, controles disabled durante loading y ausencia de requests reales.
5. Dashboard y detalle usan `MissionShell` o justifican su ausencia; sus capturas a 1280 px se comparan con las pantallas Stitch disponibles y sus layouts refluyen sin overflow a 375 y 768 px.

### Criterios específicos de Fase 4

1. El botón de avanzar/confirmar permanece disabled sin selección válida y se habilita con una selección válida.
2. El cuestionario conserva el paso visible y maneja respuesta inválida, fixture ausente, refresh y error simulado sin persistir.
3. Resultados muestra únicamente campos presentes en el fixture; campos desconocidos aparecen como `null`/no disponible.
4. El checkpoint cubre selección, disabled inicial, confirmación, error simulado, retry y anuncio accesible del resultado.
5. El cuestionario, resultados y checkpoint no invocan requests aunque cambien de paso o estado; el único flujo externo permitido sigue siendo Discord fuera de estas pantallas.

### Criterios específicos de Fase 5

1. Antes/Después y razones se renderizan desde fixture; la fecha no verificable no se rellena con un valor plausible.
2. Mantener y Aceptar tienen estados disabled/loading/éxito/error locales y ninguna de las acciones hace request o persiste.

### Criterios específicos de Fase 6

1. Copiar y compartir tienen tests de éxito, API ausente, permiso denegado y feedback accesible.
2. El contenido copiable no contiene endpoint ficticio, token, secreto ni URL no verificada.
3. No se inicia ninguna integración OAuth o request a GitHub.

### Criterios específicos de Fase 7

1. La pantalla mock no expone secretos reales, almacena tokens ni llama endpoints.
2. Generar/copiar/revocar cubre loading local, éxito visual, error simulado y retry; el token permanece enmascarado.
3. El estado anónimo queda bloqueado y el estado autenticado no se interpreta como autorización real.
4. `NEXT_PUBLIC_ORBITAL_DEMO_SESSION` no permite acceder al panel en test, preview, staging ni producción, aunque esté definido; la pantalla mock no crea una sesión ni hace requests de autenticación.

## Disposición de flujos conectados

Cada flujo identificado en `explore.md` tiene una única disposición:

- `RootLayout` / `globals.css` — **EN SCOPE**. Se cambian layout, fuentes y variables; criterio: los tests de caracterización y la verificación visual global deben confirmar que las rutas existentes y nuevas conservan foco, contraste y responsive.
- `/` `HomePage` + `HomeAuthStatus` — **EN SCOPE**. Se rediseña la home y sus estados de sesión; criterio: tests de anónimo, hidratando y autenticado.
- `/login` `LoginPage` + `LoginPanel` — **EN SCOPE**. Se rediseña la UI sin cambiar Discord ni sus contratos; criterio: tests de loading, éxito, error, logout, usuario autenticado y `returnTo` seguro.
- `/auth/error` `AuthErrorPage` — **EN SCOPE**. Se adapta la presentación Orbital; criterio: tests de razones conocidas/desconocidas sin cambiar el catálogo contractual.
- `AuthSessionHydrator` + `fetchMe` — **EN SCOPE**. Se prueba la frontera que habilita estados globales; criterio: éxito, fallo de sesión y cancelación/unmount, sin convertir el fallo en usuario autenticado.
- Backend `identity` / cookie session — **FUERA DE SCOPE / no afectado**. Evidencia: no se modifica ningún path de `backend/`, endpoint, cookie, guard, shape ni código de sesión; el frontend solo consume el contrato existente.
- `/mis-rutas` dashboard — **EN SCOPE**. Se crea como superficie fixture/mock-only; criterio: datos, loading, empty, error, retry y anónimo.
- `/mis-rutas` estado vacío — **EN SCOPE**. Se deriva del mismo recurso fixture que el dashboard; criterio: cero rutas produce empty sin ruta duplicada.
- `/mis-rutas/[routeId]` detalle — **EN SCOPE**. Se crea detalle visual y estado local efímero; criterio: progreso, acordeón, disabled, error y ausencia de requests/persistencia.
- `/mis-rutas/[routeId]/replanificacion` — **EN SCOPE**. Se crea únicamente mock visual; criterio: Antes/Después y acciones locales sin mutación real.
- `/configurador-de-ruta` cuestionario — **EN SCOPE**. Se crea flujo multi-step local; criterio: selección, disabled, loading/error, teclado y refresh sin persistencia.
- `/configurador-de-ruta/resultados` — **EN SCOPE**. Se crea resultado local desde fixture; criterio: datos válidos, `null`/no disponible y error/empty sin algoritmo real.
- Checkpoint TypeScript — **EN SCOPE**. Se crea interacción mock-only; criterio: selección, disabled, confirmación, error y retry sin registrar progreso.
- Integración GitHub — **EN SCOPE**. Se crea preview local, no integración externa; criterio: copiar/compartir exitoso, API ausente, permiso denegado y contenido sin endpoints/secretos.
- `/ajustes/tokens` — **EN SCOPE**. Se crea preview mock-only; criterio: enmascarado, disabled/anónimo, copiar/revocar/generar local y ninguna credencial real.

## Testing por nivel y segundo eje

- Fases 1 y 2: nivel 2 por lógica de estados y contrato auth. Requieren happy path, errores, loading, logout/redirect, estados borde y test de contrato frontend contra los artefactos/servicio auth existentes. No se cambia el contrato.
- Fase 3: nivel 2 para presentación de rutas mock. No hay concurrencia, BD, persistencia ni mutación real; se declara explícitamente que no aplica test de BD/concurrencia, property-based de invariantes ni recovery de fallo parcial.
- Fase 4: nivel 2 para flujo multi-step/checkpoint mock. Depende del orden de pasos, no de tiempo real ni persistencia: no aplica reloj congelable. No cruza un contrato backend nuevo, no tiene concurrencia y no muta una invariante persistente; esas ausencias deben quedar cubiertas por tests de estados locales.
- Fases 5, 6 y 7: nivel 2 por interacción y errores mock-only. No hay recovery de fallo parcial real, concurrencia, BD ni contrato externo; los errores de clipboard/share se cubren con mocks de capacidades del navegador. Tokens no alcanzan nivel crítico porque no se emiten ni revocan credenciales reales, pero la implementación debe impedir cualquier mutación o exposición accidental.
- Todo flujo mock-only declara explícitamente: sin concurrencia, sin dependencia temporal, sin contrato backend nuevo, sin mutación de invariante persistente y sin recovery de fallo parcial real. Su prueba obligatoria es la ausencia de requests/storage, más los estados locales de error y retry.
- No se define polling ni cron. Por lo tanto, no aplica criterio de queries por corrida, tiempo de corrida ni lock de corridas solapadas.
- No se introduce un requisito de intervalo, latencia o SLA. Las interacciones locales deben responder dentro del ciclo normal de render y la pregunta de negocio “¿qué decisión se rompe si el dato llega más tarde?” no aplica mientras todas las pantallas sean mock-only; cualquier necesidad real futura debe abrir otra spec/propuesta con contrato.

## Riesgos y deuda explícita

- Riesgo alto de regresión global por `layout.tsx` y `globals.css`; se mitiga con Fase 1 reversible, caracterización y verificación visual antes de avanzar.
- El contrato real de learning paths, recomendaciones, progreso, GitHub y tokens sigue desconocido. Queda como deuda explícita: antes de reemplazar cualquier mock por datos reales se debe aprobar contrato, modelo de estados, fixtures de fuente única, autorización, errores y tests.
- El contrato auth existente cruza con backend y cookies. La spec permite solo consumo/rediseño; cualquier cambio de endpoint, shape, cookie o política de auth dispara una nueva spec SDD completa.
- Las rutas canónicas sugeridas para fases nuevas son provisionales. Design debe fijarlas como rutas de UI mock-only sin presentarlas como endpoints.
- Los datos de los mockups no son datos de producción. Se descartan fechas, endpoints, tokens, identificadores y cantidades no verificables en vez de inventarlos.
- La paridad visual tiene límites explícitos: se acepta reflujo distinto al mock en 375/768 px, cambios necesarios para contraste/foco/lectura, y sustitución de elementos no verificables por `null`/no disponible. No se acepta alterar la jerarquía de la pantalla, introducir datos plausibles, romper WCAG AA, usar iconos sin nombre accesible ni cargar recursos de terceros en runtime.
- `Material Symbols Outlined` debe estar disponible como recurso ya incorporado o empaquetado localmente; no se permite un CDN ni una solicitud de red para cargarlo en una pantalla mock-only. Su uso queda limitado a iconos auxiliares, con alternativa textual y sin reemplazar contenido.
- `Discord` es la única frontera externa real de la feature: solo se conservan las llamadas de auth/sesión existentes y sus errores/redirects contractuales. Learning paths, catálogo, assessment, progreso, GitHub, replanificación y tokens no pueden llamar backend, Discord, GitHub ni servicios de terceros.
- La conformidad pixel-perfect puede entrar en tensión con WCAG AA, responsive y reduced motion. Accesibilidad y comportamiento tienen precedencia sobre coincidencia visual literal.
- No se implementa persistencia entre refresh. Si el producto requiere conservar respuestas, progreso, tokens o propuestas, queda deuda aceptada fuera de esta feature y debe planificarse con backend/contrato por separado.

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `specs/ui-stitch-orbital/explore.md`, `specs/ui-stitch-orbital/proposal.md`, `.cursor/skills/nextjs-reference/SKILL.md`, `.cursor/skills/frontend-reference/SKILL.md`, `.cursor/skills/frontend-reference/references/design-language.md`.

Aprobado por dev: PENDIENTE
