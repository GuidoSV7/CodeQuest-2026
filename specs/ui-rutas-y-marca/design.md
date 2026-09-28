# Design — `ui-rutas-y-marca`

> Fase `sdd-design`. Fecha: 2026-09-27. Entrada: `explore.md` + `spec.md` (CA-1…CA-7). Frontend-only (Next 16.3.5 App Router, React 19, CSS Modules, vitest). Sin backend, sin BD, sin cambio de contrato de API.

## Preguntas abiertas de la spec — RESUELTAS (orquestador)

| Q | Resolución | Efecto en el diseño |
|---|---|---|
| **Q-1** ¿Quitar también "CodeQuest"? | **No.** "Code Quest" se quita **solo del shell** (footer product y footer login de `MissionShell`). El nombre de producto "CodeQuest" en `LoginPanel.tsx`, metadata de login/registro y `config/site.ts` queda como está. | Paths de la spec sin cambios; `features/auth/**` y `app/(acceso)/**` siguen fuera. CA-5.1 aplica solo al `textContent` de `MissionShell`. |
| **Q-2** Footer | **Solo marca "DevTalles"**, con isologo si encaja. | Footer product: isologo + "DevTalles". Footer login: "DevTalles" solo (ver §UI → Footer, por qué no entra el isologo ahí). |
| **Q-3** Metadata puerta `unknown` | **`["Nivel", "Inicial"]`**. | Literal en `landing.fixture.ts`. |
| **Q-4** ¿Commit de `ui-devtalles-polish` antes? | **No.** La mezcla queda declarada. | D-8 pasa de condicional a **aceptada**: el diff de este ciclo convive con el del anterior en `MyRouteStatus.*`, `page.tsx`, `MissionShell.*`, `landing.fixture.ts`, `LearningPathsDashboard.*`, `LearningPathsEmptyState.tsx` y tests. `verify`/`archive` lo nombran; el gate cruza ambos ciclos contra estos paths. |

## Capas afectadas y dirección de dependencias

```
app/(producto)/configurador-de-ruta/page.tsx  (Server Component)
   └─> features/learning-paths/lib/configurator-deep-link.ts   (puro, sin React)
   └─> features/learning-paths/components/MyRouteStatus.tsx     ("use client")
app/(producto)/page.tsx  (Server Component)
   └─> features/learning-paths/components/StackIcon.tsx
   └─> features/orbital/fixtures/landing.fixture.ts ──> config/official-paths.ts (tipo)
features/learning-paths/components/{LearningPathsDashboard, MyRouteStatus}
   └─> features/learning-paths/lib/route-errors.ts ──> lib/errors.ts (asApiError, apiErrorCode)
   └─> features/learning-paths/components/SignInLink.tsx ──> features/auth/api/auth.service.ts (discordStartUrl, solo lectura)
features/learning-paths/components/LearningPathsEmptyState.tsx ──> config/brand-assets.ts
features/orbital/components/MissionShell.tsx ──> config/brand-assets.ts
```

- Siempre `app → features → config/lib`. `config/` y `lib/` no importan features.
- `SignInLink` importa `discordStartUrl` de `features/auth/api/auth.service.ts` (import cross-feature con precedente: `MissionShell` → `features/auth/components/ShellAccount`). Solo se **llama una función pura** que arma la URL; no se hace HTTP desde el componente. `features/auth/**` **no se edita**.
- Separación presentación / estado / datos: los componentes siguen recibiendo `load`/`loadRoutes`/`createOfficial` inyectables (patrón existente); la clasificación del error vive en `lib/` pura, no en el JSX.
- Estado de servidor: se mantiene el patrón manual existente (`useEffect` + flag `active` + `attempt`). No se introduce React Query/SWR (no está en el proyecto; introducirlo sería patrón nuevo — constitución → respetar lo existente).

## Módulos nuevos

### 1. `frontend/src/config/brand-assets.ts` — fuente única de rutas de marca (CA-5.3)

```ts
export const BRAND_ASSETS = {
  isologo: "/devtalles-brand/isologo-color.svg",
  deviHello: "/devtalles-brand/devi-hello.svg",
} as const;

export type BrandAssetKey = keyof typeof BRAND_ASSETS;
```

- Único archivo de `src/` que contiene el literal `/devtalles-brand/` (guardia estática, réplica de `official-paths.test.ts:47-55`).
- La spec (CA-5.7) escribe `BRAND.deviHello`; el nombre efectivo es `BRAND_ASSETS.deviHello` (constante `UPPER_SNAKE_CASE` como `OFFICIAL_PATHS`). Mismo significado.
- Assets vendorizados byte a byte (CA-5.2):
  - `DEVTALLES-PAQUETES DE ELEMENTOS/SVG/ISOLOGO COLOR.svg` → `frontend/public/devtalles-brand/isologo-color.svg`
  - `DEVTALLES-PAQUETES DE ELEMENTOS/SVG/DEVI HELLO BORDER.svg` → `frontend/public/devtalles-brand/devi-hello.svg`
  - Solo esos dos (ni LOGO, ni otras DEVI): no hay consumidor para el resto.

