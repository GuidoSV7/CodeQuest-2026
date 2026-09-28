# Design — `auth-gate-rutas`

> Fase `sdd-design`. Fecha: 2026-09-27. Base: `explore.md` + `spec.md` (checkpoint de spec resuelto por el orquestador, ver §0).
> App: `CodeQuest-2026/frontend` (Next 16.3.5 App Router, React 19.3, zustand 5, vitest 3 + jsdom, tests con `createRoot` + `act`, sin Testing Library).

Lectura: .cursor/rules/constitution-fases.mdc e3160314
Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a

## 0. Decisiones del checkpoint de spec (aplicadas en este diseño)

| Punto | Resolución | Impacto en spec |
|---|---|---|
| Timeout de `/me` | 8 000 ms (`SESSION_READ_TIMEOUT_MS`) | sin cambio |
| Valores de demo | `"true"` y `"1"`, con `nodeEnv === "development"` obligatorio | sin cambio (D1) |
| Salir + backend caído | `cq_signed_out = "1"` + lectura `unreachable` → pantalla "No pudimos conectar" | sin cambio (CA-3.4) |
| Copy login | h1 **"Iniciá sesión para ver y armar tus rutas"** · texto **"Tus rutas se guardan en tu cuenta de DevTalles. Entrá con Discord para seguir."** · link **"Entrar"** | **reemplaza** el h1 de CA-4.2 ("Iniciá sesión para armar tus rutas") |
| Copy inalcanzable | h1 **"No pudimos conectar con el servidor"** · texto **"Probá de nuevo en unos segundos."** · botón **"Reintentar"** | **reemplaza** el texto de CA-4.5 ("Revisá tu conexión y probá de nuevo.") |

⚠️ El orquestador debe reflejar las dos filas de copy en `spec.md` (CA-4.2 y CA-4.5) antes de sellar `approve`; los tests de `apply` usan el copy de esta tabla. Todo el copy pasa el regex `TUTEO` de `copy-voice.static.test.ts` (`Iniciá`/`Entrá`/`Probá` no matchean: `(?!\p{L})` corta en la tilde).

## 1. Capas afectadas y dirección de dependencias

Frontend en capas (`frontend-layers.mdc`): **ruta → presentación → estado → datos**; ninguna capa importa hacia afuera.

```
app/(producto)/{mis-rutas,configurador-de-ruta}/layout.tsx   (Server, ruteo)
        │ importa
        ▼
features/auth/components/RequireSession.tsx                  (Client, presentación)
        │ lee/dispara                     │ usa
        ▼                                 ▼
stores/auth-session.ts  (estado global)   features/auth/components/SignInLink.tsx
        ▲ escribe                         features/auth/lib/return-to.ts (puro)
        │                                 config/brand-assets.ts
features/auth/components/AuthSessionHydrator.tsx             (Client, orquestación, montado en providers)
        │ llama
        ▼
features/auth/lib/demo-session.ts (política demo, puro)
features/auth/api/auth.service.ts → lib/axios (datos/HTTP)
        │ usa
        ▼
features/auth/lib/session-read.ts (clasificación + validación, puro)
features/auth/types/auth.types.ts (tipos)
```

Reglas que el diseño respeta:
- `RequireSession` **no importa HTTP** ni `auth.service` para leer sesión: solo el store (lectura + acción `requestSessionRead`). El único que llama a `fetchMeStatus` es el hydrator (una sola fuente de lectura).
- El store **no importa HTTP**: guarda estado y aplica resultados; no hace fetch.
- `session-read.ts` y `return-to.ts` son funciones puras sin React ni axios → tests unitarios sin mocks de red.
- Pages `(producto)/**/page.tsx`, `(producto)/layout.tsx`, `MissionShell`, `lib/axios.ts`, `lib/api-auth-policy.ts` (código) **no se tocan**.

## 2. Dónde vive cada pieza

| Pieza | Archivo | Capa | Responsabilidad |
|---|---|---|---|
| Tipos `SessionRead`, `SessionStatus` | `features/auth/types/auth.types.ts` | tipos | Unión discriminada de 3 ramas + `"unknown"` |
| Validación del body y clasificación de error | `features/auth/lib/session-read.ts` (**nuevo**) | dominio de cliente (puro) | `parseSessionUser`, `classifySessionReadError` |
| Lectura `/me` con timeout | `features/auth/api/auth.service.ts` → `fetchMeStatus` (**nuevo**) | datos | 1 request, nunca lanza, delega en `session-read.ts` |
| Política demo | `features/auth/lib/demo-session.ts` | política (pura) | fix D1 + `resolveOrbitalSessionRead` (**nuevo**) |
| Estado de sesión | `stores/auth-session.ts` | estado global | `sessionStatus`, `sessionReadRequest`, `applySessionRead`, `requestSessionRead`; invariantes en cada `set` |
| Hidratación / re-hidratación | `features/auth/components/AuthSessionHydrator.tsx` | orquestación | efecto dependiente de `sessionReadRequest`; cancelación |
| `returnTo` | `features/auth/lib/return-to.ts` (**nuevo**) | puro | `sessionReturnTo(pathname, location)` |
| Gate | `features/auth/components/RequireSession.tsx` + `.module.css` (**nuevos**) | presentación | 4 estados, no monta `children` salvo `authenticated` |
| Link Discord | `features/auth/components/SignInLink.tsx` + `.module.css` (**movidos**, contenido idéntico) | presentación | sin cambios de API |
| Layouts | `app/(producto)/mis-rutas/layout.tsx`, `app/(producto)/configurador-de-ruta/layout.tsx` (**nuevos**, Server) | ruteo | envuelven `children` en `RequireSession` |
| Asset | `public/devtalles-brand/devi-laptop.svg` + `BRAND_ASSETS.deviLaptop` | config | fuente única de marca |

