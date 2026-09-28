import styles from "./MissionRadar.module.css";
import {
  activeNodeIndex,
  radarBearingDegrees,
} from "../lib/radar-progress";

type RadarNode = {
  cx: number;
  cy: number;
  r: number;
  label: string;
  x: number;
  y: number;
  primary: boolean;
};

function technologyLabel(title: string): string {
  const name = title
    .replace(/^ruta de aprendizaje\s+/i, "")
    .replace(/^programa de\s+/i, "")
    .replace(/^ruta\s+/i, "")
    .trim();
  return name || title.trim();
}

function placeTechnologies(labels: string[]): RadarNode[] {
  const count = labels.length;
  return labels.map((raw, index) => {
    const label = technologyLabel(raw);
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const cx = Math.round(200 + Math.cos(angle) * 108);
    const cy = Math.round(200 + Math.sin(angle) * 108);
    const x = Math.round(200 + Math.cos(angle) * 128);
    const y = Math.round(200 + Math.sin(angle) * 128);
    return {
      label,
      cx,
      cy,
      x,
      y,
      r: 4,
      primary: false,
    };
  });
}

type MissionRadarProps = {
  progressRatio?: number;
  completedCount?: number;
  technologies?: string[];
};

export function MissionRadar({
  progressRatio = 0,
  completedCount = 0,
  technologies = [],
}: MissionRadarProps) {
  const nodes = placeTechnologies(technologies);
  const bearing = radarBearingDegrees(progressRatio);
  const active = activeNodeIndex(progressRatio, nodes.length);
  return (
    <div className={styles.frame}>
      <div className={styles.frameHeader}>
        <span className={styles.frameMarker} aria-hidden="true" />
        <span>Tu progreso</span>
        <span className={styles.orbitData}>Avance: {Math.round((bearing / 360) * 100)} %</span>
      </div>
      <svg
        className={styles.radar}
        viewBox="0 0 400 400"
        role="img"
        aria-labelledby="mission-radar-title mission-radar-description"
      >
        <title id="mission-radar-title">Radar de tecnologías del catálogo</title>
        <desc id="mission-radar-description">
          El haz marca el {Math.round((bearing / 360) * 100)}% del progreso.
          {completedCount} nodos completados.
        </desc>
        <circle className={styles.range} cx="200" cy="200" r="170" />
        <circle className={styles.range} cx="200" cy="200" r="120" />
        <circle className={styles.range} cx="200" cy="200" r="70" />
        <circle className={styles.range} cx="200" cy="200" r="25" />
        <path className={styles.axis} d="M200 20v360M20 200h360M72 72l256 256M72 328 328 72" />
        <path className={styles.track} d="M60 200C60 120 120 60 200 60c70 0 130 50 140 120" />
        <path className={styles.trackDashed} d="M80 260c50 70 180 80 240 20 30-40 10-130-40-160" />
        <circle className={styles.core} cx="200" cy="200" r="4" />
        <circle className={styles.coreRing} cx="200" cy="200" r="8" />
        {nodes.map((node, index) => {
          const isActive = index === active;
          const nodeClass = isActive
            ? styles.nodeActive
            : node.r <= 4
              ? styles.nodeSmall
              : styles.node;
          const labelClass = isActive
            ? styles.nodeLabelActive
            : node.primary
              ? styles.nodeLabelPrimary
              : styles.nodeLabel;
          return (
            <g key={node.label}>
              {bearing > 0 ? (
                <line className={styles.nodeLinks} x1="200" y1="200" x2={node.cx} y2={node.cy} />
              ) : null}
              <circle className={nodeClass} cx={node.cx} cy={node.cy} r={node.r} />
              <text className={labelClass} x={node.x} y={node.y} textAnchor="middle">
                {node.label}
              </text>
            </g>
          );
        })}
        {bearing > 0 ? (
          <g
            className={styles.beam}
            style={{ transform: `rotate(${bearing}deg)` }}
          >
            <path className={styles.activeBeam} d="M200 200 L200 30" />
            <circle className={styles.activeTarget} cx="200" cy="30" r="9" />
          </g>
        ) : null}
      </svg>
      <div className={styles.frameFooter}>
        <span>Cursos completados: {completedCount}</span>
        <span className={styles.primaryText}>
          {bearing === 0 ? "Sin empezar" : bearing >= 360 ? "Ruta completa" : "En curso"}
        </span>
      </div>
      <span className={styles.cornerTopLeft} aria-hidden="true">+</span>
      <span className={styles.cornerTopRight} aria-hidden="true">+</span>
      <span className={styles.cornerBottomLeft} aria-hidden="true">+</span>
      <span className={styles.cornerBottomRight} aria-hidden="true">+</span>
    </div>
  );
}
