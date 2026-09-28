# Design — `ui-devtalles-polish`

> Fase: `sdd-design`. Fuente: `explore.md`, `proposal.md`, `spec.md` (aprobada vía plan, 2026-09-27).
> ✅ **Checkpoint de design cubierto por la aprobación previa del dev (pidió correr el ciclo sin frenar).** ADR 0002 queda `accepted` por esa misma aprobación; si el dev no lo ratifica, se vuelve a `proposed` y el gate bloquea el commit del Lote 1.
> Todo lo de este documento fue verificado leyendo el repo en HEAD `0d1a541`; los valores "hoy" están citados del archivo real (regla "leer antes de editar").

## Capas afectadas y dependencias

| Lado | Capa | Qué cambia | Dirección |
|---|---|---|---|
| Backend `catalog-scraper` | `application/course-card.ts` (función pura, sin framework) | `CourseCard` gana `coverImageUrl`; nueva `allowedCoverImageUrl()`; `toCourseCard` la usa | application → domain (`CatalogSnapshot`). Sin imports nuevos. |
| Backend `catalog-scraper` | `nest/` (controller) | **Sin cambio de código**. Solo test nuevo de caracterización. | — |
| Backend `learning-paths`, `mcp-user` | service / tools | **Sin cambio de código** (el alias `LearningPathCourseCardDto = CourseCard` y el `...detail` propagan el campo). Solo tests. | — |
| Contrato | `contracts/course-card.example.json` (nuevo, raíz del repo `CodeQuest-2026/`) | Artefacto único que consumen los tests de backend y front | — |
| Front config | `frontend/src/config/` (nuevo) | `official-paths.ts` (13 rutas + icono), `chrome-icon.ts` (stroke único) | presentación → config (datos estáticos). Config no importa nada. |
| Front datos | `features/learning-paths/lib/load-my-routes.ts`, `subscribe-learning-paths.ts` | `MyRouteSummary.sourceCatalogPathId` | lib → `@/lib/axios` (ya existe) |
| Front presentación | shell, auth UI, landing, configurador, dashboard, LivePath, assessment, integrations | copy, iconos, tokens, layout | componentes → config / lib |
| Paquete `path-diagram` | `model.ts`, `path-diagram.tsx`, `layout-path.ts`, `*.module.css` | tipo + cover en modal + labels | sin cambio de dependencias |

No hay caso de uso nuevo, repositorio nuevo, ni transacción: **límite de transacción: no aplica** (todo es lectura/mapeo o presentación; ningún flujo toca más de un repositorio en escritura).

**Versión del contrato:** `coverImageUrl` es **aditivo** (campo nuevo `string | null`, ninguno se saca ni renombra, la semántica de los existentes no cambia) → **sin bump de versión**. `MyRouteSummary.sourceCatalogPathId` es lectura de un campo que el backend ya devuelve → no cambia contrato.

## Flujo feliz y errores de negocio

| Flujo | Feliz | Errores / bordes (código) |
|---|---|---|
| `GET /catalog/courses/:courseId` | 200 `{ course: CourseCard }` con `coverImageUrl` validado o `null` | id no `^\d{1,12}$` → `400` (`BadRequestException('courseId must be numeric')`, comportamiento actual); curso inexistente o sin snapshot → `404` (`NotFoundException('Course was not found')`). Sin códigos nuevos. |
| `toCourseCard` + allowlist | cover `https://import.cdn.thinkific.com/...` → misma URL | host distinto / `http:` / sufijo engañoso / malformada / vacía / con credenciales / con puerto / `null` → `coverImageUrl: null` (no es error: falla segura). |
| `loadCourseCard` (front) | `{ course }` → card con `coverImageUrl` | error HTTP → `null` (catch existente, se caracteriza, no se refactoriza — deuda aceptada en spec). |
| `CourseModal` | cover → `<img>` | `null` → sin bloque; `onError` → bloque oculto; modo `mcp` → nunca renderiza cover. |
| Icono de stack | id oficial → `<img>` | id desconocido o `null` → `officialPathIconSrc` devuelve `null` → no se renderiza nada. |
| Shell sin sesión | un link "Entrar" → `/login` | — (OAuth intacto). |

Ningún error de negocio nuevo → `error-contract` no aplica.

---

## Lote 1 — Shell / auth / mobile / Lucide chrome

### 1.1 Dependencia

- `frontend/package.json` → `dependencies`: `"lucide-react": "1.48.0"` (exacta, sin `^`). Verificado hoy con `npm view lucide-react version peerDependencies license --json` → `1.48.0`, peer `react ^16.5.1 || ^17 || ^18 || ^19` (React del repo: `19.3.0` ✓), licencia ISC.
- Instalar con `npm install --save-exact lucide-react@1.48.0` dentro de `frontend/` → actualiza `frontend/package-lock.json` (en scope).
- **Nombres verificados** en `https://unpkg.com/lucide-react@1.48.0/dist/lucide-react.d.ts` (declaraciones presentes): `Menu`, `X`, `Copy`, `Check`, `ArrowRight`, `ArrowUpRight`, `ExternalLink`. Apply los re-verifica con el typecheck tras instalar (CA-1.2).
- Import **siempre nombrado** por icono: `import { Menu, X } from "lucide-react";`. Prohibido `import * as` y default import.

### 1.2 Stroke y tamaño estándar

- Nuevo `frontend/src/config/chrome-icon.ts`:

```ts
export const CHROME_ICON_STROKE_WIDTH = 2;
```

- `2` porque es el `stroke-width` que ya usa el chrome hoy (`MissionShell.module.css:235` `.menuIcon { stroke-width: 2 }`, `page.module.css:181`) → conformidad, cero cambio de peso visual.
- Todo icono Lucide del cambio: `<Icon aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} className={...} />`. **No** se pasa `size`: el tamaño lo da el CSS del contexto en `rem` (ligado a la escala del label). Lucide pone `width/height="24"` como atributos; el CSS los pisa.
- Tamaños (existentes, se conservan): menú `1.25rem` (`.menuIcon`), copiar `1rem` (`.copyIcon svg`), CTA landing `1.375rem` (`.actionIcon`), puerta landing `1rem` (`.doorAction svg`), social `0.85rem` (`.social svg`). Nuevo: cerrar LivePath `1.25rem`.
- Como Lucide ya emite `fill="none" stroke="currentColor" stroke-linecap/linejoin="round"`, se **borran** del CSS las reglas que duplicaban/pisaban el trazo (si no, el CSS gana sobre el atributo y habría dos fuentes de stroke):
  - `MissionShell.module.css:230-238` `.menuIcon` → queda solo `width: 1.25rem; height: 1.25rem;`.
  - `page.module.css:176-182` bloque `.actionIcon, .doorAction svg, .protocolIcon svg { fill; stroke; stroke-width }` → se elimina entero.

### 1.3 `ShellAccount.tsx` (`frontend/src/features/auth/components/ShellAccount.tsx`)

Hoy (L42-55): `<div className={styles.authActions}>` con dos `Link` "Login" (`authEntryPath("login")`) y "Register" (`authEntryPath("register")`, `authButtonPrimary`).

Pasa a (rama `!hydrated || !user`):

```tsx
<Link
  className={`${styles.authButton} ${styles.authButtonPrimary}`}
  href={authEntryPath("login")}
>
  Entrar
</Link>
```

- Se elimina el wrapper `authActions` (y su regla CSS `MissionShell.module.css:108-112`, queda sin uso).
- Rama con sesión (L58-78): **sin cambios** (avatar + "Salir").
- `authEntryPath`, `logoutSession`, `markSignedOut`: sin cambios (CA-1.4).

CSS de `.authButton` (`MissionShell.module.css:114-133`), valores de hoy → nuevos:

| Propiedad | Hoy | Nuevo | Por qué |
|---|---|---|---|
| `min-height` | `2rem` | `2.75rem` | touch target alineado al resto del header (`.menuButton` y `.desktopNav a` = `2.75rem`) — Should del spec |
| `padding` | `0 0.65rem` | `0 var(--orbital-space-4)` | token; proporción con la altura nueva |
| `font-size` | `0.6875rem` | `0.875rem` | misma escala que `.desktopNav` (`0.875rem`, L71) |
| resto | — | sin cambio (`border 1px solid var(--orbital-primary)`, `border-radius: var(--orbital-radius-sm)`, `font-family: var(--orbital-font-telemetry)`, `letter-spacing: 0.04em`, `white-space: nowrap`, transiciones `--orbital-motion-fast`) | conformidad |

- `.authButtonPrimary` (L141-145, lime/night) y su hover `filter: brightness(1.08)` (L147-149): **sin cambio**. Se agrega estado active:

```css
.authButtonPrimary:active {
  border-color: var(--orbital-lime-strong);
  background: var(--orbital-lime-strong);
}
```

- Efecto colateral declarado: el botón "Salir" del panel (usa `.authButton`) gana el mismo alto/tamaño → mejor target, sin romper nada.
- Presupuesto de ancho a 375 px (header `nowrap`): brand ~115 px + gutters 32 + gap 16 + hamburguesa 44 + gap 8 + "Entrar" ~76 ≈ 291 px < 375 ✓. A 768 px con avatar+nombre (`max-width: 10rem`) ≈ 721 px < 768 ✓.

### 1.4 `MissionShell.tsx` (`frontend/src/features/orbital/components/MissionShell.tsx`)

- `PRODUCT_LINKS` L14: `label: "Descubre tu ruta"` → `label: "Configurador de ruta"`.
- **Variante `login`** (L22-47):
  - `<nav aria-label="Navegación principal">` → `<nav className={styles.loginNav} aria-label="Navegación principal">`.
  - Entre `</nav>` y `<ShellAccount />` se agrega `<MissionShellMobileNav links={[...PRODUCT_LINKS]} />` (mismos destinos que product → CA-1.6). Orden DOM: brand, nav, MobileNav, ShellAccount → en mobile "Entrar" queda a la derecha del hamburguesa (CA-1.5).
  - Footer L43-45 → 
    ```tsx
    <footer className={styles.loginFooter}>
      <span className={styles.loginFooterBrand}>DevTalles</span>
      <span aria-hidden="true">•</span>
      <span>Hecho para Code Quest 2026</span>
    </footer>
    ```
- **Variante `product`** footer L76-80: DevTalles ya va primero; el tercer span pasa de `Code Quest 2026` a `Hecho para Code Quest 2026` con `className={styles.footerCredit}` (crédito explícito, CA-1.8).

CSS `MissionShell.module.css` (valores de hoy → nuevos):