### 2. `frontend/src/features/learning-paths/lib/configurator-deep-link.ts` — saneo puro del deep link (CA-3.3)

Vive en `features/learning-paths/lib/` porque el estado inicial que produce es del configurador (dueño: `MyRouteStatus`) y depende de `OFFICIAL_PATHS`. Sin React, sin Next: importable desde el Server Component y testeable en node.

```ts
import { OFFICIAL_PATHS, type OfficialPathId } from "@/config/official-paths";

export type ConfiguratorSearchParams = Record<string, string | string[] | undefined>;

export type ConfiguratorInitialState = {
  initialPanel: "none" | "form";
  initialPathId: OfficialPathId;
};

export function parseConfiguratorDeepLink(params: ConfiguratorSearchParams): ConfiguratorInitialState;
```

Reglas (allowlist, nunca normalización):
- `panel`: solo el string exacto `"form"` → `"form"`; cualquier otro (ausente, `""`, `"mcp"`, `"FORM"`, array) → `"none"`.
- `path`: solo un string que sea **igual** a un `id` de `OFFICIAL_PATHS` → ese id; cualquier otro (ausente, `""`, desconocido, `"../x"`, array) → `OFFICIAL_PATHS[0].id`.
- `panel` y `path` se sanean de forma independiente (`?path=programas-react` sin `panel` preselecciona React con el formulario cerrado: inocuo y coherente con "default actual").
- El type guard `isOfficialPathId(value: string): value is OfficialPathId` es **privado** del módulo (no se toca `config/official-paths.ts`, fuera de scope).
- `panel=mcp` se ignora a propósito (CA-3.3): abrir un diálogo modal desde la URL no está pedido.

### 3. `frontend/src/features/learning-paths/lib/route-errors.ts` — clasificación de errores (CA-1, CA-2)

```ts
export type RouteLoadFailure = "unauthorized" | "failed";
export type RouteCreateFailure = "unauthorized" | "catalog-unavailable" | "failed";

export function classifyRouteLoadError(error: unknown): RouteLoadFailure;
export function classifyRouteCreateError(error: unknown): RouteCreateFailure;
```

- Ambas pasan por `asApiError(error)` (`lib/errors.ts`, patrón existente, hoy sin callers). No se crea otro normalizador.
- `statusCode === 401` → `"unauthorized"` (señal única de sesión; prohibido leer `useAuthStore` o el token local — spec §CA).
- Create: `statusCode === 503 && apiErrorCode(api) === "CATALOG_UNAVAILABLE"` → `"catalog-unavailable"`.
- Todo lo demás (0 = sin respuesta, 5xx, 422, 400, 503 sin ese `code`) → `"failed"`.
- El **texto** lo pone cada componente (catálogo en el cliente por clasificación, constitución → API y errores). `route-errors.ts` no contiene copy.

### 4. `frontend/src/lib/errors.ts` — helper puro para leer `code` (entra por la cláusula de la spec)

```ts
export function apiErrorCode(error: ApiError): string | null;
```

- Devuelve `error.body.code` si `body` es objeto no nulo y `code` es `string`; si no, `null`.
- `ApiError`, `asApiError` y `ApiErrorBody` **no cambian** de firma.

### 5. `frontend/src/features/learning-paths/components/SignInLink.tsx` (+ `SignInLink.module.css`) — CTA "Entrar" compartido (M2)

```tsx
export function SignInLink({ returnTo }: { returnTo: string }): JSX.Element;
// <a className={styles.action} href={discordStartUrl(returnTo)}>Entrar</a>
```

- Fragmento mínimo: **solo el link**. El encabezado/mensaje lo pone cada pantalla (dashboard = estado completo; configurador = aviso de carga y feedback de submit), así el componente no acumula variantes.
- `<a>` y no `next/link`: el destino es el origen del API (absoluto), no una ruta de la app.
- `returnTo` es literal de la app (`"/mis-rutas"`, `"/configurador-de-ruta"`); `discordStartUrl` → `loginReturnTarget` ya lo restringe a ruta relativa. No viene de input de usuario.
- Hidratación: el estado "sin sesión" solo aparece tras el `useEffect` en el cliente → `window.location.origin` ya existe; no hay mismatch SSR/cliente.
- Tests: `href === discordStartUrl("/mis-rutas")` / `discordStartUrl("/configurador-de-ruta")` evaluado en el mismo jsdom.
- Va a `features/learning-paths/components/` (sus dos consumidores viven ahí). Si un tercer consumidor fuera de la feature aparece, se mueve (Rule of Three); hoy no.

### 6. `frontend/src/features/learning-paths/components/LearningPathsEmptyState.module.css` — estilo de DEVI

Módulo nuevo y tokenizado para la mascota (ver §CSS → por qué no se agrega nada a `LearningPathsDashboard.module.css`).

## Módulos modificados

