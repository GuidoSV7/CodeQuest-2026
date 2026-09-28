# Propuesta — traducción literal Stitch

## Dirección recomendada

Traducir cada `code.html` a JSX/TSX semántico por lotes independientes,
conservando jerarquía DOM observable, textos, orden visual, breakpoints,
estados iniciales e interacciones locales. Tailwind se convierte a CSS Modules
y variables CSS; no se ejecuta CDN ni se importan HTML estáticos.

Discord mantiene exactamente `discordStartUrl`, sesión, cookies, logout y
`returnTo`. Learning paths, cuestionario, checkpoint, replanificación,
GitHub y tokens permanecen mock-only, sin HTTP, Axios, storage ni persistencia.

Cada lote requiere baseline Stitch, implementación, pruebas DOM/interacción,
capturas en 375/768/1280, pixel diff y rollback independiente.

## Alternativa descartada

Importar HTML estático o conservar `https://cdn.tailwindcss.com` produciría
markup no tipado, scripts inline, dependencia externa en runtime y una frontera
difícil de probar entre Discord y las superficies mock. Tampoco es compatible
con el build standalone actual ni con la arquitectura de features.

## Orden y rollback

1. Shell/globales y landing.
2. Login y errores de auth.
3. Dashboard, empty y detalle.
4. Configurador, resultados y checkpoint.
5. Replanificación.
6. GitHub.
7. Tokens.

Cada lote revierte únicamente sus páginas, componentes y estilos. Nunca se
revierte en bloque ni se toca backend, OpenAPI, cookies o persistencia.

## Gate de equivalencia

Una pantalla pasa solo con copy, landmarks, DOM observable, tokens,
breakpoints e interacciones equivalentes, sin diferencia visual superior al 1%
por viewport. El conjunto final requiere 36 comparaciones: 12 fuentes por tres
viewports. Las máscaras, si fueran imprescindibles por contenido dinámico,
deben quedar documentadas.

## Riesgos

- `layout.tsx` y `globals.css` impactan todas las rutas.
- `LoginPanel` puede romper Discord, logout o `returnTo`.
- La literalidad se incumple si se mejora o resume el copy fuente.
- Datos no verificables deben ser `null`, placeholder explícito o no disponible.
- Una futura integración real requeriría una spec separada de contrato y seguridad.

## Decisión

Se adopta la traducción por JSX/TSX + CSS Modules, con Discord como única
integración real y el resto de superficies mock-only.
