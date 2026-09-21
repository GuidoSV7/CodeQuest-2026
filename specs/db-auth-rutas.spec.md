# Spec: Base de datos, autenticación Discord y rutas de usuario

| Campo | Valor |
|---|---|
| Change | `db-auth-rutas` |
| Estado | **SPEC ONLY** (sin código ni migraciones) |
| Método | SDD + TDD (strict) |
| Persistencia usuarios/rutas/progreso | **PostgreSQL** (fuente de verdad) |
| Persistencia catálogo | Redis (sin cambios; ver `specs/scraper-devtalles.spec.md`) |
| Auth fase 1 | Discord OAuth2 (authorization code), scopes `identify` + `email` |
| Sesión | Cookie httpOnly + JWT firmado, 7 días, sin refresh token |

> Este documento es el contrato. La implementación MUST seguirlo. No reabre las decisiones de la tabla superior.

---

## 0. Flujo SDD + TDD (esta entrega)

| Fase | Artefacto | Estado |
|---|---|---|
| **SDD explore / propose** | Decisiones del prompt + stack existente | Hecho (inputs) |
| **SDD spec** | Este archivo | **Entrega** |
| **SDD design** | Módulos Nest (auth, users, learning-paths) Ports & Adapters | Siguiente |
| **SDD tasks** | Work units + orden TDD | Tras design |
| **TDD apply** | Migraciones → repos → services → controllers | Tras tasks; Strict TDD ON |
| **SDD verify** | Acceptance scenarios | Tras apply |

Regla TDD del proyecto (`strict_tdd: true`): ningún use-case/repo/controller de producción sin test en rojo primero.

---

## 1. Separación de responsabilidades

| Dato | Dónde vive | Notas |
|---|---|---|
| Catálogo de cursos y rutas oficiales DevTalles | Redis (`catalog:current` → `catalog:v{n}`) | Solo lectura desde estos módulos |
| Usuarios, cuentas OAuth, cuestionarios, rutas del usuario, progreso | PostgreSQL | TypeORM + migraciones |
| Tokens Discord (`access_token` / `refresh_token`) | **Ningún store** | Solo en memoria durante el callback |
| `state` OAuth (anti-CSRF) | Store efímero (ver §3.2) | TTL corto; no es sesión de usuario |
| Sesión de usuario | Cookie `cq_session` (JWT) | No hay tabla de sesiones |

---

## 2. Esquema PostgreSQL

Convenciones del proyecto: identificadores en **inglés**; timestamps `timestamptz`; UUIDs v4 generados en app o DB (`gen_random_uuid()` con extensión `pgcrypto` o `uuid-ossp`).

### 2.1 Enums

```sql
CREATE TYPE auth_provider AS ENUM ('discord');
-- Extensible después con ALTER TYPE … ADD VALUE (p. ej. 'email') sin migración destructiva.

CREATE TYPE learning_path_kind AS ENUM ('generated', 'official', 'custom');

CREATE TYPE learning_path_status AS ENUM ('active', 'archived');

CREATE TYPE path_item_bucket AS ENUM ('required', 'recommended', 'optional', 'anytime');
-- Alineado semánticamente a PathBucket del catálogo (REQUIRED/RECOMMENDED/…),
-- persistido en minúsculas en Postgres.

CREATE TYPE course_progress_status AS ENUM ('not_started', 'in_progress', 'completed');
```

### 2.2 Tablas

#### `users`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `display_name` | `varchar(128)` | NO | — | Desde Discord `global_name` o fallback `username` |
| `avatar_url` | `text` | SÍ | `NULL` | URL absoluta CDN Discord; null si sin avatar |
| `email` | `varchar(320)` | SÍ | `NULL` | Puede faltar aunque se pida scope `email` |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | Actualizar en cada write de perfil |

