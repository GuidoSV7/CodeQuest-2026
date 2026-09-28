# Marcar completado desde el diagrama

| Método | ODD + TDD + RDD |
| Fuera | No cambia el endpoint `PUT /api/me/courses/:courseId/progress`. |

## Observado

En `/mis-rutas/:id` el modal del curso muestra **Marcar completado**. `PathDiagram` solo guarda si recibe `onProgress` y la ruta tiene `pathId`. `UserRouteDiagram` no pasa `onProgress`, así que el clic sale sin pedir nada al servidor ni mostrar un mensaje. El texto del modal tampoco se actualiza al cambiar `completed`, porque la ficha abierta se recuerda solo al elegir el curso.

## Contrato

- El clic llama a guardar el curso como `completed`.
- El modal dice «Curso marcado como completado.» y el botón pasa a «Marcar sin empezar».
- Si el guardado falla, el curso no queda completado y se muestra el error.
