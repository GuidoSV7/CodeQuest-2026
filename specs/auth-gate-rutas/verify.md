# Verify — `auth-gate-rutas`

> Fase `sdd-verify`. Fecha: 2026-09-27. Alcance: unidades 1-6 de `tasks.md` + cambio del orquestador en `SignInLink.module.css`.
> Camino crítico: auth (nivel 3). Base: `explore.md`, `spec.md` (aprobada `sha256:a802e4f1f5e5`), `design.md`.

Lectura: .cursor/rules/constitution-fases.mdc e3160314
Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a

## Veredicto

**🟡 APTO CON CONDICIÓN.** Los 8 grupos de CA se cumplen con evidencia ejecutada (suite, `tsc`, build, sha256, self-test). La condición es el **recibo determinista**: `verify-receipt.mjs` sale con exit 2 (worktree ≠ index) porque el working tree mezcla ciclos previos sin commitear (D-8). No stageé nada. El recibo verde se tiene que obtener **por unidad de commit** (D7) antes de cada commit; el pre-commit lo exige de todos modos. Hasta ese momento, los ✅ de testing/typecheck se apoyan en corridas manuales, no en el recibo.

## Gates deterministas (ejecutados en serie desde `CodeQuest-2026/frontend`)

| Gate | Resultado | Evidencia |
|---|---|---|
| Suite (`unit`, = `npm test` → `vitest run`) | ✅ | `npx vitest run` → exit 0 · `Test Files  60 passed (60)` · `Tests  417 passed (417)` |
| Typecheck | ✅ | `npx tsc --noEmit` → exit 0, sin salida (TS2352 resuelto) |
| Build | ✅ | `npm run build` → exit 0 · `✓ Compiled successfully` · `Finished TypeScript` · `ƒ /configurador-de-ruta` (sigue dinámica) · `○ /mis-rutas`. No chocó con `.next` del `next dev` en :3000 (dev no se tocó). |
| `sdd-self-test` | ✅ | `node --test .cursor/scripts/sdd/*.test.mjs` (desde `CodeQuest-2026/`) → exit 0 · `tests 35 · pass 35 · fail 0` |
| **Recibo** | ⚠️ NO EJECUTADO | `node .cursor/scripts/sdd/verify-receipt.mjs` → **exit 2** worktree ≠ index (lista de `??`/` M` de ciclos previos + este). Regla (a): no se stagea desde verify. |
| Lint / token-lint | ⚠️ sin ESLint/stylelint en `frontend/package.json` | El respaldo del piso visual es `test/src/ui-devtalles-polish/tokens.static.test.ts` (incluye `RequireSession.module.css` y `SignInLink.module.css`), verde en la suite. Recomendación (una vez): `stylelint` con regla de literales para que no dependa de listas manuales. |
| Validador de dependencias | ⚠️ no configurado para `frontend` en el recibo | Recomendación (una vez): gate `dependency-cruiser` en `sdd.receipt.json`. Inspección manual: `RequireSession` solo importa store/config/lib puras; el store no importa HTTP; único lector de `/me` = hydrator. |

## Criterios de aceptación