```sql
CREATE TABLE users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name varchar(128) NOT NULL,
  avatar_url   text NULL,
  email        varchar(320) NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

Índices:

| Índice | Definición | Query que sirve |
|---|---|---|
| (PK) | `users_pkey` | Lookup por sesión JWT `sub` |
| `users_email_uidx` | `UNIQUE (email) WHERE email IS NOT NULL` | Futuro login email; evita duplicados cuando hay email |

No hay unique sobre `display_name` (no es identidad).

#### `auth_accounts`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NO | — | FK → `users.id` **ON DELETE CASCADE** |
| `provider` | `auth_provider` | NO | — | Fase 1: solo `discord` |
| `provider_account_id` | `varchar(64)` | NO | — | Discord snowflake **como string** |
| `created_at` | `timestamptz` | NO | `now()` | |

```sql
CREATE TABLE auth_accounts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider             auth_provider NOT NULL,
  provider_account_id  varchar(64) NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_accounts_provider_account_uidx
    UNIQUE (provider, provider_account_id)
);

CREATE INDEX auth_accounts_user_id_idx ON auth_accounts (user_id);
```

Índices:

| Índice | Query que sirve |
|---|---|
| `UNIQUE (provider, provider_account_id)` | Upsert en login Discord |
| `auth_accounts_user_id_idx` | Listar providers de un user (futuro) |

**Prohibido** persistir tokens OAuth en esta tabla (ni en ninguna otra).

#### `questionnaire_responses`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NO | — | FK → `users.id` **ON DELETE CASCADE** |
| `answers` | `jsonb` | NO | — | Snapshot inmutable de respuestas |
| `created_at` | `timestamptz` | NO | `now()` | |

```sql
CREATE TABLE questionnaire_responses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers    jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX questionnaire_responses_user_id_idx
  ON questionnaire_responses (user_id);
```

El esquema interno de `answers` lo fija el módulo de generación (fuera de este spec). Aquí solo se exige JSON objeto válido no vacío (`jsonb` + check de aplicación).

#### `learning_paths`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NO | — | FK → `users.id` **ON DELETE CASCADE** |
| `title` | `varchar(200)` | NO | — | |
| `kind` | `learning_path_kind` | NO | — | `generated` \| `official` \| `custom` |
| `questionnaire_response_id` | `uuid` | SÍ | `NULL` | FK → `questionnaire_responses.id` **ON DELETE SET NULL**; tipicamente set solo si `kind = generated` |
| `catalog_version` | `int` | NO | — | Versión Redis del catálogo al crear/importar |
| `status` | `learning_path_status` | NO | `'active'` | Soft-archive |
| `source_catalog_path_id` | `varchar(128)` | SÍ | `NULL` | Solo `kind = official`: id de ruta DevTalles (`programas-react`, …) |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | |

```sql
CREATE TABLE learning_paths (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                      varchar(200) NOT NULL,
  kind                       learning_path_kind NOT NULL,
  questionnaire_response_id  uuid NULL
    REFERENCES questionnaire_responses(id) ON DELETE SET NULL,
  catalog_version            int NOT NULL,
  status                     learning_path_status NOT NULL DEFAULT 'active',
  source_catalog_path_id     varchar(128) NULL,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_paths_official_source_chk CHECK (
    (kind <> 'official') OR (source_catalog_path_id IS NOT NULL)
  )
);

CREATE INDEX learning_paths_user_status_idx
  ON learning_paths (user_id, status);

CREATE INDEX learning_paths_user_created_idx
  ON learning_paths (user_id, created_at DESC);
```

Índices:

| Índice | Query que sirve |
|---|---|
| `(user_id, status)` | Listar rutas activas del usuario autenticado |
| `(user_id, created_at DESC)` | Listado ordenado |

#### `learning_path_items`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `learning_path_id` | `uuid` | NO | — | FK → `learning_paths.id` **ON DELETE CASCADE** |
| `course_id` | `varchar(32)` | NO | — | ID Thinkific canónico **como string decimal** (ej. `"3805831"`). Sin FK: el catálogo no está en PG |
| `course_slug` | `varchar(256)` | NO | — | Snapshot al insertar |
| `course_title` | `varchar(256)` | NO | — | Snapshot al insertar |
| `position` | `int` | NO | — | 0-based, contiguo |
| `bucket` | `path_item_bucket` | SÍ | `NULL` | Tipicamente set en `official`/`generated`; null en `custom` libre |
| `created_at` | `timestamptz` | NO | `now()` | |

```sql
CREATE TABLE learning_path_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id uuid NOT NULL
    REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id        varchar(32) NOT NULL,
  course_slug      varchar(256) NOT NULL,
  course_title     varchar(256) NOT NULL,
  position         int NOT NULL CHECK (position >= 0),
  bucket           path_item_bucket NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_path_items_path_course_uidx
    UNIQUE (learning_path_id, course_id),
  CONSTRAINT learning_path_items_path_position_uidx
    UNIQUE (learning_path_id, position)
);

