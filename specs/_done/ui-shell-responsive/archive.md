# Archive — `ui-shell-responsive`

**Fecha:** 2026-09-22  
**Veredicto verify:** PASS (browser 375/768/1280 orquestador ✅)  
**Estado de cierre:** artefactos movidos a `specs/_done/ui-shell-responsive/`

---

## Qué cambió

Composición App Router del chrome Orbital + responsive alineado a Stitch, sin tocar contratos Discord/auth ni backend.

1. **Route groups**
   - Root `app/layout.tsx`: solo `html` / fuentes / providers / `{children}` — **sin** `MissionShell`.
   - `(producto)/layout.tsx`: un `MissionShell` product para `/`, `/mis-rutas/**`, `/configurador-de-ruta/**`, `/ajustes/**`.
   - `(acceso)/layout.tsx`: un `MissionShell variant="login"` para `/login` y `/auth/error`.
   - URLs públicas sin cambio (grupos `()`).

2. **Un solo chrome**
   - Login deja de montar `MissionShell`; se eliminó el parche CSS `:has(#login-content)`.
   - Exactamente un `<header>` y un `<footer>` de shell en rutas de acceso (anti-doble-shell).

3. **Menú móvil (product, ~48rem)**
   - Isla cliente `MissionShellMobileNav`: disclosure in-flow, 3 destinos, teclado/Escape/foco, avatar visible, sin segunda barra `fixed`.
   - Header product: altura **4rem**, una línea, breakpoint mobile-first **48rem**.

4. **Landing breakpoints**
   - LOC (`.location`) oculto bajo `md` (~48rem).
   - `.doorGrid` mobile-first: **1 / 2@48rem / 4@64rem**.

5. **Tests**
   - Foundation (`ui.shell.not_in_root` / `in_groups`), anti-doble-shell, mobile-nav, landing-breakpoints; suite 30 files / 70 tests verdes; build OK.

---

## Por qué

El shell estaba mal compuesto: doble `MissionShell` en `/login` (DOM con dos headers/footers + skip duplicados; CSS `:has` tapaba el síntoma), `/auth/error` sin variante login, header/nav desalineados con Stitch (`flex-wrap`, 42rem, avatar oculto), y landing desktop-first (LOC siempre visible; `doorGrid` 4→2→1). Foundation exigía shell en root — acoplado al bug.

Dirección aprobada: route groups + un chrome + menú a11y + landing Stitch; Discord/`LoginPanel`/backend fuera de scope.

---

## Cómo probar

### Suite + build

```bash
npm --prefix CodeQuest-2026/frontend test
npm --prefix CodeQuest-2026/frontend run build
```

Esperado (verify 2026-09-22): **30 files / 70 tests** EXIT 0; build EXIT 0; rutas `/`, `/login`, `/auth/error`, `/mis-rutas`, …

### Browser (localhost, p. ej. `:3010`) — 375 / 768 / 1280

| Viewport | Qué mirar |
|---|---|
| **375** | Login/auth-error: 1 header + 1 footer, header 64px; product: menú móvil abre 3 destinos, avatar visible, LOC oculto, doorGrid 1 col, sin overflow-x |
| **768** | Landing: LOC visible, doorGrid 2 cols, nav desktop; header 64px |
| **1280** | Landing doorGrid 4 cols; login/product/auth-error/mis-rutas: un chrome, header 64px una línea |

Verify orquestador: checklist browser **PASS**.

---

## Deuda técnica explícita

| Deuda | Severidad | Notas |
|---|---|---|
| **Skip duplicado en `/auth/error`** | Should / menor | Page aún tiene skip a `#auth-error-content` además del del shell (`#login-shell-content`). Login page OK. Follow-up sin reabrir composition. |
| **Login panel stuck «Cargando…» si backend caído** | Fuera de scope / observado | `AuthSessionHydrator` / sesión; no bloquea chrome. No es bug de esta feature. |
| **Overlay de hydration Next en landing** | Fuera de scope | Preexistente; visible en browser verify; no es del shell. |
| Pixel-diff C01–C36 | Won't / fuera de scope | Declarado en spec. |
| Token-lint / stylelint de literales visuales | Recomendación verify | Repo sin gate determinista. |
| Recibo `sdd:verify` monorepo | N/A layout | No hay `package.json` en raíz `proyecto/`; gates no cableados a este frontend. |

