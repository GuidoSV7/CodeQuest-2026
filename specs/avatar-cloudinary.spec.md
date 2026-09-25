# Spec: avatar del usuario con Cloudinary

| Campo | Valor |
|---|---|
| Change | `avatar-cloudinary` |
| Método | SDD + TDD (strict) + RDD |
| RDD | Con sesión el header muestra el recuadro `aria-label="Avatar"`. Hoy es un `span` con el nombre y no abre carga de imagen. |
| Origen | Módulo `upload-image` de ElayBet (`UploadImageService.uploadThumbnailImage` + Cloudinary `upload_stream`) |

## Comportamiento

- Sin sesión, el recuadro sigue yendo a `/login`.
- Con sesión, un click abre un modal para elegir una imagen.
- El archivo se envía como `multipart` `file` a `POST /api/me/avatar` (cookie de sesión).
- El backend usa el uploader de Cloudinary (carpeta `avatars`, máximo 400×400) y guarda `secure_url` en `users.avatar_url`.
- La URL tiene que empezar por `https://res.cloudinary.com/`. Si falta, el upload falla.
- El modal cierra y el header muestra esa imagen.
- Variables: `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_BASE_FOLDER` (default `CodeQuest`). No son obligatorias para arrancar; sin ellas el endpoint responde 503.