CREATE INDEX learning_path_items_path_pos_idx
  ON learning_path_items (learning_path_id, position);
```

Índices:

| Índice | Query que sirve |
|---|---|
| `UNIQUE (learning_path_id, course_id)` | Un curso no se repite en una ruta |
| `UNIQUE (learning_path_id, position)` | Posiciones únicas; reorder atómico |
| `(learning_path_id, position)` | Leer items ordenados |

#### `user_course_progress`

Progreso **por usuario + curso**, no por item de ruta.

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `user_id` | `uuid` | NO | — | FK → `users.id` **ON DELETE CASCADE** |
| `course_id` | `varchar(32)` | NO | — | Mismo formato Thinkific string |
| `status` | `course_progress_status` | NO | `'not_started'` | |
| `started_at` | `timestamptz` | SÍ | `NULL` | Set al pasar a `in_progress` (primera vez) |
| `completed_at` | `timestamptz` | SÍ | `NULL` | Set al `completed`; **NULL** al volver a `in_progress` |
| `updated_at` | `timestamptz` | NO | `now()` | |

```sql
CREATE TABLE user_course_progress (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id    varchar(32) NOT NULL,
  status       course_progress_status NOT NULL DEFAULT 'not_started',
  started_at   timestamptz NULL,
  completed_at timestamptz NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id),
  CONSTRAINT user_course_progress_completed_chk CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  ),
  CONSTRAINT user_course_progress_started_chk CHECK (
    (status = 'not_started' AND started_at IS NULL)
    OR (status <> 'not_started')
  )
);

CREATE INDEX user_course_progress_user_status_idx
  ON user_course_progress (user_id, status);
```

Índices:

| Índice | Query que sirve |
|---|---|
| PK `(user_id, course_id)` | Upsert progreso; join al calcular progreso de ruta |
| `(user_id, status)` | Dashboards futuros (“mis cursos completados”) |

### 2.3 Diagrama de FKs (resumen)

```
users 1──* auth_accounts
users 1──* questionnaire_responses
users 1──* learning_paths
users 1──* user_course_progress
questionnaire_responses 1──0..* learning_paths   (SET NULL)
learning_paths 1──* learning_path_items           (CASCADE)
```

### 2.4 Estrategia de migraciones

| Regla | Valor |
|---|---|
| Herramienta | **TypeORM migrations** (`backend/src/database/migrations/`) |
| CLI | `npm run migration:generate` / `migration:run` / `migration:revert` vía `src/config/data-source.ts` |
| Tabla meta | `migrations` |
| `DB_SYNCHRONIZE` | **`false` en todos los entornos no-test**; nunca `true` en producción |
| Naming | `{timestamp}-{slug}.ts` (convención TypeORM) |
| Primera migración de este change | Crear enums + 6 tablas + índices de §2 |
| Extensión UUID | Migración previa o misma: `CREATE EXTENSION IF NOT EXISTS pgcrypto;` |

Orden de apply: enums → `users` → `auth_accounts` → `questionnaire_responses` → `learning_paths` → `learning_path_items` → `user_course_progress`.

---

## 3. Autenticación Discord OAuth2

### 3.1 Endpoints Discord (referencia canónica)

| Paso | Método | URL |
|---|---|---|
| Authorize | GET (browser) | `https://discord.com/oauth2/authorize` |
| Token | POST | `https://discord.com/api/v10/oauth2/token` (`application/x-www-form-urlencoded`) |
| Perfil | GET | `https://discord.com/api/v10/users/@me` (`Authorization: Bearer {access_token}`) |

Scopes: `identify email` (separados por espacio).

Campos usados de `/users/@me`:

| Campo Discord | Uso |
|---|---|
| `id` | `auth_accounts.provider_account_id` (**única identidad**) |
| `global_name` \| `username` | `users.display_name` (`global_name` si no null/empty; si no `username`) |
| `avatar` | Construir `avatar_url` CDN o `null` |
| `email` | `users.email` o `null` si ausente |

