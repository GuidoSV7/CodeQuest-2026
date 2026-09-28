# Guardar una ruta oficial con cursos repetidos

| Método | ODD + TDD + RDD |
| Fuera | No se cambia el formulario ni el texto del error. |

## Observado

En producción, `GET /api/catalog/paths/programas-react` devuelve 20 cursos y el curso `1999158` (JavaScript Moderno), `1959693` (TypeScript), `2195572` (TanStack Query) y `2713782` (Zustand) aparecen dos veces. La vista previa dibuja esa lista. `POST /api/me/learning-paths` rechaza la ruta porque `createOfficial` no admite el mismo `courseId` dos veces, y la página muestra «No se pudo crear la ruta.»

## Contrato

- Al guardar y al previsualizar, se queda la primera aparición de cada curso, en el orden del catálogo.
- Un curso del listado sin id no tira abajo toda la ruta.
- Si no queda ningún curso guardable, la respuesta sigue siendo 422 `COURSE_NOT_IN_CATALOG`.