| Archivo | Cambio |
|---|---|
| `app/(producto)/configurador-de-ruta/page.tsx` | `async`, recibe `searchParams: Promise<ConfiguratorSearchParams>`, `await`, `parseConfiguratorDeepLink`, pasa `initialPanel`/`initialPathId` a `MyRouteStatus`. Sin `"use client"`, sin `useSearchParams` (patrón `(acceso)/login/page.tsx:10-19`). La ruta pasa a dinámica; sin Suspense requerido. `metadata` intacta. |
| `features/learning-paths/components/MyRouteStatus.tsx` | Props iniciales, estado `unauthorized`, reintento, copy de vacío, feedback de submit tipado, chevron + ayuda del picker. |
| `features/learning-paths/components/MyRouteStatus.module.css` | Clases nuevas `.notice`, `.retry` (sumada a grupos existentes), `.chevron`, `.pickerHint`, `.formFeedback`; estados del trigger. |
| `features/learning-paths/components/LearningPathsDashboard.tsx` | Estado `unauthorized` con `SignInLink`; `.catch` clasifica en vez de descartar. |
| `features/learning-paths/components/LearningPathsDashboard.module.css` | **Solo borrado** de reglas huérfanas del radar (`.emptyRadar`, `.emptyRadar svg`, `.emptyRadar path`, `.emptyCore`, `.emptyNode`). Ninguna declaración nueva. |
| `features/learning-paths/components/LearningPathsEmptyState.tsx` | Radar SVG → `<img>` DEVI. h2, copy y link intactos. |
| `features/orbital/components/MissionShell.tsx` | Isologo en ambos headers; footers sin "Code Quest" ni `•`. |
| `features/orbital/components/MissionShell.module.css` | `.brandMark`, `.footerMark`; `.loginBrand` a inline-flex; borrar `.footerCredit`. |
| `features/orbital/fixtures/landing.fixture.ts` | `LandingDoor.stackPathId: OfficialPathId \| null`; hrefs con deep link; copy y metadata de `unknown`. |
| `app/(producto)/page.tsx` | `StackIcon` en puertas con `stackPathId`; franja de iconos de `OFFICIAL_PATHS`. |
| `app/(producto)/page.module.css` | `.doorHead`, `.stackStrip`. |
| `lib/errors.ts` | `apiErrorCode` (nuevo export). |

`lib/axios.ts`, `lib/api-auth-policy.ts`, `load-my-routes.ts`, `subscribe-learning-paths.ts`, `config/official-paths.ts`, `StackIcon.tsx`, `features/auth/**`, `backend/**`: **sin cambios**.

## Props nuevas

### `MyRouteStatus`

```ts
export function MyRouteStatus({
  loadRoutes = loadMyRoutes,
  subscribe = subscribeLearningPathEvents,
  createOfficial = createOfficialRoute,
  initialPanel = "none",
  initialPathId = OFFICIAL_PATHS[0].id,
}: {
  loadRoutes?: () => Promise<MyRouteSummary[]>;
  subscribe?: (onCreated: (route: MyRouteSummary) => void) => () => void;
  createOfficial?: (input: { catalogPathId: string; title: string }) => Promise<MyRouteSummary>;
  initialPanel?: "none" | "form";
  initialPathId?: OfficialPathId;
});
```

- Se usan **solo** como inicializadores de `useState` (`panel`, `catalogPathId`). Cambios posteriores de props no re-sincronizan el estado (la página se monta una vez por navegación; no hace falta).
- Defaults = valores actuales → los tests existentes (que no pasan estas props) renderizan idéntico (CA-2.8, CA-3.4 "sin params, idéntico").
- `initialPanel` no admite `"mcp"` por tipo (coherente con el parser).

### `LearningPathsDashboard`

Sin props nuevas. `returnTo` es fijo (`"/mis-rutas"`): la pantalla solo se monta ahí; parametrizarlo sería generalizar sin consumidor.

## Estados y transiciones

### `/mis-rutas` — `LearningPathsDashboard`

```ts
type LoadState =
  | { status: "loading" }
  | { status: "ready"; routes: MyRouteSummary[] }
  | { status: "unauthorized" }
  | { status: "error" };
```

| Desde | Evento | Hacia | UI |
|---|---|---|---|
| loading | `load` resuelve `[]` | ready | `LearningPathsEmptyState` (CA-1.3) |
| loading | `load` resuelve rutas | ready | grilla actual (CA-1.4) |
| loading | rechaza, `classifyRouteLoadError` = `unauthorized` | unauthorized | `<section className={styles.state} aria-labelledby="session-required-title">` + h2 + p + `SignInLink returnTo="/mis-rutas"`. **Sin** `role="alert"`, **sin** Reintentar (CA-1.1) |
| loading | rechaza, `failed` | error | markup actual: `role="alert"` + h2 "No pudimos cargar tus rutas" + Reintentar (CA-1.2) |
| error | clic Reintentar | loading (`retrying=true`, `attempt+1`) | botón deshabilitado + "Reintentando…" (patrón actual) |
| loading (reintento) | rechaza 401 | unauthorized | CA-1.5 |
| unauthorized | — | (terminal en la pantalla) | solo navegación por "Entrar" |

Copy del estado sin sesión (voseo, sin datos inventados):
- h2: **"Entrá para ver tus rutas"**
- p: **"Iniciá sesión con Discord y volvés directo a esta pantalla."** (verdadero: `returnTo` apunta acá)

