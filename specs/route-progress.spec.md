# Progreso visible en la lista de rutas

| Método | ODD + TDD + RDD |
| Fuera | No se agrega un estado nuevo en el backend. Ya existe `PUT /api/me/courses/:courseId/progress`. |

## Observado

En el configurador, `MyRouteStatus` lista las rutas como un enlace con el título (Ruta Angular, Ruta 1, Ruta .NET / C#). El resumen ya trae `completedCount` e `itemCount`, y el detalle trae el `progress.status` de cada curso. Ninguno se dibuja en esa lista. Marcar un curso solo existe en el modal del diagrama si se pasa `onProgress`, y la página de la ruta no lo conecta.

## Contrato

- Cada ruta muestra cuántos cursos están listos, con una barra.
- Al abrir los cursos de esa ruta se ve el título de cada uno y cuáles están completados.
- Tocar un curso lo marca como completado o lo vuelve a dejar pendiente, y la cuenta de la barra cambia.
