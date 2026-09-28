# Verify — `ui-shell-responsive`

**Fecha:** 2026-09-22  
**Veredicto:** **PASS — listo para archivar** (browser 375/768/1280 = ✅ orquestador)  
**Constitución leída:** `constitution-fases.mdc` e3160314 · `constitution-codigo.mdc` 2c261a0a

---

## Recibo SDD (`npm run sdd:verify`)

| Gate | Resultado | Evidencia |
|---|---|---|
| Recibo determinista monorepo | ⚠️ **NO EJECUTADO** | No hay `package.json` en la raíz del workspace `proyecto/`. El git root es `CodeQuest-2026/` y no expone script `sdd:verify`. Config existe en `.cursor/sdd.receipt.json` pero los gates (`test:pg`, `arch-guard` sobre `src`, etc.) no están cableados a este frontend. **No se inventó un ✅.** |
| Suite frontend (pedido explícito) | ✅ | Ver bloque Testing |
| Build frontend (pedido explícito) | ✅ | Ver bloque Build |

---

## Comandos ejecutados (evidencia)

### Suite

```text
$ npm --prefix CodeQuest-2026/frontend test
… Test Files  30 passed (30)
     Tests  70 passed (70)
   Duration  33.79s
EXIT_TEST:0
```

Incluye: `foundation`, `anti-doble-shell`, `mobile-nav`, `landing` + `landing-breakpoints`, `login` / `login-contract` / `auth-error`, `auth.service.test`.

### Build

```text
$ npm --prefix CodeQuest-2026/frontend run build
✓ Compiled successfully in 6.1s
  Finished TypeScript in 34.7s …
✓ Generating static pages … (12/12)
Route (app): /, /login, /auth/error, /mis-rutas, … (URLs públicas sin cambio de path)
EXIT_BUILD:0
```

---

## Criterios de aceptación (spec)

| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| **CA1** | Un solo chrome en `/login` y `/auth/error`; sin `:has(#login-content)` | ✅ **PASS** | Source: `(acceso)/layout` monta un `MissionShell variant="login"`; `login/page.tsx` y `auth/error/page.tsx` **no** contienen `MissionShell` ni `<header>`/`<footer>`. CSS: `MissionShell.module.css` **sin** `:has(` (rg 0 matches). Test: `anti-doble-shell.test.ts` (2) verde en suite EXIT 0. |
| **CA2** | Shell por group; root sin `MissionShell`; URLs públicas | ✅ **PASS** | `app/layout.tsx` L42–58: solo providers/`{children}`, sin import `MissionShell`. `(producto)/layout.tsx` → `<MissionShell>{children}</MissionShell>`. `(acceso)/layout.tsx` → `variant="login"`. Build routes: `/`, `/login`, `/auth/error`, `/mis-rutas`, … Test: `foundation.test.ts` `ui.shell.not_in_root` / `ui.shell.in_groups`. |
| **CA3** | Header 4rem / una línea; `padding-top` ≥ header | ✅ **PASS** | CSS + browser: altura **64px** en 375/768/1280 (login y product). |
| **CA4** | Menú móvil a11y ~48rem; avatar; no 2.ª barra `fixed` | ✅ **PASS** | DOM tests + browser 375: botón abre «Mis rutas / Descubre tu ruta / Ajustes»; panel absolute. |
| **CA5** | Landing LOC + `doorGrid` mobile-first | ✅ **PASS** | `.location { display: none }` + show `@media (min-width: 48rem)`. `.doorGrid`: 1 col default → 2@48rem → 4@64rem. Test: `landing-breakpoints.characterization.test.ts` (`ui.landing.loc_hidden` / `door_grid`) verde. |
| **CA6** | Contrato auth intacto | ✅ **PASS** (contrato) | `git diff HEAD -- frontend/src/features/auth/api/auth.service.ts` → **vacío**. `LoginPanel` sigue con `discordStartUrl(returnTo)`. Suite fase-2 `login-contract` + `login` + `auth.service.test` verdes. **Nota:** el worktree tiene cambios *presentacionales* previos en `LoginPanel.tsx`/`.module.css` (Stitch literal vs HEAD `1ee1223`); **no** cambian el contrato Discord/`returnTo`/`auth.service`. No mezclar esos archivos en el commit de shell si el objetivo es un diff de feature limpio. |
| **CA7** | Tests foundation / anti-doble / menú / landing | ✅ **PASS** | Suite 70/70 EXIT 0; señales `ui.shell.*` y `ui.landing.*` presentes y verdes. |

