import { getPublicApiUrl } from "@/lib/api-url";
import styles from "./McpDocs.module.css";

const PUBLIC_TOOLS = [
  {
    name: "get_documentation",
    detail: "Lee esta guía desde el MCP, sin abrir la web.",
  },
  {
    name: "search_courses",
    detail: "Busca cursos del catálogo DevTalles por tema, precio o ruta oficial.",
  },
  {
    name: "get_course",
    detail: "Trae el detalle de un curso que ya está en el catálogo, por id.",
  },
  {
    name: "list_official_paths",
    detail: "Lista las rutas oficiales (React, Nest, Dart y el resto).",
  },
  {
    name: "get_official_path",
    detail: "Devuelve una ruta oficial completa, con su diagrama.",
  },
  {
    name: "generate_learning_path",
    detail: "Arma una ruta de estudio con cursos del catálogo, según una meta.",
  },
] as const;

const USER_TOOLS = [
  { name: "get_my_profile", detail: "Tu nombre, avatar y cuántas rutas activas tenés." },
  { name: "list_my_paths", detail: "Las rutas guardadas en tu cuenta." },
  { name: "get_my_path", detail: "El detalle de una de tus rutas, con progreso." },
  { name: "save_learning_path", detail: "Guarda una ruta generada en tu cuenta." },
  { name: "update_course_progress", detail: "Marca un curso como en progreso o completado." },
] as const;

export function McpDocs() {
  const origin = getPublicApiUrl();
  const publicUrl = `${origin}/mcp`;
  const userUrl = `${origin}/mcp/user`;
  const cursorConfig = `{
  "mcpServers": {
    "codequest-catalogo": {
      "url": "${publicUrl}"
    },
    "codequest-cuenta": {
      "url": "${userUrl}"
    }
  }
}`;
  const livePrompt = `Usá solo el servidor codequest-cuenta (/mcp/user). No uses el catálogo público para esto.
Armame una ruta para aprender React con generate_learning_path.
Cuando la tool termine, repetí la frase que te devolvió, incluida la página.`;

  return (
    <article className={styles.article}>
      <p className={styles.kicker}>Docs MCP</p>
      <h1 className={styles.title}>Cómo conectar CodeQuest a tu editor</h1>
      <p className={styles.lead}>
        El MCP deja que Cursor o Claude lean el catálogo DevTalles y, si entrás
        con Discord, tus rutas y tu progreso. Hay dos servidores. El público
        no pide sesión. El de tu cuenta abre el login de Discord la primera vez.
      </p>

      <section className={styles.section} aria-labelledby="public-mcp">
        <h2 id="public-mcp">1. Catálogo público, sin login</h2>
        <p>
          Pegá esta URL. No hace falta cookie ni token.
        </p>
        <p className={styles.url}>{publicUrl}</p>
        <ol className={styles.steps}>
          <li>En Cursor, abrí Settings y entrá a MCP.</li>
          <li>Agregá un servidor nuevo. El transporte es URL (HTTP), no un comando local.</li>
          <li>
            Nombre: <strong>codequest-catalogo</strong>. URL: la de arriba.
          </li>
          <li>Guardá y esperá a que el servidor quede en verde.</li>
          <li>
            En el chat, pedile algo concreto, por ejemplo: “buscá cursos de Nest” o
            “mostrame la ruta oficial de React”.
          </li>
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="user-mcp">
        <h2 id="user-mcp">2. Tu cuenta, con Discord</h2>
        <p>
          Esta URL es la de tus rutas. El editor va a abrir el navegador, CodeQuest
          te pide permiso y el login es el mismo Discord de la web.
        </p>
        <p className={styles.url}>{userUrl}</p>
        <ol className={styles.steps}>
          <li>Agregá un segundo servidor MCP, también por URL.</li>
          <li>
            Nombre: <strong>codequest-cuenta</strong>. URL: la de arriba.
          </li>
          <li>
            Cuando Cursor o Claude intenten usarlo, van a abrir el navegador. Si no
            tenés sesión, entra con Discord.
          </li>
          <li>
            En la pantalla de permiso, revisá el nombre del programa y tocá Permitir.
            Rechazar corta la conexión.
          </li>
          <li>
            Volvé al editor. A partir de ahí podés pedir “listá mis rutas” o
            “marcá el curso 100 como completado”.
          </li>
        </ol>
        <p>
          El token viaja en el header <code>Authorization</code>. No lo pegues en
          la URL ni en el chat.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="cursor-json">
        <h2 id="cursor-json">3. El mismo dato en mcp.json</h2>
        <p>
          Si preferís el archivo, en Cursor es <code>.cursor/mcp.json</code> del
          proyecto, o el MCP global del usuario. Los dos servidores pueden convivir.
        </p>
        <pre className={styles.code}>
          <code>{cursorConfig}</code>
        </pre>
      </section>

      <section className={styles.section} aria-labelledby="claude">
        <h2 id="claude">4. Claude</h2>
        <ol className={styles.steps}>
          <li>En Claude, entrá a Connectors y elegí agregar un conector propio.</li>
          <li>Para el catálogo, pegá la URL pública. No pide login.</li>
          <li>
            Para tus rutas, pegá la URL de la cuenta. Claude abre el mismo permiso
            y el login de Discord.
          </li>
          <li>Cuando el conector figure conectado, pedí una ruta o tu progreso en el chat.</li>
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="live-path">
        <h2 id="live-path">5. Ver la ruta mientras hablás</h2>
        <p>
          La ruta se abre en un modal sobre la página de CodeQuest en la que estés,
          con la misma cuenta de Discord del conector. El indicador del modal tiene
          que decir <strong>En vivo</strong>. Si dice Sin sesión, el navegador no
          tiene la cookie y no va a aparecer nada.
        </p>
        <p>
          Solo el servidor <strong>codequest-cuenta</strong> actualiza esa página.
          El catálogo público también arma rutas, pero no las manda a la web.
          Pegá este pedido en Claude o en Cursor:
        </p>
        <pre className={styles.code}>
          <code>{livePrompt}</code>
        </pre>
        <p>
          La tool responde con la frase «La ruta se muestra en tu página» y el
          diagrama aparece sin recargar. Si hay dos rutas parecidas, Claude dice
          «Decile a Claude cuál preferís» y las opciones quedan en la página.
          Respondé en el chat cuál querés: esas opciones no se clickean.
        </p>
        <p>
          Para guardarla en tu cuenta, seguí con: «Guardá esa ruta en mi cuenta.»
        </p>
      </section>

      <section className={styles.section} aria-labelledby="tools">
        <h2 id="tools">Qué puede hacer cada servidor</h2>
        <h3>Público</h3>
        <ul className={styles.tools}>
          {PUBLIC_TOOLS.map((tool) => (
            <li key={tool.name}>
              <code>{tool.name}</code>
              <span>{tool.detail}</span>
            </li>
          ))}
        </ul>
        <h3>Tu cuenta</h3>
        <p>Además de las del catálogo público, con la sesión:</p>
        <ul className={styles.tools}>
          {USER_TOOLS.map((tool) => (
            <li key={tool.name}>
              <code>{tool.name}</code>
              <span>{tool.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
