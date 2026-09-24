# Fixtures UI Stitch Orbital

Esta carpeta es la única fuente de fixtures para las pantallas Orbital. Los
fixtures son mock-only: no contienen secretos, credenciales, endpoints,
URLs externas no verificadas ni datos de sesión inventados.

Los valores no verificables se representan como `null` o como un estado
explícito (`loading`, `empty`, `error` o `disabled`). Las pantallas y sus
tests deben importar los datos desde este directorio en lugar de declarar
objetos paralelos.
