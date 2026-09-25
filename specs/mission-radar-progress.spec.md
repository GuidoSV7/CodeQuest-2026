# Spec: radar de misión según progreso

| Campo | Valor |
|---|---|
| Change | `mission-radar-progress` |
| Método | SDD + TDD (strict) + RDD |
| RDD | SVG observado en la home: `MissionRadar`, `viewBox="0 0 400 400"`, haz fijo `m200 200 80-70`, blanco en `(280,130)`, pie `NODOS ACTIVOS: 142` y `T-ORBIT: 0.941` |

## Comportamiento

- El haz y el blanco giran alrededor de `(200,200)`.
- Ángulo = `progressRatio * 360` grados en sentido horario, con 0 mirando arriba.
- `progressRatio` se recorta a `[0, 1]`.
- Sin sesión o sin ruta activa: ratio `0`, haz en el origen.
- Con sesión: la ruta **active** de `updatedAt` más reciente. `progressRatio`, `completedCount` e `itemCount` salen de `GET /api/me/learning-paths`.
- El nodo activo es el sector de ese ratio. Con ratio `1`, el último nodo.
- `T-ORBIT` muestra el ratio con 3 decimales. `NODOS ACTIVOS` es `completedCount`, no un número fijo.
- `prefers-reduced-motion` anula la transición del haz.
