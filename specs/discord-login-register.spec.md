# Spec: login y registro con Discord

| Campo | Valor |
|---|---|
| Change | `discord-login-register` |
| Método | SDD + TDD (strict) + RDD |
| RDD | Header en `/login`: `<header class="MissionShell-module__…__header">` con texto `AVATAR`. El panel tiene un botón visual de Discord y un formulario de correo que no llama al API. |

## Comportamiento

- No hay usuario/contraseña. Identidad solo por Discord.
- `/login` y `/registro` abren `GET {API}/api/auth/discord/start`. El backend crea la cuenta la primera vez y reingresa si ya existe.
- El header, con `aria-label="Avatar"`, muestra **Entrar** y **Crear cuenta** si no hay sesión. Con sesión, el nombre de Discord.
- La sesión se hidrata con `GET /api/auth/me`, no con un usuario fixture.
