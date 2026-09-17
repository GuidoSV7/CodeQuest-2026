# Fixtures DevTalles (HTML SSR)

Captura offline para tests de parsers. **No** usar red en los tests unitarios.

| Archivo | URL | Fecha captura | Notas |
|---|---|---|---|
| `listing-all.html` | https://cursos.devtalles.com/pages/todos-los-cursos | 2026-09-16 | Listado completo (~72 cards) |
| `listing-free.html` | https://cursos.devtalles.com/pages/todos-los-cursos-gratuitos | 2026-09-16 | Cursos gratis |
| `course-paid.html` | https://cursos.devtalles.com/courses/golang-backend-profesional | 2026-09-16 | Curso de pago + curriculum largo |
| `course-free.html` | https://cursos.devtalles.com/courses/visual-studio-code | 2026-09-16 | Precio Gratis |
| `course-unicode.html` | https://cursos.devtalles.com/courses/Ingeniería-de-prompts | 2026-09-16 | Slug unicode |
| `course-uppercase.html` | https://cursos.devtalles.com/courses/spring-AI | 2026-09-16 | Slug con mayúsculas |
| `course-no-preview.html` | derivado de `course-paid.html` | 2026-09-16 | Sintético: se eliminó el iframe de YouTube |
| `path-programas-react.html` | https://cursos.devtalles.com/pages/programas-react | 2026-09-16 | Ruta `programas-*` |
| `path-ruta-python.html` | https://cursos.devtalles.com/pages/ruta-python | 2026-09-16 | Ruta `ruta-*`; sin bucket EN CUALQUIER MOMENTO |
| `invalid-page.html` | n/a | 2026-09-16 | HTML mínimo sin estructura Thinkific |

User-Agent de captura: Chrome 131 (desktop).