## 3. Contratos e interfaces (firmas)

### 3.1 `features/auth/types/auth.types.ts` (se agrega; `SessionUser`/`SessionSnapshot` no cambian)

```ts
export type SessionRead =
  | { status: "authenticated"; user: SessionUser }
  | { status: "anonymous" }
  | { status: "unreachable" };

export type SessionStatus = SessionRead["status"] | "unknown";
```

### 3.2 `features/auth/lib/session-read.ts` (nuevo, puro)

```ts
export function parseSessionUser(body: unknown): SessionUser | null;
export function classifySessionReadError(error: unknown): SessionRead; // nunca "authenticated"
```

- `parseSessionUser`: `null` salvo que `body` sea objeto no nulo con `id` string no vacío, `displayName` string, `avatarUrl` string|null y `email` string|null. Valida **los 4 campos** que declara `SessionUser` (no solo `id`) para que el tipo de retorno no mienta: el backend los devuelve siempre (`backend/src/modules/identity/presentation/auth.controller.ts:88-93`, `null` explícito). Cubre CA-2.5 (`null`, `{}`, `{ id: 1 }` → `null`) y es más estricto que la spec; ⚠️ si el backend omitiera un campo nullable en vez de mandar `null`, la sesión caería en `unreachable` — hoy no pasa (verificado en el controller).
- `classifySessionReadError`: `asApiError(error).statusCode` (patrón ya usado en `learning-paths/lib/route-errors.ts`) — `401 | 403` → `{ status: "anonymous" }`; cualquier otro (0 = red/CORS/timeout `ECONNABORTED` porque `mapApiResponseError` no pone `codigoEstado` sin `response`; 5xx; 400/404/429) → `{ status: "unreachable" }`.

### 3.3 `features/auth/api/auth.service.ts`

```ts
export const SESSION_READ_TIMEOUT_MS = 8_000;

export async function fetchMeStatus(): Promise<SessionRead>;
// api.get<unknown>("/api/auth/me", { timeout: SESSION_READ_TIMEOUT_MS })
// 200 → parseSessionUser(data) ? authenticated : unreachable
// catch (error) → classifySessionReadError(error)
```

- `fetchMe` **no cambia** (firma, cuerpo, comportamiento: CA-2.6). `logoutSession`, `discordStartUrl`, `authEntryPath` no cambian.
- El `catch` no es "catch que devuelve un default" (constitución → Anti-invención): la función **es** un clasificador total; cada error tiene rama explícita y testeada (CA-2.3), ninguno se pierde como `null` ambiguo.
- `timeout` por request existe en `AxiosRequestConfig` (verificado en spec: `axios/index.d.ts`). El `timeout: 30_000` global de `lib/axios.ts` no se toca (D-4).

### 3.4 `features/auth/lib/demo-session.ts`

```ts
// cambio D1 (una expresión):
return environment.nodeEnv === "development"
  && (environment.demoSession === "true" || environment.demoSession === "1");

// nuevo:
export function resolveOrbitalSessionRead(
  environment: OrbitalDemoEnvironment,
  readSession: () => Promise<SessionRead>,
): Promise<SessionRead>;
// demo → Promise.resolve({ status: "authenticated", user: orbitalDemoSessionFixture }) sin invocar readSession
// sino → readSession()
```

- Los valores aceptados se expresan como allowlist literal (no `.toLowerCase()`, no `Boolean(...)`): `"TRUE"`, `"0"`, `""` → `false` (CA-1.1).
- `resolveOrbitalSession` (versión `SessionUser | null`) **se conserva sin cambios** porque `demo-session.test.ts:30-56` no se modifica (spec). Queda sin caller productivo → deuda D-9 (§11).
- `readSignedOut`, `markSignedOut`, `clearSignedOut`, `sessionAfterSignOut` sin cambios.

### 3.5 `stores/auth-session.ts` — estados y acciones

```ts
type AuthState = {
  user: SessionUser | null;
  hydrated: boolean;
  sessionStatus: SessionStatus;      // inicial "unknown"
  sessionReadRequest: number;        // inicial 0; id de la lectura vigente
  setUser: (user: SessionUser | null) => void;
  setHydrated: (value: boolean) => void;
  clear: () => void;
  applySessionRead: (read: SessionRead, request: number) => void;
  requestSessionRead: () => void;
};
```

**Invariantes (CA-3.2)** — cada acción escribe los tres campos en **un solo `set`**, nunca por partes:
- I1: `sessionStatus === "authenticated"` ⇔ `user !== null`
- I2: `hydrated === true` ⇔ `sessionStatus !== "unknown"`

