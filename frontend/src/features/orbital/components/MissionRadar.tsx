import styles from "./MissionRadar.module.css";

export function MissionRadar() {
  return (
    <div className={styles.frame}>
      <div className={styles.frameHeader}>
        <span className={styles.frameMarker} aria-hidden="true" />
        <span>VECTOR DISPLAY // POLAR MATRIX</span>
        <span className={styles.orbitData}>T-ORBIT: 0.941</span>
      </div>
      <svg
        className={styles.radar}
        viewBox="0 0 400 400"
        role="img"
        aria-labelledby="mission-radar-title mission-radar-description"
      >
        <title id="mission-radar-title">Matriz orbital de seis nodos</title>
        <desc id="mission-radar-description">
          Seis nodos de aprendizaje conectados alrededor del centro de la
          misión: TypeScript, Nest, React, DevOps, dominio hexagonal y Clean
          Code.
        </desc>
        <circle className={styles.range} cx="200" cy="200" r="170" />
        <circle className={styles.range} cx="200" cy="200" r="120" />
        <circle className={styles.range} cx="200" cy="200" r="70" />
        <circle className={styles.range} cx="200" cy="200" r="25" />
        <path className={styles.axis} d="M200 20v360M20 200h360M72 72l256 256M72 328 328 72" />
        <path className={styles.track} d="M60 200C60 120 120 60 200 60c70 0 130 50 140 120" />
        <path className={styles.trackDashed} d="M80 260c50 70 180 80 240 20 30-40 10-130-40-160" />
        <path className={styles.nodeLinks} d="m120 120 80-30 80 40 30 90-70 70-90-20z" />
        <path className={styles.activeBeam} d="m200 200 80-70" />
        <circle className={styles.core} cx="200" cy="200" r="4" />
        <circle className={styles.coreRing} cx="200" cy="200" r="8" />
        <circle className={styles.node} cx="120" cy="120" r="5" />
        <text className={styles.nodeLabelPrimary} x="110" y="105">TS_FOUND</text>
        <circle className={styles.nodeSmall} cx="200" cy="90" r="4" />
        <text className={styles.nodeLabel} x="195" y="76">NEST.SYS</text>
        <circle className={styles.nodeActive} cx="280" cy="130" r="6" />
        <text className={styles.nodeLabelActive} x="290" y="128">REACT_ARC</text>
        <circle className={styles.nodeSmall} cx="310" cy="220" r="4" />
        <text className={styles.nodeLabel} x="320" y="225">DOCKER/K8S</text>
        <circle className={styles.node} cx="240" cy="290" r="5" />
        <text className={styles.nodeLabel} x="230" y="310">HEX_DOMAIN</text>
        <circle className={styles.nodeSmall} cx="150" cy="270" r="4" />
        <text className={styles.nodeLabel} x="90" y="282">CLEAN_CODE</text>
        <circle className={styles.activeTarget} cx="280" cy="130" r="9" />
      </svg>
      <div className={styles.frameFooter}>
        <span>NODOS ACTIVOS: 142</span>
        <span className={styles.primaryText}>PROPULSIÓN: DIRECTA</span>
        <span>SIMULACIÓN: READY</span>
      </div>
      <span className={styles.cornerTopLeft} aria-hidden="true">+</span>
      <span className={styles.cornerTopRight} aria-hidden="true">+</span>
      <span className={styles.cornerBottomLeft} aria-hidden="true">+</span>
      <span className={styles.cornerBottomRight} aria-hidden="true">+</span>
    </div>
  );
}