| CA | Estado | Evidencia |
|---|---|---|
| CA-1.1 matriz demo 4×7 | ✅ | `demo-session.test.ts`: `DEMO_MATRIX` con asserts de 28 combos / 2 `true` + `it.each` (34 tests verdes). Código: allowlist `"true" \|\| "1"` + `development`. |
| CA-1.2 / 1.3 lector | ✅ | Bloque `orbital demo session read`: demo → fixture sin invocar lector; dev sin variable → `toHaveBeenCalledOnce`. l.30-69 intactas (diff solo agrega). |
| CA-1.4 banner | ✅ | `OrbitalDemoBanner.tsx` no aparece en `git status`; `fase-0/dom.test.tsx` verde. |
| CA-2.1–2.5 `fetchMeStatus` | ✅ | `auth.service.test.ts` (18) + `session-read.test.ts` (19): 200 válido, 401/403, red, timeout, 500/503/404, bodies inválidos, `{ timeout: 8000 }`. `parseSessionUser` valida los 4 campos. |
| CA-2.6 `fetchMe` intacto | ✅ | Cuerpo sin cambios; caracterización (3 casos) verde; `login-contract.test.ts` verde. |
| CA-3.1 store compatible | ✅ | `user/hydrated/setUser/setHydrated/clear` conservados; tests DOM con `setState({ user, hydrated })` verdes. |
| CA-3.2 invariantes | ✅ | `auth-session.test.ts`: 4 estados × cada acción pública; cada acción es un único `set`. |
| CA-3.3 `clear` | ✅ | Store test + `RequireSession.test.tsx` "clear() while authenticated switches to the sign-in screen". |
| CA-3.4 hidratación 6 ramas | ✅ | `AuthSessionHydrator.test.tsx` bloque "lectura de 3 ramas" (demo, authenticated + `clearSignedOut`, anonymous, unreachable, signedOut+demo, signedOut+unreachable). |
| CA-3.5 cancelación | ✅ | "does not write the store when the read resolves after unmount". |
| CA-3.6 carrera | ✅ | "keeps the newest read when two reads resolve in reverse order" + store `applySessionRead` con request viejo = no-op. |
| CA-3.7 caracterización previa | ✅ | Bloque "caracterización" (3 casos, aserciones sobre store y `api.get`) verde post-refactor. |
| CA-4.1 unknown | ✅ | `role="status"` "Verificando tu sesión…", `childRenders === 0`; la rama no lee `window`. |
| CA-4.2 anonymous | ✅ | img `deviLaptop` `alt=""` 160×177, h1/p con copy exacto, `href === discordStartUrl("/mis-rutas")`. |
| CA-4.3 returnTo | ✅ | Tests con query del configurador y hash excluido. Navegador (orquestador): href real `…returnTo=http%3A%2F%2Flocalhost%3A3000%2Fmis-rutas` y deep link conserva `?panel=form&path=programas-react`. |
| CA-4.4 open redirect | ✅ | `//evil.example` → `discordStartUrl("/")`, `href` sin `evil.example`. |
| CA-4.5 unreachable + retry + recovery | ✅ | `role="alert"`, copy exacto, clic → status, `button === null`, `fetchMeStatus` ×2; 2ª `authenticated` monta hijos, 2ª `anonymous` → login. Navegador: backend apagado → ~8 s → pantalla + Reintentar. |
| CA-4.6 sin wrapper | ✅ | `container.innerHTML === CHILD_MARKUP`. |
| CA-4.7 sin copy protegido | ✅ | `it.each` sobre los 3 estados ≠ authenticated. |
| CA-4.8 layouts | ✅ | Ambos layouts sin `"use client"`, envuelven en `RequireSession`; `layouts.static.test.ts` (5) verde; landing/docs públicas. |
| CA-4.9 estáticos existentes | ✅ | `configurator-page.static`, `configurator-layout.static`, `access.characterization`, `copy-voice.static` verdes. |
| CA-4.10 estilos | ✅ | `RequireSession.module.css`: solo `var(--orbital-*)` + literales `rem` existentes; en `TOKENIZED_CSS` y `LIVE_COPY_FILES`; foco por anillo global; `prefers-reduced-motion` presente. |
| CA-4.11 gate visual | 🟡 parcial | Evidencia del orquestador: `anonymous` en `/mis-rutas` y configurador a 375 px sin overflow; `unreachable` visto en dev. **Falta** captura explícita de `unreachable` a 375 y de ambos estados a 1280 px. Revisión de código: conformidad Orbital (mismo patrón que `LearningPathsEmptyState`), 5 estados de `.retry`, motion 160 ms con token, sin `transition: all`. |
| CA-5.1 SVG byte a byte | ✅ | `sha256sum` origen y destino = `b2b7e5fbf1f2599de6c1097b5debb233c8bc04617685b982ef0d1fae3f28ce63` (ambos); `cmp` exit 0; 16 065 B. |
| CA-5.2 `BRAND_ASSETS.deviLaptop` | ✅ | `brand-assets.test.ts` verde. |
| CA-6.1–6.4 local-session | ✅ | Diff: 3 firmas con `Pick<…>`, cuerpos iguales; test sin casts (grep `as (unknown\|any\|Location\|Storage)` = 0); 4 casos borde; `tsc` 0 errores. |
| CA-7.1 `SignInLink` movido | 🟡 desvío declarado | Move + 2 imports OK, carpeta vieja vacía, tests verdes. **Pero el contenido ya no es idéntico**: el orquestador agregó `justify-content: center` a `.action` (ver Observaciones). |
| CA-8.1 / 8.2 / 8.3 | ✅ | Ver gates. |
| CA-8.4 recibo | ⚠️ | Exit 2 (ver condición del veredicto). |

## Constitución