### Should

| Item | Resultado | Evidencia |
|---|---|---|
| Skip único coherente con landmark | ⚠️ **PARCIAL** | Login page: sin skip propio (OK). Shell login: skip → `#login-shell-content` (OK). **`/auth/error`** aún tiene skip de página → `#auth-error-content` **además** del skip del shell → dos skips en esa ruta. No bloquea Must; deuda menor Should. |
| Regresión shell product ≥1 ruta | ✅ | `dom.test.tsx` + build de `/` / `/mis-rutas`. |

---

## Inspección pedida (checklist orquestador)

| # | Chequeo | Resultado |
|---|---|---|
| 1 | Root layout sin `MissionShell` | ✅ |
| 2 | `(producto)` / `(acceso)` layouts correctos | ✅ |
| 3 | Login sin `MissionShell` anidado; sin `:has()` | ✅ |
| 4 | `MissionShellMobileNav` a11y presente | ✅ |
| 5 | Landing LOC / `doorGrid` breakpoints | ✅ |
| 6 | Discord / `LoginPanel` sin cambio de **contrato** | ✅ (ver CA6) |

---

## Flujos conectados (explore → spec)

| Flujo | Disposición | Verificación |
|---|---|---|
| RootLayout → MissionShell | EN SCOPE | ✅ foundation + source root |
| LoginPage anidado | EN SCOPE | ✅ anti-doble-shell |
| `/auth/error` + shell | EN SCOPE | ✅ layout acceso + anti-doble-shell |
| Product pages vía layout | EN SCOPE | ✅ producto layout + build routes + dom |
| LoginPanel + Discord | FUERA | ✅ auth.service sin diff; contract tests verdes; codegraph: LoginPage → LoginPanel sin tocar service |
| AuthSessionHydrator / cookies | FUERA | ✅ no tocado por paths de shell (hydrator dirty = trabajo previo Stitch/demo, no units shell) |
| Landing LOC/doorGrid | EN SCOPE | ✅ CSS + landing-breakpoints |
| Header + nav móvil | EN SCOPE | ✅ MissionShell* + mobile-nav |
| Backend Identity | FUERA | ✅ sin rutas backend en el build/test de esta verificación |

---

## Testing (constitución → escala)

| Punto | Resultado | Evidencia |
|---|---|---|
| Suite existe y PASA | ✅ | `EXIT_TEST:0` · 30 files / 70 tests |
| No se debilitaron asserts sin criterion | ✅ | Foundation **reemplazó** assert de MissionShell-en-root por not_in_root + in_groups (declarado en spec). Contract Discord no relajado. |
| Nivel por flujo | ✅ | Composición / menú / landing = nivel 2 (happy + bordes en anti-doble, menu_*, door_grid). Auth Discord fuera → no abre nivel 3. |
| Segundo eje camino crítico | ✅ N/A | Spec declara ausente (sin concurrencia/contrato nuevo/tiempo/dinero). |
| Mutation / test:pg | ⚠️ N/A | UI-only; sin BD; Stryker no configurado en frontend (no bloquea). |
| Runtime endpoint/query BD | ✅ N/A | Sin rutas/handlers/queries tocados. |

---

## Frontend (constitución + fases)

