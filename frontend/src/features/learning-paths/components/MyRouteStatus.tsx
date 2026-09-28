"use client";

import Link from "next/link";
import { modelFromUserPath, PathDiagram } from "path-diagram";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { CHROME_ICON_STROKE_WIDTH } from "@/config/chrome-icon";
import { OFFICIAL_PATHS, type OfficialPathId } from "@/config/official-paths";
import { loadCourseCard } from "@/lib/load-course-card";
import { getPublicApiUrl } from "@/lib/api-url";
import { createOfficialRoute, loadMyRoutes, type MyRouteSummary } from "../lib/load-my-routes";
import { previewOfficialPath, type OfficialPathPreviewItem } from "../lib/preview-official-path";
import {
  classifyRouteCreateError,
  classifyRouteLoadError,
  type RouteCreateFailure,
} from "../lib/route-errors";
import { subscribeLearningPathEvents } from "../lib/subscribe-learning-paths";
import { SignInLink } from "@/features/auth/components/SignInLink";
import { StackIcon } from "./StackIcon";
import "@xyflow/react/dist/style.css";
import styles from "./MyRouteStatus.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; routes: MyRouteSummary[] }
  | { status: "unauthorized" }
  | { status: "error" };

type SubmitFeedback = { kind: "none" } | { kind: RouteCreateFailure };

function routeTitle(catalogPathId: string): string {
  const choice = OFFICIAL_PATHS.find((item) => item.id === catalogPathId) ?? OFFICIAL_PATHS[0];
  return `Ruta ${choice.label}`;
}

type RoutePreview = {
  catalogPathId: string;
  title: string;
  items: OfficialPathPreviewItem[];
};

