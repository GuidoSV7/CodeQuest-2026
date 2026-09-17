# Backend — estructura (NestJS · Clean Architecture / Ports & Adapters)

Base siguiendo `.cursor/skills/nestjs/SKILL.md`. **ORM: TypeORM** (vive solo en `infrastructure/`).

```
src/
├── common/           # transversal, agnóstico de dominio
│   ├── dtos/         # PaginationDto, respuestas paginadas, DTOs compartidos
│   ├── decorators/   # @Roles(), @CurrentUser(), etc.
│   ├── filters/      # exception filters (traducen errores de dominio/BD → HTTP)
│   ├── guards/       # JwtAuthGuard, RolesGuard
│   ├── interceptors/ # logging, transform, timeout
│   └── pipes/        # validation / parsing pipes
├── config/           # configuración y validación de env
└── modules/          # un módulo por dominio de negocio (ver _example-module)
```

## Niveles (elegir el mínimo que corresponde)

**Nivel 1 — Repository Port (default, OBLIGATORIO en todo módulo):**

```
modules/<module>/
├── dto/
│   ├── create-<name>.dto.ts
│   └── update-<name>.dto.ts
├── ports/
│   └── <name>-repository.port.ts     # interface + token Symbol()
├── infrastructure/
│   └── typeorm-<name>.repository.ts   # implementa el port (skill typeorm)
├── <name>.controller.ts
├── <name>.service.ts
└── <name>.module.ts
```

**Nivel 2 — Domain Layer** (solo con reglas de negocio no triviales): agrega `domain/`
(entities puras, value objects) y `application/{use-cases,ports}/`, con
`presentation/{controller,dto}`. Ver la skill para el detalle y cuándo aplicarlo.

## Reglas base

- Dependencias hacia adentro: Domain ← Application ← Infrastructure. El service/controller
  **nunca** importa tipos de TypeORM (`Repository<T>`, entities decoradas): eso vive en `infrastructure/`.
- Controller = DTO + pipes + delegación. Sin lógica de negocio.
- `findOne` del port retorna `T | null`; las excepciones HTTP las lanza el service/use-case.
- `Logger` de NestJS, nunca `console.log`.

> Detalle completo y ejemplos: `.cursor/skills/nestjs/SKILL.md` y el subagent
> `backend/.cursor/agents/nestjs.md`.