**MUST NOT** usar `username` ni `discriminator` como identidad.

### 3.2 Store de `state` (anti-CSRF)

| Propiedad | Valor |
|---|---|
| Generación | 32+ bytes cryptographically random, hex o base64url |
| Persistencia | **Redis** clave `oauth:state:{state}` → payload `{ createdAt }` **o** cookie httpOnly firmada `cq_oauth_state` con el mismo valor |
| TTL | **10 minutos** |
| Validación en callback | `state` query MUST existir, MUST coincidir, MUST borrarse (one-shot) |
| Preferencia | Redis si está disponible; si Redis cae en el instante del login → **503** (no degradar a state sin store) |

Justificación: el proyecto ya tiene Redis para catálogo; reutilizarlo para state efímero evita sesiones en PG (prohibidas para OAuth state de larga vida) y escala a multi-réplica.

### 3.3 Cookie de sesión

| Propiedad | Valor |
|---|---|
| Nombre | `cq_session` |
| Contenido | JWT firmado (HS256 o mejor; algoritmo fijo en config) |
| Claims mínimos | `sub` = `users.id` (uuid), `iat`, `exp` |
| Claims opcionales | `dn` = display_name (UX; no autorizar con esto) |
| `HttpOnly` | `true` |
| `Secure` | `true` en producción; `false` solo si `NODE_ENV=development` sobre HTTP local |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Max-Age` / `exp` | **7 días** |
| Refresh token | **No** |
| Logout | Clear-cookie (`Max-Age=0`) |

### 3.4 Flujo paso a paso

```
Browser                API                         Discord              Postgres / Redis
  |                     |                             |                       |
  | GET /api/auth/discord/start                       |                       |
  |-------------------->| genera state                |                       |
  |                     |---------------------------->| SET oauth:state TTL   |
  | 302 Location=discord authorize?state=…            |                       |
  |<--------------------|                             |                       |
  | redirect ---------------------------------------> |                       |
  | <— redirect callback?code&state —                 |                       |
  | GET /api/auth/discord/callback?code&state         |                       |
  |-------------------->| valida+DEL state            |                       |
  |                     | POST /oauth2/token --------->|                       |
  |                     | GET /users/@me ------------->|                       |
  |                     | (descarta tokens)            |                       |
  |                     | upsert auth_accounts+users ------------------------->|
  |                     | Set-Cookie cq_session=JWT    |                       |
  | 302 FRONTEND_URL/…  |                             |                       |
  |<--------------------|                             |                       |
```

### 3.5 Contratos HTTP — Auth

Prefijo global existente: `/api`.

#### `GET /api/auth/discord/start`

| | |
|---|---|
| Auth | Público |
| Query | opcional `returnTo` (path relativo whitelist, default `/`) |
| Response | **302** a Discord authorize URL |
| Side effects | Persiste `state` con TTL 10m; puede guardar `returnTo` junto al state |

Errores:

| Código | Cuándo |
|---|---|
| 500 | Falta config Discord |
| 503 | No se pudo persistir `state` |

#### `GET /api/auth/discord/callback`

| | |
|---|---|
| Auth | Público (one-shot OAuth) |
| Query | `code` (requerido), `state` (requerido); Discord puede enviar `error` / `error_description` |
| Success | **302** a `{FRONTEND_URL}{returnTo}` + `Set-Cookie: cq_session` |
| Failure | **302** a `{FRONTEND_URL}/auth/error?reason=…` **sin** cookie de sesión |

Errores mapeados a `reason` (query, valores cerrados):

| `reason` | Origen |
|---|---|
| `access_denied` | Usuario canceló en Discord |
| `invalid_state` | state ausente/mismatch/expirado |
| `token_exchange_failed` | Discord token endpoint no OK |
| `profile_failed` | `/users/@me` no OK o sin `id` |
| `persist_failed` | Fallo al upsert en Postgres |

Reglas de upsert:

1. Buscar `auth_accounts` por `(discord, provider_account_id)`.
2. Si existe → actualizar `users.display_name`, `avatar_url`; actualizar `email` **solo si** Discord devolvió email no nulo (no borrar email previo con `null`).
3. Si no existe → crear `users` + `auth_accounts` en la misma transacción.
4. Emitir JWT / cookie.

**Si Discord no devuelve `email`:** login **continúa**; `users.email` queda `NULL` (alta) o se conserva el valor previo (re-login).

**Tokens Discord:** se usan solo para `/users/@me` y se descartan; MUST NOT loguear el token completo.

#### `POST /api/auth/logout`

| | |
|---|---|
| Auth | Cookie presente (idempotente si no hay cookie) |
| Body | vacío |
| Response | **204** + clear `cq_session` |

#### `GET /api/auth/me`

| | |
|---|---|
| Auth | Requerido (cookie JWT válida) |
| Response **200** | `{ id, displayName, avatarUrl, email }` |
| **401** | Sin cookie / JWT inválido / expirado |

---

## 4. API de rutas del usuario

Todas las rutas bajo `/api/me/...` requieren sesión válida (**401** si no).  
Toda lectura/escritura MUST filtrar por `user_id = sub` del JWT. Si el recurso existe pero es de otro usuario → **404** (no 403; evitar enumeración).

### 4.1 Tipos de respuesta compartidos

```ts
type CourseProgressDto = {
  courseId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt: string | null;    // ISO-8601
  completedAt: string | null;
  updatedAt: string;
};

