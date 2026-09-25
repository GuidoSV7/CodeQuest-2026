import styles from "./MissionRadar.module.css";
import {
  activeNodeIndex,
  radarBearingDegrees,
} from "../lib/radar-progress";

const NODES = [
  { cx: 120, cy: 120, r: 5, label: "TS_FOUND", x: 110, y: 105, primary: true },
  { cx: 200, cy: 90, r: 4, label: "NEST.SYS", x: 195, y: 76, primary: false },
  { cx: 280, cy: 130, r: 6, label: "REACT_ARC", x: 290, y: 128, primary: false },
  { cx: 310, cy: 220, r: 4, label: "DOCKER/K8S", x: 320, y: 225, primary: false },
  { cx: 240, cy: 290, r: 5, label: "HEX_DOMAIN", x: 230, y: 310, primary: false },
  { cx: 150, cy: 270, r: 4, label: "CLEAN_CODE", x: 90, y: 282, primary: false },
] as const;

type MissionRadarProps = {
  progressRatio?: number;
  completedCount?: number;
};

export function MissionRadar({
  progressRatio = 0,
  completedCount = 0,
}: MissionRadarProps) {
  const bearing = radarBearingDegrees(progressRatio);
  const active = activeNodeIndex(progressRatio, NODES.length);
  const orbit = (bearing / 360).toFixed(3);

  return (
    <div className={styles.frame}>
      <div className={styles.frameHeader}>
        <span className={styles.frameMarker} aria-hidden="true" />
        <span>VECTOR DISPLAY // POLAR MATRIX</span>
        <span className={styles.orbitData}>T-ORBIT: {orbit}</span>
      </div>
      <svg
        className={styles.radar}
        viewBox="0 0 400 400"
        role="img"
        aria-labelledby="mission-radar-title mission-radar-description"
      >
        <title id="mission-radar-title">Matriz orbital de seis nodos</title>
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
        {bearing > 0 ? (
          <path className={styles.nodeLinks} d="m120 120 80-30 80 40 30 90-70 70-90-20z" />
        ) : null}
        <circle className={styles.core} cx="200" cy="200" r="4" />
        <circle className={styles.coreRing} cx="200" cy="200" r="8" />
        {NODES.map((node, index) => {
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
              <circle className={nodeClass} cx={node.cx} cy={node.cy} r={node.r} />
              <text className={labelClass} x={node.x} y={node.y}>
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
        <span>NODOS ACTIVOS: {completedCount}</span>
        <span className={styles.primaryText}>
          {bearing === 0 ? "EN ESPERA" : "PROPULSIÓN: DIRECTA"}
        </span>
        <span>{bearing >= 360 ? "ÓRBITA: CERRADA" : "SIMULACIÓN: READY"}</span>
      </div>
      <span className={styles.cornerTopLeft} aria-hidden="true">+</span>
      <span className={styles.cornerTopRight} aria-hidden="true">+</span>
      <span className={styles.cornerBottomLeft} aria-hidden="true">+</span>
      <span className={styles.cornerBottomRight} aria-hidden="true">+</span>
    </div>
  );
}