| Selector:línea | Hoy | Nuevo |
|---|---|---|
| `.loginHeader` L328-335 | `grid-template-columns: 1fr auto;` `border-bottom: 1px solid rgb(120 94 172 / 20%);` | `grid-template-columns: 1fr auto auto;` `border-bottom: 1px solid color-mix(in srgb, var(--orbital-border-strong) 20%, transparent);` (mismo color exacto: `--orbital-border-strong` = `#785eac` = `120 94 172`) |
| `.loginHeader nav` L346-356 | selector descendiente | **renombrar a `.loginNav`**. Motivo: `.loginHeader nav` también matchea el `<nav aria-label="Navegación móvil">` interno del panel móvil y, por orden de fuente, le ganaría a `.mobilePanel nav` (misma especificidad) → el panel quedaría vacío. `color: rgb(255 255 255 / 80%)` → `color-mix(in srgb, var(--orbital-ink) 80%, transparent)` |
| `.loginHeader nav a` L358-363, `:hover` L365-368, reduced-motion L422 | idem | `.loginNav a`, `.loginNav a:hover` (con `.loginBrand:hover`), `.loginNav a` en reduced-motion |
| `@media (min-width: 48rem) .loginHeader` L404-407 | `padding-inline: var(--orbital-gutter); grid-template-columns: 1fr auto auto;` | solo `padding-inline: var(--orbital-gutter);` (la grilla ya es `1fr auto auto` en base; `.mobileNav { display: none }` a ≥48rem saca al hamburguesa del flujo) |
| `@media … .loginHeader nav` L409-412 | | `.loginNav { display: flex; gap: var(--orbital-space-6); }` |
| `.accountPanel` L98-100 | `border-radius: 12px; background: #121028; box-shadow: 0 12px 32px rgb(0 0 0 / 35%);` | `border-radius: var(--orbital-radius-md);` (= 0.75rem = 12px exacto) `background: var(--orbital-surface-container-low);` `box-shadow: var(--orbital-shadow-panel);` |
| `.authActions` L108-112 | regla | **eliminar** (sin uso) |
| nuevo | — | `.footerCredit { color: var(--orbital-ink-muted); }` · `.loginFooterBrand { color: var(--orbital-ink); font-weight: 700; }` · `.loginFooter { gap: var(--orbital-space-2); }` (agregar a la regla existente L370-381) |

**Restricciones de tests que se respetan (no negociables, CA-1.5):** `min-height: 4rem` (`.header` L36, `.loginHeader` L330), `padding-top: 4rem` (`.content` L295), `@media (min-width: 48rem)`, `flex-wrap: nowrap`, sin `@media (max-width: 42rem)`, `.mobileNav { display: none }` dentro del media, `.avatar` nunca `display: none`. **Ojo regex de `mobile-nav.test.tsx:135-136`:** `/\.mobilePanel[\s\S]*position:\s*fixed/` es greedy hasta el final del archivo → **prohibido escribir `position: fixed` en cualquier línea posterior a `.mobilePanel` (L240)**. Ninguno de los cambios de arriba lo agrega.

### 1.5 `MissionShellMobileNav.tsx`

- L3: agregar `import { Menu, X } from "lucide-react";` y `import { CHROME_ICON_STROKE_WIDTH } from "@/config/chrome-icon";`.
- L45-51 (`<svg>` ad hoc) →
  ```tsx
  {open ? (
    <X aria-hidden="true" className={styles.menuIcon} strokeWidth={CHROME_ICON_STROKE_WIDTH} />
  ) : (
    <Menu aria-hidden="true" className={styles.menuIcon} strokeWidth={CHROME_ICON_STROKE_WIDTH} />
  )}
  ```
- `aria-label`, `aria-expanded`, `aria-controls`, Escape, cierre al navegar: sin cambio.

### 1.6 Resto del chrome Lucide del Lote 1

| Archivo:línea (hoy) | Hoy | Nuevo |
|---|---|---|
| `features/learning-paths/components/MyRouteStatus.tsx:214-219` | `<svg viewBox="0 0 16 16">` copiar | `{copied ? <Check …/> : <Copy …/>}` con `aria-hidden="true"` y `strokeWidth={CHROME_ICON_STROKE_WIDTH}`; el `aria-label` del botón ya cambia "Copiar"/"Copiado" |
| `features/live-path/components/LivePathScreen.tsx:28-30` | `<span aria-hidden="true">×</span>` | `<X aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} />` (el `aria-label="Cerrar"` ya existe) |
| `app/(producto)/page.tsx:92-94` | svg flecha CTA | `<ArrowRight aria-hidden="true" className={styles.actionIcon} strokeWidth={…} />` |
| `app/(producto)/page.tsx:150-152` | svg flecha diagonal | `<ArrowUpRight aria-hidden="true" strokeWidth={…} />` (conserva la forma diagonal existente; CSS `.doorAction svg` da el tamaño) |
| `app/(producto)/page.tsx:56-62` (`SocialIcon` rama `"web"`) | svg link externo | `return <ExternalLink aria-hidden="true" strokeWidth={…} />;` — ramas `github`/`linkedin` **se quedan** (marca) |
| `app/(producto)/page.tsx:165-170` | `<span className={styles.protocolIcon}>` con svg (círculo + ejes) | **se elimina** (icono de relleno: no agrega significado al título; piso de oficio). Se borran `.protocolIcon` (L437-448) y `.protocolIcon svg` (L449+) de `page.module.css`. Efecto: `svg circle` de la landing pasa de 13 a **12** (radar 12). |

Todos los botones/links de solo icono ya tienen nombre accesible (`aria-label` del botón de menú, "Copiar", "Cerrar"); los que llevan texto (CTA, puertas, social) mantienen el texto visible.

### 1.7 Estados de interacción (componentes tocados en Lote 1)

| Control | default | hover | focus-visible | active | disabled | loading |
|---|---|---|---|---|---|---|
| "Entrar" (`.authButton.authButtonPrimary`) | bg `--orbital-lime`, texto `--orbital-night` | `filter: brightness(1.08)` (existente) | global `outline: 3px solid var(--orbital-focus); outline-offset: 3px` (`globals.css:140-145`) | bg/borde `--orbital-lime-strong` (nuevo) | n/a (link) | n/a |
| Hamburguesa (`.menuButton`) | existente (`--orbital-ink-muted`, borde `--orbital-header-border`) | existente (lime) | global | sin cambio | n/a | n/a |
| Links nav login (`.loginNav a`) | `color-mix(ink 80%)` | `--orbital-ink-muted` (existente) | global | n/a | n/a | n/a |

Contraste: "Entrar" `#110c30` sobre `#c8dd0b` ≈ 11.9:1 ✓; crédito footer `#b48cf3` sobre header ≈ 7.6:1 ✓.

### 1.8 Tests del Lote 1

Se modifican (mismo tipo de assert, valor nuevo — porqué en spec §Tests):

| Archivo:línea | Cambio |
|---|---|
| `frontend/test/src/ui-stitch-orbital/fase-0/dom.test.tsx:73-74` | `a[href='/login']` textContent `toBe("Entrar")`; `querySelectorAll("header a[href='/registro']")` `toHaveLength(0)` |
| `…/fase-0/dom.test.tsx:90-91` | ídem en variante login + `expect(container.querySelector("button[aria-controls]")).not.toBeNull()` (MobileNav presente en login) |
| `…/fase-0/dom.test.tsx:94` | se mantiene `toContain("Code Quest 2026")` y se agrega: `footer.textContent.indexOf("DevTalles") < footer.textContent.indexOf("Code Quest 2026")` (ambas variantes) |
| `…/fase-0/mobile-nav.test.tsx:33` | label `"Configurador de ruta"` |
| `…/fase-0/mobile-nav.test.tsx:127-128` | `querySelectorAll("a[href='/login']")` `toHaveLength(1)` con texto `"Entrar"`; `a[href='/registro']` `toBeNull()` |
| `…/fase-0/mobile-nav.test.tsx` (nuevo `it`) | "login variant offers the mobile nav": monta `<MissionShell variant="login">`, click en `button[aria-expanded]` → 3 links en `nav[aria-label='Navegación móvil']`, Escape → `aria-expanded="false"` |
| `…/fase-0/mobile-nav.test.tsx:130-137`, `header-responsive.characterization.test.ts:20-25` | **sin cambio** |
| `frontend/test/src/features/auth/components/ShellAccount.test.tsx:38` | título del `it` → `"opens Salir from the name and returns to Entrar"` |
| `…/ShellAccount.test.tsx:64` | `toContain("Entrar")` + `not.toContain("Register")` |
| `frontend/test/src/ui-stitch-orbital/fase-2/login-contract.test.ts:24-26` | `expect(panel).toContain("discordStartUrl(returnTo)")`; `not.toContain("logoutSession")`; `not.toContain("/api/auth/discord/start")` (no arma la URL de OAuth a mano) |
| `…/login-contract.test.ts:43-45` | `not.toContain('type="password"')`; `not.toMatch(/invitado/i)`; `toContain("Continuar con Discord")`. L45 (`event.preventDefault()`) también es obsoleta (el panel no tiene form): pasa a `not.toContain("<form")`. L46-47 sin cambio. Mismo porqué declarado en spec (contrato Discord vigente). |
| `…/fase-1/landing.test.tsx:61` | `toHaveLength(12)` |

Nuevo:
- `frontend/test/src/ui-devtalles-polish/shell-chrome.static.test.ts` (lee archivos con `readFileSync(resolve(import.meta.dirname, "../../.."), …)` como el resto de la suite):
  - `package.json` → `dependencies["lucide-react"]` `toBe("1.48.0")`.
  - En `MissionShellMobileNav.tsx`, `MyRouteStatus.tsx`, `LivePathScreen.tsx`, `app/(producto)/page.tsx`: todo import de lucide matchea `/import \{[^}]+\} from "lucide-react"/`; ninguno matchea `/import \* as \w+ from "lucide-react"|import \w+ from "lucide-react"/`; cada uso `<(Menu|X|Copy|Check|ArrowRight|ArrowUpRight|ExternalLink)\b[^>]*>` contiene `strokeWidth={CHROME_ICON_STROKE_WIDTH}` y `aria-hidden="true"`.
  - `MissionShellMobileNav.tsx` y `MyRouteStatus.tsx`: `not.toContain("<svg")`. `LivePathScreen.tsx`: `not.toContain("×")`.
  - `ShellAccount.tsx`, `MissionShell.tsx`, `MissionShellMobileNav.tsx`: `not.toMatch(/>\s*(Login|Register)\s*</)` y `not.toContain("Descubre tu ruta")`.

---

## Lote 2 — Iconos de stack + contrato `coverImageUrl`

### 2.1 SVG vendorizados

Destino `frontend/public/devtalles-tech/`. **Decisión: normalizar a kebab-case en minúscula por nombre de stack.** Por qué: Linux/Git distinguen mayúsculas y Windows no (renombrar solo casing rompe en silencio), y los nombres upstream tienen artefactos (`2ICON-`, `PHP4`) que no deben filtrarse a URLs públicas. La trazabilidad queda en esta tabla.

