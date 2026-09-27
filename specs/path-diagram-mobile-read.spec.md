# Diagrama legible en el celular

| Método | ODD + TDD + RDD |
| Fuera | En el escritorio el flujo sigue de izquierda a derecha. El zoom y el arrastre del lienzo siguen apagados. |

## Observado

En una ruta guardada, el pane de React Flow mide unos 429×1098. El flujo conectado se dibuja en columnas (paso 1 a la izquierda, los del paso 2 al lado) y `fitView` lo achica hasta `minZoom: 0.2` para que entre en el ancho. El título queda en ~0.95rem a esa escala y no se lee. Hay un test que exige ese acomodo horizontal aunque el ancho sea 429.

## Contrato

- Con ancho menor a 720, el flujo conectado se apila en una columna. El cuadro usa casi todo el ancho y el paso se lee en el tamaño real.
- Los números y las flechas se mantienen. En el celular las flechas entran por arriba y salen por abajo.
- El lienzo del celular no se achica para caber: crece con el contenido y la página hace scroll.