### `/configurador-de-ruta` — `MyRouteStatus`

Carga — mismo `LoadState` de 4 estados + `attempt`/`retrying`/flag `active` copiados del dashboard (CA-2.2):

| Estado | UI en la sección "Tus rutas" |
|---|---|
| loading | "Cargando tus rutas…" (actual) |
| unauthorized | `<div className={styles.notice}>` con `<p className={styles.note}>Entrá para ver y guardar tus rutas.</p>` + `SignInLink returnTo="/configurador-de-ruta"`; sin Reintentar, sin alert (CA-2.1) |
| error | `<div className={styles.notice} role="alert">` con "No pudimos cargar tus rutas" + `<button className={styles.retry} disabled={retrying}>` "Reintentar" / "Reintentando…" (CA-2.2) |
| ready `[]` | `<p className={styles.empty}>Todavía no creaste ninguna ruta.</p>` (CA-2.3) |
| ready rutas | lista actual |

- `useEffect` de carga pasa a depender de `[attempt, loadRoutes]`. Al reintentar: `setRetrying(true)`, `setState({ status: "loading" })`, `setAttempt(n + 1)`; `.finally` → `setRetrying(false)` si `active`.
- `mergeRoutes` se conserva (al reintentar desde `loading` mergea contra `[]`).
- Suscripción live: sin cambios; un evento entrante sigue llevando a `ready` desde cualquier estado (comportamiento preexistente, documentado: el WS no autentica en localhost, D-2).
- Los botones "Quiero hacerlo por…" y el formulario **siguen visibles en todos los estados de carga** (como hoy en `error`). Crear con 401 se resuelve por el feedback de submit; ocultarlos sería un cambio de flujo no pedido.

Creación — `formError: string` se reemplaza por un feedback tipado (derivable → no se guarda texto):

```ts
type SubmitFeedback = { kind: "none" } | { kind: RouteCreateFailure };
```

| Desde | Evento | Hacia | UI |
|---|---|---|---|
| none | submit | saving (`saving=true`, feedback none) | botón "Creando…" deshabilitado (actual) |
| saving | resuelve | none; ruta mergeada; `panel="none"` | actual |
| saving | rechaza `unauthorized` | `{kind:"unauthorized"}` | `<div className={styles.formFeedback} role="alert">` "Tu sesión no está activa. Entrá para crear la ruta." + `SignInLink returnTo="/configurador-de-ruta"` (CA-2.4) |
| saving | rechaza `catalog-unavailable` | `{kind:"catalog-unavailable"}` | mismo contenedor: **"El catálogo todavía no está listo en el servidor. Probá de nuevo en unos minutos."** (CA-2.5, literal exacto) |
| saving | rechaza `failed` | `{kind:"failed"}` | mismo contenedor: **"No se pudo crear la ruta."** (CA-2.6) |
| cualquier feedback | nuevo submit | saving (feedback se limpia) | formulario operable (CA-2.7) |

> Nota de copy: la spec llama "el actual" a "No se pudo crear la ruta." pero el código actual no lleva punto final. La caracterización previa asserta con `toContain("No se pudo crear la ruta")` (vale para ambos) y el test nuevo fija el texto con punto. No es relajar un assert: el assert de caracterización nace así.

### Picker (CA-4)

- Un solo icono: `ChevronDown` (Lucide, `strokeWidth={CHROME_ICON_STROKE_WIDTH}`, `aria-hidden="true"`, `className={styles.chevron}`) al final del trigger; abierto se **rota 180° por CSS** (`.pickerButton[aria-expanded="true"] .chevron`). Se elige rotar en vez de alternar `ChevronUp` para que haya un solo import policiado y una transición continua.
- Texto de ayuda siempre visible, debajo del trigger y antes de `.generated`:
  `<p className={styles.pickerHint} id="path-choice-hint">Lista desplegable con {OFFICIAL_PATHS.length} rutas oficiales. Si no ves la tuya, desplazate dentro de la lista.</p>`
- Trigger: `aria-describedby="path-choice-hint"`; mantiene `aria-haspopup="listbox"`, `aria-expanded`, `aria-labelledby`. Sin literal `13` en el componente.

## Contratos / interfaces

- **No se crea ni cambia contrato de API.** Se consume el shape actual de `AllExceptionsFilter` (`{ statusCode, code, message }`) vía `codigoEstado`/`cuerpo` que pone `mapApiResponseError`. Tests del front usan fixtures copiados de ese shape → deuda D-3 (sin artefacto compartido).
- **URL pública nueva** `/configurador-de-ruta?panel=form&path=<OfficialPathId>`: interna, sin consumidor externo; parámetros desconocidos se ignoran (tolerante).
- Tipos exportados nuevos: `ConfiguratorSearchParams`, `ConfiguratorInitialState`, `RouteLoadFailure`, `RouteCreateFailure`, `BrandAssetKey`.

## Versión del contrato

Sin bump: no se toca ningún endpoint ni shape de request/response.

## Límite de transacción

No aplica: frontend sin escrituras propias; el único write (`POST /api/me/learning-paths`) es una llamada existente y atómica del lado del backend, no se modifica.

