# Spec: endurecer Redis

| Campo | Valor |
|---|---|
| Change | `redis-hardening` |
| Estado | **SPEC ONLY** (sin código ni cambios de infraestructura) |
| Método | SDD + TDD |
| Exploración | `specs/redis-hardening/exploration.md` |
| Qué no entra | Copiar el catálogo a Postgres, cache-aside, réplicas, Sentinel, clustering |

Redis guarda solo el catálogo scrapeado. Postgres sigue siendo la fuente de verdad de usuarios, rutas y progreso. El catálogo se puede volver a scrapear. `catalog.seed.json` es un respaldo mínimo, no una copia del snapshot vivo.

---

## 0. Hechos de la auditoría (2026-09-25)

| Hecho | Valor medido |
|---|---|
| Imagen | `redis:7`, servidor **7.4.11**, standalone |
| Dónde vive la definición | Servicio de base de datos de Dokploy, no un compose del repo. Proyecto `CodeQuest-2026`. Servicio `codequest-redis-veojwy` |
| Volumen | Nombrado `codequest-redis-veojwy-data` en `/data` (driver `local`, RW). Hay `dump.rdb`. No hay archivo AOF |
| Comando | `redis-server --requirepass` con contraseña puesta. El valor no se documenta |
| AOF | `appendonly no`, `aof_enabled` 0. `appendfsync` es `everysec` y no actúa |
| RDB | `save 3600 1 300 100 60 10000`. Último save `2026-09-21T02:30:43Z`, status ok, 0 cambios pendientes |
| Memoria | `used_memory` 3,25 MB, pico 5,02 MB, `maxmemory` 0, `maxmemory-policy` `noeviction` (no aplica mientras el tope es 0) |
| Red | Publicado `0.0.0.0:8864` y `[::]:8864` hacia el `6379` del contenedor. También en `dokploy-network` |
| Health / restart | Sin healthcheck. Restart policy `no` |
| Claves vivas | `DBSIZE` 2: `catalog:current` y `catalog:v1` (MEMORY USAGE 1 835 064) |
| Claves durables de usuario | Ninguna |

---

## 1. Persistencia

Se configura en el panel del servicio Redis de Dokploy. No hay compose en el repo. El volumen ya existe y se mantiene.

| Ajuste | Valor |
|---|---|
| Volumen | Seguir con el nombrado `codequest-redis-veojwy-data` montado en `/data` |
| AOF | `appendonly yes` |
| `appendfsync` | `everysec` |
| RDB | Dejar `save 3600 1 300 100 60 10000` |
| Directorio | `dir /data` (ya es así). `dbfilename dump.rdb` se conserva |

Un `SET` del catálogo hoy puede perderse hasta una hora si el proceso muere: AOF está apagado y la regla de un solo cambio es `save 3600 1`. Con AOF `everysec`, esa ventana baja a cerca de un segundo. El RDB queda como segunda copia en el mismo volumen.

Aplicarlo exige reiniciar Redis. El reinicio no borra el volumen. Esta spec no cambia la restart policy.

---

## 2. Memoria

El snapshot vivo ocupa unos 1,8 MB. El proceso usó 3,25 MB y llegó a un pico de 5,02 MB. Al guardar, el código retiene la versión anterior, así que pueden coexistir dos payloads.

`maxmemory` **64mb** (67 108 864 bytes). Cubre el pico medido, una versión extra y el rewrite de AOF, sin acercarse a llenar el host. `maxmemory-policy` **noeviction**.

Quedan prohibidas `allkeys-lru`, `allkeys-lfu`, `volatile-lru`, `volatile-lfu`, `volatile-ttl`, `volatile-random` y `allkeys-random`. El catálogo no tiene TTL. Esas políticas pueden borrar `catalog:v1`.

Con `noeviction` y un tope, un write que no quepa falla. No se evicta la clave.

---

## 3. Red y contraseña

Redis no publica puerto hacia el host. El `6379` solo se ve desde `dokploy-network`. Se quita el publish de `8864` en `0.0.0.0` y en `[::]`.

`requirepass` sigue obligatorio. El valor sale de la variable que Dokploy ya guarda. No va en el repo ni en logs.

En producción, el backend no arranca si `REDIS_PASSWORD` está vacío. Hoy el schema de env lo acepta vacío. El cliente ioredis sigue enviando esa contraseña y no la loguea.

Quitar el puerto publicado corta el camino de `backend/.env` local, que apunta al host en el puerto 8864. Después, el backend de Dokploy usa el hostname interno del servicio. El acceso de un operador es por la red del servidor o un túnel, no por 8864 en internet.

---

## 4. Healthcheck y Redis que tarda

Healthcheck del contenedor Redis, en Dokploy:

```sh
redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping
```

Éxito: la salida es `PONG`. Intervalo 10 s, timeout 3 s, reintentos 5, start period 10 s. El healthcheck no cambia la restart policy `no`: si el proceso se cae, hay que levantarlo a mano.

Si Redis todavía no acepta conexiones al boot, el backend no se cae por el catálogo. MCP, con Redis null o lanzando, sirve el seed en memoria. Las lecturas de rutas degradan y las escrituras de rutas responden 503. No se agrega un retry infinito de boot. ioredis puede reintentar la conexión en background sin tumbar el proceso.

