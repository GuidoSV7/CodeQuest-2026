# 🗺️ CodeQuest

Armá tu ruta de cursos DevTalles. Ves por dónde empezar, qué curso sigue y podés generarla desde la web o desde tu editor con una IA.

```text
  🧑 vos          🤖 tu IA            🧭 CodeQuest
   │               │                    │
   │  "quiero Nest"│                    │
   ├──────────────►│  busca el catálogo │
   │               ├───────────────────►│
   │               │◄──── la ruta ──────┤
   │◄── te guía ───┤                    │
   │                                    │
   └──────── el diagrama se abre ──────►│  ✨
```

## 🎢 Cómo se usa

1. 🎮 **Entrás con Discord.** La sesión viaja en una cookie. Sin login no hay rutas guardadas.
2. 🧭 **Elegís una meta.** Fundamentos, React, Nest, C#… lo que esté en el catálogo oficial.
3. 👀 **Ves el diagrama antes de guardar.** Cuadros, números y flechas: por acá se empieza y qué sigue.
4. 💾 **Guardás si te gusta.** Si no, elegís otra. Nada se guarda solo.
5. 🔔 **Te enterás en el celular y en la computadora.** Si la página está abierta, aparece un aviso: se armó la ruta.

En el celular los cuadros bajan en columna para poder leerlos. En la computadora el mapa va de izquierda a derecha.

## 🕹️ Dos formas de armar la ruta

| | 📝 Formulario | 🤖 MCP (tu IA) |
|---|---|---|
| Dónde | En CodeQuest | En Cursor o Claude |
| Qué pasa | Elegís el tema y tocás **Ver ruta** | La IA lee la guía y llama a las tools |
| Guardar | Botón **Guardar ruta** | `generate_learning_path` abre el modal **En vivo** |

El formulario no inventa cursos. Muestra la ruta oficial del catálogo. La IA tampoco puede inventar: solo usa lo que devuelven las tools.

## 🛰️ Los dos servidores MCP

Son dos puertas del mismo edificio.

- 📖 **`codequest-catalogo`** (`/mcp`) — público. Sirve para leer la documentación con `get_documentation` y mirar cursos y rutas. No pide sesión.
- 🔐 **`codequest-cuenta`** (`/mcp/user`) — con tu cuenta. La primera vez abre Discord. Solo este arma la ruta en vivo sobre la página en la que estés.

Si el indicador dice **Sin sesión**, el navegador no tiene la cookie. Si dice **En vivo**, la ruta ya puede abrirse ahí.

Guía para la persona que conecta la IA: `/docs/mcp`.

## 🧱 De qué está hecho

```text
frontend/     🎨  Next.js  — la web, el diagrama y los avisos
backend/      ⚙️  NestJS   — la API, el login y el MCP
PostgreSQL    🗄️  tus rutas y tu sesión
Redis         ⚡  el catálogo raspado de DevTalles
```

El catálogo no se escribe a mano. Un scraper lee los cursos y las rutas oficiales de DevTalles y los deja en Redis. El cron no corre por GitHub Actions: se dispara con `npm run catalog:sync` o con `POST /api/catalog/sync`.

## 🚀 Levantarlo

Hace falta Node 20 o más.

```bash
npm install
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Completá Discord, Postgres y Redis en `backend/.env`. Los secretos no van al repositorio.

```bash
npm run dev:backend
npm run dev:frontend
```

El front lee `NEXT_PUBLIC_API_URL`. Si levantás los dos en tu máquina, el puerto del backend tiene que ser distinto al del front: en los ejemplos los dos figuran en `3000`.

| Comando | Qué hace |
|---|---|
| `npm run dev:frontend` | La web |
| `npm run dev:backend` | La API y el MCP |
| `npm run test:frontend` | Tests del front |
| `npm run test:backend` | Tests del back |
| `npm run catalog:sync --workspace=backend` | Trae el catálogo de DevTalles |

## 🧪 La idea de los tests

Primero se escribe lo que tiene que pasar (y falla). Después se implementa hasta que pasa. Si cambiás el diagrama, el formulario o el MCP, el test que cuenta esa historia tiene que cambiar con vos.
