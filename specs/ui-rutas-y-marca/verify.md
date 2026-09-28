# Verify — `ui-rutas-y-marca`

> Fase `sdd-verify`. Fecha: 2026-09-27. Alcance: lotes A–E de `tasks.md` contra `spec.md` (CA-1…CA-7), `design.md`, `explore.md` y la constitución (`constitution-codigo.mdc`, `constitution-fases.mdc`).
> Directorio de comandos: `CodeQuest-2026/frontend/` salvo indicación.

## Veredicto

**PASS con observaciones.** Ningún CA falla por el código de este ciclo. Hay dos bloqueos preexistentes o de herramienta que impiden sellar CA-7.1 completo (type check / `next build` rojos por un test de auth que no se tocó; sin script de lint), y el gate visual en navegador queda **PENDIENTE_ORQUESTADOR** antes de archivar.

CA fallidos: **ninguno**. CA con ⚠️: CA-7.1 (bloqueo preexistente + lint sin script), CA-3.2 (la parte de "compila como ruta dinámica" no se pudo observar porque el build corta en el type check), CA-5.6/CA-5.9 (la parte visual en 375 px queda pendiente del navegador).

## Gates deterministas (evidencia)

### Recibo SDD — ⚠️ NO EJECUTADO
`npm run sdd:verify` **no existe** en `frontend/package.json` ni en el `package.json` raíz (declarado en `tasks.md` §Supuestos). Sustituto acordado en tasks: suite + typecheck corridos a mano, abajo.

### Suite — ✅
```
$ cd CodeQuest-2026/frontend && npx vitest run
 Test Files  54 passed (54)
      Tests  249 passed (249)
   Duration  36.87s
EXIT=0
```
Incluye (verdes): `LearningPathsDashboard.test.tsx`, `MyRouteStatus.test.tsx`, `route-errors.test.ts` (14), `configurator-deep-link.test.ts` (11), `errors.test.ts` (8), `api-auth-policy.test.ts` (3), `brand-assets.test.ts`, `landing-doors.test.ts` (4), `configurator-page.static.test.ts`, `landing.test.tsx`, `landing-copy.test.tsx`, `copy-voice.static.test.ts` (16), `tokens.static.test.ts`, `shell-chrome.static.test.ts`, `fase-0/dom.test.tsx`, `mobile-nav.test.tsx`, `header-responsive.characterization.test.ts`, `routes-dom.test.tsx`, `official-paths.test.ts`, `StackIcon.test.tsx`, `load-my-routes.test.ts`, `login.test.tsx`, `demo-session.test.ts`, `configurator-layout.static.test.ts`.

### Typecheck — ⚠️ ROJO PREEXISTENTE (no es regresión)
```
$ cd CodeQuest-2026/frontend && npx tsc --noEmit
test/src/features/auth/lib/local-session.test.ts(14,7): error TS2352: Conversion of type '{ getItem: ...; setItem: ...; removeItem: ... }' to type 'Storage' may be a mistake ...
EXIT=2
```
Único error. En esta corrida `.next/types/validator.ts` **no** reportó error (el orquestador lo había listado como conocido). Por qué no es regresión:
```
$ git status --short -- frontend/test/src/features/auth/lib/local-session.test.ts   → (vacío, sin cambios)
$ git log -1 --format='%h %s' -- frontend/test/src/features/auth/lib/local-session.test.ts
dd5b38c fix: mandar la sesión local con el JWT que ya firma el login
$ git status --short -- frontend/tsconfig.json frontend/next.config.ts frontend/src/features/auth/lib/   → (vacío)
$ git diff -- frontend/package.json   → solo +"lucide-react": "1.48.0" (ciclo ui-devtalles-polish; no cambia TypeScript)
```
El error depende solo de ese archivo (fuera de scope, `features/auth/**`) y de `lib.dom`; ninguno cambió. Sin `any`/casts nuevos en el diff de este ciclo (el único `as` de `lib/errors.ts:22` es preexistente).

### Build — ⚠️ ROJO PREEXISTENTE (mismo error)
```
$ cd CodeQuest-2026/frontend && npm run build
▲ Next.js 16.3.5 (Turbopack)
✓ Compiled successfully in 798ms
  Running TypeScript ...
test/src/features/auth/lib/local-session.test.ts(14,7): error TS2352: ...
Failed to type check.
EXIT=1
```
Compila; corta en el type check por el mismo archivo. Consecuencia: no se imprime la tabla de rutas, así que "`/configurador-de-ruta` compila como ruta dinámica" (CA-7.1 / CA-3.2) **no se pudo observar**. Arreglo fuera de scope (auth) → sesión aparte; no se tocó.

