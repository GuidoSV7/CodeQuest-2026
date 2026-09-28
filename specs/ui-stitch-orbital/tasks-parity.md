# Tareas de paridad visual Stitch

## Estado

- Fundación Orbital, shell global y tokens: completado.
- Fixtures Stitch y colección de rutas: completado.
- Repintado de pantallas y estados mock-only: completado.
- Sesión demo exclusivamente en development: completado.
- Pruebas DOM mínimas con jsdom: completado.
- Verificación visual manual y gates deterministas de lint/token-lint: pendiente.

## Checklist por viewport

### 375 px

- [ ] Header y navegación no generan scroll horizontal.
- [ ] Tarjetas de rutas pasan a una columna.
- [ ] CTA y controles conservan un área táctil usable.
- [ ] Texto de telemetría permanece legible sin overflow.

### 768 px

- [ ] Shell mantiene gutters y jerarquía de navegación.
- [ ] Dashboard conserva separación entre tarjetas y gauges.
- [ ] Formularios y cuestionarios mantienen foco visible.

### 1280 px

- [ ] Contenedor máximo y header coinciden con la composición Stitch.
- [ ] Dashboard muestra dos tarjetas en grid.
- [ ] Footer queda separado del contenido principal.

## Gates reproducibles disponibles

```text
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend exec -- tsc --noEmit -p frontend/tsconfig.json
```

La evidencia de ejecución y las limitaciones de lint, token-lint, contraste
automatizado y verificación visual están documentadas en `verify.md`.