---

## 5. Chequeo de arranque

Al crear el cliente Redis, en producción, después de autenticar:

1. `CONFIG GET appendonly`
2. `CONFIG GET maxmemory-policy`
3. `CONFIG GET maxmemory`
4. `INFO persistence` para `aof_enabled`

Se registra un error de Nest, sin secretos, y el proceso **sigue**, si:

- `appendonly` no es `yes` o `aof_enabled` no es `1`;
- `maxmemory-policy` no es `noeviction`;
- `maxmemory` es `0`.

Si Redis responde que `CONFIG` está bloqueado, se degrada a warning y el proceso arranca igual. El warning dice que no se pudo verificar la política de evicción. `INFO persistence` se usa cuando responde.

No se loguea `requirepass` ni `REDIS_PASSWORD`.

---

## 6. Claves durables

No hay. Progreso, rutas, sesión `cq_session`, grants OAuth, refresh tokens y tokens personales no están en Redis. No hay migración a Postgres en esta fase.

El catálogo es descartable. Si se pierde, el scraper lo reconstruye. No se copia a Postgres.

---

## 7. Plan de tests

Redis efímero `redis:7`, con volumen nombrado, AOF on, `requirepass`, `maxmemory 64mb` y `noeviction`.

| Caso | Resultado |
|---|---|
| Guardar un snapshot y reiniciar el contenedor conservando el volumen | `catalog:current` y `catalog:vN` siguen, y `INFO persistence` muestra AOF activo |
| Redis vacío, solo el repositorio | `getCurrent()` devuelve null. Nest no llama `bootstrapCatalog` al arrancar, así que no rellena el seed solo |
| MCP `createCatalogCache` con `getCurrent()` null o con throw | Una sola lectura de `catalog.seed.json`, `fromSeed: true`, y el proceso sigue |
| Redis caído en lecturas de rutas | GET degradado, escrituras 503, el proceso no termina |
| Cliente sin contraseña contra un Redis con `requirepass` | La conexión falla |
| `maxmemory-policy volatile-lru` o `appendonly no` | El chequeo de arranque registra error. Con `CONFIG` deshabilitado, registra warning y arranca |

No se vacía el Redis de Dokploy para probar.

---

## 8. Verificación manual en producción

Dentro del servidor, sin imprimir secretos:

```sh
docker exec codequest-redis-veojwy redis-cli --no-auth-warning -a "$REDIS_PASSWORD" INFO persistence
docker exec codequest-redis-veojwy redis-cli --no-auth-warning -a "$REDIS_PASSWORD" CONFIG GET appendonly
docker exec codequest-redis-veojwy redis-cli --no-auth-warning -a "$REDIS_PASSWORD" CONFIG GET appendfsync
docker exec codequest-redis-veojwy redis-cli --no-auth-warning -a "$REDIS_PASSWORD" CONFIG GET save
docker exec codequest-redis-veojwy redis-cli --no-auth-warning -a "$REDIS_PASSWORD" CONFIG GET maxmemory
docker exec codequest-redis-veojwy redis-cli --no-auth-warning -a "$REDIS_PASSWORD" CONFIG GET maxmemory-policy
docker volume inspect codequest-redis-veojwy-data
```

Esperado después del cambio: `aof_enabled:1`, `appendonly` yes, `appendfsync` everysec, `maxmemory` 67108864, `maxmemory-policy` noeviction, el volumen sigue en `/data`.

Si `CONFIG` responde que el comando está deshabilitado, `INFO persistence` alcanza para AOF. La política de memoria queda como warning.

Desde fuera del VPS:

```sh
nc -vz -w 3 <IP_DEL_VPS> 8864
```

Esperado después del cambio: timeout o connection refused. No se manda `PING` ni contraseña. Hoy, antes del cambio, `8864` está publicado en `0.0.0.0` y en `[::]`.

El `REDIS_HOST` del backend de producción no se pudo leer: Dokploy lo devuelve redacted.

---

## 9. Dudas / supuestos

1. El backend de producción se asume en la misma red Docker que Redis. Los `REDIS_*` del contenedor de la API no se leyeron.
2. `catalog.seed.json` está declarado como asset de nest-cli y el Dockerfile copia `dist/`. No se listó el filesystem del contenedor en marcha.
3. `bootstrapCatalog` importa el seed a Redis si el snapshot viene null, pero Nest no lo llama al arrancar. Esta spec no lo engancha al boot.
4. Las rutas de usuario no usan el seed. Redis vacío parece catálogo vacío. Redis caído degrada la lectura y responde 503 en escritura. MCP sí sirve el seed (1 curso, 0 rutas).
5. La contraseña está en la línea de comando del contenedor. Quitar el puerto no la saca de `inspect` para un admin del servidor.
6. La restart policy `no` queda fuera de este cambio. Un Redis caído sigue detenido aunque exista el healthcheck.
7. El lock del cron es un `Map` del proceso. `catalog:lock` está declarado y no se escribe en Redis. No es un problema de persistencia.
8. Los tokens MCP y el state de Discord OAuth son memoria del proceso Node, no claves Redis. Un wipe de Redis no los borra. Un restart del API sí.
