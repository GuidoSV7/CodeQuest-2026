# Cuestionario del formulario de ruta

| Método | ODD + TDD + RDD |
| Fuera | No reemplaza el catálogo oficial. La vista previa y el guardado siguen igual. |

## Observado

En el configurador, el formulario solo pregunta «Qué querés aprender» y muestra el listado de tecnologías. Existe un `AssessmentWizard` de escenarios, pero no elige una ruta oficial ni se usa al crear la ruta.

## Contrato

- El formulario pregunta qué te gustaría construir y cuánto ya programás.
- Con las dos respuestas, elige una ruta oficial y la deja marcada en el selector. Se puede cambiar a mano.
- Recién empiezo y una página web apunta a Fundamentos. Una API y ya armo proyectos apunta a NestJS.
- Ver ruta sigue usando el id elegido.