| Acción | Efecto | Nota |
|---|---|---|
| `applySessionRead(read, request)` | Si `request !== sessionReadRequest` → **no-op** (lectura vieja). Sino: `authenticated` → `{ user: read.user, sessionStatus: "authenticated", hydrated: true }`; `anonymous`/`unreachable` → `{ user: null, sessionStatus: read.status, hydrated: true }` | Guarda de carrera CA-3.6, determinista y testeable sobre el store real. |
| `requestSessionRead()` | `{ user: null, hydrated: false, sessionStatus: "unknown", sessionReadRequest: n + 1 }` | **Es la re-hidratación** (CA-3.6). La dispara `RequireSession` (Reintentar). |
| `clear()` | `{ user: null, sessionStatus: "anonymous", hydrated: true }` | CA-3.3. Antes solo `user: null`; `hydrated` ya era `true` en el único caller (`ShellAccount` muestra "Salir" solo con `hydrated && user`), así que no cambia nada observable fuera de `sessionStatus`. |
| `setUser(user)` | `user` ? `{ user, sessionStatus: "authenticated", hydrated: true }` : `{ user: null, sessionStatus: "anonymous", hydrated: true }` | Se conserva por CA-3.1. Semántica ajustada para no romper I1/I2. Sin caller productivo tras el cambio (el hydrator pasa a `applySessionRead`) → D-10. |
| `setHydrated(value)` | `false` → `{ hydrated: false, user: null, sessionStatus: "unknown" }`; `true` con `unknown` → `{ hydrated: true, sessionStatus: "anonymous" }`; `true` ya hidratado → no-op | Ídem. |

- **Tests que hacen `useAuthStore.setState({ user, hydrated })` a mano** (routes-dom, assessment-dom, replanning-dom, dom.test, ShellAccount.test): siguen compilando (merge parcial de zustand) y no leen `sessionStatus`, así que siguen verdes sin modificarse (CA-3.1). No renderizan `RequireSession`. Los tests **nuevos** resetean con `useAuthStore.setState(useAuthStore.getInitialState(), true)` (API de zustand 5; verificar en `node_modules/zustand` al implementar) para no heredar `sessionStatus` entre casos.
- No hay persistencia (`persist`) ni middleware nuevo.

### 3.6 `AuthSessionHydrator.tsx` — orquestación y re-hidratación

**Decisión: la re-hidratación es una acción del store (`requestSessionRead`) que el hydrator observa**, no una función exportada por el hydrator.
- ✅ Por qué: `RequireSession` queda sin dependencia de HTTP ni del hydrator (solo store); hay una sola fuente que lee `/me`; la cancelación del efecto que ya existe (`cancelled`) cubre desmontaje y reintento con el mismo mecanismo.
- ❌ Alternativa descartada: exportar `rehydrateSession()` desde el hydrator o hacer que el store llame `fetchMeStatus` → mete HTTP en el store o acopla presentación con orquestación, y duplica la lógica de demo/signedOut.

```tsx
export function AuthSessionHydrator() {
  const sessionReadRequest = useAuthStore((s) => s.sessionReadRequest);
  const applySessionRead = useAuthStore((s) => s.applySessionRead);

  useEffect(() => {
    captureLocalSessionFromLocation(window.location, sessionStorage, (url) => {
      window.history.replaceState(null, "", url);
    });
    let cancelled = false;
    void (async () => {
      const environment = { nodeEnv: process.env.NODE_ENV, demoSession: process.env.NEXT_PUBLIC_ORBITAL_DEMO_SESSION };
      const read = readSignedOut()
        ? await fetchMeStatus()
        : await resolveOrbitalSessionRead(environment, fetchMeStatus);
      if (cancelled) return;
      if (read.status === "authenticated") clearSignedOut();
      applySessionRead(read, sessionReadRequest);
    })();
    return () => { cancelled = true; };
  }, [sessionReadRequest, applySessionRead]);

  return null;
}
```

- Equivalencia con hoy: con `cq_signed_out = "1"` se salta la demo y se lee de verdad; si la lectura da usuario se limpia la marca (igual que `if (user) clearSignedOut()` + `setUser(readSignedOut() ? null : user)` actual). Nuevo: `signedOut + unreachable → unreachable` (checkpoint).
- **Doble guarda de carrera**: `cancelled` (desmontaje / StrictMode / cambio de `sessionReadRequest` → cleanup) + `request` en `applySessionRead` (si la promesa vieja resuelve entre el `set` y el commit del re-render, el store la descarta). CA-3.5 prueba la primera, CA-3.6 la segunda.
- `captureLocalSessionFromLocation` corre también en cada reintento: sin `#cq_session` es no-op (CA-6.3 lo fija).
- Tests por string que cambian (declarados en la tabla "Asserts que se reescriben" de la spec): `fase-0/auth.characterization.test.ts:20-22` y `fase-2/auth-session-hydrator.test.ts:17-19` pasan de `toContain("resolveOrbitalSession" | "fetchMe" | "setHydrated(true)")` a `toMatch(/\bresolveOrbitalSessionRead\b/)`, `toMatch(/\bfetchMeStatus\b/)`, `toMatch(/\bapplySessionRead\b/)`. El `not.toContain("axios")` y los asserts de `HomeAuthStatus` quedan intactos. Ninguno se borra.

