import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { layoutPath } from "./layout-path";
import { bucketLabel, introVideoSrc, type CourseCard, type DiagramItem, type DiagramModel } from "./model";
import { PathCard } from "./path-card";
import styles from "./path-diagram.module.css";

type CardData = {
  item: DiagramItem;
  step?: number;
  vertical?: boolean;
  onOpen: (item: DiagramItem) => void;
};

function CardNode({ data }: NodeProps<Node<CardData>>) {
  const item = data.item;
  const incoming = data.vertical ? Position.Top : Position.Left;
  const outgoing = data.vertical ? Position.Bottom : Position.Right;
  return (
    <>
      <Handle type="target" position={incoming} isConnectable={false} />
      <PathCard
        title={item.title}
        bucketLabel={bucketLabel(item.bucket)}
        bucket={item.bucket}
        alreadyKnown={item.alreadyKnown}
        partial={item.partial}
        completed={item.completed}
        step={data.step}
        onOpen={() => data.onOpen(item)}
      />
      <Handle type="source" position={outgoing} isConnectable={false} />
    </>
  );
}

const nodeTypes = { card: CardNode, header: HeaderNode, group: GroupNode };

function FitWhenMeasured({ fitKey, readable }: { fitKey: string; readable: boolean }) {
  const flow = useReactFlow();
  const flowRef = useRef(flow);
  flowRef.current = flow;
  useEffect(() => {
    const minZoom = readable ? 1 : 0.2;
    const fit = () => {
      void flowRef.current.fitView({ padding: 0.18, minZoom, maxZoom: 1 });
    };
    const frame = requestAnimationFrame(fit);
    const timer = window.setTimeout(fit, 60);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [fitKey, readable]);
  useEffect(() => {
    const onResize = () => {
      const minZoom = readable ? 1 : 0.2;
      void flowRef.current.fitView({ padding: 0.18, minZoom, maxZoom: 1 });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [readable]);
  return null;
}

function HeaderNode({ data }: NodeProps<Node<{ label: string }>>) {
  return <div className={styles.header}>{data.label}</div>;
}

function GroupNode({ data }: NodeProps<Node<{ label: string }>>) {
  return <div className={styles.groupLabel}>{data.label}</div>;
}

export type ProgressResult = { ok: boolean; message?: string };

function withCard(item: DiagramItem, card: CourseCard | null | undefined): DiagramItem {
  if (!card) return item;
  return {
    ...item,
    url: card.url || item.url,
    lessonCount: card.lessonCount,
    videoHours: card.videoHours,
    detail: card,
  };
}

const DESCRIPTION_LIMIT = 140;

function previewDescription(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= DESCRIPTION_LIMIT) return clean;
  const cut = clean.slice(0, DESCRIPTION_LIMIT + 1);
  const wordBreak = cut.lastIndexOf(" ");
  const shortened = wordBreak > 80 ? cut.slice(0, wordBreak) : clean.slice(0, DESCRIPTION_LIMIT);
  return `${shortened.trim()}…`;
}

function CourseModal({
  item,
  mode,
  allowProgress,
  progressError,
  openUrl,
  entered,
  onToggle,
  onClose,
}: {
  item: DiagramItem;
  mode: "web" | "mcp";
  allowProgress: boolean;
  progressError: string;
  openUrl?: (url: string) => void;
  entered: boolean;
  onToggle: (item: DiagramItem) => void;
  onClose: () => void;
}) {
  const video = introVideoSrc(item.detail?.previewYoutubeId);
  const sections = item.detail?.sections ?? [];
  const tags = item.detail?.tags ?? [];
  const description = item.detail?.description ? previewDescription(item.detail.description) : "";
  const [motion, setMotion] = useState<"closed" | "open">("closed");
  useEffect(() => {
    if (!entered) {
      setMotion("closed");
      return;
    }
    const timer = window.setTimeout(() => setMotion("open"), 32);
    return () => window.clearTimeout(timer);
  }, [entered]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={motion === "open" ? `${styles.backdrop} ${styles.backdropOpen}` : styles.backdrop} onClick={onClose}>
      <div
        className={motion === "open" ? `${styles.dialog} ${styles.dialogOpen}` : styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        data-motion={motion}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.summary}>
          <p className={styles.kicker}>{bucketLabel(item.bucket)}</p>
          <h2>{item.title}</h2>
          {item.detail?.instructor ? <p className={styles.instructor}>{item.detail.instructor}</p> : null}
          <ul className={styles.facts}>
            {item.lessonCount === null ? null : <li>{item.lessonCount} lecciones</li>}
            {item.videoHours === null ? null : <li>{item.videoHours} horas</li>}
            {item.detail?.price ? (
              <li>
                {item.detail.price.amount} {item.detail.price.currency}
              </li>
            ) : null}
          </ul>
        </header>
        {description ? (
          <p className={styles.description} data-course-description>
            {description}
          </p>
        ) : null}
        {tags.length > 0 ? (
          <ul className={styles.tags}>
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
        <section className={styles.block}>
          <h3>Video de introducción</h3>
          {video ? (
            <iframe className={styles.video} title="Video de introducción" src={video} allowFullScreen />
          ) : (
            <p>Este curso no tiene video de introducción</p>
          )}
        </section>
        <section className={styles.block}>
          <h3>Temas</h3>
          {sections.length === 0 ? <p>Sin temario publicado</p> : null}
          <div className={styles.syllabus}>
            {sections.map((section) => (
              <section key={section.title}>
                <h4>{section.title}</h4>
                <ul>
                  {section.lessons.map((lesson) => (
                    <li key={lesson}>{lesson}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
        {item.detail?.prerequisites.length ? (
          <section className={styles.block}>
            <h3>Requisitos</h3>
            <ul>
              {item.detail.prerequisites.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {item.detail?.related?.length ? (
          <section className={styles.block}>
            <h3>Cursos relacionados</h3>
            <ul>
              {item.detail.related.map((related) => (
                <li key={related.url}>{related.title}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className={styles.actions}>
          {item.url && mode === "web" ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              Abrir curso
            </a>
          ) : null}
          {item.url && mode === "mcp" ? (
            <button type="button" onClick={() => openUrl?.(item.url)}>
              Abrir curso
            </button>
          ) : null}
          {allowProgress ? (
            <button type="button" onClick={() => onToggle(item)}>
              {item.completed ? "Marcar sin empezar" : "Marcar completado"}
            </button>
          ) : null}
          <button type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {progressError ? <p role="alert">{progressError}</p> : null}
      </div>
    </div>
  );
}

export function PathDiagram({
  model,
  mode = "web",
  width: widthProp,
  openUrl,
  onProgress,
  loadCourse,
}: {
  model: DiagramModel;
  mode?: "web" | "mcp";
  width?: number;
  openUrl?: (url: string) => void;
  onProgress?: (courseId: string, status: "completed" | "not_started") => Promise<ProgressResult>;
  loadCourse?: (courseId: string) => Promise<DiagramItem["detail"]>;
}) {
  const [selected, setSelected] = useState<DiagramItem | null>(null);
  const [presented, setPresented] = useState<DiagramItem | null>(null);
  const [entered, setEntered] = useState(false);
  const [loadedCard, setLoadedCard] = useState<DiagramItem["detail"]>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [progressError, setProgressError] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const measure = () => {
      const viewport = window.innerWidth;
      const box = element.getBoundingClientRect().width;
      setWidth(widthProp ?? Math.min(box || viewport, viewport));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [widthProp]);
  useEffect(() => {
    if (!selected || !loadCourse || selected.detail?.sections.length) {
      setLoadedCard(null);
      return;
    }
    let active = true;
    loadCourse(selected.courseId).then((card) => {
      if (active) setLoadedCard(card ?? null);
    });
    return () => {
      active = false;
    };
  }, [loadCourse, selected]);
  const items = model.items.map((item) => ({
    ...item,
    completed: completed[item.courseId] ?? item.completed,
  }));

  const graph = useMemo(
    () => layoutPath(items, model.edges, width),
    [items, model.edges, width],
  );
  const [dragged, setDragged] = useState<Record<string, { x: number; y: number }>>({});
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setDragged((current) => {
      let next = current;
      for (const change of changes) {
        if (change.type !== "position" || !change.position) continue;
        if (next === current) next = { ...current };
        next[change.id] = { x: change.position.x, y: change.position.y };
      }
      return next;
    });
  }, []);

  const nodes = graph.nodes.map((node) => {
    const item = items.find((candidate) => candidate.courseId === node.id);
    return {
      id: node.id,
      type: node.type,
      position: dragged[node.id] ?? node.position,
      parentId: node.parentId,
      draggable: node.type === "card",
      selectable: node.type === "card",
      data: node.type === "card" && item
        ? { item, step: node.data.step, vertical: node.data.vertical, onOpen: setSelected }
        : { label: node.data.label },
      width: node.width,
      height: node.height,
      style: { width: node.width, height: node.height },
    };
  });

  const toggle = async (item: DiagramItem) => {
    if (!onProgress || !model.allowProgress || !model.pathId) return;
    const next = item.completed ? "not_started" : "completed";
    const previous = item.completed;
    setCompleted((current) => ({ ...current, [item.courseId]: !previous }));
    setProgressError("");
    const result = await onProgress(item.courseId, next);
    if (!result.ok) {
      setCompleted((current) => ({ ...current, [item.courseId]: previous }));
      setProgressError(result.message ?? "No se pudo guardar el progreso");
    }
  };

  const fitKey = graph.nodes.map((node) => `${node.id}:${node.position.x}:${node.position.y}`).join("|");
  const readable = width < 720;
  const contentHeight = Math.max(480, ...graph.nodes.map((node) => node.position.y + node.height), 0) + 72;
  const canvasHeight = readable ? contentHeight : Math.min(1100, contentHeight);
  const zoomFloor = readable ? 1 : 0.2;
  const openCourse = selected
    ? withCard(items.find((item) => item.courseId === selected.courseId) ?? selected, loadedCard)
    : null;

  useEffect(() => {
    if (!openCourse) return;
    setPresented(openCourse);
  }, [selected, loadedCard]);

  useEffect(() => {
    if (!selected) {
      setEntered(false);
      return;
    }
    const frame = window.setTimeout(() => setEntered(true), 32);
    return () => window.clearTimeout(frame);
  }, [selected]);

  useEffect(() => {
    if (selected || !presented) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reducedMotion) {
      setPresented(null);
      return;
    }
    const timer = window.setTimeout(() => setPresented(null), 420);
    return () => window.clearTimeout(timer);
  }, [selected, presented]);

  return (
    <div className={styles.frame}>
      <ReactFlowProvider>
        <div className={styles.canvas} ref={canvasRef} style={{ height: canvasHeight }}>
          <ReactFlow
            nodes={nodes}
            edges={graph.edges.map((edge) => ({
              ...edge,
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed, color: "#dcd8ff", width: 18, height: 18 },
            }))}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18, minZoom: zoomFloor, maxZoom: 1 }}
            minZoom={zoomFloor}
            maxZoom={1}
            panOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            nodesDraggable
            autoPanOnNodeDrag={false}
            onNodesChange={onNodesChange}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <FitWhenMeasured fitKey={fitKey} readable={readable} />
            <Background />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
      {presented ? (
        <CourseModal
          item={presented}
          mode={mode}
          allowProgress={model.allowProgress}
          progressError={progressError}
          openUrl={openUrl}
          entered={entered}
          onToggle={(item) => void toggle(item)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