---

## Commits — hallazgo y sugerencia

### Hallazgo (obligatorio)

`git log` sobre `main` / `origin/main..HEAD`: **cero commits** de esta feature. Todo el trabajo vive en el worktree (staged/unstaged/untracked), mezclado con trabajo previo Stitch/`ui-stitch-orbital` (assessment, learning-paths, `LoginPanel*`, hydrator, etc.).

- ❌ Unidad sin commit (todas las U1–U4).
- ⚠️ El worktree **mezcla** unidades de shell con features ajenas → un solo commit monstruo sería hallazgo de mezcla.

**No se creó commit en esta fase archive** (pedido explícito del orquestador).

### Commits sugeridos (por unidad de `tasks.md`)

Separar **solo** paths de shell; **no** incluir `LoginPanel*`, hydrator, demo-session, assessment, learning-paths, ni specs de otras features.

```text
fix(ui-shell-responsive): move product routes into (producto) group
# U1: root sin MissionShell, (producto)/layout, git mv páginas producto, foundation + regresión

fix(ui-shell-responsive): isolate login shell in (acceso) group
# U2: (acceso)/layout, git mv login+auth, page sin shell, borrar :has(), anti-doble-shell

feat(ui-shell-responsive): add accessible product mobile nav
# U3: MissionShellMobileNav + CSS 4rem/48rem/nowrap + tests menu_*

fix(ui-shell-responsive): align landing LOC and doorGrid breakpoints
# U4: page.module.css + landing-breakpoints asserts

chore(ui-shell-responsive): archive SDD specs to _done
# Solo specs/_done/ui-shell-responsive/ (este cierre)
```

U5 no necesita commit vacío si no hubo fix de harness.

### Credenciales / debug

Ningún archivo de secretos en el diff de shell. No commitear `.env`, dumps ni overlays de debug.

### Tamaño de PR

Diff total del worktree vs HEAD es **muy grande** (~9k+ líneas) porque incluye Stitch orbital completo.  
**Solo shell** (layouts + MissionShell* + tests shell + moves): estimable en el orden de **unas pocas centenas de líneas netas** por unidad (U3 la más densa) — dentro de presupuesto si se parte por unidad.

**Recomendación:** PRs/commits encadenados por unidad (mensajes arriba), **después** (o en PR aparte) el resto de Stitch que no es de esta feature. No un PR único con assessment+shell+LoginPanel.

---

## Paths tocados (feature)

- `frontend/src/app/layout.tsx`
- `frontend/src/app/(producto)/**` (layout + pages movidas + `page.module.css`)
- `frontend/src/app/(acceso)/**` (layout + login + auth/error)
- `frontend/src/features/orbital/components/MissionShell.tsx` / `.module.css`
- `frontend/src/features/orbital/components/MissionShellMobileNav.tsx` (nuevo)
- `frontend/test/src/ui-stitch-orbital/fase-0|{foundation,anti-doble-shell,mobile-nav,header-responsive,acceso-shell}*`
- `frontend/test/src/ui-stitch-orbital/fase-1/landing*` / `landing-breakpoints*`

**Fuera (no mezclar en commits de shell):** `LoginPanel*`, `auth.service`, cookies, backend, OpenAPI.

---

## Cierre SDD

- Spec/design/tasks/verify/proposal/explore + este `archive.md` → `specs/_done/ui-shell-responsive/`.
- Gate ignora `specs/_*`: la feature deja de aprobar commits futuros por globs activos.
- Siguiente paso humano: **commitear por unidad** (sugerencias arriba) + PR limpio de shell.

📚 Referencias: `verify.md` PASS, `spec.md`, `design.md`, `tasks.md` (U1–U5), constitución vía verify.