### 3.7 `features/auth/lib/return-to.ts` (nuevo, puro)

```ts
export function sessionReturnTo(
  pathname: string,
  location: Pick<Location, "pathname" | "search">,
): string;
// location.pathname === pathname ? pathname + location.search : pathname
```

- `pathname` viene de `usePathname()` (fuente de verdad del App Router durante el render); `location` es `window.location`.
- **Por qué la guarda**: en navegación cliente (usuario anónimo en `/` que toca "Mis rutas"), el render del layout nuevo puede ocurrir antes de que el router haga `pushState`; leer solo `window.location` daría `returnTo = "/"` y el login volvería a la landing. Si la URL ya está comprometida (carga directa o deep link externo, el caso de CA-4.3) se conserva la query; si no, se usa solo el path. El `hash` nunca entra (no se lee). Esto **precisa** CA-4.3 sin contradecirlo: los dos ejemplos de la spec son cargas directas.
- Sin `useSearchParams` → sin `<Suspense>` extra ni bail-out de prerender.
- La defensa de open redirect sigue en `loginReturnTarget` (vía `discordStartUrl`); CA-4.4 se fija sobre el `href` final.

### 3.8 `RequireSession.tsx` (nuevo, `"use client"`)

```tsx
export function RequireSession({ children }: Readonly<{ children: ReactNode }>): ReactNode;
```

| `sessionStatus` | Render | `children` | Lee `window` |
|---|---|---|---|
| `"unknown"` | `<p role="status" className={styles.checking}>Verificando tu sesión…</p>` dentro de `.gate` | no | **no** (es el HTML de SSR → sin mismatch) |
| `"anonymous"` | `<section aria-labelledby="session-gate-title">`: `<img src={BRAND_ASSETS.deviLaptop} alt="" width={160} height={177}>`, `h1#session-gate-title`, `p`, `<div className={styles.actions}><SignInLink returnTo={sessionReturnTo(pathname, window.location)} /></div>` | no | sí (solo esta rama, siempre post-hidratación) |
| `"unreachable"` | `<section role="alert" aria-labelledby="session-gate-title">`: mismo `img`, `h1`, `p`, `<button type="button" onClick={requestSessionRead}>Reintentar</button>` | no | no |
| `"authenticated"` | `<>{children}</>` (sin wrapper, CA-4.6) | sí | no |

- Subcomponentes internos no exportados en el mismo archivo (`SessionChecking`, `SignInGate`, `UnreachableGate`); un solo archivo < 100 líneas. No se crea Container/Presentational extra.
- `width/height`: viewBox 267.11×296.16 → 160 × 177,4 → **160 × 177** (dentro de ±1 px, CA-4.2). Mismo ancho que DEVI en `LearningPathsEmptyState` (160).
- **"Botón deshabilitado mientras está en `unknown`" (CA-4.5)**: al hacer clic, `requestSessionRead` pone `unknown` y la vista pasa a "Verificando tu sesión…"; el botón **deja de existir**, así que no hay doble disparo posible. El test lo fija como `querySelector("button") === null` durante `unknown` + `fetchMeStatus` con exactamente 2 llamadas. Si el dev prefiere mantener el panel de error con el botón `disabled` + `aria-busy` durante el reintento, es un cambio chico de presentación: decidir en este checkpoint.
- `SignInLink` se envuelve en `.actions` porque su CSS trae `justify-self: start` (valor actual leído en `SignInLink.module.css:5`); el wrapper es el grid item centrado y no se edita `SignInLink` (CA-7.1: contenido idéntico).

### 3.9 Layouts (Server Components, sin `"use client"`)

```tsx
// app/(producto)/mis-rutas/layout.tsx  (idéntico en configurador-de-ruta, nombre ConfiguradorDeRutaLayout)
import { RequireSession } from "@/features/auth/components/RequireSession";

export default function MisRutasLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RequireSession>{children}</RequireSession>;
}
```

- Misma forma de props que `(producto)/layout.tsx` (patrón existente, no `LayoutProps<>`).
- `metadata` sigue en cada page. `/configurador-de-ruta` sigue siendo dinámica (su page lee `searchParams`); `/mis-rutas` se prerenderiza con el estado `unknown`.
- Cubren las 7 URLs del explore (subrutas heredan el layout).

## 4. Límite de transacción

No hay BD ni repositorios. El equivalente de atomicidad es el store: **cada transición de sesión es un único `set` con `user` + `hydrated` + `sessionStatus` juntos**; nunca `setUser` seguido de `setHydrated` (hoy son dos `set` y entre ambos existe un estado intermedio observable). Eso es lo que hace verificables I1/I2 por acción.

## 5. Versión del contrato

Sin cambio de contrato de API: `GET /api/auth/me` y `/api/auth/discord/start` se consumen igual (request y response). `fetchMe` conserva firma. `SessionRead` es un tipo interno del frontend. **No hay bump de versión.**

## 6. Flujo feliz y "errores de negocio" (ramas de sesión)

El frontend no emite errores de API; los "errores" son ramas clasificadas de la lectura.