### Lint — ⚠️ NO EJECUTADO
Sin script `lint` en el repo (declarado en `tasks.md` E7). No se inventó comando.

### Token-lint — ⚠️ PARCIAL
No hay `stylelint`. El respaldo existente es `tokens.static.test.ts` (verde), que policía hex/`rgb()` en la lista `TOKENIZED_CSS`; ahora incluye `SignInLink.module.css` y `LearningPathsEmptyState.module.css`. No policía literales de spacing/tipografía (`0.875rem`, `2.75rem`, `1.5rem`). Recomendación (una vez): un token-lint real (`stylelint` con `declaration-strict-value`) es lo único que convierte "cero literales" en gate.

### Validador de dirección de dependencias — ⚠️ NO CONFIGURADO en `frontend/`
Recomendación (una vez): `dependency-cruiser` o `eslint-plugin-boundaries` para el frontend.

### Grep estático complementario — ✅
```
$ grep -nE '\b13\b|<svg' src/features/learning-paths/components/MyRouteStatus.tsx          → sin coincidencias
$ grep -rn '/devtalles-brand/' src                                                          → solo src/config/brand-assets.ts:2,3
$ grep -niE 'code\s*quest|footerCredit|•' MissionShell.tsx MissionShell.module.css          → sin coincidencias
$ grep -rn 'Por el momento no hay ruta' src                                                 → sin coincidencias
$ grep -nE 'use client|useSearchParams' "src/app/(producto)/configurador-de-ruta/page.tsx"  → sin coincidencias
$ grep -nE 'console\.(log|debug)|dangerouslySetInnerHTML|innerHTML' <archivos tocados>      → sin coincidencias
$ grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' <5 módulos CSS tocados>                            → sin coincidencias
```

### sha256 de SVG vendorizados (CA-5.2) — ✅
```
$ sha256sum "DEVTALLES-PAQUETES DE ELEMENTOS/SVG/ISOLOGO COLOR.svg" CodeQuest-2026/frontend/public/devtalles-brand/isologo-color.svg \
            "DEVTALLES-PAQUETES DE ELEMENTOS/SVG/DEVI HELLO BORDER.svg" CodeQuest-2026/frontend/public/devtalles-brand/devi-hello.svg
4d8019b7d1c40da5c05d6690e871aaed815eac8dfde2a903655664bbf138faab  ISOLOGO COLOR.svg
4d8019b7d1c40da5c05d6690e871aaed815eac8dfde2a903655664bbf138faab  isologo-color.svg
80af2c089123f3b265737226152f014582b19dd7791779f04a63d9db008ab259  DEVI HELLO BORDER.svg
80af2c089123f3b265737226152f014582b19dd7791779f04a63d9db008ab259  devi-hello.svg
```
Idénticos byte a byte. `public/devtalles-brand/` contiene solo esos dos archivos.

## Criterios de aceptación

