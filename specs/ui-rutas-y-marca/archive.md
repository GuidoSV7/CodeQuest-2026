# Archive — `ui-rutas-y-marca`

> Fase `sdd-archive`. Fecha: 2026-09-27. Base: `spec.md` (CA-1…CA-7), `design.md`, `tasks.md` (Unidades 1–11), `verify.md` (PASS con observaciones) y gate visual hecho por el orquestador en navegador.
> **Sin commits** (pedido explícito del dev). La carpeta **no** se movió a `specs/_done/` todavía: la spec sigue sin sellar (ver §Pendiente del dev).

## Qué cambió

Solo frontend (`CodeQuest-2026/frontend/`). Sin endpoints, sin BD, sin cambios en `lib/axios.ts`, `tsconfig` ni `features/auth/lib/**`.

1. **Errores de carga clasificados** — `lib/errors.ts` suma `apiErrorCode`; nuevo `features/learning-paths/lib/route-errors.ts` (función pura sobre `statusCode` + `code`, nunca sobre texto).
2. **`/mis-rutas` sin sesión** — `LearningPathsDashboard` distingue 401 ("Entrá para ver tus rutas" + CTA `SignInLink` a `discordStartUrl("/mis-rutas")`), error de red/5xx ("No pudimos cargar tus rutas" + Reintentar) y vacío (DEVI en `LearningPathsEmptyState`).
3. **Configurador** — `MyRouteStatus`: estados sin sesión / error + reintentar / vacío ("Todavía no creaste ninguna ruta."); errores al crear ruta tipados (401 → pedir sesión, 503 + `CATALOG_UNAVAILABLE` → mensaje propio, resto → "No se pudo crear la ruta.").
4. **Deep link landing → configurador** — `configurador-de-ruta/page.tsx` pasa a Server Component async que lee `searchParams`; `configurator-deep-link.ts` sanea `panel`/`path` con allowlist exacta contra `OFFICIAL_PATHS`. Las puertas start/switch/specialize de la landing enlazan con `?panel=form&path=…`; `unknown` no preselecciona.
5. **Picker** — chevron Lucide (`ChevronDown`, rotación 160 ms) y hint siempre visible con `OFFICIAL_PATHS.length`, enlazado por `aria-describedby`.
6. **Marca DevTalles-only** — isologo y DEVI vendorizados en `public/devtalles-brand/` (sha256 idéntico al paquete), fuente única `config/brand-assets.ts`; `MissionShell` sin "Code Quest" ni `•`; isologo en ambos headers.
7. **Iconos de stack en la landing** — `StackIcon size="md"` en las puertas con `stackPathId`; franja accesible con los 13 iconos que envuelve (`flex-wrap`).
8. **Guardias estáticas extendidas** — `tokens.static.test.ts`, `copy-voice.static.test.ts`, `shell-chrome.static.test.ts`, `brand-assets.test.ts`.

## Por qué

- Un 401 se mostraba como error genérico y el usuario no sabía que tenía que entrar; red caída y sesión ausente necesitan salidas distintas (reintentar vs. entrar).
- Las puertas de la landing no llevaban a la ruta elegida: el usuario tenía que volver a buscarla en el formulario.
- El picker no parecía desplegable y no decía cuántas rutas había.
- La marca mezclaba "Code Quest" con DevTalles; el producto se presenta solo como DevTalles.

## Cómo probarlo

### Automático (desde `CodeQuest-2026/frontend/`)

```bash
npx vitest run        # 54 archivos / 249 tests verdes (verify.md)
npx tsc --noEmit      # ROJO preexistente: solo local-session.test.ts:14 (ver D-10)
```

### Manual en navegador (hecho por el orquestador; dev server `localhost:3000`, backend `:3001` apagado)

| # | Paso | Resultado observado |
|---|---|---|
| a | Landing a 1280 px | Isologo en header; iconos de stack en puertas start/switch/specialize; `unknown` sin icono. ✅ |
| b | `/configurador-de-ruta?panel=form&path=programas-react` | Abre el formulario con React preseleccionado, chevron visible, hint "Lista desplegable con 13 rutas oficiales…". ✅ |
| c | `/mis-rutas` con backend apagado | Tras el timeout de 30 s: "No pudimos cargar tus rutas" + Reintentar (correcto: red caída, no 401). ✅ |
| d | 375 px | Sin overflow horizontal (`scrollWidth` 375); franja de 13 iconos en 2 líneas; 2 imágenes de marca; shell sin "Code Quest". ✅ |

### No verificado en navegador (queda para el dev)

- **Estado 401** "Entrá para ver tus rutas" en `/mis-rutas` y en el configurador: levantar backend `:3001` sin sesión y abrir ambas pantallas. Cubierto por tests (CA-1.1, CA-2.1), no observado en vivo.
- **DEVI en vacío** de `/mis-rutas`: requiere sesión real sin rutas. Cubierto por test (CA-5.7).
- Contraste AA de `StackIcon md` sobre `.door` y del hint `--orbital-ink-muted`: sin medición con herramienta.

## Deuda explícita

De `spec.md` (aceptada en el checkpoint):