| Situación | Clasificación (`fetchMeStatus`) | Store | Pantalla |
|---|---|---|---|
| 200 con `SessionUser` válido | `authenticated` | `authenticated`, `user` | `children` |
| Demo habilitada (dev + `"true"`/`"1"`, sin `cq_signed_out`) | (no hay request) `authenticated` fixture | `authenticated` | `children` |
| 401 / 403 | `anonymous` | `anonymous` | Login con DEVI + Entrar |
| Red caída / CORS / timeout 8 s (`statusCode 0`) | `unreachable` | `unreachable` | "No pudimos conectar con el servidor" + Reintentar |
| 5xx / 400 / 404 / 429 | `unreachable` | `unreachable` | ídem |
| 200 con body inválido (`null`, `{}`, `{ id: 1 }`, campos faltantes) | `unreachable` | `unreachable` | ídem |
| Salir (`ShellAccount` → `markSignedOut` + `clear`) | — | `anonymous` | Login sin recargar (CA-3.3) |
| Recarga tras Salir + backend caído | `unreachable` | `unreachable` | "No pudimos conectar" (checkpoint) |
| Reintentar → 200 | `authenticated` | `authenticated` | `children` montan (recovery) |
| Reintentar → 401 | `anonymous` | `anonymous` | Login |
| Token vencido en una pantalla ya montada | — (el gate ya pasó) | `authenticated` | estados 401 de `ui-rutas-y-marca` como respaldo; `UserRouteDiagram` sin 401 (D-5) |

## 7. UI — Lenguaje visual

**Modo: conformidad elevada.** El proyecto tiene sistema Orbital completo (`app/globals.css` con `--orbital-*`) y un precedente directo del mismo rol: `LearningPathsEmptyState` (DEVI + h2 + p + acción en panel). **Superficie: producto** (pantalla de acceso dentro del shell de producto): legibilidad manda; la marca aparece en dosis (DEVI, acento lima del botón).

### 7.1 Qué se extiende (rutas exactas, valores leídos)
- Panel: patrón `.state`/`.empty` de `features/learning-paths/components/LearningPathsDashboard.module.css` (bloque final l.476-523 que es el que gana en cascada: `padding: var(--orbital-space-6)`, `border-radius: var(--orbital-radius-xl)`, fondo `--orbital-surface-container-*`, h2 `--orbital-font-display` + `--orbital-on-surface`, p `--orbital-font-body` + `--orbital-on-surface-variant` + `1.125rem`). **No** se copia su `border: 1px solid rgb(120 94 172 / 20%)` (literal que `tokens.static.test.ts` prohibiría): se usa `var(--orbital-border)`.
- Mascota: `.mascot` de `LearningPathsEmptyState.module.css` (`width: min(100%, 10rem); height: auto`).
- Link Entrar: `SignInLink` tal cual (lima, `--orbital-font-telemetry`, hover `filter: brightness(1.08)`, active `--orbital-lime-strong`, transición con `--orbital-motion-fast`).
- Botón Reintentar: **mismos valores que `SignInLink .action`** (para que las dos acciones primarias del gate se vean iguales) + reset de `<button>` (`font: inherit` sobre la familia telemetry, `cursor: pointer`).
- Foco: el anillo global `button:focus-visible, a:focus-visible { outline: 3px solid var(--orbital-focus); outline-offset: 3px }` (`globals.css:140-145`) cubre Entrar y Reintentar; no se redefine.

### 7.2 `RequireSession.module.css` (clases y tokens)

| Clase | Propiedades (solo tokens o valores ya usados en el sistema) |
|---|---|
| `.gate` | `display: grid; justify-items: center; align-content: center; gap: var(--orbital-space-4); min-height: 34rem` (mismo alto que `.empty`, evita salto entre `unknown` → login/error); `padding: clamp(var(--orbital-space-5), 5vw, var(--orbital-space-7))`; `border: 1px solid var(--orbital-border)`; `border-radius: var(--orbital-radius-xl)`; `background: var(--orbital-surface-container-lowest)`; `text-align: center` |
| `.mascot` | `width: min(100%, 10rem); height: auto` |
| `.title` (h1) | `margin: 0; color: var(--orbital-on-surface); font-family: var(--orbital-font-display); font-size: 2.25rem` (≤ 34rem: `1.5rem`); `text-wrap: balance`; sin `text-transform` |
| `.copy` (p) | `margin: 0; max-inline-size: 36ch; color: var(--orbital-on-surface-variant); font-family: var(--orbital-font-body); font-size: 1.125rem; line-height: 1.5` |
| `.checking` | `margin: 0; color: var(--orbital-on-surface-variant); font-family: var(--orbital-font-telemetry); font-size: 0.875rem` |
| `.actions` | `display: flex; justify-content: center; margin-top: var(--orbital-space-2)` (agrupa la acción con el texto y la separa del título: ritmo `space-4` entre bloques, `space-2` extra antes de la acción) |
| `.retry` | valores de `SignInLink .action` (`min-height: 2.75rem; padding: 0 var(--orbital-space-4); border: 1px solid var(--orbital-lime); border-radius: var(--orbital-radius-sm); background: var(--orbital-lime); color: var(--orbital-night); font-family: var(--orbital-font-telemetry); font-size: 0.875rem; font-weight: 700; letter-spacing: 0.04em`) + `cursor: pointer`; `transition: background var(--orbital-motion-fast), border-color var(--orbital-motion-fast), filter var(--orbital-motion-fast)` (propiedades listadas, nunca `all`) |
| `.panel` (contenido de login/error) | entrada `@keyframes` opacidad 0→1 + `translateY(var(--orbital-space-2))`→0 con `animation: … var(--orbital-motion-fast) both` (160 ms, curva ease-out del token) — **el único momento de motion**: suaviza el paso "Verificando…" → login/error |
| `@media (prefers-reduced-motion: reduce)` | `.panel { animation: none }`, `.retry { transition: none }` |
| `@media (max-width: 34rem)` | `.title { font-size: 1.5rem }`, `.retry`, `.actions > *` a `width: 100%` (igual que `.primaryAction` en el mismo breakpoint) |

