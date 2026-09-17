# _example-module — plantilla (Nivel 1)

Módulo de referencia con la estructura **Nivel 1** de la skill nestjs. **Copiar y renombrar**
al crear un módulo real (`orders`, `users`, …) y borrar este ejemplo.

- `dto/` — `create-<name>.dto.ts`, `update-<name>.dto.ts` (class-validator)
- `ports/` — `<name>-repository.port.ts` (interface + token `Symbol()`)
- `infrastructure/` — `typeorm-<name>.repository.ts` (implementa el port; único lugar con TypeORM)
- en la raíz del módulo: `<name>.controller.ts`, `<name>.service.ts`, `<name>.module.ts`

Si el módulo tiene reglas de negocio no triviales → pasar a **Nivel 2** (`domain/`,
`application/`, `presentation/`). Ver `.cursor/skills/nestjs/SKILL.md`.