- **Seguridad** ✅: sin endpoints nuevos (IDOR/BFLA no aplican); respuesta de `/me` validada en la frontera; timeout explícito 8 s; open redirect cubierto sobre el `href` final; hash nunca viaja en `returnTo`; sin `dangerouslySetInnerHTML`; token sigue en `sessionStorage`. El gate es UX, la frontera real sigue en `SessionAuthGuard`.
- **Errores** ✅: se clasifica por `statusCode` (`asApiError`), nunca por texto; copy fijo en el cliente; ningún error tragado (clasificador total con ramas testeadas).
- **Arquitectura / calidad** ✅: capas respetadas; sin `console.log`, sin código comentado, sin imports sin usar (tsc + build verdes).
- **Asserts reescritos** ✅: los 4 reemplazos (`demo-session` l.9-28, guardas por nombre en `auth.characterization` y `auth-session-hydrator` con `\b`, casts de `local-session`) coinciden con la tabla declarada en la spec; ninguno borrado.
- **Tests "sin modificarse"** ⚠️: `ShellAccount.test`, `LearningPathsDashboard.test`, `MyRouteStatus.test`, `login*.test`, `routes-dom`, `dom.test` tienen diff contra HEAD, pero los cambios son de copy de ciclos previos (ninguno toca `sessionStatus`, `SignInLink` ni las APIs nuevas). No atribuibles a este ciclo hasta aislar commits (D-8).
- **Runtime de endpoints** — no aplica: no se tocó ruta ni query de backend. Consumo de `/me` real verificado en navegador por el orquestador (401 → login).
- **Segundo eje** ✅: concurrencia (CA-3.5/3.6 sobre store real), tiempo (config + `ECONNABORTED`, sin reloj real), invariante de estado (exhaustivo CA-3.2); contrato → deuda D-3 aceptada.
- **Mutation testing** ⚠️ NO EJECUTADO: Stryker no configurado (D-7). Ofrecido una vez: configurarlo con `.cursor/skills/mutation-testing/SKILL.md` acotado a `session-read.ts`, `auth.service.ts`, `demo-session.ts`, `auth-session.ts`, `RequireSession.tsx`. No bloquea.

## Observaciones

1. **`justify-content: center` en `SignInLink.module.css` — técnicamente correcto, contractualmente un desvío.** `.action` es `inline-flex`; la propiedad solo cambia algo cuando el link es más ancho que su texto. Eso pasa únicamente en `RequireSession` ≤ 34rem (`.actions > * { width: 100% }`); sin ella "Entrar" queda pegado a la izquierda en móvil. En `LearningPathsDashboard` y `MyRouteStatus` no hay reglas que ensanchen el link → sin efecto visible. Queda cubierto por `tokens.static.test.ts`. Pero contradice CA-7.1 ("mismo contenido") y design §3.8 ("no se edita `SignInLink`").
   - ✅ Recomendación: aceptarlo y registrar el desvío en `spec.md`/archive (es el lugar correcto: el link se centra solo, sin acoplar estilos del padre). Alternativa sin tocar `SignInLink`: `.actions > * { justify-content: center }` en `RequireSession.module.css`, que acopla el padre al layout interno del hijo (peor).
2. **Error de hidratación visto una vez tras HMR en `SessionChecking`**: no se reproduce al recargar. Es consistente con HMR conservando el estado del módulo zustand (el cliente arranca en un estado ≠ `unknown` mientras el HTML del servidor es `unknown`). En carga limpia el estado inicial es `unknown` en ambos lados. No es bloqueante; si reaparece en una recarga completa, reabrir.
3. **No verificado**: flujo con sesión real de Discord (`authenticated` → hijos montan en navegador). Cubierto solo por tests unitarios/DOM.
4. `tasks.md` tiene 4.6, 5.4 y 6.7 sin tildar: las corridas de este verify los cubren salvo el recibo.

## Para cerrar

- Orquestador: stagear por unidad (D7) y correr `node .cursor/scripts/sdd/verify-receipt.mjs` hasta exit 0 antes de cada commit.
- Completar capturas de CA-4.11 (`unreachable` a 375; ambos estados a 1280) o aceptar la evidencia actual explícitamente.
- Registrar el desvío de CA-7.1.

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `.cursor/rules/constitution-codigo.mdc`, `.cursor/rules/frontend-layers.mdc` (glob), `CodeQuest-2026/specs/auth-gate-rutas/{spec,design,tasks}.md`, `CodeQuest-2026/.cursor/sdd.receipt.json`; código: `RequireSession.{tsx,module.css}`, `SignInLink.module.css`, `AuthSessionHydrator.tsx`, `stores/auth-session.ts`, `session-read.ts`, `auth.service.ts`, `return-to.ts`, layouts, diffs de `demo-session.ts`, `local-session.ts`, `auth.types.ts`, `.env.example` y tests reescritos.