type LearningPathItemDto = {
  id: string;
  courseId: string;
  courseSlug: string;          // snapshot
  courseTitle: string;         // snapshot
  position: number;
  bucket: 'required' | 'recommended' | 'optional' | 'anytime' | null;
  unavailable: boolean;        // true si courseId no está en catálogo Redis actual
  progress: CourseProgressDto; // derivado; default not_started si no hay fila
};

type LearningPathSummaryDto = {
  id: string;
  title: string;
  kind: 'generated' | 'official' | 'custom';
  status: 'active' | 'archived';
  catalogVersion: number;
  sourceCatalogPathId: string | null;
  itemCount: number;
  completedCount: number;
  progressRatio: number;       // completedCount / itemCount; 0 si itemCount=0
  createdAt: string;
  updatedAt: string;
};

type LearningPathDetailDto = LearningPathSummaryDto & {
  questionnaireResponseId: string | null;
  items: LearningPathItemDto[]; // ordenados por position ASC
};
```

### 4.2 Endpoints

#### `GET /api/me/learning-paths`

| Query | Default | Notas |
|---|---|---|
| `status` | `active` | `active` \| `archived` \| `all` |

**200** → `{ items: LearningPathSummaryDto[] }` ordenados por `createdAt` DESC.

#### `GET /api/me/learning-paths/:pathId`

**200** → `LearningPathDetailDto`  
**404** → no existe o no pertenece al usuario.

Cálculo:

- Cargar items de la ruta.
- Leer catálogo actual Redis (si falla Redis → items con `unavailable: false` **no**; ver §6).
- Por cada item: `unavailable = !(courseId ∈ catalog.courses)`.
- Join progreso `user_course_progress` por `(userId, courseId)`.
- `completedCount` = items cuyo progreso `status === completed`.
- `progressRatio = itemCount === 0 ? 0 : completedCount / itemCount`.

#### `POST /api/me/learning-paths` — crear

Body (discriminado por `kind`):

```ts
// custom vacía o con items iniciales
{
  kind: 'custom';
  title: string;                 // 1..200
  items?: Array<{                // opcional; default []
    courseId: string;            // MUST existir en catálogo actual
    bucket?: PathItemBucket | null;
  }>;
}

// official: copia desde ruta DevTalles del catálogo Redis
{
  kind: 'official';
  catalogPathId: string;         // ej. "programas-react"
  title?: string;                // default = title de la ruta del catálogo
}

