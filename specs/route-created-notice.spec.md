# Aviso cuando se arma una ruta

| Método | ODD + TDD + RDD |
| Fuera | No se abre un aviso del sistema del celular. No cambia el modal de la ruta en vivo. |

## Observado

`ProveedorNotificaciones` ya dibuja un cartel arriba a la derecha, y hoy nadie lo usa para las rutas. Crear una ruta oficial publica `path_created` por el WebSocket, pero solo lo escucha `MyRouteStatus` en el configurador. `generate_learning_path` publica `path.generated` por SSE y `LivePathModal` lo recibe en cualquier página del shell, también en el celular, pero no muestra un aviso. Un evento con `replayed: true` es el último estado al reconectar, no una acción nueva.

## Contrato

- `path.generated` y `path_created` muestran `Se armó la ruta {título}.` en el cartel.
- El mismo id no se anuncia dos veces en esa página.
- `replayed: true`, el progreso y `path.saved` no anuncian. `path.saved` también sale al abrir una ruta que ya existía.
