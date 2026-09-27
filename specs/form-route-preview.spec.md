# Vista previa de la ruta del formulario

| Método | ODD + TDD + RDD |
| Fuera | El flujo MCP no cambia. Guardar sigue siendo `POST /api/me/learning-paths`. |

## Observado

En `#assessment-content`, `MyRouteStatus` lista las rutas ya guardadas (`ul.list`: Ruta Angular, Ruta 1, Ruta .NET / C#). El formulario elige un id oficial y, al enviarse, llama a `createOfficial` y mete el título en esa lista. No hay diagrama antes de guardar.

## Contrato

- Enviar el formulario arma la vista de la ruta oficial (`GET /api/catalog/paths/:pathId`) y la muestra con el diagrama. No llama a `createOfficial`.
- Debajo aparece **Guardar ruta**. Solo ese botón persiste y la agrega a la lista.
- La vista no se puede marcar como completada.
- Un id que no es una ruta oficial responde 404.
