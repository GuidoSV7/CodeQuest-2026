# Aviso cuando se arma una ruta

| Método | ODD + TDD + RDD |
| Fuera | No hay servidor de push: si la página está cerrada, no llega el evento. No cambia el modal de la ruta en vivo. |

## Observado

`RouteCreatedNotice` llama a `mostrarNotificacion`. Eso dibuja el cartel de arriba a la derecha. No hay `Notification`, service worker ni manifest. En el celular, con la página en segundo plano, ese cartel no aparece como un aviso de app.

El navegador sí puede mostrar avisos del sistema con `Notification` y `registration.showNotification`, si la persona los permitió. En iPhone hace falta agregar el sitio a la pantalla de inicio.

## Contrato

- El cartel sigue saliendo.
- Además se pide permiso una sola vez y se muestra un aviso del sistema con título `CodeQuest` y el mismo texto `Se armó la ruta {título}.`
- Si el permiso está denegado o el navegador no tiene `Notification`, solo queda el cartel.
- `replayed: true` no anuncia en ninguno de los dos.