// generated: requiere questionnaire previo (generación de items = otro módulo;
// este endpoint asume items ya calculados O se implementa en el mismo change
// de generación — ver §9 supuestos)
{
  kind: 'generated';
  title: string;
  questionnaireResponseId: string; // MUST pertenecer al user
  items: Array<{ courseId: string; bucket?: PathItemBucket | null }>;
}
```

Reglas de creación:

1. Resolver cada `courseId` contra catálogo Redis actual → snapshot `course_slug` + `course_title`. Si falta → **422** `COURSE_NOT_IN_CATALOG`.
2. `catalog_version` = versión actual del snapshot Redis.
3. `official`: leer `paths` del catálogo por `catalogPathId`; si no existe → **404** `CATALOG_PATH_NOT_FOUND`; copiar entries en orden; `bucket` desde catálogo (lowercase); `source_catalog_path_id` set.
4. Posiciones asignadas 0..n-1 en el orden del array / entries.
5. Duplicados de `courseId` en el request → **422** `DUPLICATE_COURSE_IN_PATH`.

**201** → `LearningPathDetailDto`  
**400** validación DTO  
**401**  
**404** questionnaire / catalog path  
**422** reglas de negocio  
**503** catálogo Redis no disponible (no se puede crear sin snapshots)

#### `PATCH /api/me/learning-paths/:pathId`

Body parcial:

```ts
{ title?: string; status?: 'active' | 'archived' }
```

**200** → summary/detail actualizado  
**404**  
Archivar: `status = archived` (soft). No borra items ni progreso.

#### `DELETE /api/me/learning-paths/:pathId`

Hard delete de la ruta (CASCADE items). **No** borra `user_course_progress` (progreso es del usuario+curso).

**204**  
**404**

#### `POST /api/me/learning-paths/:pathId/items`

```ts
{ courseId: string; bucket?: PathItemBucket | null; position?: number }
```

- Si `position` omitido → append al final (`max+1`).
- Si `position` dado → insertar y **renumerar** contiguo (transacción).
- Curso ya en la ruta → **409** `COURSE_ALREADY_IN_PATH`.
- Curso no en catálogo → **422** `COURSE_NOT_IN_CATALOG`.

**201** → `LearningPathItemDto` (+ puede devolver path detail completo; implementación elige uno y lo fija en OpenAPI; preferencia: devolver **detail** completo para evitar race de UI).

#### `DELETE /api/me/learning-paths/:pathId/items/:itemId`

Elimina item y **renumera** posiciones 0..n-1.

**204** / **404**

#### `PUT /api/me/learning-paths/:pathId/items/order`

```ts
{ orderedItemIds: string[] }  // permutación exacta de todos los item ids de la ruta
```

**200** → detail  
**422** si no es permutación completa (`INVALID_ORDER`)

#### `PUT /api/me/courses/:courseId/progress`

```ts
{ status: 'not_started' | 'in_progress' | 'completed' }
```

Upsert en `user_course_progress` (no requiere que el curso esté en una ruta).

Transiciones / side effects:

| Nuevo status | Efectos |
|---|---|
| `not_started` | `started_at = null`, `completed_at = null` |
| `in_progress` | `started_at = coalesce(started_at, now())`, `completed_at = null` |
| `completed` | `started_at = coalesce(started_at, now())`, `completed_at = now()` |

**200** → `CourseProgressDto`  
**422** si `courseId` con formato inválido (no numérico string)

> Nota: marcar progreso de un curso **unavailable** en catálogo sigue permitido (el usuario pudo haberlo iniciado cuando existía).

#### `POST /api/me/questionnaire-responses` (soporte)

```ts
{ answers: Record<string, unknown> }  // objeto no vacío
```

**201** → `{ id, createdAt }`  
Usado antes de crear `kind: generated`. Validación profunda del shape = módulo de generación (fuera de alcance estricto; ver §9).

---

## 5. Reglas de negocio (MUST)

1. **Unicidad de curso en ruta:** `UNIQUE (learning_path_id, course_id)`. Violación → 409/422 según endpoint.
2. **Posiciones contiguas:** invariante `positions === {0,1,…,n-1}` tras cada mutación de items (insert/delete/reorder) en la misma transacción.
3. **Progreso por usuario+curso:** compartir el mismo `course_id` en dos rutas del mismo usuario refleja el **mismo** progreso.
4. **`completed` ⇒ `completed_at` set; salir de `completed` ⇒ `completed_at` null.**
5. **Progreso de ruta** = `count(items where progress.status = completed) / count(items)`.
6. **Ownership:** todo query incluye `user_id = auth.sub`.
7. **Snapshots:** al agregar item, `course_slug` y `course_title` se copian del catálogo actual; no se auto-actualizan en scrapes posteriores.
8. **`kind = official`:** `source_catalog_path_id` obligatorio; items iniciales vienen del catálogo; el usuario puede editar después (customización local; no re-sync automático).
9. **Email/password:** no en esta fase; `auth_provider` enum deja hueco para `'email'` futuro sin drop de tabla.

---

## 6. Catálogo desactualizado / Redis

| Situación | Comportamiento API |
|---|---|
| `course_id` de un item **no** está en el snapshot Redis actual | Item se devuelve igual (snapshots); `unavailable: true`; **nunca** 5xx por esto |
| Redis caído en **GET** detail/list | Devolver items con `unavailable: true` para todos **o** 503 si no hay forma de distinguir — **decisión: 503** en list/detail que necesitan catálogo para flag `unavailable` **solo si** la política de producto exige el flag fiable. Preferencia de este spec: **degradar** → `unavailable: false` + header/warning `X-Catalog-Stale: unreachable` y log warn (no tumbar lectura de rutas del user). Ver §9. |
| Redis caído en **POST/PATCH items** que requieren snapshot fresco | **503** `CATALOG_UNAVAILABLE` |
| Curso unavailable marcado completed | Permitido |

La UI puede mostrar badge “ya no está en el catálogo” usando `unavailable` + título snapshot.

---

## 7. Plan de tests

### 7.1 Infra de test DB

| Opción | Uso |
|---|---|
| **Preferida** | Contenedor efímero Postgres (`testcontainers` o script `docker run --rm` en `globalSetup` de Vitest) |
| Alternativa CI local | DB dedicada `codequest_test` en el mismo Postgres de docker-compose futuro |
| Prohibido | Apuntar tests a prod / Dokploy |

Hooks:

1. `beforeAll`: levantar PG, correr migraciones (`migration:run` contra URL de test).
2. `beforeEach` o por suite: truncate tablas en orden FK (o `TRUNCATE … CASCADE`).
3. `afterAll`: parar contenedor.

`DB_SYNCHRONIZE=false` también en test; el esquema sale **solo** de migraciones (contrato real).

### 7.2 Capas

| Capa | Qué | Doubles |
|---|---|---|
| **Repos / TypeORM** | CRUD users, auth upsert, path items uniqueness, reorder contiguo, progress constraints | PG real de test |
| **Application / services** | Reglas §5, cálculo `progressRatio`, `unavailable`, ownership | Repo ports mockeados + catalog port fake |
| **HTTP / controllers** | Status codes, cookies, 401/404 | Nest testing module; Discord HTTP mock (`nock` / fetcher fake); Redis state store fake |
| **OAuth integration (narrow)** | Callback feliz / invalid_state / email null | Discord mock + PG test |

Casos mínimos OAuth:

- [ ] start → Set state + 302 Discord
- [ ] callback state inválido → redirect error, sin cookie
- [ ] callback OK sin email → user creado, email null, cookie set
- [ ] segundo login mismo Discord id → mismo `users.id`, perfil actualizado
- [ ] logout limpia cookie; `/me` → 401

Casos mínimos rutas:

- [ ] no puede GET path de otro user (404)
- [ ] duplicate course en create → 422
- [ ] reorder no permutación → 422
- [ ] delete item renumera 0..n-1
- [ ] progress completed setea `completed_at`; volver a in_progress lo limpia
- [ ] item cuyo course_id no está en catalog fake → `unavailable: true`, 200

---

## 8. Variables de entorno

Amplían el `envSchema` Zod existente (`backend/src/config/env.validation.ts`). La app **MUST fallar al arrancar** si falta alguna crítica (mismo patrón `validateEnv`).

### 8.1 Críticas (sin default en production)

| Variable | Descripción | Dev local ejemplo |
|---|---|---|
| `DB_*` | Ya existentes | ver `.env.example` |
| `DISCORD_CLIENT_ID` | App Discord | `…` |
| `DISCORD_CLIENT_SECRET` | Secret | `…` |
| `DISCORD_REDIRECT_URI` | MUST coincidir exactamente con Developer Portal | `http://localhost:3000/api/auth/discord/callback` |
| `SESSION_JWT_SECRET` | ≥ 32 chars | `dev-only-change-me-32chars-minimum!!` |
| `FRONTEND_URL` | Origin del SPA para redirects post-login | `http://localhost:5173` |