## Flujo feliz + errores

| Flujo | Feliz | Errores (clasificación → UI) |
|---|---|---|
| Ver `/mis-rutas` | rutas → grilla / `[]` → DEVI + CTA configurador | 401 → sin sesión + Entrar · 0/5xx/otro → alert + Reintentar |
| Ver configurador | lista / "Todavía no creaste ninguna ruta." | 401 → aviso + Entrar · 0/5xx/otro → alert + Reintentar |
| Crear ruta | ruta agregada, panel cerrado | 401 → mensaje + Entrar · 503 `CATALOG_UNAVAILABLE` → catálogo no listo · resto → "No se pudo crear la ruta." |
| Deep link | params válidos → formulario abierto + ruta preseleccionada | inválidos → se ignoran, render actual |

## UI — Lenguaje visual (obligatorio)

- **Modo: conformidad elevada / EXTENSIÓN.** El proyecto tiene sistema visual Orbital completo (tokens `--orbital-*` en `app/globals.css:2-64`). No se abre modo creación.
- **Superficie:** landing = marca (franja e isologo suman identidad, en dosis); `/mis-rutas` y configurador = producto (legibilidad manda; estados sobrios).
- **Tokens nuevos: ninguno.** Todo sale de tokens existentes o `color-mix` sobre token.
- **Componentes existentes que se extienden** (se citan los valores actuales leídos, no reescritos de memoria):
  - Estado de pantalla: `LearningPathsDashboard.module.css .state` (vigente la segunda definición, `:476-482`: `padding: var(--orbital-space-6)`, `border: 1px solid var(--orbital-border)`, `radius-xl`, `background: var(--orbital-surface-container-low)`; h2 `on-surface` + `font-display` `:544-547`). El estado sin sesión reusa `.state` tal cual.
  - Botón Reintentar del dashboard: `.secondaryAction` actual, sin cambios.
  - CTA "Entrar": **mismo tratamiento que el "Entrar" del header** (`ShellAccount` usa `.authButton.authButtonPrimary`, `MissionShell.module.css:108-148`). `SignInLink.module.css .action` replica esos valores con los mismos tokens: `inline-flex`, `min-height: 2.75rem`, `padding: 0 var(--orbital-space-4)`, `border: 1px solid var(--orbital-lime)`, `border-radius: var(--orbital-radius-sm)`, `background: var(--orbital-lime)`, `color: var(--orbital-night)`, `font-family: var(--orbital-font-telemetry)`, `font-size: 0.875rem`, `font-weight: 700`, `letter-spacing: 0.04em`, `text-decoration: none`, `justify-self: start`, `transition: background var(--orbital-motion-fast), border-color var(--orbital-motion-fast), filter var(--orbital-motion-fast)`. Razón: el usuario reconoce la misma acción que ya ve en el header. (No se importa la clase de `MissionShell.module.css`: CSS Modules no se comparten entre features; se replica el valor por token, que es la fuente única.)
  - Botones del configurador: `.retry` se **suma a los grupos existentes** `.choice, .form button, .dialog button` (base `:65-78`), a sus `:hover`/`:active` (`:80-92`, con `:not(:disabled)` en la regla de `.retry`) y a `.form .submit:disabled` (`:98-102`: `border-color: var(--orbital-outline-variant)`, `color: var(--orbital-outline)`, `cursor: not-allowed`). Cero valores nuevos.
  - Picker: `.form .pickerButton` actual (`:130-140`: `border: 1px solid var(--orbital-header-border)`, `radius-md`, `background: var(--orbital-surface-container-low)`); hoy **no tiene hover** definido.
  - Isologo/DEVI/iconos: patrón `StackIcon` (`<img>`, `width`/`height` explícitos, `alt=""` junto a texto).

### Estados de interacción de lo nuevo/extendido

| Elemento | default | hover | focus | active | disabled | loading |
|---|---|---|---|---|---|---|
| `SignInLink` | lime / night (como header) | `filter: brightness(1.08)` (valor actual de `.authButtonPrimary:hover`) | ring global `3px solid var(--orbital-focus)` offset 3px (`globals.css:140-145`) | `background`+`border-color: var(--orbital-lime-strong)` | n/a (navegación) | n/a (navega fuera) |
| Reintentar (configurador, `.retry`) | outline lime pill (grupo `.choice`) | fondo lime / texto night | ring global | `lime-strong` | `outline-variant` / `outline`, not-allowed | texto "Reintentando…" + disabled |
| Trigger del picker | actual | `border-color: var(--orbital-border-strong)` (nuevo, token existente) | ring global | abierto (`aria-expanded="true"`): `border-color: var(--orbital-lime)` + chevron rotado | n/a | n/a |
| Link de marca (header) con isologo | actual | actual (`.loginBrand:hover` → `ink-muted`; `.brand` sin hover) | ring global | — | — | — |
| Iconos de franja / puertas | estático (`<img>`) | no interactivos (sin hover propio; la puerta ya tiene hover) | — | — | — | — |

### Motion