- Cero hex / `rgb()` / fallbacks con hex → se agrega a `TOKENIZED_CSS` de `tokens.static.test.ts` (CA-4.10).
- ⚠️ **Token faltante (checkpoint):** el proyecto **no tiene tokens de escala tipográfica** (`--orbital-*` no define font-size); todo el CSS existente usa literales `rem` (`2.25rem`, `1.125rem`, `0.875rem`). Este diseño reutiliza **exactamente esos literales ya presentes** y no introduce valores nuevos: h1 `2.25rem` (`.empty h2`, `mis-rutas/page.module.css:24`) y `1.5rem` en móvil (`MissionShell.module.css:56`, `LearningPathsDashboard.module.css:365`). Opciones para el dev: (a) aceptar los literales existentes (recomendado, conformidad), o (b) crear `--orbital-text-*` → fuera de scope, iría como deuda D-11.
- Sin iconos (ninguno agrega significado; DEVI es ilustración de marca, no icono).

### 7.3 Estados de interacción de los componentes nuevos

| Elemento | default | hover | focus | active | disabled | loading |
|---|---|---|---|---|---|---|
| Entrar (`SignInLink`, existente) | lima / texto `--orbital-night` | `brightness(1.08)` | anillo global `--orbital-focus` 3px | `--orbital-lime-strong` | n/a (`<a>`) | n/a (navega a Discord) |
| Reintentar (`.retry`) | ídem Entrar | ídem | anillo global | ídem | `cursor: not-allowed; opacity: 0.55` (valor de `.secondaryAction:disabled` existente) — definido por completitud; en el flujo actual el botón no se renderiza en `unknown` (§3.8) | se reemplaza por el panel "Verificando tu sesión…" (`role="status"`) |
| Panel gate | estático | — | — | — | — | `unknown` = `.checking` en el mismo `.gate` (mismo alto) |

### 7.4 Gate de verify (CA-4.11)
Capturas 375 y 1280 px de `anonymous` y `unreachable` sobre `/mis-rutas`. Criterios a mirar: DEVI con silueta blanca visible sobre `--orbital-surface-container-lowest`, h1 sin cortes feos en 375 (`text-wrap: balance`), botón a ancho completo en móvil, sin salto de layout al pasar de "Verificando…" al panel.

## 8. Seguridad

- El gate es UX; la frontera real sigue siendo `SessionAuthGuard` (401 por endpoint). Nada del cliente decide permisos.
- Respuesta de `/me` = input no confiable → `parseSessionUser` antes de guardar en el store (CA-2.5).
- Timeout explícito 8 s en la llamada (constitución → situacional "llamada a servicio externo"). Sin reintento automático (W7); el manual es idempotente (GET).
- `returnTo` controlado por URL → `loginReturnTarget` descarta `//…` y absolutos; `hash` (token `#cq_session`) nunca viaja en `returnTo`.
- DEVI solo como `<img>` (SVG con `<style>` interno; inline chocaría clases), asset inerte verificado en explore.
- Sin `dangerouslySetInnerHTML`, sin tokens en `localStorage` (se mantiene `sessionStorage`).

## ADR: no aplica (puerta de doble sentido)

Explore: reversible con un revert, sin consumidor externo, sin componente de runtime nuevo. D1 **alinea** el código con el ADR vigente `decisions/0001-ui-stitch-orbital.md` (accepted: demo solo en `development` y con valor explícito; se aceptan `"true"` y `"1"` por los dos párrafos del ADR). No hace falta ADR nuevo.

## 9. Tests — orden (caracterización primero) y archivos

Ubicaciones siguen la convención `test/src/<espejo de src>`; DOM con `// @vitest-environment jsdom`, `createRoot` + `act`, `IS_REACT_ACT_ENVIRONMENT = true` (patrón de `ShellAccount.test.tsx`). Red mockeada en `@/lib/axios` (`vi.mock("@/lib/axios", () => ({ default: { get } }))`, patrón de `load-my-routes.test.ts`). Env con `vi.stubEnv("NODE_ENV", "development")` + `vi.stubEnv("NEXT_PUBLIC_ORBITAL_DEMO_SESSION", …)` y `vi.unstubAllEnvs()` en `afterEach`.

