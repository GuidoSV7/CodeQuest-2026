import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { layoutPath } from "./layout-path";
import { bucketLabel, iconLabel, introVideoSrc, type DiagramItem, type DiagramModel } from "./model";
import { PathCard } from "./path-card";
import styles from "./path-diagram.module.css";

type CardData = {
  item: DiagramItem;
  step?: number;
  onOpen: (item: DiagramItem) => void;
};

function CardNode({ data }: NodeProps<Node<CardData>>) {
  const item = data.item;
  return (
    <PathCard
      title={item.title}
      bucketLabel={bucketLabel(item.bucket)}
      iconLabel={iconLabel(item.category)}
      alreadyKnown={item.alreadyKnown}
      partial={item.partial}
      completed={item.completed}
      step={data.step}
      onOpen={() => data.onOpen(item)}
    />
  );
}

const nodeTypes = { card: CardNode, header: HeaderNode, group: GroupNode };

function FitWhenMeasured({ nodeCount }: { nodeCount: number }) {
  const flow = useReactFlow();
  const flowRef = useRef(flow);
  flowRef.current = flow;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void flowRef.current.fitView({ padding: 0.12 });
    });
    return () => cancelAnimationFrame(frame);
  }, [nodeCount]);
  useEffect(() => {
    const onResize = () => {
      void flowRef.current.fitView({ padding: 0.12 });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return null;
}

function HeaderNode({ data }: NodeProps<Node<{ label: string }>>) {
  return <div className={styles.header}>{data.label}</div>;
}

function GroupNode({ data }: NodeProps<Node<{ label: string }>>) {
  return <div className={styles.groupLabel}>{data.label}</div>;
}

export type ProgressResult = { ok: boolean; message?: string };

function CourseModal({
  item,
  mode,
  allowProgress,
  progressError,
  openUrl,
  onToggle,
  onClose,
}: {
  item: DiagramItem;
  mode: "web" | "mcp";
  allowProgress: boolean;
  progressError: string;
  openUrl?: (url: string) => void;
  onToggle: (item: DiagramItem) => void;
  onClose: () => void;
}) {
  const video = introVideoSrc(item.detail?.previewYoutubeId);
  const sections = item.detail?.sections ?? [];
  const tags = item.detail?.tags ?? [];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{item.title}</h2>
        <p>{bucketLabel(item.bucket)}</p>
        {item.detail?.instructor ? <p>{item.detail.instructor}</p> : null}
        {item.detail?.description ? <p>{item.detail.description}</p> : null}
        {tags.length > 0 ? (
          <ul className={styles.tags}>
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
        <h3>Video de introducción</h3>
        {video ? (
          <iframe className={styles.video} title="Video de introducción" src={video} allowFullScreen />
        ) : (
          <p>Este curso no tiene video de introducción</p>
        )}
        <h3>Temas</h3>
        {sections.length === 0 ? <p>Sin temario publicado</p> : null}
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
        {item.detail?.prerequisites.length ? (
          <>
            <h3>Requisitos</h3>
            <ul>
              {item.detail.prerequisites.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : null}
        <p>{item.lessonCount === null ? "No disponible" : `${item.lessonCount} lecciones`}</p>
        <p>{item.videoHours === null ? "No disponible" : `${item.videoHours} horas`}</p>
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
        {progressError ? <p role="alert">{progressError}</p> : null}
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
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
}: {
  model: DiagramModel;
  mode?: "web" | "mcp";
  width?: number;
  openUrl?: (url: string) => void;
  onProgress?: (courseId: string, status: "completed" | "not_started") => Promise<ProgressResult>;
}) {
  const [selected, setSelected] = useState<DiagramItem | null>(null);
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
  const items = model.items.map((item) => ({
    ...item,
    completed: completed[item.courseId] ?? item.completed,
  }));

  const graph = useMemo(
    () => layoutPath(items, model.edges, width),
    [items, model.edges, width],
  );

  const nodes = graph.nodes.map((node) => {
    const item = items.find((candidate) => candidate.courseId === node.id);
    return {
      id: node.id,
      type: node.type,
      position: node.position,
      parentId: node.parentId,
      draggable: false,
      selectable: node.type === "card",
      data: node.type === "card" && item ? { item, step: node.data.step, onOpen: setSelected } : { label: node.data.label },
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

  return (
    <div className={styles.frame}>
      <ReactFlowProvider>
        <div className={styles.canvas} ref={canvasRef}>
          <ReactFlow
            nodes={nodes}
            edges={graph.edges.map((edge) => ({
              ...edge,
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed, color: "#dcd8ff", width: 18, height: 18 },
            }))}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            panOnDrag
            minZoom={0.4}
            maxZoom={1.5}
            nodesDraggable={false}
            proOptions={{ hideAttribution: true }}
          >
            <FitWhenMeasured nodeCount={nodes.length} />
            <Background />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
      {selected ? (
        <CourseModal
          item={items.find((item) => item.courseId === selected.courseId) ?? selected}
          mode={mode}
          allowProgress={model.allowProgress}
          progressError={progressError}
          openUrl={openUrl}
          onToggle={(item) => void toggle(item)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