| CA | Estado | Evidencia |
|---|---|---|
| CA-1.1 | ✅ | `LearningPathsDashboard.tsx:53-60` (sección `aria-labelledby="session-required-title"`, `SignInLink returnTo="/mis-rutas"`); test "shows a sign-in state without alert or retry when loading returns 401" verde (`href === discordStartUrl("/mis-rutas")`, sin alert, sin Reintentar). |
| CA-1.2 | ✅ (obs. O-1) | `it.each` network error / 503 verde: alert + "No pudimos cargar tus rutas" + Reintentar, `load` ×2, sin botón habilitado durante la carga. |
| CA-1.3 | ✅ | Test "shows the empty state without alert or sign-in" verde. |
| CA-1.4 | ✅ | Test "shows the saved route title and progress…" intacto y verde (los otros 2 del grupo vienen del ciclo previo, D-8). |
| CA-1.5 | ✅ | Test "moves to the sign-in state when the retry returns 401" verde. |
| CA-2.1 | ✅ | `MyRouteStatus.tsx:97-102`; test "shows a sign-in notice without alert or retry…" verde (`discordStartUrl("/configurador-de-ruta")`). |
| CA-2.2 | ✅ | `MyRouteStatus.tsx:103-118` (`attempt`/`retrying`/`active`); test verifica `loadRoutes` ×2 y `"Reintentando…"` con `disabled === true`. |
| CA-2.3 | ✅ | `MyRouteStatus.tsx:119-121` "Todavía no creaste ninguna ruta."; grep confirma que el copy viejo desapareció; test estático "no longer uses the old empty copy". |
| CA-2.4 | ✅ | `MyRouteStatus.tsx:196-202`; test "asks to sign in when creating the route returns 401" verde. |
| CA-2.5 | ✅ | `route-errors.ts:13` (503 + `apiErrorCode === "CATALOG_UNAVAILABLE"`); test con `toBe` exacto verde. |
| CA-2.6 | ✅ | `it.each` 503 sin code / 422 / 400 / red → exactamente "No se pudo crear la ruta.". |
| CA-2.7 | ✅ | Feedback con `role="alert"`; test "clears the create feedback and adds the route when a retry succeeds" (`createOfficial` ×2, alert limpio). |
| CA-2.8 | ✅ | Tests existentes verdes; asserts reescritos solo en `:31,65,47,70` según §Asserts (diff verificado). El cambio del test MCP ("video placeholder") viene de `ui-devtalles-polish` (D-8). |
| CA-3.1 | ✅ | `landing.fixture.ts:45,54,63,72`; `landing-doors.test.ts` (hrefs exactos + cada `path` ∈ `OFFICIAL_PATHS`). |
| CA-3.2 | ✅ estático / ⚠️ build | `configurador-de-ruta/page.tsx:14-20` async, `await searchParams`, sin `"use client"`/`useSearchParams`; `configurator-page.static.test.ts` verde. Ruta dinámica en build: no observable (bloqueo preexistente). |
| CA-3.3 | ✅ | `configurator-deep-link.ts:11-21` allowlist exacta; 11 casos verdes (válido, desconocido, `../x`, `""`, `mcp`, `FORM`, array, ausente). |
| CA-3.4 | ✅ | Test "opens the form with the path preselected from the deep link props" → trigger `"React"`; tests sin props sin cambios. |
| CA-3.5 | ✅ | `landing.test.tsx` y `landing-copy.test.tsx` verdes (CTA sin query, sin fetch/axios/storage/useRouter). |
| CA-3.6 | ✅ | `unknown`: `stackPathId: null`, metadata `["Nivel","Inicial"]`, copy menciona Fundamentos y MCP; `copy-voice.static.test.ts` verde; test D5 sin icono en `unknown`. |
| CA-4.1 | ✅ | `ChevronDown` Lucide con `strokeWidth={CHROME_ICON_STROKE_WIDTH}` y `aria-hidden`; rotación 180° en `[aria-expanded="true"]` con `--orbital-motion-fast` = `160ms cubic-bezier(0.23, 1, 0.32, 1)` (< 300 ms, curva propia); sin `<svg` a mano. |
| CA-4.2 | ✅ | `#path-choice-hint` siempre visible con `{OFFICIAL_PATHS.length}`; test lo verifica; test estático sin literal `13`. |
| CA-4.3 | ✅ | `aria-describedby="path-choice-hint"`, `aria-haspopup="listbox"`, `aria-expanded` false→true verificados en test. |
| CA-4.4 | ✅ | `shell-chrome.static.test.ts:13,21` incluye `ChevronDown`; verde. |
| CA-4.5 | ✅ | Estilos nuevos (`.notice`, `.retry`, `.chevron`, `.pickerHint`, `.formFeedback`) solo con `var(--orbital-*)`; `tokens.static.test.ts` verde. |
| CA-5.1 | ✅ | `dom.test.tsx` product y login: `not.toMatch(/code\s*quest/i)`, footer "DevTalles" sin `•`; `.footerCredit` borrado (grep). |
| CA-5.2 | ✅ | sha256 idénticos (arriba). |
| CA-5.3 | ✅ | `brand-assets.test.ts` (fuente única + archivos existen); grep. |
| CA-5.4 | ✅ | `brand-assets.test.ts` "vendors the brand SVG as inert files" verde. |
| CA-5.5 | ✅ | Uso solo como `<img>` con `width`/`height` (`MissionShell.tsx:28,60,82`, `LearningPathsEmptyState.tsx:9`); `landing.test.tsx` (`svg circle` = 12) verde. |
| CA-5.6 | ✅ estático / ⏳ visual | Isologo `alt=""` en ambos headers dentro del link `aria-label="DevTalles, inicio"`, `.brandMark` 2rem; `header-responsive` sin cambios y verde; `mobile-nav.test.tsx` verde con asserts `4rem`/`nowrap` intactos (sus otros cambios son del ciclo previo, D-8). 375 px en navegador: PENDIENTE_ORQUESTADOR. |
| CA-5.7 | ✅ | DEVI `<img alt="">` reemplaza el radar; `routes-dom.test.tsx:81` reescrito según spec. |
| CA-5.8 | ✅ | `page.tsx:132-135` `StackIcon size="md"` si `stackPathId`; test compara `src` con `officialPathIconSrc`. |
| CA-5.9 | ✅ estático / ⏳ visual | `ul[aria-label="Tecnologías de las rutas oficiales"]` con `OFFICIAL_PATHS.length` iconos y `standaloneLabel`; `.stackStrip { flex-wrap: wrap }` con test estático. Sin scroll horizontal en 375 px: PENDIENTE_ORQUESTADOR. |
| CA-5.10 | ✅ (ajustado por D-9) | Módulos nuevos en `TOKENIZED_CSS`; `LearningPathsDashboard.module.css` solo pierde reglas (D-9 aprobada en design). |
| CA-6.1 | ✅ | `api-auth-policy.test.ts` (3) verde; `lib/axios.ts` sin cambios (no aparece en `git status`). |
| CA-6.2 | ✅ | `errors.test.ts` (8): `asApiError` 4 casos + `apiErrorCode` (string / sin code / no-string / no-objeto). |
| CA-6.3 | ✅ | `copy-voice.static.test.ts:23-24` agrega `LearningPathsDashboard.tsx` y `SignInLink.tsx`; verde. |
| CA-7.1 | ⚠️ | Vitest ✅; typecheck y build rojos **solo** por el error preexistente de `local-session.test.ts:14`; lint sin script. No es regresión de este ciclo. |