### 8.2 Con default seguro / opcional

| Variable | Default | Notas |
|---|---|---|
| `SESSION_COOKIE_NAME` | `cq_session` | |
| `SESSION_TTL_DAYS` | `7` | |
| `OAUTH_STATE_TTL_SECONDS` | `600` | |
| `SESSION_COOKIE_SECURE` | `true` si `NODE_ENV=production`, else `false` | |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | — | Requeridas si state/catálogo usan Redis; alinear con Dokploy |

### 8.3 Fragmento `.env.example` (añadir; no aplicar aún)

```bash
# Auth Discord
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
SESSION_JWT_SECRET=dev-only-change-me-32chars-minimum!!
FRONTEND_URL=http://localhost:5173
SESSION_TTL_DAYS=7
OAUTH_STATE_TTL_SECONDS=600
```

En `NODE_ENV=production`, `SESSION_JWT_SECRET` MUST tener longitud mínima enforceable (≥32) y `DISCORD_*` / `FRONTEND_URL` sin default vacío.

---

## 9. Dudas / supuestos

1. **Generación automática de rutas (`kind: generated`):** este spec fija persistencia + API de items; el algoritmo que transforma `questionnaire_responses.answers` → lista de `courseId` es un change aparte. Supuesto: ese change llamará `POST /api/me/learning-paths` con `kind: generated` o un use-case interno compartido.
2. **Shape de `answers` jsonb:** no validado aquí más allá de “objeto no vacío”.
3. **Degradación Redis en GET:** preferencia documentada en §6 (degradar + warning). Confirmar en design si producto prefiere 503 estricto.
4. **Columna `source_catalog_path_id`:** añadida respecto al prompt mínimo para poder re-mostrar origen “oficial” y evitar duplicar imports ciegos; semántica compatible.
5. **Avatar URL:** se asume construcción estándar Discord CDN `https://cdn.discordapp.com/avatars/{id}/{avatar}.png`; si `avatar` es null → `users.avatar_url = null` (default embed Discord no se inventa).
6. **CORS / dominio cookie:** supuesto same-site o frontend y API bajo dominios que permitan cookie `SameSite=Lax` en top-level redirect OAuth. Cross-site puro puede requerir ajuste futuro (`None`+`Secure`) — fuera de fase 1 si el deploy usa subdominios hermanos.
7. **Rate limit** en `/auth/discord/start` y callback: recomendado (Redis) pero no contrato de esta fase.
8. **`course_id` string vs number del catálogo:** catálogo Redis usa `number`; Postgres/API usan string decimal sin notación científica. Conversión en el boundary catalog↔API.
9. **Eliminar vs archivar:** ambos expuestos; UI decide. Hard delete no toca progreso global del curso.
10. **Tests Discord:** no pegar a Discord real en CI; solo mocks.
11. **Extensión `auth_provider`:** futuro `'email'` implicará tabla de credenciales aparte; no se diseña aquí.
12. **Idempotencia create official:** no hay unique `(user_id, source_catalog_path_id)`; el usuario puede importar la misma ruta oficial varias veces (supuesto). Si producto quiere una sola, añadir unique parcial en design.

---

## 10. Acceptance checklist (verify futuro)

- [ ] Migración aplica en PG vacío y es reversible.
- [ ] Login Discord sin email crea user usable.
- [ ] Re-login no duplica `users` ni `auth_accounts`.
- [ ] Cookie httpOnly / Secure(prod) / SameSite=Lax / 7d.
- [ ] No hay columna ni log persistente de tokens Discord.
- [ ] CRUD rutas scoped al user; 404 cross-user.
- [ ] Items con curso ausente del catálogo → `unavailable: true`, HTTP 200.
- [ ] Progress ratio correcto; `completed_at` coherente con status.
- [ ] Posiciones siempre contiguas tras mutaciones.
- [ ] Arranque falla si faltan `DISCORD_*` / `SESSION_JWT_SECRET` / `FRONTEND_URL` en production.

---

## 11. Fuera de alcance (explícito)

- Scraper / mutación del catálogo Redis.
- Sesiones en BD, refresh tokens, almacenamiento de tokens Discord.
- Login email/password.
- Pagos, roles admin, compartir rutas entre usuarios.
- Código, entities TypeORM, migraciones generadas.