- **D-1** `demo-session.ts` ignora `NEXT_PUBLIC_ORBITAL_DEMO_SESSION`: `ShellAccount` muestra avatar demo aunque el API responda 401. Sesión SDD de auth aparte (riesgo ALTO).
- **D-2** SSE `/api/me/learning-paths/events` y WebSocket `/live` sin Bearer: no autentican en localhost y fallan en silencio.
- **D-3** El backend no emite RFC 9457 ni hay contrato compartido del shape de error; si cambia `AllExceptionsFilter`, el mapeo 401/`CATALOG_UNAVAILABLE` se rompe sin que una suite lo vea.
- **D-4** Gate `sdd.paths.json`: globs anclados a la raíz, no matchean `CodeQuest-2026/frontend/src/**` ni `backend/src/**` → ninguna señal dispara en este monorepo. Ciclo propio.
- **D-5** Listbox del picker sin teclado completo (flechas, Home/End, Escape, foco al abrir).
- **D-6** Licencia de uso de isologo y DEVI sin declarar.
- **D-7** Portadas de curso: verificación manual.
- **D-8** Mezcla sin commitear con `ui-devtalles-polish` (y cambios de `backend/**`, `load-my-routes.ts`, `subscribe-learning-paths.ts`, `LivePathModal.tsx`, `ShellAccount.tsx`, `LoginPanel.tsx`): el diff de este ciclo no se puede aislar por `git diff`.
- **D-9** (design) Tokens heredados en `LearningPathsDashboard.module.css`: el archivo solo perdió reglas, no se tokenizó; no está en `TOKENIZED_CSS`.

Surgida en verify / cierre:

- **D-10** `next build` y `tsc --noEmit` rojos por TS2352 preexistente en `test/src/features/auth/lib/local-session.test.ts:14` (no modificado; último commit `dd5b38c`). CA-7.1 no puede quedar verde completo hasta arreglarlo en sesión de auth. Consecuencia: "`/configurador-de-ruta` compila como ruta dinámica" (CA-3.2) no se observó en la tabla de build.
- **D-11** Sin scripts `lint` ni `sdd:verify`; sin token-lint real (`stylelint`) ni validador de dependencias en `frontend/`.
- **D-12** Spec sin sellar: el gate no tiene aprobación registrada.
- **O-1** (verify) En `LearningPathsDashboard`, "Reintentando…" nunca se ve: al reintentar vuelve a `loading` y el botón se desmonta. El doble clic está evitado, pero no por `disabled`.
- **O-4** (verify, preexistente) `✦` unicode como adorno en la landing, choca con "nunca unicode como icono".
- **Observación (no pedida)** El timeout de axios de 30 s hace que "Cargando" dure 30 s con backend caído antes de mostrar el error. No se tocó `lib/axios.ts` (fuera de scope); decidir en un ciclo propio.

## Commits y tamaño del PR

- `git log --oneline -5` en `CodeQuest-2026/`: el último commit es `0d1a541` (ciclo anterior). **Ninguna de las 11 unidades de `tasks.md` tiene commit** — hallazgo, consistente con el pedido "sin commits" pero no cumple la regla de un commit por unidad.
- Working tree: 58 archivos modificados, +1432/−620 (más archivos nuevos sin trackear: SVG, `config/*`, `SignInLink`, `StackIcon`, `route-errors`, `configurator-deep-link`, tests). Incluye la mezcla D-8. Pronóstico de `tasks.md` solo para este ciclo: ~1840 líneas.
- **Supera 400 líneas → recomiendo PRs encadenados.** Antes, commitear/aislar `ui-devtalles-polish` (D-8), si no ningún PR queda limpio.

| PR | Unidades | Base | Depende de | Fuera de scope |
|---|---|---|---|---|
| #1 | 1–3 (helpers de error, `/mis-rutas` sin sesión, estados del configurador) | rama feature | `ui-devtalles-polish` commiteado | marca, landing |
| #2 | 4–6 (deep link, picker, errores al crear) | rama de #1 | #1 | marca |
| #3 | 7–8 (assets vendorizados, shell DevTalles, DEVI) | rama de #2 | #2 (DEVI vive en el vacío de #1) | iconos landing |
| #4 | 9–10 (StackIcon en landing, guardias estáticas) | rama de #3 | #3 | — |

### Commits sugeridos (uno por unidad, con sus tests adentro)

```
test(learning-paths): fijar el manejo actual de errores de carga
feat(learning-paths): pedir entrar en mis rutas cuando no hay sesión
feat(learning-paths): distinguir sin sesión, error y vacío en el configurador
feat(configurador): preseleccionar la ruta desde las puertas de la landing
feat(configurador): mostrar chevron y ayuda en el selector de rutas
feat(configurador): explicar por qué no se pudo crear la ruta
chore(brand): vendorizar isologo y DEVI con fuente única
feat(shell): mostrar solo la marca DevTalles con isologo
feat(landing): mostrar el icono de cada ruta en puertas y franja
test(static): cubrir los nuevos estilos, copy e iconos en las guardias
docs(specs): cerrar ui-rutas-y-marca
```

El último debe incluir `git mv specs/ui-rutas-y-marca specs/_done/ui-rutas-y-marca` (crear `specs/_done/` si no existe).

### Revisión de lo que no debe ir al commit

- `frontend/.env` y `backend/.env` no aparecen en `git status` (ignorados). Mantenerlos fuera.
- Sin `console.log`, `dangerouslySetInnerHTML` ni código comentado en los archivos tocados (grep de verify).
- `package-lock.json` y `frontend/package-lock.json` modificados por `lucide-react` (ciclo `ui-devtalles-polish`): van con ese ciclo, no con este.

## Pendiente del dev (en orden)

1. Sellar la spec: `node .cursor/scripts/sdd/sdd-gate.mjs approve specs/ui-rutas-y-marca` (desde la raíz; tener presente D-4).
2. Decidir si acepta CA-7.1 con D-10 como deuda.
3. Probar en vivo el estado 401 y DEVI en vacío (§No verificado).
4. Aislar/commitear `ui-devtalles-polish` y luego commitear por unidad según la tabla.
5. Mover la carpeta a `specs/_done/` en el commit de cierre.