## Constitución

- **Arquitectura / separación** ✅ — Clasificación de errores en función pura (`route-errors.ts`) sin copy ni lectura de `useAuthStore`; saneo del deep link en función pura; page es Server Component. Los componentes reciben los loaders inyectados (patrón existente); `SignInLink` solo importa el constructor de URL `discordStartUrl`, no un cliente HTTP.
- **Calidad** ✅ — Sin `console.log`, sin código comentado (grep). Los 2 comentarios nuevos explican el porqué (`configurator-deep-link.ts:10`, `landing.fixture.ts:9`).
- **Errores (contrato)** ✅ con deuda — El `switch` es sobre `statusCode` + `code`, nunca sobre texto; el copy vive en el componente por clasificación. El backend no emite RFC 9457 ni `correlationId` → **D-3 aceptada** (fixtures copiados del shape de `AllExceptionsFilter`, marcados en el test).
- **Seguridad** ✅ — IDOR/BFLA no aplican (sin endpoints nuevos). Input no confiable = query de URL → allowlist exacta (CA-3.3). `returnTo` es literal de la app. SVG de marca inertes (test). Sin `innerHTML`. No hay señales situacionales nuevas (sin cookies, uploads ni llamadas externas nuevas).
- **Scope / flujos conectados** ✅ — EN SCOPE con test corrido ahora: `mapApiResponseError` (CA-6.1), `asApiError` (CA-6.2), `LearningPathsDashboard`, `LearningPathsEmptyState`, `MyRouteStatus`, `configurador-de-ruta/page.tsx`, landing + fixture, `MissionShell` — todos verdes. FUERA DE SCOPE confirmados sin tocar en este ciclo: `lib/axios.ts`, `tsconfig`, `features/auth/lib/**` sin cambios; `official-paths.ts`/`StackIcon` reusados sin cambiar firma (`official-paths.test.ts`, `StackIcon.test.tsx` verdes). ⚠️ Por la mezcla D-8, `git status` muestra cambios en `load-my-routes.ts`, `subscribe-learning-paths.ts`, `LivePathModal.tsx`, `ShellAccount.tsx`, `LoginPanel.tsx` y `backend/**`, que pertenecen al ciclo `ui-devtalles-polish` u otros, no a este; no se pueden separar por diff sin commit previo.
- **Runtime de endpoints** — N/A: este ciclo no toca rutas, handlers ni queries (solo frontend).
- **Infra de tests / BD** — N/A: sin tests de integración, contenedores ni migraciones.
- **Testing** ✅ — Nivel 2 en los flujos con lógica: 401 / red / 5xx / vacío / reintento→401 (dashboard y configurador), submit 401 / 503+code / 503 sin code / 422 / 400 / red, saneo con 7 inválidos. Caracterización previa presente (A1, A2, A5, A8). No es camino crítico → segundo eje y mutation no aplican (declarado en spec). **Asserts no debilitados**: los reescritos coinciden con la tabla §Asserts de la spec; la aserción del footer se reemplazó por la inversa más fuerte.

