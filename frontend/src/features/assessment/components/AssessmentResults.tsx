import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CHROME_ICON_STROKE_WIDTH } from "@/config/chrome-icon";
import { getAssessment } from "../lib/assessment-data";
import styles from "./AssessmentResults.module.css";

export function AssessmentResults() {
  const result = getAssessment("anonymous");

  if (result.status !== "ready" || result.data === null) {
    return (
      <section className={styles.state} role={result.status === "error" ? "alert" : undefined}>
        <h2>Resultado no disponible</h2>
        <p>La lectura mock no tiene datos para mostrar.</p>
        <Link className={styles.primaryAction} href="/configurador-de-ruta">
          Volver al configurador
        </Link>
      </section>
    );
  }

  const assessment = result.data;
  const routeCards = assessment.result.routeCards ?? [];

  return (
    <section className={styles.results} aria-labelledby="results-title">
      <div className={styles.resultGrid}>
        <section className={styles.radarPanel}>
          <div className={styles.archetypeHeader}>
            <p className={styles.kicker}>Resultado de tu diagnóstico</p>
            <span>Tu arquetipo</span>
            <h2 id="results-title">{assessment.result.archetype ?? "No disponible"}</h2>
            <p>{assessment.result.affinity ?? "No disponible"}</p>
          </div>
          <svg
            className={styles.radar}
            viewBox="0 0 520 520"
            role="img"
            aria-labelledby="radar-title radar-description"
          >
            <title id="radar-title">Radar hexagonal de afinidades</title>
            <desc id="radar-description">
              Seis ejes de afinidad para infraestructura, backend, frontend,
              comunidad, shipper y calidad.
            </desc>
            <polygon className={styles.radarGrid} points="260,90 398,170 398,330 260,410 122,330 122,170" />
            <polygon className={styles.radarGrid} points="260,125 363,185 363,305 260,365 157,305 157,185" />
            <polygon className={styles.radarGrid} points="260,160 329,200 329,280 260,320 191,280 191,200" />
            <polygon className={styles.radarGrid} points="260,195 294,215 294,255 260,275 226,255 226,215" />
            <path className={styles.radarAxis} d="M260 235V90M260 235l138-65M260 235l138 95M260 235v175M260 235l-138 95M260 235l-138-65" />
            <polygon className={styles.radarShape} points="260,105 385,182 310,298 210,360 148,310 140,180" />
            <circle className={styles.radarPoint} cx="260" cy="105" r="4.5" />
            <circle className={styles.radarPoint} cx="385" cy="182" r="4.5" />
            <circle className={styles.radarPoint} cx="310" cy="298" r="4" />
            <circle className={styles.radarPoint} cx="210" cy="360" r="3.5" />
            <circle className={styles.radarPoint} cx="148" cy="310" r="3.5" />
            <circle className={styles.radarPoint} cx="140" cy="180" r="4" />
            <text className={styles.radarLabel} x="260" y="58">Infra</text>
            <text className={styles.radarLabel} x="415" y="160">Backend</text>
            <text className={styles.radarLabel} x="415" y="334">Frontend/UI</text>
            <text className={styles.radarLabel} x="260" y="435">Comunidad</text>
            <text className={styles.radarLabel} x="105" y="334">Shipper</text>
            <text className={styles.radarLabel} x="105" y="160">Calidad</text>
          </svg>
          <div className={styles.calibration}>
            <span aria-hidden="true">●</span>
            <strong>Afinidad: 94,2 %</strong>
            <em>Complejidad sugerida: {assessment.result.complexity}</em>
          </div>
          <div className={styles.domain}>
            <div>
              <strong>Área principal</strong>
              <small>{assessment.result.primaryDomain}</small>
            </div>
            <b>{assessment.result.systemStatus}</b>
          </div>
        </section>
        <section className={styles.routePanel} aria-labelledby="routes-title">
          <div className={styles.routePanelHeader}>
            <h2 id="routes-title">Rutas del catálogo para vos</h2>
            <span>{routeCards.length} rutas disponibles</span>
          </div>
          {routeCards.map((route, index) => (
            <article className={index === 0 ? styles.recommendedCard : styles.routeCard} key={route.title}>
              <div className={styles.routeMeta}>
                <span>{route.label}</span>
                <small>{route.location}</small>
              </div>
              <h3>{route.title}</h3>
              <div className={styles.routeStats}>
                <span>{route.duration}</span><b>✦</b>
                <span>{route.completion}</span><b>✦</b>
                <span>{route.courses}</span>
              </div>
              {route.sequence ? (
                <div className={styles.sequence}>
                  <span>Orden sugerido</span>
                  <p>{route.sequence.join(" ➔ ")}</p>
                </div>
              ) : null}
              <div className={styles.routeFooter}>
                <span>{route.description}</span>
                <Link className={index === 0 ? styles.primaryAction : styles.secondaryAction} href="/mis-rutas">
                  {route.action} <ArrowRight aria-hidden="true" strokeWidth={CHROME_ICON_STROKE_WIDTH} />
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