| Paso | Test | Contra qué código | Estado esperado |
|---|---|---|---|
| **0** | `features/auth/lib/local-session.test.ts`: agregar CA-6.3 (sin `cq_session` no llama `setItem`/`replace`; `#cq_session=x&tab=2` → `…#tab=2`; `read(undefined)` → `null`; `clear` llama `removeItem("cq_session_token")`) | actual | verde (vitest no typechequea) |
| 0b | Estrechar firmas (`Pick<…>`, CA-6.1) y quitar los 3 casts; fakes inline con solo los miembros de la firma | nuevo | verde + `tsc --noEmit` 0 errores → **commit 1** |
| **1** | **Caracterización** `features/auth/api/auth.service.test.ts` → `describe("fetchMe (caracterización)")`: 200 → user; rechazo con `codigoEstado 401` → `null`; rechazo sin respuesta → `null` | actual | verde |
| **2** | **Caracterización** `features/auth/components/AuthSessionHydrator.test.tsx` → `describe("caracterización")`, aserciones **sobre el store y la red mockeada en axios, no sobre nombres internos** (así sobrevive al refactor sin tocarse): dev + demo `"1"` → `api.get` 0 llamadas, `user` = fixture, `hydrated` true; `cq_signed_out = "1"` + 200 → `api.get` 1 llamada, `user` del body, marca borrada; `cq_signed_out = "1"` + rechazo → `user null`, `hydrated true` | actual | verde, y **sigue verde sin modificarse** después de los pasos 4-5 |
| **3** | `fase-2/demo-session.test.ts`: reescritura declarada l.9-28 → matriz table-driven CA-1.1 (4 × 7 = 28 combos, 2 `true`) | actual | **rojo** (fija el bug) |
| 3b | Fix D1 en `isOrbitalDemoSessionEnabled`; tests de `resolveOrbitalSessionRead` (demo → fixture sin llamar lector; dev sin variable → lector 1 vez) | nuevo | verde; l.30-69 intactas y verdes |
| **4** | `features/auth/lib/session-read.test.ts`: `parseSessionUser` (válido, `null`, `{}`, `{ id: 1 }`, `id: ""`, falta `avatarUrl`), `classifySessionReadError` (401, 403, 0, 500, 503, 404, 429, `new Error` sin código, valor no-Error) | — | rojo → verde |
| 4b | `auth.service.test.ts` → `describe("fetchMeStatus")`: CA-2.1–2.5 + `get` recibe `("/api/auth/me", { timeout: 8000 })` + `SESSION_READ_TIMEOUT_MS === 8_000`; caracterización del paso 1 sigue verde | — | rojo → verde |
| **5** | `stores/auth-session.test.ts`: invariantes I1/I2 exhaustivos (4 estados iniciales × cada acción pública con cada argumento representativo), `clear` → `anonymous`, `applySessionRead` con `request` viejo → no-op, `requestSessionRead` incrementa y vuelve a `unknown` | — | rojo → verde |
| 5b | `AuthSessionHydrator.test.tsx` → `describe("lectura de 3 ramas")` (mock parcial de `auth.service` con `vi.mock(..., async (importOriginal) => …)` sobre `fetchMeStatus`): 6 ramas CA-3.4; cancelación CA-3.5 (resolver tras `unmount` → `unknown`); carrera CA-3.6 (dos lecturas resueltas en orden inverso → gana la de `request` mayor) | — | rojo → verde (hydrator refactorizado) |
| 5c | Reescribir strings en `fase-0/auth.characterization.test.ts` y `fase-2/auth-session-hydrator.test.ts` a regex con `\b` (§3.6) | — | verde |
| **6** | CA-5: copiar SVG byte a byte, `BRAND_ASSETS.deviLaptop`; `config/brand-assets.test.ts` sin cambios lo cubre | — | verde |
| 6b | CA-7: mover `SignInLink.*`, actualizar 2 imports + rutas en `copy-voice.static.test.ts` y `tokens.static.test.ts` | — | verde (tests de dashboard/MyRouteStatus/routes-dom sin tocar) |
| **7** | `features/auth/lib/return-to.test.ts`: path solo, path + query con URL comprometida, URL no comprometida → solo path, hash ignorado | — | rojo → verde |
| 7b | `features/auth/components/RequireSession.test.tsx` (mock `next/navigation` `usePathname`; `window.history.replaceState` para fijar URL): CA-4.1 (hijo espía 0 renders, `role="status"`), CA-4.2 (img/h1/p/href con copy de §0), CA-4.3 (2 URLs, hash excluido), CA-4.4 (`//evil.example` → `returnTo` relativo `/` en el `href`), CA-4.5 con hydrator montado (clic → "Verificando…", sin botón, `fetchMeStatus` 2 llamadas; 2ª `authenticated` → hijo monta; 2ª `anonymous` → login), CA-4.6, CA-4.7 (sin "Armá tu ruta"/"Arma tu ruta"/"No pudimos cargar tus rutas" en ningún estado ≠ `authenticated`), CA-3.3 (`clear()` estando `authenticated` → login sin remount) | — | rojo → verde |
| 7c | `test/src/auth-gate-rutas/layouts.static.test.ts`: CA-4.8 (2 layouts sin `"use client"`, envuelven en `RequireSession`; `(producto)/layout.tsx`, `(producto)/page.tsx`, `docs/mcp/page.tsx` no importan `RequireSession`); agregar `RequireSession.tsx` a `LIVE_COPY_FILES` y `RequireSession.module.css` a `TOKENIZED_CSS` | — | verde |
| **8** | `npx tsc --noEmit`, `npm --prefix frontend test`, `npm run build`, `node .cursor/scripts/sdd/verify-receipt.mjs` | — | todo verde (CA-8) |