## Frontend

1. **Seguridad frontend** ✅ — sin HTML crudo; assets como `<img>`; SVG inertes.
2. **Accesibilidad AA** ✅ estático — sección con `aria-labelledby` en sin sesión; `role="alert"` solo en errores; picker con `aria-describedby`/`aria-expanded`/`aria-haspopup`; iconos decorativos `aria-hidden`/`alt=""`; franja con nombre accesible por icono dentro de `ul` etiquetado; focus ring global (`globals.css:140-142`). Contraste AA de `StackIcon md` sobre `.door` y del hint `--orbital-ink-muted`: **PENDIENTE_ORQUESTADOR** (herramienta en navegador). Teclado completo del listbox → D-5.
3. **Separación** ✅ — ver Arquitectura.
4. **Doble submit** ✅ — "Crear ruta" deshabilitado con `saving`; "Reintentar" deshabilitado en el configurador; en el dashboard el botón desaparece durante la carga (O-1).
5. **Componentes de datos** ✅ — sin colecciones nuevas; `OFFICIAL_PATHS` es cerrada (13 ítems). La lista de rutas del usuario no se pagina (preexistente, fuera de scope).
6. **Lenguaje visual** — modo **conformidad**. ✅ estático: `.retry` se sumó a los grupos existentes de botón (reusa hover/active/disabled); `SignInLink` replica `.authButtonPrimary`; chevron con motion propio < 300 ms; reduced-motion en `.retry`, `.chevron`, `.action`; tokens existentes en todo lo nuevo; superficies del navegador tematizadas en `globals.css` (selección, caret, scrollbar, focus). ⏳ **PENDIENTE_ORQUESTADOR**: revisión en navegador a 375 / 768 / 1280 px del header con isologo (sin salto de línea), franja de 13 iconos envolviendo sin scroll horizontal, contraste de iconos en puertas, DEVI en `/mis-rutas` vacío y estados sin sesión/error en ambas pantallas.

## Observaciones (no bloquean)

- **O-1** `LearningPathsDashboard`: al hacer clic en "Reintentar" el estado pasa a `loading` y el botón se desmonta, así que el estado `retrying` y la etiqueta "Reintentando…" nunca se ven. El doble clic está evitado igual, pero el assert `enabledRetry(...) === undefined` del test pasa porque el botón no existe, no porque esté deshabilitado. Es el comportamiento que fijó la caracterización A5 (preexistente). Si se quiere el texto literal de CA-1.2 ("el botón queda deshabilitado mientras carga"), habría que no volver a `loading`, como hace el configurador.
- **O-2** Bloqueo preexistente de type check / build en `test/src/features/auth/lib/local-session.test.ts:14` (TS2352). Hasta que se arregle en una sesión de auth, CA-7.1 no puede quedar verde completo en ningún ciclo.
- **O-3** Hueco de herramientas: sin `lint`, sin `sdd:verify`, sin token-lint real ni validador de dependencias en `frontend/`. Recomendados una vez (arriba).
- **O-4** `page.tsx` de la landing usa `✦` (unicode) como adorno con `aria-hidden` en los eyebrows y el protocolo. Es preexistente y no lo tocó este ciclo, pero choca con el piso "nunca unicode como icono".
- **O-5** Mezcla D-8 aceptada: el diff incluye cambios del ciclo `ui-devtalles-polish` (p. ej. Login→Entrar en `dom.test.tsx` y `mobile-nav.test.tsx`, test MCP). Se verificaron contra su propia spec solo en lo que se cruza con esta.

## Pendiente antes de archivar

- ⏳ Gate visual en navegador (375 / 768 / 1280 px) — PENDIENTE_ORQUESTADOR.
- 🔔 El dev decide si acepta CA-7.1 con el bloqueo preexistente O-2 declarado como deuda.

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `.cursor/rules/constitution-codigo.mdc`, `.cursor/rules/frontend-layers.mdc` (adjunta por glob), `specs/ui-rutas-y-marca/spec.md`, `specs/ui-rutas-y-marca/tasks.md`, código y tests de los paths en scope.

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
Lectura: .cursor/rules/constitution-fases.mdc e3160314