- Un solo momento nuevo: rotación del chevron, `transition: transform var(--orbital-motion-fast)` (160 ms, `cubic-bezier(0.23, 1, 0.32, 1)` — curva del proyecto, < 300 ms). Nunca `transition: all`.
- `@media (prefers-reduced-motion: reduce)`: `.chevron`, `.retry`, `SignInLink .action` → `transition: none`.

### CSS por archivo (todo con tokens; sin hex/`rgb()`)

- **`MyRouteStatus.module.css`**
  - `.notice { display: grid; gap: var(--orbital-space-3); justify-items: start; }`
  - `.formFeedback { display: grid; gap: var(--orbital-space-2); justify-items: start; margin: 0; color: var(--orbital-error); }` — `--orbital-error` es el token de estado de error existente; el `SignInLink` dentro conserva su propio color.
  - `.chevron { flex: none; width: 1rem; height: 1rem; margin-left: auto; transition: transform var(--orbital-motion-fast); }` + `.form .pickerButton[aria-expanded="true"] .chevron { transform: rotate(180deg); }`
  - `.form .pickerButton:hover { border-color: var(--orbital-border-strong); }` · `.form .pickerButton[aria-expanded="true"] { border-color: var(--orbital-lime); }`
  - `.pickerHint { margin: 0; color: var(--orbital-ink-muted); font-size: 0.875rem; line-height: 1.5; }` (misma familia que `.generated`, jerarquía por debajo del label).
  - `.retry` en los grupos existentes (ver arriba).
- **`SignInLink.module.css`** (nuevo): `.action` + `:hover` + `:active` + reduced-motion, valores citados arriba.
- **`LearningPathsEmptyState.module.css`** (nuevo): `.mascot { width: min(100%, 10rem); height: auto; }`. El `<img>` lleva `width={160} height={170}` (proporción del viewBox 292.5 × 310.69) para reservar espacio y evitar salto de layout.
- **`LearningPathsDashboard.module.css`**: solo se **borran** `.emptyRadar`, `.emptyRadar svg`, `.emptyRadar path`, `.emptyCore`, `.emptyNode` (quedan huérfanas al sacar el radar).
- **`MissionShell.module.css`**
  - `.brand { gap: var(--orbital-space-2); }` (ya es `display: flex; align-items: center`, `:44-50`).
  - `.loginBrand` suma `display: inline-flex; align-items: center; gap: var(--orbital-space-2);` (hoy es inline de texto).
  - `.brandMark { flex: none; width: 2rem; height: 2rem; }` — ≤ 2rem dentro de `min-height: 4rem` + `nowrap` (CA-5.6).
  - `.footerBrand` suma `display: inline-flex; align-items: center; gap: var(--orbital-space-2);` · `.footerMark { flex: none; width: 1.5rem; height: 1.5rem; }`
  - Se borra `.footerCredit`.
- **`page.module.css` (landing)**
  - `.doorHead { display: flex; align-items: center; gap: var(--orbital-space-3); margin-bottom: var(--orbital-space-2); }` y el `h3` dentro de `.doorHead` con `margin: 0` (el margen pasa al contenedor).
  - `.stackStrip { display: flex; flex-wrap: wrap; gap: var(--orbital-space-2); margin: 0; padding: 0; list-style: none; }` (CA-5.9: envuelve en 375 px, sin scroll horizontal).

### Header e isologo (CA-5.6)

`<Link className={styles.brand} href="/" aria-label="DevTalles, inicio"><img className={styles.brandMark} src={BRAND_ASSETS.isologo} alt="" width={32} height={32} />DevTalles</Link>` — ídem en `.loginBrand`. Sin `loading="lazy"` (está above the fold). Variante `ISOLOGO COLOR`: su círculo `#130c25` se funde con el header y la marca blanca queda ≈ 18:1 (explore §6).

### Footer (Q-2)

- **Product:** `<span className={styles.footerBrand}><img className={styles.footerMark} src={BRAND_ASSETS.isologo} alt="" width={24} height={24} />DevTalles</span>` — sin `•`, sin crédito.
- **Login:** `<span className={styles.loginFooterBrand}>DevTalles</span>` solo. El isologo no entra: el footer login trabaja a `0.75rem` (`:378`); una marca legible (≥ 1.25rem) rompería la escala de esa franja y duplica el isologo del header a una pantalla de distancia. Decisión dentro de "si encaja".

### Empty state con DEVI (CA-5.7)

`<img className={emptyStyles.mascot} src={BRAND_ASSETS.deviHello} alt="" width={160} height={170} />` en lugar del `<div className={styles.emptyRadar}>`. Decorativa: el h2 da el mensaje. Variante BORDER por contraste (el contorno `#0a0613` sin borde se pierde sobre `surface-container-lowest`). C1 (DEVI en el vacío del configurador) **no entra** en este ciclo: el configurador ya tiene jerarquía propia y la spec lo marca Could.

### Landing