export function MyRouteStatus({
  loadRoutes = loadMyRoutes,
  subscribe = subscribeLearningPathEvents,
  createOfficial = createOfficialRoute,
  previewOfficial = previewOfficialPath,
  initialPanel = "none",
  initialPathId = OFFICIAL_PATHS[0].id,
}: {
  loadRoutes?: () => Promise<MyRouteSummary[]>;
  subscribe?: (onCreated: (route: MyRouteSummary) => void) => () => void;
  createOfficial?: (input: { catalogPathId: string; title: string }) => Promise<MyRouteSummary>;
  previewOfficial?: (catalogPathId: string) => Promise<{ items: OfficialPathPreviewItem[] }>;
  initialPanel?: "none" | "form";
  initialPathId?: OfficialPathId;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [panel, setPanel] = useState<"none" | "form" | "mcp">(initialPanel);
  const [catalogPathId, setCatalogPathId] = useState<string>(initialPathId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<SubmitFeedback>({ kind: "none" });
  const [formError, setFormError] = useState("");
  const [preview, setPreview] = useState<RoutePreview | null>(null);

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
      .catch((error: unknown) => {
        if (!active) return;
        setState(
          classifyRouteLoadError(error) === "unauthorized"
            ? { status: "unauthorized" }
            : { status: "error" },
        );
      })
      .finally(() => {
        if (active) setRetrying(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, loadRoutes]);

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
      <p className={styles.kicker}>Configurador de ruta</p>
      <h1 className={styles.title} id="my-routes-title">
        Armá tu ruta
      </h1>
      <h2 className={styles.sectionTitle}>Tus rutas</h2>
      {state.status === "loading" ? <p className={styles.note}>Cargando tus rutas…</p> : null}
      {state.status === "unauthorized" ? (
        <div className={styles.notice}>
          <p className={styles.note}>Entrá para ver y guardar tus rutas.</p>
          <SignInLink returnTo="/configurador-de-ruta" />
        </div>
      ) : null}
      {state.status === "error" ? (
        <div className={styles.notice} role="alert">
          <p className={styles.note}>No pudimos cargar tus rutas</p>
          <button
            type="button"
            className={styles.retry}
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              setAttempt((current) => current + 1);
            }}
          >
            {retrying ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : null}
      {state.status === "ready" && state.routes.length === 0 ? (
        <p className={styles.empty}>Todavía no creaste ninguna ruta.</p>
      ) : null}
      {state.status === "ready" && state.routes.length > 0 ? (
        <ul className={styles.list}>
          {state.routes.map((route) => (
            <li key={route.id}>
              <Link className={styles.route} href={`/mis-rutas/${route.id}`}>
                <StackIcon pathId={route.sourceCatalogPathId} size="sm" />
                <span>{route.title}</span>
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
                aria-describedby="path-choice-hint"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <StackIcon pathId={catalogPathId} size="sm" />
                <span>{OFFICIAL_PATHS.find((choice) => choice.id === catalogPathId)?.label}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={styles.chevron}
                  strokeWidth={CHROME_ICON_STROKE_WIDTH}
                />
              </button>
              {menuOpen ? (
                <ul className={styles.menu} role="listbox" aria-labelledby="path-choice-label">
                  {OFFICIAL_PATHS.map((choice) => (
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
                        <StackIcon pathId={choice.id} size="sm" />
                        {choice.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className={styles.pickerHint} id="path-choice-hint">
              Lista desplegable con {OFFICIAL_PATHS.length} rutas oficiales. Si no ves la tuya,
              desplazate dentro de la lista.
            </p>
            <p className={styles.generated}>La ruta se va a llamar {routeTitle(catalogPathId)}</p>
          </div>
          {formError ? (
            <p className={styles.formFeedback} role="alert">
              {formError}
            </p>
          ) : null}
          <button className={styles.submit} type="submit" disabled={previewing || saving}>
            {previewing ? "Armando…" : "Ver ruta"}
          </button>
          {preview ? (
            <div className={styles.preview}>
              <h2 className={styles.previewTitle}>{preview.title}</h2>
              <p className={styles.previewNote}>Esta vista no se guarda hasta que toques Guardar ruta.</p>
              <PathDiagram
                model={{
                  ...modelFromUserPath({
                    id: preview.catalogPathId,
                    title: preview.title,
                    items: preview.items,
                  }),
                  pathId: null,
                  allowProgress: false,
                }}
                mode="web"
                loadCourse={loadCourseCard}
              />
              <button className={styles.submit} type="button" disabled={saving} onClick={() => void savePreview()}>
                {saving ? "Guardando…" : "Guardar ruta"}
              </button>
              {feedback.kind === "unauthorized" ? (
                <div className={styles.formFeedback} role="alert">
                  <p>Tu sesión no está activa. Entrá para crear la ruta.</p>
                  <SignInLink returnTo="/configurador-de-ruta" />
                </div>
              ) : null}
              {feedback.kind === "catalog-unavailable" ? (
                <p className={styles.formFeedback} role="alert">
                  El catálogo todavía no está listo en el servidor. Probá de nuevo en unos minutos.
                </p>
              ) : null}
              {feedback.kind === "failed" ? (
                <p className={styles.formFeedback} role="alert">
                  No se pudo crear la ruta.
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
      ) : null}
      {panel === "mcp" ? <McpStartDialog onClose={() => setPanel("none")} /> : null}
    </section>
  );

  async function submitForm() {
    setPreviewing(true);
    setFormError("");
    setFeedback({ kind: "none" });
    try {
      const next = await previewOfficial(catalogPathId);
      if (next.items.length === 0) {
        setPreview(null);
        setFormError("Esa ruta no tiene cursos publicados");
        return;
      }
      setPreview({ catalogPathId, title: routeTitle(catalogPathId), items: next.items });
      setMenuOpen(false);
    } catch {
      setFormError("No pudimos mostrar la ruta");
    } finally {
      setPreviewing(false);
    }
  }

  async function savePreview() {
    if (!preview) return;
    setSaving(true);
    setFeedback({ kind: "none" });
    try {
      const created = await createOfficial({
        catalogPathId: preview.catalogPathId,
        title: preview.title,
      });
      setState((current) => ({
        status: "ready",
        routes: mergeRoutes(current.status === "ready" ? current.routes : [], [created]),
      }));
      setPreview(null);
      setPanel("none");
      setMenuOpen(false);
    } catch (error: unknown) {
      setFeedback({ kind: classifyRouteCreateError(error) });
    } finally {
      setSaving(false);
    }
  }
}

function McpStartDialog({ onClose }: { onClose: () => void }) {
  const api = getPublicApiUrl();
  const prompt = [
    "Para conectar el MCP hay que usar esta guía.",
    "",
    "Guiame paso a paso. Una instrucción por mensaje y esperá a que yo confirme antes de seguir.",
    "",
    `1. Conectá el servidor público codequest-catalogo en ${api}/mcp. No pide sesión.`,
    "2. En ese servidor llamá a get_documentation y leé la documentación. No inventes pasos que no estén ahí.",
    `3. Conectá el servidor de mi cuenta codequest-cuenta en ${api}/mcp/user. La primera vez abre Discord: decime qué tengo que tocar.`,
    "4. Cuando ya esté conectado, usá generate_learning_path en codequest-cuenta para armar mi ruta. El modal se abre en la página de CodeQuest donde esté.",
  ].join("\n");
  const [copied, setCopied] = useState(false);
  const [motion, setMotion] = useState<"closed" | "open">("closed");
  const closing = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMotion("open"), 32);
    return () => window.clearTimeout(timer);
  }, []);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced) {
      onClose();
      return;
    }
    setMotion("closed");
    window.setTimeout(onClose, 420);
  };

  return (
    <div className={styles.backdrop} data-motion={motion} onClick={requestClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Crear la ruta con MCP"
        data-motion={motion}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Quiero hacerlo por MCP</h2>
        <div className={styles.copyBox}>
          <div className={styles.copyHead}>
            <p className={styles.copySubtitle}>Copiá y pegá esto en tu IA para conectarte</p>
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
              {copied ? (
                <Check aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} />
              ) : (
                <Copy aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} />
              )}
            </button>
          </div>
          <pre className={styles.prompt}>{prompt}</pre>
        </div>
        <button type="button" className={styles.dialogClose} onClick={requestClose}>
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