| Punto | Resultado | Evidencia |
|---|---|---|
| Seguridad FE | ✅ | Sin `dangerouslySetInnerHTML`/`innerHTML` en orbital shell. |
| a11y AA | ✅ (estático) | Landmarks `header`/`nav`/`footer`; botón menú con `aria-*` + label; Escape; foco vía `--orbital-focus`; SVG no emoji. Browser teclado: pendiente. |
| Separación presentación/datos | ✅ | Shell no fetch; isla solo estado UI local. |
| Lenguaje visual (conformidad) | ✅ con nota | Tokens `--orbital-*` en menú/header; motion + `prefers-reduced-motion`. **Nota:** login shell CSS conserva literales `rgb(...)` preexistentes en variante login (L230/248) — no introducidos como tokens nuevos de marca en esta feature. |
| Token-lint determinista | ⚠️ ausente | Repo **no** tiene stylelint/token-lint configurado. **Recomendación (una vez):** agregar gate de literales visuales (`frontend-reference/references/design-lint.md`) para que “cero literales” no dependa de opinión. |

---

## Seguridad (base + situacional)

| Señal | Aplica | Resultado |
|---|---|---|
| IDOR / injection / secretos nuevos | No (solo layouts/CSS/UI) | ✅ N/A |
| Auth chrome debilitado | No | ✅ sin endpoints nuevos; Discord contract tests verdes |
| Situacionales (rate limit, CSRF, JWT, uploads…) | Sin señales nuevas en este diff | ✅ N/A |

---

## Arquitectura / calidad

| Punto | Resultado |
|---|---|
| Capas / deps hacia adentro | ✅ solo frontend presentación; MissionShell server + isla client |
| Atomicidad / UoW / migraciones | ✅ N/A |
| Contrato HTTP | ✅ sin bump; sin OpenAPI |
| console.log / código muerto | ✅ no observado en archivos de shell tocados |
| Error contract RFC 9457 | ✅ N/A (sin API) |

---

## Browser manual (tasks Unidad 5)

| Viewport | Ítem | Estado |
|---|---|---|
| **375** | Login: 1 header + 1 footer, altura 64px, nav oculta, avatar visible, sin overflow-x | ✅ PASS (orquestador, localhost:3010) |
| **375** | Landing product: 1 header 64px, menú móvil abre 3 destinos, LOC `display:none`, doorGrid 1 col, sin overflow-x | ✅ PASS |
| **768** | Landing: desktopNav flex, mobileNav none, LOC visible, doorGrid 2 cols, header 64px | ✅ PASS |
| **1280** | Landing / login / auth/error / mis-rutas: 1 header 64px, un chrome; login muestra nav completa | ✅ PASS |
| Follow-up CSS | Login nav bajo 48rem truncaba «Ajustes» → `display:none` mobile-first + show `@media (min-width: 48rem)` | ✅ corregido post-verify |

**Notas browser:** overlay Next de hydration en landing (preexistente / fuera de scope shell). `/auth/error` sigue con skip duplicado (Should). Session hydrator en login queda en «Cargando…» si el backend no responde — no bloquea chrome.

---

## Hallazgos no bloqueantes

1. **Should — skip duplicado en `/auth/error`:** page conserva skip a `#auth-error-content` además del del shell. Corregible en follow-up sin reabrir composition.
2. **Worktree auth sucio vs HEAD:** `LoginPanel*` / hydrator / demo-session aparecen modificados por trabajo Stitch previo; contrato Discord intacto. Separar commits al archivar.
3. **Token-lint** no existe en el repo (recomendación única arriba).
4. **Recibo `sdd:verify`** no ejecutable en este layout de monorepo (documentado).

---

## Veredicto final

**PASS — listo para `sdd-archive`.** Browser 375/768/1280 completado por el orquestador. No hay ❌ Must fallidos.

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc` (e3160314), `.cursor/rules/constitution-codigo.mdc` (2c261a0a), `CodeQuest-2026/specs/ui-shell-responsive/{spec,design,tasks}.md`, `.cursor/skills/frontend-reference/references/design-language.md` (extracto), codegraph (`MissionShell`, layouts, `LoginPanel`, `discordStartUrl`)
