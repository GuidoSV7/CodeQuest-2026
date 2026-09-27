"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createOfficialRoute, loadMyRoutes, type MyRouteSummary } from "../lib/load-my-routes";
import { subscribeLearningPathEvents } from "../lib/subscribe-learning-paths";
import styles from "./MyRouteStatus.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; routes: MyRouteSummary[] }
  | { status: "error" };

const PATH_CHOICES = [
  { id: "programas-fundamentos", label: "Fundamentos" },
  { id: "programas-react", label: "React" },
  { id: "programas-vue", label: "Vue" },
  { id: "programas-angular", label: "Angular" },
  { id: "programas-node", label: "Node" },
  { id: "programas-nest", label: "NestJS" },
  { id: "ruta-dart", label: "Dart y Flutter" },
  { id: "ruta-python", label: "Python" },
  { id: "ruta-java", label: "Java" },
  { id: "ruta-c", label: "C# y .NET" },
  { id: "ruta-ia", label: "Inteligencia artificial" },
  { id: "ruta-php", label: "PHP" },
  { id: "ruta-go", label: "Go" },
] as const;

function routeTitle(catalogPathId: string): string {
  const choice = PATH_CHOICES.find((item) => item.id === catalogPathId) ?? PATH_CHOICES[0];
  return `Ruta ${choice.label}`;
}

export function MyRouteStatus({
  loadRoutes = loadMyRoutes,
  subscribe = subscribeLearningPathEvents,
  createOfficial = createOfficialRoute,
}: {
  loadRoutes?: () => Promise<MyRouteSummary[]>;
  subscribe?: (onCreated: (route: MyRouteSummary) => void) => () => void;
  createOfficial?: (input: { catalogPathId: string; title: string }) => Promise<MyRouteSummary>;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [panel, setPanel] = useState<"none" | "form" | "mcp">("none");
  const [catalogPathId, setCatalogPathId] = useState<string>(PATH_CHOICES[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    loadRoutes()
      .then((routes) => {
        if (!active) return;
        setState((current) => ({
          status: "ready",
          routes: mergeRoutes(current.status === "ready" ? current.routes : [], routes),
        }));
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [loadRoutes]);

  useEffect(() => {
    return subscribe((route) => {
      setState((current) => ({
        status: "ready",
        routes: mergeRoutes(current.status === "ready" ? current.routes : [], [route]),
      }));
    });
  }, [subscribe]);

  return (
    <section className={styles.panel} aria-labelledby="my-routes-title">
      <p className={styles.kicker}>Mis rutas</p>
      <h1 className={styles.title} id="my-routes-title">
        Tus rutas
      </h1>
      {state.status === "loading" ? <p className={styles.note}>Cargando tus rutas…</p> : null}
      {state.status === "error" ? (
        <p className={styles.note} role="alert">
          No pudimos cargar tus rutas
        </p>
      ) : null}
      {state.status === "ready" && state.routes.length === 0 ? (
        <p className={styles.empty}>Por el momento no hay ruta</p>
      ) : null}
      {state.status === "ready" && state.routes.length > 0 ? (
        <ul className={styles.list}>
          {state.routes.map((route) => (
            <li key={route.id}>
              <Link className={styles.route} href={`/mis-rutas/${route.id}`}>
                {route.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.choices}>
        <button type="button" className={styles.choice} onClick={() => setPanel("form")}>
          Quiero hacerlo por un formulario
        </button>
        <button type="button" className={styles.choice} onClick={() => setPanel("mcp")}>
          Quiero hacerlo por MCP
        </button>
      </div>
      {panel === "form" ? (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm();
          }}
        >
          <div className={styles.field}>
            <span id="path-choice-label">Qué querés aprender</span>
            <div className={styles.picker}>
              <button
                type="button"
                className={styles.pickerButton}
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                aria-labelledby="path-choice-label"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {PATH_CHOICES.find((choice) => choice.id === catalogPathId)?.label}
              </button>
              {menuOpen ? (
                <ul className={styles.menu} role="listbox" aria-labelledby="path-choice-label">
                  {PATH_CHOICES.map((choice) => (
                    <li key={choice.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={choice.id === catalogPathId}
                        onClick={() => {
                          setCatalogPathId(choice.id);
                          setMenuOpen(false);
                        }}
                      >
                        {choice.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className={styles.generated}>La ruta se va a llamar {routeTitle(catalogPathId)}</p>
          </div>
          {formError ? <p role="alert">{formError}</p> : null}
          <button className={styles.submit} type="submit" disabled={saving}>
            {saving ? "Creando…" : "Crear ruta"}
          </button>
        </form>
      ) : null}
      {panel === "mcp" ? <McpStartDialog onClose={() => setPanel("none")} /> : null}
    </section>
  );

  async function submitForm() {
    setSaving(true);
    setFormError("");
    try {
      const created = await createOfficial({ catalogPathId, title: routeTitle(catalogPathId) });
      setState((current) => ({
        status: "ready",
        routes: mergeRoutes(current.status === "ready" ? current.routes : [], [created]),
      }));
      setPanel("none");
      setMenuOpen(false);
    } catch {
      setFormError("No se pudo crear la ruta");
    } finally {
      setSaving(false);
    }
  }
}

function McpStartDialog({ onClose }: { onClose: () => void }) {
  const docsUrl = `${window.location.origin}/docs/mcp`;
  const prompt = `Llamá a get_documentation en el servidor codequest-cuenta y seguí esa guía. Después usá generate_learning_path para armar la ruta. La guía pública está en ${docsUrl}.`;
  const [copied, setCopied] = useState(false);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Crear la ruta con MCP"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Quiero hacerlo por MCP</h2>
        <div className={styles.videoSlot}>El video va acá</div>
        <div className={styles.copyBox}>
          <div className={styles.copyHead}>
            <p className={styles.copySubtitle}>Copia y pega esto a tu IA para conectarte</p>
            <button
              type="button"
              className={styles.copyIcon}
              aria-label={copied ? "Copiado" : "Copiar"}
              onClick={() => {
                void navigator.clipboard.writeText(prompt).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M5 1.5h6.5A1.5 1.5 0 0 1 13 3v8h-1.5V3.2H5V1.5ZM3 4h7.5A1.5 1.5 0 0 1 12 5.5v8a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 13.5v-8A1.5 1.5 0 0 1 3 4Zm0 1.5v8h7.5v-8H3Z"
                />
              </svg>
            </button>
          </div>
          <p>
            Conectá CodeQuest a Cursor o Claude. Tu IA lee la guía y llama a
            generate_learning_path. La ruta se abre en un modal sobre esta página.
          </p>
          <p className={styles.docsLink}>{docsUrl}</p>
        </div>
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

function mergeRoutes(current: MyRouteSummary[], incoming: MyRouteSummary[]): MyRouteSummary[] {
  const routes = new Map(current.map((route) => [route.id, route]));
  for (const route of incoming) routes.set(route.id, route);
  return [...routes.values()];
}