- **Puertas (CA-5.8):** `LandingDoor` suma `readonly stackPathId: OfficialPathId | null` (`start`→`programas-fundamentos`, `switch`→`programas-react`, `specialize`→`programas-nest`, `unknown`→`null`). En `page.tsx` el `h3` se envuelve en `<div className={styles.doorHead}>` con `{door.stackPathId ? <StackIcon pathId={door.stackPathId} size="md" /> : null}` antes del `h3`. `alt=""` (el `h3` es el texto). Se usa campo explícito y no se deriva del `href`, porque `unknown` tiene `path=programas-fundamentos` en la URL pero no debe mostrar el logo de JavaScript (CA-3.6).
- **Hrefs (CA-3.1):** literales en el fixture: `/configurador-de-ruta?panel=form&path=programas-fundamentos` (start y unknown), `…&path=programas-react`, `…&path=programas-nest`.
- **Puerta `unknown` (CA-3.6, S1):** description → *"¿No tenés claro por dónde ir? Empezá por Fundamentos en el formulario. Si preferís que tu IA te arme una ruta a medida, en el configurador también tenés el MCP."*; metadata `["Nivel", "Inicial"]`.
- **Franja (CA-5.9):** dentro del hero, inmediatamente debajo de `.telemetryStrip` (junto al dato "Rutas oficiales N": los iconos ilustran ese número, no son relleno):
  `<ul className={styles.stackStrip} aria-label="Tecnologías de las rutas oficiales">{OFFICIAL_PATHS.map(p => <li key={p.id}><StackIcon pathId={p.id} size="sm" standaloneLabel={p.label} /></li>)}</ul>`
  Tamaño `sm` (24 px): en el hero la franja acompaña, no compite con el H1 y el CTA; `md` × 13 dominaría la columna en 375 px.
- `page.tsx` sigue siendo Server Component sin `fetch|axios|localStorage|sessionStorage|useRouter` (CA-3.5).

## Seguridad

- Input no confiable: query de `/configurador-de-ruta` → allowlist estricta en el parser (CA-3.3); nunca se interpola en HTML ni en URLs. El backend sigue validando `catalogPathId` (422); el front no es frontera.
- `returnTo` del CTA: literal de la app; `loginReturnTarget` ya lo acota a ruta relativa.
- Assets: SVG inertes verificados (explore §6) y servidos como `<img>` (el navegador no ejecuta scripts de un SVG en `<img>`); test estático de inercia como segunda barrera (CA-5.4).
- Sin `dangerouslySetInnerHTML`, sin tokens nuevos en storage, sin retry automático.

## Orden de tests (caracterización primero)

Cada paso: test escrito → corrido → verde (caracterización) o rojo esperado (nuevo) → código → verde.

1. **Caracterización `mapApiResponseError`** — `test/src/lib/api-auth-policy.test.ts` (CA-6.1): con `response` → `codigoEstado`/`cuerpo`; sin `response` → sin `codigoEstado`. Verde contra el código actual; el código no se toca.
2. **`asApiError`** — `test/src/lib/errors.test.ts` (CA-6.2): verde contra el código actual.
3. **Caracterización `LearningPathsDashboard` error** (en `LearningPathsDashboard.test.tsx`): `load` rechaza con `Error` plano y con `codigoEstado: 503` → `role="alert"` "No pudimos cargar tus rutas" + Reintentar; clic → `load` ×2; botón deshabilitado mientras carga. Verde hoy **y** sigue verde después (se convierte en el test de CA-1.2; no se reescribe).
4. **Caracterización `MyRouteStatus`** carga fallida (→ alert "No pudimos cargar tus rutas") y submit fallido (→ contiene "No se pudo crear la ruta"). Verde hoy, verde después.
5. `apiErrorCode` (rojo → implementar en `lib/errors.ts`).
6. `route-errors.test.ts` en `test/src/features/learning-paths/lib/` (rojo → implementar): 401 / 0 / 500 / 503 con y sin `CATALOG_UNAVAILABLE` / 422 / no-Error.
7. `configurator-deep-link.test.ts` (CA-3.3: válido, desconocido, `../x`, `panel=mcp`, `panel=FORM`, array, ausente) → implementar. Test estático de `configurador-de-ruta/page.tsx` (CA-3.2: sin `"use client"`, sin `useSearchParams`, contiene `await searchParams` y `parseConfiguratorDeepLink`).
8. Fixture de landing (CA-3.1: mapeo exacto + cada `path` ∈ `OFFICIAL_PATHS`; `stackPathId` de `unknown` = `null`; metadata `["Nivel","Inicial"]`) → cambiar fixture.
9. Dashboard nuevos (CA-1.1, 1.3, 1.5) → `SignInLink` + estado `unauthorized`.
10. `MyRouteStatus` nuevos (CA-2.1–2.7, CA-3.4, CA-4.1–4.3) → implementar. Reescritura de asserts de vacío (`:31,65,47,70`) al copy nuevo **en el mismo commit** que cambia el copy.
11. Marca: `test/src/config/brand-assets.test.ts` (CA-5.3 literal solo en el mapa + archivos existen; CA-5.4 inercia) → vendorizar SVG + `brand-assets.ts`. `fase-0/dom.test.tsx:78-79,98-100` reescritos (CA-5.1, sin `/code\s*quest/i` en shell; isologo `img[alt=""]` en header) → `MissionShell`. `routes-dom.test.tsx:81` → `img[src$="devi-hello.svg"]` con `alt=""` → empty state. Landing (CA-5.8 iconos por puerta, `unknown` sin icono; CA-5.9 `OFFICIAL_PATHS.length` imgs con `alt` = label; test estático `flex-wrap: wrap` en `.stackStrip`) → `page.tsx`.
12. Guardas estáticas extendidas:
    - `shell-chrome.static.test.ts`: `LUCIDE_FILES[MyRouteStatus.tsx]` += `"ChevronDown"`; `ICON_USAGE` += `ChevronDown` (CA-4.4).
    - `copy-voice.static.test.ts`: `LIVE_COPY_FILES` += `LearningPathsDashboard.tsx`, `SignInLink.tsx`, `MyRouteStatus.tsx`/`LearningPathsEmptyState.tsx` si no están (CA-6.3).
    - `tokens.static.test.ts`: `TOKENIZED_CSS` += `SignInLink.module.css`, `LearningPathsEmptyState.module.css` (CA-5.10). Los otros tocados ya están listados, salvo `LearningPathsDashboard.module.css` (ver decisión abajo).
