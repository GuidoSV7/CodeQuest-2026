import { useMemo, useState } from "react";
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { layoutPath } from "./layout-path";
import { bucketLabel, iconLabel, type DiagramItem, type DiagramModel } from "./model";
import { PathCard } from "./path-card";
import styles from "./path-diagram.module.css";

type CardData = {
  item: DiagramItem;
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
      onOpen={() => data.onOpen(item)}
    />
  );
}

const nodeTypes = { card: CardNode, header: HeaderNode, group: GroupNode };

function HeaderNode({ data }: NodeProps<Node<{ label: string }>>) {
  return <div className={styles.header}>{data.label}</div>;
}

function GroupNode({ data }: NodeProps<Node<{ label: string }>>) {
  return <div className={styles.groupLabel}>{data.label}</div>;
}

export type ProgressResult = { ok: boolean; message?: string };

export function PathDiagram({
  model,
  mode = "web",
  openUrl,
  onProgress,
}: {
  model: DiagramModel;
  mode?: "web" | "mcp";
  openUrl?: (url: string) => void;
  onProgress?: (courseId: string, status: "completed" | "not_started") => Promise<ProgressResult>;
}) {
  const [selected, setSelected] = useState<DiagramItem | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [progressError, setProgressError] = useState("");
  const items = model.items.map((item) => ({
    ...item,
    completed: completed[item.courseId] ?? item.completed,
  }));

  const graph = useMemo(
    () => layoutPath(items, model.edges, 960),
    [items, model.edges],
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
      data: node.type === "card" && item ? { item, onOpen: setSelected } : { label: node.data.label },
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
        <div className={styles.canvas}>
          <ReactFlow
            nodes={nodes}
            edges={graph.edges.map((edge) => ({ ...edge, type: "smoothstep" }))}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            panOnDrag
            minZoom={0.4}
            maxZoom={1.5}
            nodesDraggable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
      {selected ? (
        <div className={styles.dialog} role="dialog" aria-label={selected.title}>
          <h2>{selected.title}</h2>
          <p>{bucketLabel(selected.bucket)}</p>
          <p>{selected.lessonCount === null ? "No disponible" : `${selected.lessonCount} lecciones`}</p>
          <p>{selected.videoHours === null ? "No disponible" : `${selected.videoHours} horas`}</p>
          {selected.url && mode === "web" ? (
            <a href={selected.url} target="_blank" rel="noopener noreferrer">
              Abrir curso
            </a>
          ) : null}
          {selected.url && mode === "mcp" ? (
            <button type="button" onClick={() => openUrl?.(selected.url)}>
              Abrir curso
            </button>
          ) : null}
          {model.allowProgress ? (
            <button type="button" onClick={() => void toggle(items.find((item) => item.courseId === selected.courseId) ?? selected)}>
              {items.find((item) => item.courseId === selected.courseId)?.completed
                ? "Marcar sin empezar"
                : "Marcar completado"}
            </button>
          ) : null}
          {progressError ? <p role="alert">{progressError}</p> : null}
          <button type="button" onClick={() => setSelected(null)}>
            Cerrar
          </button>
        </div>
      ) : null}
    </div>
  );
}
