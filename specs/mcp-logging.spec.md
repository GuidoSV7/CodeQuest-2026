# MCP logging y errores

| Método | ODD sobre el código y el contenedor en producción + TDD + RDD (curl y tests) |
| Fuera | No se loguean tokens, cookies ni argumentos de las tools |

## Observado

Producción corre un solo contenedor del backend, levantado el 2026-09-25T19:01:10Z a partir de `ee24cfe`. El código del fallo entra en `719aefd`, que sacó `path-aliases.json` de los assets de Nest. En `/app/dist/modules/mcp-public` está `resolve-alias.js` y no el JSON. `generate_learning_path` lee ese archivo antes de mirar el catálogo; `search_courses` y `get_official_path` no. La excepción (ENOENT) caía en `fail()` y salía al cliente como `catalog_unavailable`, sin log. Los logs de Dokploy son stdout del Logger de Nest (`LOG` en el arranque). No hay líneas de las llamadas a tools.

## Contrato

- `catalog_unavailable` solo si Redis y el seed fallan y no queda snapshot en memoria.
- Cualquier otra excepción: `internal_error (ref: <id>). Error del servidor. Podés reintentar.` El log tiene el mismo ref, `error.message` y el stack.
- Cada tool loguea nombre, servidor (`/mcp` o `/mcp/user`), duración, resultado y ref.
- `/api/health` y `serverInfo.version` exponen `GIT_COMMIT` si el deploy lo inyecta.