13. Suite completa del frontend + typecheck + lint + `next build` (CA-7.1). `verify` además: sha256 origen/destino de los 2 SVG (CA-5.2) y gate visual manual (contraste `StackIcon` sobre `.door`, 375 px).

## Decisiones de diseño (para el checkpoint)

1. **`LearningPathsDashboard.module.css` NO se agrega a `TOKENIZED_CSS`.** ❌ La spec (CA-5.10) pide agregarlo "si se toca". 💡 Tiene 12 literales `rgb()` preexistentes (`:89,177,179,292,314,333,338,387,389,421,467,491`); agregarlo obliga a tokenizarlos y uno (`rgb(87 48 146 / 30%)`, `#573092`) **no tiene token equivalente** → token nuevo = regla del pedido incompleto, y sería refactor de paso. ✅ Este diseño **no agrega ninguna declaración** a ese archivo (solo borra reglas huérfanas); todo CSS nuevo va a módulos nuevos que sí entran a la guardia. Se registra como **D-9** (literales preexistentes en `LearningPathsDashboard.module.css`, incluido un color sin token). Si el dev prefiere cumplir CA-5.10 literal, hace falta aprobar un token para `#573092` en este checkpoint.
2. Chevron único rotado por CSS (no alternar `ChevronUp`).
3. `SignInLink` = solo el link; el copy lo pone cada pantalla.
4. Formulario visible en todos los estados de carga del configurador.
5. `stackPathId` explícito en el fixture (no derivado del href).
6. Isologo en footer product sí, footer login no.
7. Franja con `StackIcon size="sm"` en el hero.
8. `panel=mcp` y parámetros desconocidos se ignoran.

## Deuda (se suma a D-1…D-8 de la spec)

- **D-8** (ahora aceptada por Q-4): diff mezclado con `ui-devtalles-polish`.
- **D-9** `LearningPathsDashboard.module.css` con 12 `rgb()` literales preexistentes y un color sin token (`rgb(87 48 146 / 30%)`); fuera de la guardia `tokens.static.test.ts`.

## ADR: no aplica (puerta de doble sentido)

Todo es frontend reversible por `git revert`: sin contrato de API, sin BD, sin componente de runtime nuevo (cola, cache, canal, scheduler). El paso de `/configurador-de-ruta` a render dinámico usa el mismo modelo que `/login` y se revierte en el mismo PR. Assets de marca como `<img>` ya cubiertos por ADR 0002 (marcas fuera de Lucide).

## Checkpoint

🔔 El dev aprueba este diseño (en particular la decisión 1 / D-9) antes de `sdd-tasks`.

📚 Referencias cargadas: `CodeQuest-2026/specs/ui-rutas-y-marca/explore.md`, `CodeQuest-2026/specs/ui-rutas-y-marca/spec.md`, `.cursor/rules/constitution-fases.mdc`, `.cursor/rules/constitution-codigo.mdc`, `.cursor/rules/frontend-layers.mdc` (adjunta), `.cursor/skills/frontend-reference/references/design-language.md`, código leído: `MyRouteStatus.tsx`/`.module.css`, `LearningPathsDashboard.tsx`/`.module.css`, `LearningPathsEmptyState.tsx`, `StackIcon.tsx`, `MissionShell.tsx`/`.module.css`, `app/(producto)/page.tsx`/`page.module.css`, `configurador-de-ruta/page.tsx`, `(acceso)/login/page.tsx`, `landing.fixture.ts`, `config/official-paths.ts`, `lib/errors.ts`, `features/auth/api/auth.service.ts`, `features/auth/lib/local-session.ts`, `app/globals.css`, tests `MyRouteStatus.test.tsx`, `shell-chrome.static.test.ts`, `tokens.static.test.ts`, `copy-voice.static.test.ts`, `configurator-layout.static.test.ts`, `header-responsive.characterization.test.ts`, `fase-0/dom.test.tsx`.

Lectura: .cursor/rules/constitution-fases.mdc e3160314
Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