- Los tests de nivel 3 prueban sobre el **store real** (zustand), no mock (segundo eje: concurrencia sin BD, la "clave compartida" es el store).
- Sin `Date.now()`/timers reales: el timeout se verifica por config (CA-2.4) y por clasificación del error `ECONNABORTED` simulado (CA-2.3).
- Mutation (Stryker) no configurado → `verify` lo ofrece una vez sobre `session-read.ts`, `auth.service.ts`, `demo-session.ts`, `auth-session.ts`, `RequireSession.tsx` (D-7).

## 10. Orden de implementación y commits (D7)

1. **Commit 1** — pasos 0/0b (TS2352). ~40 líneas. Desbloquea el gate `typecheck`.
2. (Ciclos previos sin commitear: los hace el orquestador, fuera de este ciclo.)
3. **Commit 2** — pasos 1-3b (caracterización + demo opt-in). ~150 líneas.
4. **Commit 3** — pasos 4-5c (lectura 3 ramas, store, hydrator). ~300 líneas.
5. **Commit 4** — pasos 6-7c + `.env.example` (S1: `# NEXT_PUBLIC_ORBITAL_DEMO_SESSION=1` comentada, con nota "solo en development"). ~350 líneas (SVG de 16 KB es una sola línea útil; si el presupuesto de 400 lo cuenta distinto, partir asset+move en commit aparte).

## 11. Deuda nueva que introduce el diseño (se suma a D-1…D-8 de la spec)

- **D-9** `resolveOrbitalSession` (versión `SessionUser | null`) queda exportada sin caller productivo, solo por `demo-session.test.ts:30-56` que la spec prohíbe modificar. Retirarla en un ciclo que pueda migrar ese test a `resolveOrbitalSessionRead`.
- **D-10** `setUser` / `setHydrated` del store quedan sin caller productivo (CA-3.1 obliga a conservarlas); semántica ajustada para mantener invariantes.
- **D-11** (solo si el dev elige opción (b) en §7.2) Sin tokens de escala tipográfica en `--orbital-*`.

## 12. Riesgos del diseño

| Riesgo | Mitigación |
|---|---|
| Cold start del backend > 8 s → `unreachable` falso en la primera carga | Reintentar manual; valor ajustable en la constante |
| Validación de 4 campos más estricta que la spec → un cambio de shape del backend deja a todos en "No pudimos conectar" | Es el comportamiento buscado ante contrato roto (visible, no silencioso); D-3 sigue abierta |
| `returnTo` pierde la query en navegación cliente con URL aún no comprometida | Documentado (§3.7); el deep link real llega por carga directa y conserva la query |
| Tests viejos que resetean el store con `setState({ user, hydrated })` dejan `sessionStatus` desincronizado dentro del mismo archivo | No leen `sessionStatus`; los tests nuevos resetean con `getInitialState()` |

## Checkpoint

🔔 El dev aprueba este diseño antes de `tasks`. Puntos a decidir:
1. Re-hidratación como **acción del store observada por el hydrator** (§3.6) — recomendado.
2. `parseSessionUser` valida los **4 campos** de `SessionUser` (más estricto que CA-2.5).
3. Durante el reintento se muestra "Verificando tu sesión…" y el botón **desaparece** (en vez de quedar `disabled`) (§3.8).
4. Guarda de `returnTo` con `usePathname()` para navegación cliente (§3.7).
5. Literales tipográficos existentes (`2.25rem`/`1.5rem`/`1.125rem`/`0.875rem`) por falta de tokens de escala (§7.2): (a) aceptar o (b) deuda D-11.
6. Actualizar el copy de CA-4.2 / CA-4.5 en `spec.md` con la tabla de §0 antes de `approve`.

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc`, `.cursor/rules/constitution-codigo.mdc`, `.cursor/rules/frontend-layers.mdc` (glob), `.cursor/skills/frontend-reference/references/design-language.md`, `specs/auth-gate-rutas/{explore,spec}.md`; código leído: `stores/auth-session.ts`, `AuthSessionHydrator.tsx`, `auth.service.ts`, `demo-session.ts`, `local-session.ts`, `auth.types.ts`, `ShellAccount.tsx`, `SignInLink.{tsx,module.css}`, `LearningPathsEmptyState.{tsx,module.css}`, `LearningPathsDashboard.module.css`, `app/globals.css` (tokens + focus ring), `config/brand-assets.ts`, `lib/{axios,errors,api-auth-policy}.ts`, `learning-paths/lib/route-errors.ts`, `(producto)/layout.tsx`, `vitest.config.ts`, tests `demo-session`, `auth-session-hydrator`, `auth.characterization`, `copy-voice.static`, `tokens.static`, `ShellAccount.test`, `backend/.../identity/presentation/auth.controller.ts` (shape de `/me`).