| # | Origen (`https://raw.githubusercontent.com/Nleivas/Backgrounds/refs/heads/main/<archivo>`) | Destino | Ruta oficial |
|---|---|---|---|
| 1 | `ICON-JS.svg` | `javascript.svg` | `programas-fundamentos` (supuesto declarado en spec) |
| 2 | `ICON-REACT.svg` | `react.svg` | `programas-react` |
| 3 | `ICON-VUE.svg` | `vue.svg` | `programas-vue` |
| 4 | `ICON-ANGULAR.svg` | `angular.svg` | `programas-angular` |
| 5 | `ICON-NODE.svg` | `node.svg` | `programas-node` |
| 6 | `ICON-NEST.svg` | `nest.svg` | `programas-nest` |
| 7 | `ICON-DART.svg` | `dart.svg` | `ruta-dart` |
| 8 | `ICON-PYTHON.svg` | `python.svg` | `ruta-python` |
| 9 | `ICON-JAVA.svg` | `java.svg` | `ruta-java` |
| 10 | `2ICON-CSHARP.svg` | `csharp.svg` | `ruta-c` |
| 11 | `ICON-IA.svg` | `ia.svg` | `ruta-ia` |
| 12 | `ICON-PHP4.svg` | `php.svg` | `ruta-php` |
| 13 | `ICON-GO.svg` | `go.svg` | `ruta-go` |
| 14 | `ICON-LEGACY.svg` | `legacy.svg` | — (vendorizado sin consumidor, Won't del spec) |

- Descarga: `curl -fsSL <origen> -o frontend/public/devtalles-tech/<destino>` (sin reescribir el contenido: son `viewBox="0 0 15.34 15.34"` con `<style>` interno `.cls-N`; como se usan vía `<img>`, las clases no colisionan).
- Validación en apply antes de commitear (y fijada por test): cada archivo empieza con `<?xml` o `<svg`, contiene `<svg`, **no** contiene `<script` ni atributos `/\son[a-z]+\s*=/i` ni `href="javascript:`.

### 2.2 Mapa ruta → icono (fuente única)

Nuevo `frontend/src/config/official-paths.ts`. Reemplaza a `PATH_CHOICES` (`MyRouteStatus.tsx:15-28`), que deja de existir: mover la lista es requerido porque la landing (Server Component) y `MissionRadar` necesitan la misma fuente y no pueden importar de un componente `"use client"`. No es refactor de paso.

```ts
type OfficialPath = { id: string; label: string; icon: string };

export const OFFICIAL_PATHS = [
  { id: "programas-fundamentos", label: "Fundamentos", icon: "javascript.svg" },
  { id: "programas-react", label: "React", icon: "react.svg" },
  { id: "programas-vue", label: "Vue", icon: "vue.svg" },
  { id: "programas-angular", label: "Angular", icon: "angular.svg" },
  { id: "programas-node", label: "Node", icon: "node.svg" },
  { id: "programas-nest", label: "NestJS", icon: "nest.svg" },
  { id: "ruta-dart", label: "Dart y Flutter", icon: "dart.svg" },
  { id: "ruta-python", label: "Python", icon: "python.svg" },
  { id: "ruta-java", label: "Java", icon: "java.svg" },
  { id: "ruta-c", label: "C# y .NET", icon: "csharp.svg" },
  { id: "ruta-ia", label: "Inteligencia artificial", icon: "ia.svg" },
  { id: "ruta-php", label: "PHP", icon: "php.svg" },
  { id: "ruta-go", label: "Go", icon: "go.svg" },
] as const satisfies readonly OfficialPath[];

export type OfficialPathId = (typeof OFFICIAL_PATHS)[number]["id"];

const ICON_BASE_PATH = "/devtalles-tech/";

export function officialPathIconSrc(pathId: string | null): string | null {
  const path = OFFICIAL_PATHS.find((item) => item.id === pathId);
  return path ? `${ICON_BASE_PATH}${path.icon}` : null;
}

export function officialPathLabel(pathId: OfficialPathId): string {
  return OFFICIAL_PATHS.find((item) => item.id === pathId)?.label ?? pathId;
}
```

- Labels = los de `PATH_CHOICES` hoy (sin cambio de copy). Orden = el de `OFFICIAL_PATH_IDS` del backend (`domain/config.ts:20-34`).
- Ningún otro archivo escribe `/devtalles-tech/` (fijado por test).

### 2.3 Componente de presentación `StackIcon`

`frontend/src/features/learning-paths/components/StackIcon.tsx` + `StackIcon.module.css` (junto a sus dos consumidores del feature). Presentación pura, sin estado.

```tsx
type StackIconProps = {
  pathId: string | null;
  size: "sm" | "md";
  standaloneLabel?: string;
};
// src = officialPathIconSrc(pathId); si null → return null.
// <img className={`${styles.icon} ${styles[size]}`} src={src} alt={standaloneLabel ?? ""}
//      width={size === "sm" ? 24 : 40} height={size === "sm" ? 24 : 40} loading="lazy" decoding="async" />
```

- `alt=""` por defecto (siempre va junto al nombre visible de la ruta → decorativo, CA-2.3). `standaloneLabel` solo si algún día va sin texto.
- `width/height` numéricos = relación intrínseca (evita salto de layout); el tamaño real lo da el CSS:

```css
.icon { display: block; flex: none; object-fit: contain; }
.sm { width: 1.5rem; height: 1.5rem; }
.md { width: 2.5rem; height: 2.5rem; }
```

  Por qué 1.5/2.5rem: el glifo ocupa ~65% del `viewBox` (margen interno de 2.68/15.34) → a 1.5rem el glifo mide ~1rem, alineado ópticamente con texto de 1rem.
- Sin estados de interacción propios (no es interactivo; hereda los del control que lo contiene).
- Contraste: decorativo → no aplica 1.4.11; algunos logos de marca (p. ej. PHP `#6181b6`) tienen contraste bajo sobre fondo oscuro, aceptable por ser decorativo.

### 2.4 Consumidores del icono (Lote 2)

- `LearningPathsDashboard.tsx:89-94`: dentro de `.cardTitleRow`, el `<div>` que envuelve el `<h2>` pasa a `<div className={styles.cardTitleLead}><StackIcon pathId={route.sourceCatalogPathId} size="md" /><h2>{route.title}</h2></div>`. CSS nuevo en `LearningPathsDashboard.module.css`: `.cardTitleLead { display: flex; align-items: center; gap: var(--orbital-space-3); min-width: 0; }`.
- `MyRouteStatus.tsx` lista (L95-101): `<Link className={styles.route} …><StackIcon pathId={route.sourceCatalogPathId} size="sm" /><span>{route.title}</span></Link>`.
- Picker y opciones: ver Lote 3 §3.3 (van con el centrado del configurador, CA-3.5).

### 2.5 `load-my-routes.ts` (`frontend/src/features/learning-paths/lib/load-my-routes.ts`)

```ts
export type MyRouteSummary = {
  id: string;
  title: string;
  itemCount: number;
  completedCount: number;
  progressRatio: number;
  sourceCatalogPathId: string | null;
};

type LearningPathSummaryItem = {
  id: string;
  title: string;
  itemCount?: number;
  completedCount?: number;
  progressRatio?: number;
  sourceCatalogPathId?: string | null;
};
type LearningPathListResponse = { items: LearningPathSummaryItem[] };
```

- `loadMyRoutes` (L39-48) y `createOfficialRoute` (L21-37): agregar `sourceCatalogPathId: item.sourceCatalogPathId ?? null` / `response.data.sourceCatalogPathId ?? null`. `createOfficialRoute` pasa a `api.post<LearningPathSummaryItem>` (hoy tipa la respuesta como `MyRouteSummary`, que ya no calza). El backend devuelve el campo en `LearningPathSummaryDto` (`learning-paths.service.ts:76`) y en el detalle (hereda) → cero cambio de backend (CA-2.5).
- `subscribe-learning-paths.ts:24-30`: el mensaje WS `path_created` no trae el campo → `sourceCatalogPathId: null` (valor honesto, no inventado).

### 2.6 Contrato `CourseCard` — backend

`backend/src/modules/catalog-scraper/application/course-card.ts` (capa application, función pura, sin framework — el único archivo backend de código en scope):

```ts
const COVER_IMAGE_HOST = 'import.cdn.thinkific.com'

export function allowedCoverImageUrl(raw: string | null): string | null {
  if (!raw || !URL.canParse(raw)) return null
  const url = new URL(raw)
  if (url.protocol !== 'https:') return null
  if (url.hostname !== COVER_IMAGE_HOST) return null
  if (url.username || url.password || url.port) return null
  return raw
}
```

- `URL.canParse` en vez de `try/catch` (sin catch que devuelva default): disponible en Node ≥19.9; backend corre `node:22-alpine` (`backend/Dockerfile:4,23`) y `@types/node ^22` lo tipa (verificado en `node_modules/@types/node/url.d.ts`).
- `CourseCard` gana `coverImageUrl: string | null` entre `previewYoutubeId` y `prerequisites` (orden del spec).
- `toCourseCard` (L28-46): agregar `coverImageUrl: allowedCoverImageUrl(course.coverImageUrl),` después de `previewYoutubeId`. `Course.coverImageUrl: string | null` ya existe (`domain/models.ts:47`).
- Devuelve la URL tal cual (sin reescribir). Frontera de confianza = acá; el front no revalida.

### 2.7 Contrato — front

`frontend/path-diagram/src/model.ts:5-17`: agregar `coverImageUrl: string | null;` (requerido) después de `previewYoutubeId`. `price?`/`related?` quedan opcionales (spec).

Sitios que construyen `CourseCard` literal y deben sumar `coverImageUrl: null` (el front typecheck excluye tests de `path-diagram`, pero se agrega igual para que el shape de los fixtures sea el del contrato): `path-diagram/src/path-diagram.modal.test.tsx:37-46` y `:88-100`, `path-diagram/src/model.test.ts:51-61`. Código de producción que construye `CourseCard`: ninguno (solo tipa respuestas).

### 2.8 Artefacto de contrato compartido

Ubicación exacta: **`CodeQuest-2026/contracts/course-card.example.json`** (raíz del repo git, carpeta nueva `contracts/`). Contenido (datos del fixture existente de `course-card.spec.ts` + cover verificado del fixture `course-free.html`; ningún valor inventado):

```json
{
  "description": "Primeros pasos",
  "instructor": "Teddy Paz",
  "lessonCount": 120,
  "videoHours": 11.5,
  "previewYoutubeId": "h9qGQuJGhTo",
  "coverImageUrl": "https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg",
  "prerequisites": ["Saber usar una computadora"],
  "tags": ["backend"],
  "sections": [{ "title": "Sección 1", "lessons": ["Bienvenida"] }],
  "url": "https://cursos.devtalles.com/courses/csharp",
  "price": { "amount": 40, "currency": "USD" },
  "related": [{ "title": ".NET Backend", "url": "https://cursos.devtalles.com/courses/NET-Backend" }]
}
```

Cómo lo lee cada lado (patrón existente de lectura de archivos en tests):
- **Backend (provider):** `readFileSync(path.resolve(process.cwd(), '../contracts/course-card.example.json'), 'utf8')` + `JSON.parse` (mismo patrón que `infrastructure/parsers/load-fixture.ts`, cwd de vitest = `backend/`).
- **Front (consumer):** `readFileSync(resolve(import.meta.dirname, "../../../../contracts/course-card.example.json"), "utf8")` desde `frontend/test/src/contracts/` (mismo patrón que `frontendRoot` en la suite).
- **Exhaustividad tipada sin casts** en ambos lados:
  ```ts
  const COURSE_CARD_KEYS = {
    description: true, instructor: true, lessonCount: true, videoHours: true,
    previewYoutubeId: true, coverImageUrl: true, prerequisites: true, tags: true,
    sections: true, url: true, price: true, related: true,
  } satisfies Record<keyof CourseCard, true>;
  ```
  `satisfies` con literal hace excess-property check → si alguien agrega/quita un campo del tipo y no del test, rompe el typecheck. Runtime: `Object.keys(example).sort()` `toEqual(Object.keys(COURSE_CARD_KEYS).sort())`.
  (No se usa `import … from "*.json"` + `satisfies CourseCard`: el JSON infiere `currency: string`, no `"USD"`, y obligaría a un cast.)

### 2.9 Tests del Lote 2

Backend:
- `backend/src/modules/catalog-scraper/application/course-card.spec.ts` — reescritura:
  - Test existente L41-53: `toEqual` → `toStrictEqual`, y el curso del snapshot gana `coverImageUrl: 'https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg'` → el esperado lo incluye.
  - `describe('allowedCoverImageUrl')` con `it.each`: válido → mismo valor; `https://evil.example.com/a.jpg`, `http://import.cdn.thinkific.com/a.jpg`, `https://import.cdn.thinkific.com.evil.com/a.jpg`, `https://user:pw@import.cdn.thinkific.com/a.jpg`, `https://import.cdn.thinkific.com:8443/a.jpg`, `not a url`, `''`, `null` → `null`.
  - Contract: construye el snapshot a partir de `contracts/course-card.example.json` (curso id `3306165`, path `ruta-c` con tags `['backend']`) y afirma `toCourseCard(snapshot, '3306165')` `toStrictEqual(example)` + exhaustividad `COURSE_CARD_KEYS`.
- **Nuevo** `backend/src/modules/catalog-scraper/nest/catalog-scraper.controller.spec.ts` (`Test.createTestingModule` como `learning-paths.controller.spec.ts`; providers `{ provide: CatalogScraperService, useValue: { getCourseCard } }`, `{ provide: ConfigService, useValue: new ConfigService() }`):
  - 200: `getCourseCard` = mapeo real (`toCourseCard` sobre el snapshot del ejemplo) → `controller.course('3306165')` `toStrictEqual({ course: example })`.
  - cover `null` en el curso → `course.coverImageUrl` `toBeNull()` (campo presente: `'coverImageUrl' in course`).
  - 404: stub devuelve `null` → rechaza `NotFoundException` (`getStatus() === 404`).
  - 400: `'abc'` y `'1234567890123'` (13 dígitos) → rechaza `BadRequestException` (`getStatus() === 400`) y `getCourseCard` no fue llamado.
- `backend/src/modules/learning-paths/learning-paths.service.spec.ts:290-302`: `toEqual` → `toStrictEqual` y agregar `coverImageUrl: null,` después de `previewYoutubeId` (el fixture L39 trae `null`).
- `backend/src/modules/mcp-user/mcp-user-tools.spec.ts`: fixture L61 `coverImageUrl: null` → `'https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg'`; en el test de `get_my_path` (L196-204) ampliar el tipo parseado con `items: Array<{ …; detail: { coverImageUrl: string | null } | null }>` y afirmar, para el mismo snapshot: `detail.items[0]?.detail?.coverImageUrl` === `(await service.getById(ada, created.id)).items[0]?.detail?.coverImageUrl` === `toCourseCard(snapshot, '100')?.coverImageUrl` === la URL (paridad MCP ↔ REST detalle ↔ `GET /catalog/courses/:id`). Apply verifica el nombre exacto del userId que usa el spec.
- Sin cambios: `mcp-public/**` y sus specs (CA-2.12), `live-path.sse.spec.ts`.

Front:
- **Nuevo** `frontend/test/src/contracts/course-card.contract.test.tsx`: lee el artefacto; exhaustividad `COURSE_CARD_KEYS satisfies Record<keyof CourseCard, true>` (import de tipo `from "path-diagram"`); type guard `isCourseCard(value: unknown): value is CourseCard` (chequeos `typeof`/`Array.isArray`/`null` por campo, sin casts); render de `<PathDiagram mode="web" width={429}>` con un item cuyo `detail` es el ejemplo → click en la card → `dialog img` con `src` = `example.coverImageUrl`. (Esto último depende del Lote 3; el test se crea en el Lote 2 con la parte de claves/tipos y se completa con el render en el Lote 3.)
- **Nuevo** `frontend/test/src/lib/load-course-card.test.ts` (`vi.mock("@/lib/axios", () => ({ default: { get: vi.fn() } }))`): con cover → card con `coverImageUrl`; `coverImageUrl: null` → `null` en el campo; `get` rechaza → `null`.
- **Nuevo** `frontend/test/src/config/official-paths.test.ts`: (a) ids de `OFFICIAL_PATHS` `toEqual` los ids extraídos por regex de `backend/src/modules/catalog-scraper/domain/config.ts` (bloque `OFFICIAL_PATH_IDS = [ … ]`) → ancla el "13" a la verdad del backend; (b) cada `officialPathIconSrc(id)` apunta a un archivo existente en `frontend/public/devtalles-tech/`; (c) `officialPathIconSrc("desconocido")` y `(null)` → `null`; (d) los 14 SVG cumplen CA-2.1 (sin `<script`, sin `on*=`); (e) recorrido de `frontend/src/**` (sin `config/official-paths.ts`) → ningún archivo contiene `/devtalles-tech/`.
- **Nuevo** `frontend/test/src/features/learning-paths/components/StackIcon.test.tsx`: `pathId="ruta-c"` → `img[src='/devtalles-tech/csharp.svg'][alt='']` con `width="24"`; `standaloneLabel` → `alt` = label; `pathId={null}` → contenedor vacío.
- **Nuevo** `frontend/test/src/features/learning-paths/lib/load-my-routes.test.ts`: item con `sourceCatalogPathId: "ruta-go"` → se conserva; item sin el campo → `null`.
- Modificados (typecheck del tipo nuevo `MyRouteSummary`): `test/src/ui-stitch-orbital/fase-3/routes-dom.test.tsx:53-54` y `fase-0/dom.test.tsx:111-112` (+ `sourceCatalogPathId: null`), `test/src/features/learning-paths/components/MyRouteStatus.test.tsx:38,51,66,74` (+ campo), `LearningPathsDashboard.test.tsx:23-29` (`sourceCatalogPathId: "ruta-c"`) + assert nuevo `article img[src='/devtalles-tech/csharp.svg']` con `alt=""`; y un caso `null` → sin `img`.

---

## Lote 3 — Diagrama / configurador

### 3.1 Cover en `CourseModal` (`frontend/path-diagram/src/path-diagram.tsx:99-231`)

- Estado local (el componente ya usa hooks):
  ```ts
  const cover = mode === "web" ? (item.detail?.coverImageUrl ?? null) : null;
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const showCover = cover !== null && cover !== failedCover;
  ```
  Guardar el `src` fallido (no un booleano) evita un `useEffect` de reset si cambia el item.
- Markup: primer hijo del `div[role="dialog"]`, **antes** de `<header className={styles.summary}>` (L137):
  ```tsx
  {showCover ? (
    <img
      className={styles.cover}
      src={cover}
      alt=""
      width={640}
      height={360}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedCover(cover)}
    />
  ) : null}
  ```
- `alt=""`: el título del curso es el `<h2>` visible inmediatamente abajo (CA-3.1). `640×360` = relación 16:9 intrínseca; `aspect-ratio` fija la caja aunque la imagen real tenga otra proporción. `null` / error / modo `mcp` → no existe `<img>` ni contenedor (no hay wrapper).
- Modo `mcp` sin cover: cumple el Won't del widget (sin covers) y evita el bloqueo por CSP del host.
- CSS nuevo en `path-diagram/src/path-diagram.module.css` (el paquete conserva hex por diseño: widget standalone sin `globals.css`, decisión del spec):
  ```css
  .cover {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 12px;
    background: #130c25;
  }
  ```
  (`12px` = radio de `.video` L199; `#130c25` = fondo de `.frame` L4 → mismo sistema del paquete.)
- `<img>` plano, sin `next/image` ni `next.config.ts` (Won't).

### 3.2 `layout-path.ts` y CSS del diagrama

- `frontend/path-diagram/src/layout-path.ts:45-47` → `required: "Requerido", recommended: "Recomendado", optional: "Opcional"`; `:108` → `label: "En cualquier momento"`. Iguales a `verticalLayout` (L221-224). Geometría intacta (CA-3.2).
- `path-diagram.module.css`:
  - `.header, .groupLabel` (L47-54): quitar `text-transform: uppercase`; `letter-spacing: 2.5px` → `0.02em`; `font-size: 0.688rem` → `0.75rem` (legibilidad en oración).
  - `.dialog h3` (L138-144): quitar `text-transform: uppercase`; `letter-spacing: 0.08em` → `0.01em`; `font-size: 0.75rem` → `0.875rem`.
  - `.tags li` (L185-193): `text-transform: uppercase` → `text-transform: capitalize` (el string sigue en minúscula en el DOM → `path-diagram.modal.test.tsx:74` `toContain("bases")` verde sin tocar).
  - `.kicker` (L90-97, etiqueta de bucket): se queda (etiqueta, no título).

### 3.3 Configurador centrado + iconos (`/configurador-de-ruta`)

Hoy: `configurador-de-ruta/page.module.css:7-11` `.shell { width: min(100%, 70rem); margin: 0 auto; … }` y `MyRouteStatus.module.css:59-69` `.choice, .form button, .dialog button { justify-self: start; … }` → bloque angosto pegado a la izquierda de una columna de 1120 px.

Cambios:
- `configurador-de-ruta/page.module.css:8` `width: min(100%, 70rem)` → `width: min(100%, 48rem)`. La columna (768 px) queda centrada por el `margin: 0 auto` existente y el texto tiene ancho de lectura; los hijos del `.panel` (grid) se estiran al ancho de la columna → márgenes izquierdo/derecho iguales (CA-3.4).
- `MyRouteStatus.module.css` `.choice, .form button, .dialog button` (L59-69): **eliminar `justify-self: start`**; `border-radius: 999px` → `var(--orbital-radius-full)`; `padding: 0.55rem 0.9rem` → `var(--orbital-space-2) var(--orbital-space-4)`; agregar `min-height: 2.75rem` y `transition: background var(--orbital-motion-fast), color var(--orbital-motion-fast)`.
- Nuevas reglas:
  ```css
  .choices { grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
  .choice:hover, .form .submit:hover, .dialog .dialogClose:hover { background: var(--orbital-lime); color: var(--orbital-night); }
  .choice:active, .form .submit:active, .dialog .dialogClose:active { background: var(--orbital-lime-strong); color: var(--orbital-night); }
  .form .submit { justify-self: start; }
  .form .submit:disabled { border-color: var(--orbital-outline-variant); color: var(--orbital-outline); cursor: not-allowed; }
  .dialog .dialogClose { justify-self: end; }
  .sectionTitle { margin: 0; font-family: var(--orbital-font-display); font-size: 1.25rem; }
  .route, .form .pickerButton, .form .menu button { display: flex; align-items: center; gap: var(--orbital-space-3); }
  ```
  (`.choices` en 2 columnas desde ~32rem, apiladas en 375 px; sin scroll horizontal en 375/768.)
- `MyRouteStatus.tsx`:
  - L229 botón "Cerrar" del diálogo → `className={styles.dialogClose}`; L156 submit ya tiene `styles.submit`.
  - Picker L131: `<StackIcon pathId={catalogPathId} size="sm" /><span>{OFFICIAL_PATHS.find((choice) => choice.id === catalogPathId)?.label}</span>`.
  - Opciones L146: `<StackIcon pathId={choice.id} size="sm" />{choice.label}` (el `<img alt="">` no aporta texto → `MyRouteStatus.test.tsx:95` `textContent === "React"` sigue verde).
  - `PATH_CHOICES` → `OFFICIAL_PATHS` (import de `@/config/official-paths`) en `routeTitle` (L30-33), estado inicial (L46) y mapeos.
- **Quitar placeholder:** `MyRouteStatus.tsx:199` `<div className={styles.videoSlot}>El video va acá</div>` → eliminado; regla `.videoSlot` (`MyRouteStatus.module.css:146-153`) eliminada.

### 3.4 Estados de interacción (Lote 3)

| Control | default | hover | focus-visible | active | disabled | loading |
|---|---|---|---|---|---|---|
| `.choice` | borde + texto `--orbital-lime`, fondo transparente | fondo `--orbital-lime`, texto `--orbital-night` | global | fondo `--orbital-lime-strong` | n/a | n/a |
| `.submit` "Crear ruta" | ídem `.choice` | ídem | global | ídem | borde `--orbital-outline-variant`, texto `--orbital-outline`, `not-allowed` | texto "Creando…" + `disabled` (existente) |
| Picker / opción | fondo `--orbital-surface-container-low` | sin cambio | global | opción seleccionada `color-mix(lime 16%)` + texto lime (existente) | n/a | n/a |
| Cover (`<img>`) | no interactivo | — | — | — | — | `loading="lazy"`; fondo `#130c25` mientras carga; `onError` oculta |

### 3.5 Tests del Lote 3

- `frontend/path-diagram/src/path-diagram.modal.test.tsx` — nuevos `it`:
  - "shows the course cover when the card has one": `detail.coverImageUrl = "https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg"` → `dialog img` con ese `src`, `alt=""`, `width="640"`, `height="360"`, `loading="lazy"`, `referrerpolicy="no-referrer"`.
  - "renders no cover block without an image": `coverImageUrl: null` → `dialog img` `toBeNull()`.
  - "hides the cover when it fails to load": dispatch `new Event("error")` sobre el `img` → `dialog img` `toBeNull()`.
  - "never renders the cover in mcp mode": mismo item, `mode="mcp"` → `dialog img` `toBeNull()`.
- `frontend/path-diagram/src/layout-path.test.ts` — nuevo `it` "column headers are sentence case": labels de nodos `header:*` y `group:anytime` `toEqual(["Requerido", "Recomendado", "Opcional", "En cualquier momento"])`. Los 13 tests de geometría sin cambio.
- `frontend/test/src/features/learning-paths/components/MyRouteStatus.test.tsx:128` → `not.toContain("El video va acá")`; nuevo assert: opciones del listbox contienen `img[src^='/devtalles-tech/']` con `alt=""` (13).
- `frontend/test/src/contracts/course-card.contract.test.tsx`: se completa con el render del cover (ver 2.9).
- **Nuevo** `frontend/test/src/ui-devtalles-polish/configurator-layout.static.test.ts`: `configurador-de-ruta/page.module.css` contiene `width: min(100%, 48rem)`; `MyRouteStatus.module.css` no matchea `/\.choice,\s*\.form button,\s*\.dialog button\s*\{[^}]*justify-self:\s*start/s` ni contiene `videoSlot`; `path-diagram/src/path-diagram.module.css`: bloques `.header,\n.groupLabel` y `.dialog h3` sin `text-transform: uppercase`, `.tags li` con `text-transform: capitalize`; `path-diagram/src/layout-path.ts` no contiene `REQUERIDO|RECOMENDADO|OPCIONAL|EN CUALQUIER MOMENTO`.
- `cd frontend/path-diagram && npm run build:widget && npx vitest run` (CA-3.7).

---

## Lote 4 — Copy humanizado + tokens + marca + landing

Registro: **voseo rioplatense**. Títulos en oración. Sin `//`. Etiquetas pequeñas (kicker/eyebrow/pill de estado) conservan su `text-transform: uppercase` de CSS como identidad Orbital (conformidad); lo que cambia es el texto literal en mayúsculas y los headings.

### 4.1 Tabla de reemplazo de copy

**`frontend/src/app/(producto)/page.tsx`**

| Línea | Hoy | Nuevo |
|---|---|---|
| 78 | `<span className={styles.location}>LOC: 09° // LAT 12° \| ESTADO: ACTIVO</span>` | **eliminado** (dato inventado) + CSS `.location` (L278 y media L689) eliminado |
| 82 | `descubre tu ruta de` | `Descubrí tu ruta de` |
| 84 | `<span>aprendizaje ideal</span>` | sin cambio (continuación de la oración) |
| 96-102 | bloque `.calibration` (`CALIBRACIÓN ESTIMADA: ~4 MINUTOS` / `0% SPAM // ALINEADO CON LA INDUSTRIA TECH`) | **eliminado** + CSS `.calibration*` (L189-213, media L633) eliminado |
| 105 | `landingFixture.telemetry.map(…)` | `[["Rutas oficiales", String(OFFICIAL_PATHS.length)] as const, ...landingFixture.telemetry].map(…)` — única cifra, derivada (import `OFFICIAL_PATHS` de `@/config/official-paths`) |
| 122 | `SELECCIONA TU PUNTO DE PARTIDA ACTUAL PARA PERSONALIZAR EL VECTOR` | `Puntos de partida` |
| 125 | `puertas de acceso a la misión` | `Elegí desde dónde arrancás` |
| 128 | `<span className={styles.dispatch}>DISPATCH MODE // 04 STRATEGIC ENTRYPOINTS</span>` | **eliminado** + CSS `.dispatch` (L103, L274, media L651) eliminado |
| 136-139 | `.doorMeta` (`DOOR // 01`, `SYS.REF // 01-START`) | **eliminado** (numeración que no codifica una secuencia real) + CSS `.doorMeta` (L231, L314, L321) eliminado |
| 145 | span con "Ventana de vuelo 4 - 6 meses" / "Metodología Puente sintáctico" / "Profundidad Alta escala" / "Vector RIASEC-Dev 360°" | **eliminado** (cifras/claims inventados); queda solo el span de `door.metadata` (L144) |
| 149 | `CALIBRAR ESTE PUNTO` | `Empezar por acá` |
| 191 | `EQUIPO` | `Equipo` |
| 194 | `desarrolladores` | `Desarrolladores` |

**`frontend/src/features/orbital/fixtures/landing.fixture.ts`**

| Línea | Hoy | Nuevo |
|---|---|---|
| 25 | `SISTEMA DE NAVEGACIÓN Y CALIBRACIÓN DE CARRERA // DEV_PATH_ORBITAL` | `Rutas de aprendizaje de DevTalles` |
| 26 | `descubre tu ruta de aprendizaje ideal` | `Descubrí tu ruta de aprendizaje ideal` |
| 27 | subtitle | sin cambio |
| 28-29 | `Algoritmo de diagnóstico RIASEC adaptado a la industria tech. Mapea tu perfil…` | `Elegí una ruta oficial del catálogo de DevTalles o pedile a tu IA que arme una a tu medida con el MCP de CodeQuest. Después seguís tu avance curso por curso.` |
| 30 | `Descubre tu ruta` | `Configurá tu ruta` |
| 33-35 | `["MOTOR","RIASEC.DEV v2.4"], ["TAXONOMÍA","38 RUTAS ACTIVAS"], ["CERTIFICACIÓN","100% PRODUCCIÓN"]` | `["Catálogo", "DevTalles"], ["Con tu IA", "MCP para Claude y Cursor"]` |
| 40 | `empiezo de cero` | `Empiezo de cero` |
| 48 | `cambio de stack` | `Cambio de stack` |
| 50 | `Vienes de otro lenguaje o ecosistema backend/mobile y necesitas productividad…` | `Venís de otro lenguaje o ecosistema backend/mobile y necesitás productividad inmediata en React, NestJS, Node o Flutter.` |
| 56 | `especializarme` | `Quiero especializarme` |
| 58 | `Lleva tu código a escala de alta disponibilidad: microservicios distribuidos, …` | `Llevá tu código a escala: microservicios, testing automatizado, arquitectura hexagonal y DevOps pragmático.` |
| 64 | `no sé qué quiero` | `No sé qué quiero` |
| 66 | `Deja que el test situacional detecte tus inclinaciones…` (el test situacional no es alcanzable: `AssessmentWizard` huérfano) | `Pedile a tu IA que te haga preguntas y arme una ruta a tu medida con el MCP de CodeQuest.` |
| 68 | `metadata: ["Diagnóstico", "Completo"]` | `metadata: ["Modo", "Con tu IA"]` |
| 72 | `Algoritmo de alineación técnica continua` | `Qué vas a encontrar` |
| 74 | `Sin contenidos de relleno • Enfoque 100% en habilidades de producción real` | `Cursos del catálogo oficial de DevTalles, ordenados en una ruta que podés seguir curso por curso.` |
| 76-78 | `ESTRUCTURADO POR FERNANDO HERRERA`, `TELEMETRÍA EN TIEMPO REAL`, `CERO DEUDA TÉCNICA` | `Rutas oficiales del catálogo DevTalles`, `Tu progreso guardado en tu cuenta`, `Rutas a medida con tu IA vía MCP` |

**`frontend/src/features/orbital/components/MissionRadar.tsx`** (Should del spec: labels reales)

| Línea | Hoy | Nuevo |
|---|---|---|
| 7-14 | `NODES` con `label: "TS_FOUND" / "NEST.SYS" / "REACT_ARC" / "DOCKER/K8S" / "HEX_DOMAIN" / "CLEAN_CODE"` | mismos `cx/cy/r/x/y/primary`, `label` → `pathId`: `"programas-fundamentos"`, `"programas-nest"`, `"programas-react"`, `"programas-node"`, `"programas-angular"`, `"ruta-python"`; render `{officialPathLabel(node.pathId)}`; `key={node.pathId}` |
| 33 | `VECTOR DISPLAY // POLAR MATRIX` | `Tu progreso` |
| 34 | `T-ORBIT: {orbit}` | `Avance: {Math.round((bearing / 360) * 100)} %` (y se elimina la constante `orbit` L27) |
| 42 | `Matriz orbital de seis nodos` | `Radar de progreso sobre seis rutas oficiales` |
| 91 | `NODOS ACTIVOS: {completedCount}` | `Cursos completados: {completedCount}` |
| 93 | `{bearing === 0 ? "EN ESPERA" : "PROPULSIÓN: DIRECTA"}` | `{bearing === 0 ? "Sin empezar" : bearing >= 360 ? "Ruta completa" : "En curso"}` |
| 95 | `<span>{bearing >= 360 ? "ÓRBITA: CERRADA" : "SIMULACIÓN: READY"}</span>` | **eliminado** (su información pasó a L93) |

**`frontend/src/features/auth/components/LoginPanel.tsx`**

| Línea | Hoy | Nuevo |
|---|---|---|
| 20 | `TERMINAL DE ACCESO // AUTH` | `Acceso con Discord` |
| 22 | `"Inicia sesión en tu misión"` | `"Entrá a CodeQuest"` (register `"Creá tu cuenta"` sin cambio) |
| resto | "Crear cuenta", "Ya tengo cuenta", ledes, aria-labels | sin cambio (ya en voseo) |

**`frontend/src/features/integrations/components/GithubPreview.tsx`**

| Línea | Hoy | Nuevo |
|---|---|---|
| 49 | `MARKDOWN COPIADO AL PORTAPAPELES` | `Copiaste el Markdown al portapapeles` |
| 72 | `MENSAJE PARA DISCORD COPIADO // LISTO PARA PEGAR` | `Copiaste el mensaje para Discord. Ya podés pegarlo.` |
| 87 | `✦ SE ACTUALIZA SOLO CON TU PROGRESO ✦` | `Se actualiza solo con tu progreso` |
| 93 | `RAW PREVIEW ✦ UTF-8` | `Vista previa del archivo` |
| 97 | `RENDER VISUAL DE LA INSIGNIA` | `Así se ve la insignia` |
| 98 | `STATUS: 34% COMPLETADO` | `34 % completado` (valor mock de pantalla mock-only, ADR 0001; no se toca el número) |
| 112 | `VISTA PREVIA EN ESCALA 1:1 // INYECCIÓN VECTORIAL` | `Vista previa a tamaño real` |
| 115 | `CÓDIGO FUENTE DE INCRUSTACIÓN (MARKDOWN)` | `Código Markdown para tu README` |
| 116 | `FORMATO ESTÁNDAR` | `Markdown estándar` |
| 127 | `{copyStatus === "success" ? "✓" : "⧉"}` (glifo unicode como icono) | `{copyStatus === "success" ? <Check aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} /> : <Copy aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} />}` — el piso de oficio de la constitución lo exige (unicode como icono), mismo ADR 0002 |

**`frontend/src/features/learning-paths/components/ReplanningProposal.tsx`**

| Línea | Hoy | Nuevo |
|---|---|---|
| 76 | `✦ DIFF GENERADO POR EL MOTOR — determinista y explicable` | `Cambios propuestos para tu ruta` |
| 81 | `label="LINEAL // BASELINE"` | `label="Ruta actual"` |
| 84 | `label="AJUSTE PROPUESTO"` | `label="Ajuste propuesto"` |
| 90 | `CRITERIOS DE OPTIMIZACIÓN` | `Por qué la cambiamos` |
| 156 | `"MOD // POST-DESPLIEGUE"` / `"MOD // CORE VINCULANTE"` | `"Después del despliegue"` / `"Parte central"` |

**`frontend/src/features/assessment/components/AssessmentResults.tsx`**

| Línea | Hoy | Nuevo |
|---|---|---|
| 28 | `✦ DIAGNÓSTICO TELEMÉTRICO // SÍNTESIS` | `Resultado de tu diagnóstico` |
| 29 | `tu arquetipo:` | `Tu arquetipo` |
| 64 | `<span>●</span>` | `<span aria-hidden="true">●</span>` (viñeta decorativa, Could del spec) |
| 65 | `CALIBRACIÓN: 94.2% DE AFINIDAD` | `Afinidad: 94,2 %` (mock, ADR 0001) |
| 66 | `✦ COMPLEJIDAD SUGERIDA: {…}` | `Complejidad sugerida: {assessment.result.complexity}` |
| 69 | `<span aria-hidden="true">⌁</span>` | **eliminado** (glifo de relleno) |
| 71 | `VECTOR DE DOMINIO PRIMARIO` | `Área principal` |
| 79 | `✦ RUTAS IDENTIFICADAS EN CATÁLOGO` | `Rutas del catálogo para vos` |
| 80 | `3 EXPEDIENTES DISPONIBLES` | `{routeCards.length} rutas disponibles` (derivado de la lista que se renderiza, L21) |
| 96 | `SECUENCIA DE MISIÓN:` | `Orden sugerido` |
| 103 | `{route.action} <span aria-hidden="true">→</span>` | `{route.action} <ArrowRight aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} />` |

**`frontend/src/features/assessment/components/TypescriptCheckpoint.tsx`**

| Línea | Hoy | Nuevo |
|---|---|---|
| 22 | `REGISTRANDO RESPUESTA…` | `Guardando tu respuesta…` |
| 70-73 | 4 spans `.coordinate*` (`[SYS.EVAL // CHK-TS-01]`, `COORD: +42.08 // SEC.B`, `STATUS: RUNNING`, `REG.ID // 0x98A1`) | **eliminados** + reglas `.coordinateTopLeft/TopRight/BottomLeft/BottomRight` de `TypescriptCheckpoint.module.css` eliminadas (sin tests que las lean — verificado) |
| 75 | `✦ REQUISITO DE DESPEGUE // VERIFICACIÓN SINTÁCTICA` | `Chequeo de TypeScript` |
| 96 | `✦ REGISTRAR` | `Elegir` |
| 102 | `` `OPCIÓN [ 0N ] REGISTRADA EN TELEMETRÍA` `` / `"SIN VALOR SELECCIONADO"` | `` `Elegiste la opción ${n}` `` (n = índice + 1, sin padding) / `"Todavía no elegiste una opción"` |
| 110 | `CONFIRMAR RESPUESTA <span aria-hidden="true">→</span>` | `Confirmar respuesta <ArrowRight aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} />` |

**`frontend/src/features/live-path/components/LivePathScreen.tsx`**

| Línea | Hoy | Nuevo |
|---|---|---|
| 29 | `×` | Lucide `X` (Lote 1) |
| 37 | `Esperando que Claude arme la ruta.` | `Esperando que tu IA arme la ruta.` |

**`frontend/src/features/learning-paths/components/MyRouteStatus.tsx`**

| Línea | Hoy | Nuevo |
|---|---|---|
| 80 | kicker `Mis rutas` | `Configurador de ruta` (mismo nombre que nav y `metadata.title`) |
| 81-83 | h1 `Tus rutas` | `Armá tu ruta` |
| antes de L84 | — | `<h2 className={styles.sectionTitle}>Tus rutas</h2>` (encabeza estados loading/empty/list) |
| 202 | `Copia y pega esto a tu IA para conectarte` | `Copiá y pegá esto en tu IA para conectarte` |
| resto | "Quiero hacerlo por…", "Por el momento no hay ruta", "Crear ruta", "Qué querés aprender" | sin cambio (neutros o ya voseo) |

**`frontend/src/features/learning-paths/components/LearningPathsEmptyState.tsx`** (tuteo en archivo vivo, CA-4.1)

| Línea | Hoy | Nuevo |
|---|---|---|
| 20 | `Aún no tienes rutas` | `Todavía no tenés rutas` |
| 21 | `Responde el cuestionario y descubre tu Dev DNA` (cuestionario no alcanzable) | `Elegí una ruta oficial o pedile a tu IA que arme una.` |
| 23 | `Descubre tu ruta` | `Ir al configurador de ruta` |

**Otros**

| Archivo:línea | Hoy | Nuevo |
|---|---|---|
| `app/(producto)/mis-rutas/page.tsx:15` | `<h1>mis rutas</h1>` | `<h1>Mis rutas</h1>` |
| `app/(producto)/mis-rutas/[routeId]/page.tsx:7` | `"Detalle mock de una ruta de aprendizaje."` | `"Tu ruta de aprendizaje, curso por curso."` |

### 4.2 Cifra de landing — derivación

La única cifra es `OFFICIAL_PATHS.length` de `frontend/src/config/official-paths.ts` (Lote 2), que el test `official-paths.test.ts` ancla a `OFFICIAL_PATH_IDS` del backend. Nunca un literal `13` en `page.tsx` ni en el fixture.

### 4.3 `text-transform` a cambiar

| Archivo:línea | Hoy | Nuevo |
|---|---|---|
| `app/(producto)/mis-rutas/page.module.css:27` | `text-transform: lowercase;` (h1) | eliminar la línea |
| `features/live-path/components/LivePathScreen.module.css:18-22` | `.kicker, .title { font-family: var(--live-display), sans-serif; text-transform: uppercase; letter-spacing: 2px; }` | separar: `.kicker` según tabla 4.5; `.title` sin `text-transform` ni `letter-spacing` |
| `LivePathScreen.module.css:84` | `.notes h2 { text-transform: uppercase; letter-spacing: 1.5px }` | eliminar ambas |
| `features/assessment/components/AssessmentResults.module.css:176` | `.archetypeHeader > span { text-transform: lowercase }` | eliminar la línea |
| `path-diagram.module.css:53,143,192` | ver §3.2 | ver §3.2 |
| Se conservan (etiquetas, no títulos) | `MyRouteStatus.module.css:14` `.kicker`, `LivePathScreen.module.css:44` `.connection`, `LoginPanel.module.css:19,28` `.eyebrow`/`.terminalLabel`, `page.module.css:554,581` `.social`/`.crewList span`, `path-diagram.module.css:96` `.kicker`, `path-card.module.css:116,125`, `LearningPathsDashboard.module.css`, `McpDocs.module.css:15`, `GithubPreview.module.css`, `ReplanningProposal.module.css`, `TypescriptCheckpoint.module.css:31`, `auth/error/page.module.css:43` | sin cambio (identidad Orbital; conformidad) |

### 4.4 `user-select`

`app/(producto)/page.module.css:11` `user-select: none;` en `.page` → **eliminar la línea**. Es el único caso en `frontend/src`.

### 4.5 Mapeo hex / rgb → token (ningún token nuevo)

Tokens citados de `frontend/src/app/globals.css` (valores de hoy): `--orbital-surface #121125`, `--orbital-cosmos #09081c`, `--orbital-night #110c30`, `--orbital-panel-raised #3e287b`, `--orbital-ink #ffffff`, `--orbital-ink-muted #b48cf3`, `--orbital-lime #c8dd0b`, `--orbital-lime-strong #d9ee1c`, `--orbital-border rgb(120 94 172 / 30%)`, `--orbital-border-strong #785eac`, `--orbital-surface-container-lowest #0d0c20`, `--orbital-surface-container-low #1a192e`, `--orbital-surface-container #1e1d32`, `--orbital-surface-container-high #29283d`, `--orbital-outline #958e9b`, `--orbital-outline-variant #494550`, `--orbital-on-surface #e3dffc`, `--orbital-on-surface-variant #cbc4d1`, `--orbital-primary #d3bbff`, `--orbital-primary-container #785eac`, `--orbital-tertiary #bdd100`, radios `sm 0.25rem / md 0.75rem / lg 1rem / xl 1.5rem / full 9999px`, espacios `1 0.25 · 2 0.5 · 3 0.75 · 4 1 · 5 1.5 · 6 2.5 · 7 3 · 8 5 rem`, `--orbital-shadow-panel`, `--orbital-motion-fast 160ms cubic-bezier(0.23, 1, 0.32, 1)`, `--orbital-motion-standard 240ms cubic-bezier(0.77, 0, 0.175, 1)`, `--orbital-font-display/body/telemetry`.

**Regla de mapeo** (aplica a los 4 archivos de CA-4.7: `LivePathScreen.module.css`, `MyRouteStatus.module.css`, `MissionShell.module.css`, `app/(producto)/page.module.css`):

| Literal | Token | Exactitud |
|---|---|---|
| `#c8dd0b` | `var(--orbital-lime)` | exacto |
| `rgb(200 221 11 / N%)` | `color-mix(in srgb, var(--orbital-lime) N%, transparent)` | exacto |
| `rgb(120 94 172 / 30%)` | `var(--orbital-border)` | exacto |
| `rgb(120 94 172 / N%)` (N≠30) | `color-mix(in srgb, var(--orbital-border-strong) N%, transparent)` | exacto |
| `rgb(62 40 123 / N%)` | `color-mix(in srgb, var(--orbital-panel-raised) N%, transparent)` | exacto |
| `rgb(9 8 28 / 0%)` | `transparent` | exacto |
| `rgb(203 196 209 / N%)` | `color-mix(in srgb, var(--orbital-on-surface-variant) N%, transparent)` | exacto |
| `rgb(189 209 0 / N%)` | `color-mix(in srgb, var(--orbital-tertiary) N%, transparent)` | exacto |
| `rgb(26 25 46 / N%)` | `color-mix(in srgb, var(--orbital-surface-container-low) N%, transparent)` | exacto |
| `rgb(211 187 255 / N%)` | `color-mix(in srgb, var(--orbital-primary) N%, transparent)` | exacto |
| `rgb(41 40 61 / N%)` | `color-mix(in srgb, var(--orbital-surface-container-high) N%, transparent)` | exacto |
| `rgb(13 12 32 / N%)` | `color-mix(in srgb, var(--orbital-surface-container-lowest) N%, transparent)` | exacto |
| `rgb(255 255 255 / N%)` | `color-mix(in srgb, var(--orbital-ink) N%, transparent)` | exacto |
| `#130c25` | `var(--orbital-surface)` | Δ mínima; `MyRouteStatus.module.css:142` ya lo trataba como fallback de `--orbital-surface` |
| `#f0eeff` | `var(--orbital-on-surface)` | Δ mínima (texto claro sobre superficie; contraste ≈ 14:1) |
| `#1c1829`, `rgba(28, 24, 41, 0.85)` | `var(--orbital-surface-container)` | Δ mínima |
| `#121028` | `var(--orbital-surface-container-low)` (panel de cuenta) / `var(--orbital-surface-container)` (menú del picker, elevado sobre el picker) | Δ mínima |
| `#16122c` | `var(--orbital-surface-container-low)` | Δ mínima |
| `#171228` | `var(--orbital-surface-container-low)` | Δ mínima |
| `rgb(87 48 146 / N%)` | `color-mix(in srgb, var(--orbital-primary-container) N%, transparent)` | Δ mínima (violeta al 20% sobre fondo oscuro) |
| `rgba(192, 185, 252, a)` / `rgb(192 185 252 / N%)` como **borde** | `var(--orbital-border)` | Δ declarada (sin token para `#c0b9fc`) |
| `rgb(192 185 252 / N%)` como **color** (no borde) | `color-mix(in srgb, var(--orbital-primary) N%, transparent)` | Δ declarada |
| `rgba(192, 185, 252, 0.5)` fondo de `.connection` | fondo `var(--orbital-surface-container-high)` + texto `var(--orbital-primary)` | cambio intencional: hoy `#f0eeff` sobre lila 50% ≈ 4:1 (falla AA para 0.6875rem); nuevo ≈ 8.5:1 |
| `rgb(8 6 16 / 72%)`, `rgba(8, 5, 18, 0.72)` (backdrops) | `color-mix(in srgb, var(--orbital-cosmos) 72%, transparent)` | Δ mínima |
| sombras `0 12px 32px rgb(0 0 0 / 35%)`, `0 24px 80px rgba(0,0,0,0.45)` | `var(--orbital-shadow-panel)` | token de profundidad existente (offset + blur) |
| `var(--orbital-surface, #130c25)` | `var(--orbital-surface)` | sin fallback innecesario |

Excepciones declaradas (sin cambio): `LoginPanel.module.css:77,89,98` (marca Discord); `path-diagram/src/*.module.css` y `MarkerType #dcd8ff` (widget standalone).

Las Δ mínimas son decisión de design aprobada en este checkpoint (unificar sobre el sistema en vez de crear 8 tokens casi idénticos). Si el dev prefiere tokens exactos, se agregan en `globals.css` con estos nombres: `--orbital-surface-deep` (#130c25), `--orbital-on-surface-bright` (#f0eeff) — no se proponen por defecto.

**`LivePathScreen.module.css` completo** (hoy → nuevo; px → tokens/rem):

| Selector | Cambios |
|---|---|
| `.page` L1-7 | **eliminar** (sin referencias: `grep styles.page` en `features/live-path` → 0) |
| `.top` | `max-width: 1200px` → `75rem`; `margin: 0 auto 24px` → `0 auto var(--orbital-space-5)` |
| `.kicker` | `margin: 0; color: var(--orbital-lime); font-family: var(--orbital-font-telemetry); font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase;` (mismo patrón que `MyRouteStatus.module.css:8-15`) |
| `.title` | `font-family: var(--orbital-font-display); font-size: 1.5rem; font-weight: 700; text-align: center; margin: 0 0 var(--orbital-space-6);` |
| `.topActions` | `gap: 10px` → `var(--orbital-space-2)` |
| `.connection` | `padding: var(--orbital-space-1) var(--orbital-space-3); border-radius: var(--orbital-radius-full); background: var(--orbital-surface-container-high); color: var(--orbital-primary); font-family: var(--orbital-font-telemetry); font-size: 0.6875rem; letter-spacing: 0.12em;` `text-transform: uppercase` se queda |
| `.prompt` | `font-family: var(--orbital-font-body); font-size: 1rem;` |
| `.options` | `gap: var(--orbital-space-4); max-width: 26.25rem; margin: var(--orbital-space-5) auto;` |
| `.options li`, `.notes li` | `padding: var(--orbital-space-3) var(--orbital-space-4); border: 1px solid var(--orbital-border); border-radius: var(--orbital-radius-lg); background: var(--orbital-surface-container);` |
| `.notes` | `max-width: 75rem; margin: var(--orbital-space-4) auto 0; gap: var(--orbital-space-2);` |
| `.notes h2` | `font-family: var(--orbital-font-display); font-size: 0.875rem; color: var(--orbital-lime);` |
| `.notes ul` | `gap: var(--orbital-space-2)` |
| `.canvas` | `height: 45rem; max-width: 75rem;` |
| `.backdrop` | `padding: var(--orbital-space-5) var(--orbital-space-4); background: color-mix(in srgb, var(--orbital-cosmos) 72%, transparent); transition: opacity var(--orbital-motion-standard);` |
| `.dialog` | `width: min(68.75rem, 100%); max-height: min(53.75rem, calc(100vh - var(--orbital-space-7))); padding: var(--orbital-space-5) var(--orbital-space-4) var(--orbital-space-6); border: 1px solid var(--orbital-border); border-radius: var(--orbital-radius-xl); background: var(--orbital-surface); color: var(--orbital-on-surface); box-shadow: var(--orbital-shadow-panel); transform: translateY(var(--orbital-space-4)); transition: opacity var(--orbital-motion-standard), transform var(--orbital-motion-standard);` |
| `.dialog .canvas` | `height: min(35rem, 60vh)` |
| `@media (max-width: 40rem)` | `.backdrop padding: var(--orbital-space-3)`; `.dialog max-height: calc(100vh - var(--orbital-space-5)); max-height: calc(100dvh - var(--orbital-space-5));`; canvas `min(20rem, 46vh)` |
| `.close` | `width: 2.75rem; height: 2.75rem; border: 1px solid color-mix(in srgb, var(--orbital-lime) 70%, transparent); border-radius: var(--orbital-radius-full); background: var(--orbital-surface-container); color: var(--orbital-lime); transition: background var(--orbital-motion-fast), color var(--orbital-motion-fast);` (se quitan `font-size`/`line-height`) |
| `.close:hover` | `background: var(--orbital-lime); color: var(--orbital-surface);` |
| `.close:active` (nuevo) | `background: var(--orbital-lime-strong); color: var(--orbital-surface);` |
| `.close svg` (nuevo) | `width: 1.25rem; height: 1.25rem;` |
| reduced-motion | agregar `.close` a la lista `transition: none` |

**Motion (el momento orquestado del cambio):** apertura/cierre del modal LivePath con `--orbital-motion-standard` (240 ms, curva propia, < 300 ms). `frontend/src/features/live-path/components/LivePathModal.tsx:14` `const EXIT_MS = 280;` → `const EXIT_MS = 240;` en el mismo commit (CA-4.8). `prefers-reduced-motion` ya cortocircuita (`LivePathModal.tsx:39-41,50-53` + CSS L150-155).

**`MyRouteStatus.module.css`** (además de §3.3): L85 `border-radius: 12px` → `var(--orbital-radius-md)`; L86 `#16122c` → `var(--orbital-surface-container-low)`; L88 `padding: 0.7rem 0.85rem` → `var(--orbital-space-3) var(--orbital-space-4)`; L95 `top: calc(100% + 0.35rem)` → `calc(100% + var(--orbital-space-1))`; L100 `padding: 0.35rem` → `var(--orbital-space-1)`; L104 radius → `var(--orbital-radius-md)`; L105 `#121028` → `var(--orbital-surface-container)` + `box-shadow: var(--orbital-shadow-panel)`; L111 `8px` → `var(--orbital-radius-sm)`; L116 → `color-mix(in srgb, var(--orbital-lime) 16%, transparent)`; L73 `gap: 0.45rem` → `var(--orbital-space-2)`; L131 `padding: 1rem` → `var(--orbital-space-4)`; L132 → `color-mix(in srgb, var(--orbital-cosmos) 72%, transparent)`; L138 `gap: 0.75rem` → `var(--orbital-space-3)`; L140 `padding: 1.25rem` → `var(--orbital-space-5)`; L141 `16px` → `var(--orbital-radius-lg)`; L142 → `var(--orbital-surface)`; `.copyBox` L158-161 → `gap: var(--orbital-space-3); padding: var(--orbital-space-3) var(--orbital-space-4); border: 1px dashed color-mix(in srgb, var(--orbital-lime) 55%, transparent); border-radius: var(--orbital-radius-md); background: color-mix(in srgb, var(--orbital-lime) 6%, transparent);`; `.copyHead` gap → `var(--orbital-space-3)`; `.dialog .copyIcon` `2rem` → `2.75rem` (touch) y `8px` → `var(--orbital-radius-sm)`.

**`app/(producto)/page.module.css`**: aplicar la regla de mapeo a todas las líneas listadas por grep (L3, 41, 89, 139, 166, 194, 220, 251, 302, 304, 309, 310, 323, 349, 381, 393, 415, 428, 430, 443, 512, 515, 516, 522, 525, 526, 547, 549, 564, 565); `border-radius: 999px` (L548) → `var(--orbital-radius-full)`.

### 4.6 Tests del Lote 4

Modificados:

| Archivo:línea | Nuevo valor |
|---|---|
| `test/src/ui-stitch-orbital/fase-2/login.test.tsx:43-44` | `toBe("Entrá a CodeQuest")` |
| `test/src/ui-stitch-orbital/fase-1/landing.test.tsx:51-53` | `toContain("Descubrí tu ruta de")` |
| `…/landing.test.tsx:54-56` | sin cambio (`"aprendizaje ideal"`) |
| `…/landing.test.tsx:57-59` | `toBe("Elegí desde dónde arrancás")` |
| `…/landing.test.tsx:66` | `toBe("Desarrolladores")` |
| `test/src/ui-stitch-orbital/fase-1/landing-breakpoints.characterization.test.ts:15-18` | `expect(styles).not.toMatch(/\.location\s*\{/)` + `expect(page).not.toContain("styles.location")` (lee `page.tsx`); asserts de `.doorGrid` sin cambio |
| `test/src/features/learning-paths/components/MyRouteStatus.test.tsx:129` | `toContain("Copiá y pegá esto en tu IA para conectarte")` |
| `test/src/ui-stitch-orbital/fase-6/github-dom.test.tsx:58,60` | `"Copiaste el Markdown al portapapeles"` |
| `test/src/ui-stitch-orbital/fase-4/assessment-dom.test.tsx:97` | `includes("Confirmar respuesta")` |
| `…/assessment-dom.test.tsx:105` | `toContain("Guardando tu respuesta")` |
| `test/src/ui-stitch-orbital/fase-4/checkpoint.test.tsx:21` | `toContain("Confirmar respuesta")` |
| `test/src/ui-stitch-orbital/fase-3/routes-dom.test.tsx:80` | `toBe("Todavía no tenés rutas")` (renderiza `LearningPathsEmptyState`, vivo) |

> Estos 4 últimos (`assessment-dom:97,105`, `checkpoint:21`, `routes-dom:80`) no están en la tabla de la spec pero fijan copy de componentes **vivos** (`TypescriptCheckpoint`, `LearningPathsEmptyState`); mismo porqué declarado en spec §Tests (caracterización literal de Stitch, cambio aprobado), mismo tipo de assert. `assessment-dom:64` (AssessmentWizard huérfano) y los asserts de `RouteDetail` en `routes-dom` **no se tocan**.

Nuevos:
- `frontend/test/src/ui-devtalles-polish/landing-copy.test.tsx`: render de `HomePage` → ningún texto matchea `/38 rutas|100%|~4 minutos|riasec\.dev|0% spam|cero deuda técnica|fernando herrera/i` (DOM + contenido de `page.tsx` y `landing.fixture.ts`); el item de telemetría con label "Rutas oficiales" tiene `strong` === `String(OFFICIAL_PATHS.length)`; `page.tsx` contiene `OFFICIAL_PATHS.length`; `landing.fixture.ts` no matchea `/\b13\s+rutas/i`; `page.module.css` no contiene `user-select: none`.
- `frontend/test/src/ui-devtalles-polish/copy-voice.static.test.ts`: para los 8 archivos de CA-4.2 + `MissionRadar.tsx`, `LivePathScreen.tsx`, `MyRouteStatus.tsx`, `LearningPathsEmptyState.tsx`, `LoginPanel.tsx`: quitar líneas `^\s*(\/\/|\*|\/\*)` y URLs `https?:\/\/\S+`, luego `not.toMatch(/\S\s\/\/\s\S/)` (sin separador `//`) y `not.toMatch(/\b(Inicia|Descubre|Selecciona|Copia y pega|Elige|Vienes|necesitas|Lleva|Deja|tienes)\b/)` (voseo); `LivePathScreen.tsx` no contiene `Claude`.
- `frontend/test/src/ui-devtalles-polish/tokens.static.test.ts`: los 4 CSS de CA-4.7 → `not.toMatch(/#[0-9a-fA-F]{3,8}\b/)`, `not.toMatch(/\brgba?\(/)`, `not.toMatch(/var\(--[\w-]+,\s*#/)`; recorrido de `frontend/src/**/*.css` → ninguno contiene `var(--live-display)`; `LivePathModal.tsx` contiene `const EXIT_MS = 240;` y `LivePathScreen.module.css` contiene `var(--orbital-motion-standard)` y no `ease;`; `mis-rutas/page.module.css` sin `lowercase`; `AssessmentResults.module.css` sin `text-transform: lowercase`; `LivePathScreen.module.css` bloque `.title` sin `text-transform`.
- `frontend/test/src/features/live-path/components/LivePathScreen.test.tsx`: `LivePathView` con `screen = { kind: "esperando", connection: "conectado" }` y `onClose = vi.fn()` → `button[aria-label='Cerrar']` existe, contiene `svg[aria-hidden='true']`, su `textContent` no contiene `×`; click → `onClose` llamado 1 vez; texto de espera no contiene `Claude` (CA-4.9, CA-4.10).

---

## Frontend — lenguaje visual

- **Modo: conformidad elevada.** El proyecto tiene UI Orbital completa con tokens en `globals.css` (ADR 0001); la feature se inserta en pantallas existentes. Identidad intocable; se exige oficio.
- **Superficies:** landing = **marca** (el riesgo estético vive acá: el radar Orbital, ahora etiquetado con rutas reales); shell, configurador, `/mis-rutas`, modal de curso, LivePath = **producto** (legibilidad manda).
- **Componentes existentes que se extienden (no se crea ninguno del mismo rol):** `MissionShell`, `MissionShellMobileNav`, `ShellAccount`, `MyRouteStatus`, `LearningPathsDashboard`, `LearningPathsEmptyState`, `CourseModal` (dentro de `path-diagram.tsx`), `LivePathView`, `MissionRadar`, `LoginPanel`, `GithubPreview`, `ReplanningProposal`, `AssessmentResults`, `TypescriptCheckpoint`. Único componente nuevo: `StackIcon` (no existía primitiva de imagen de marca de ruta; buscado en `features/**/components`).
- **Tokens consumidos:** los citados en §4.5. **Token faltante: ninguno** → sin checkpoint de token.
- **Jerarquía:** título LivePath 1.25→1.5rem display; headers de columna y `h3` del modal en oración con tamaño legible; `h2` "Tus rutas" separa creación de listado en el configurador.
- **Ritmo:** todos los px sueltos tocados pasan a la escala `--orbital-space-*`; el configurador agrupa acciones (`.choices` en 2 columnas) y airea con la columna de 48rem.
- **Estados:** tablas §1.7 y §3.4 + `.close` LivePath (default/hover/focus/active definidos; disabled/loading n/a).
- **Motion:** un solo momento orquestado (modal LivePath, `--orbital-motion-standard`); panel móvil y botones siguen con `--orbital-motion-fast`; sin `transition: all`; reduced-motion respetado.
- **Iconos:** un solo set (Lucide) para chrome, stroke único `2`, color `currentColor` (hereda del texto/token del control), tamaño en rem por contexto; marcas (GitHub/LinkedIn/Discord) e ilustraciones `role="img"` siguen como SVG propios; logos de stack como `<img>` (imagen de marca, no icono de chrome). Iconos de relleno eliminados (protocolo landing, `⌁`).
- **Superficies del navegador:** ya tematizadas en `globals.css:140-157` (focus ring, `::selection`, caret, scrollbar) — sin cambio. `tabular-nums`: no hay datos tabulares nuevos.
- **Accesibilidad (piso AA):** controles de solo icono con `aria-label` y `<svg aria-hidden>`; imágenes decorativas `alt=""`; contraste verificado en los pares nuevos (§1.7, §4.5 `.connection`); touch targets tocados ≥ 2.75rem (Entrar, cerrar LivePath, copiar, choices); foco visible global; la variante login gana navegación móvil operable por teclado (Escape existente).

## ADR

- **Nuevo:** `decisions/0002-lucide-chrome-icons.md` — `status: accepted` (aprobación previa del dev vía plan). Supera la cláusula "sin librerías de iconos nuevas" de `decisions/0001-ui-stitch-orbital.md` limitada a iconos de chrome, y registra que el copy humanizado supera la traducción literal Stitch (memoria #1460). Unifica la nota de CA-4.11 (no se crea un tercer documento).
- Por qué hace falta: la propuesta agrega una dependencia de runtime del front (librería de iconos) que contradice un ADR aceptado, y el contrato `CourseCard` tiene consumidor externo (MCP `get_my_path`), cubierto acá por §Contrato del spec + artefacto `contracts/course-card.example.json` (aditivo, sin bump).
- `spec.md` gana la línea `ADR: decisions/0002-lucide-chrome-icons.md` (la lee `sdd-gate.mjs`).
- Pendiente para apply/archive (CA-4.11): `mem_save` con relación `supersedes` sobre #1460 (esta fase lo registra; ver resumen).

## Supuestos que apply verifica

- Lucide 1.48.0 agrega o no `aria-hidden` por defecto: se pasa explícito igual (sin depender del default).
- Nombre exacto del userId en `mcp-user-tools.spec.ts` para `service.getById` en el assert de paridad.
- `svg circle` de la landing = 12 tras quitar el icono de protocolo (radar sin progreso = 12 círculos); si difiere, se fija el valor medido, no se relaja el assert.
- Los 14 SVG siguen respondiendo `200 image/svg+xml` al descargarlos (verificados en explore y hoy con 5 muestras).

## Deuda anotada en esta fase (además de la de spec)

- Cifras mock en pantallas mock-only (`GithubPreview` "34 %", `AssessmentResults` "94,2 %"): se humaniza el texto, no el número (son mock declarado por ADR 0001). Decidir en otra feature si esas pantallas se conectan o se retiran.
- `AssessmentResults.tsx:97` usa `" ➔ "` como separador de texto en `route.sequence.join(...)`: se deja (texto, no icono de control).

## Checkpoint

- ✅ **Design cubierto por la aprobación previa del dev (2026-09-27, "correr el ciclo sin frenar").**
- Antes de commitear el Lote 1: el dev sella la spec con `node .cursor/scripts/sdd/sdd-gate.mjs approve specs/ui-devtalles-polish` (toca `src/**/auth/**`), y ratifica ADR 0002 `accepted`.
- Siguiente fase: `sdd-tasks` (una lista por lote, en orden 1 → 2 → 3 → 4; el test de contrato del front se crea en el Lote 2 y se completa en el Lote 3).

📚 Referencias cargadas: `.cursor/rules/constitution-fases.mdc` (e3160314), `.cursor/rules/constitution-codigo.mdc` (2c261a0a), `.cursor/rules/frontend-layers.mdc`, `.cursor/rules/patterns-by-layer.mdc`, `.cursor/skills/frontend-reference/references/design-language.md`, `.cursor/skills/frontend-reference/references/accessibility.md`, `.cursor/templates/adr.md`, `decisions/0001-ui-stitch-orbital.md`, `specs/ui-devtalles-polish/{explore,proposal,spec}.md`, `.cursor/scripts/sdd/sdd-gate.mjs` (regla `ADR:`).

Lectura: .cursor/rules/constitution-codigo.mdc 2c261a0a
Lectura: .cursor/rules/constitution-fases.mdc e3160314
