import Link from "next/link";
import { landingFixture } from "@/features/orbital/fixtures";
import styles from "./page.module.css";
import { MissionRadarLive } from "@/features/orbital/components/MissionRadarLive";
import { HomeAuthStatus } from "@/features/auth/components/HomeAuthStatus";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="mission-title">
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <div className={styles.telemetryHeader}>
              <p className={styles.telemetryPill}>
                <span className={styles.statusDot} aria-hidden="true" />
                {landingFixture.eyebrow}
              </p>
              <span className={styles.location}>LOC: 09° // LAT 12° | ESTADO: ACTIVO</span>
            </div>
            <div className={styles.titleBlock}>
              <h1 className={styles.title} id="mission-title">
                descubre tu ruta de
                <br />
                <span>aprendizaje ideal</span>
              </h1>
              <p className={styles.subtitle}>{landingFixture.subtitle}</p>
            </div>
            <p className={styles.lede}>{landingFixture.description}</p>
            <div className={styles.actions}>
              <Link className={styles.cta} href={landingFixture.ctaHref}>
                {landingFixture.ctaLabel}
                <svg aria-hidden="true" className={styles.actionIcon} viewBox="0 0 24 24">
                  <path d="m5 12 14 0m-6-6 6 6-6 6" />
                </svg>
              </Link>
              <div className={styles.calibration}>
                <span aria-hidden="true">✦</span>
                <div>
                  <strong>CALIBRACIÓN ESTIMADA: ~4 MINUTOS</strong>
                  <span>0% SPAM // ALINEADO CON LA INDUSTRIA TECH</span>
                </div>
              </div>
            </div>
            <div className={styles.telemetryStrip}>
              {landingFixture.telemetry.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <HomeAuthStatus />
          </div>
          <MissionRadarLive />
        </section>

        <section className={styles.doors} aria-labelledby="doors-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionEyebrow}>
                <span aria-hidden="true">✦</span>
                SELECCIONA TU PUNTO DE PARTIDA ACTUAL PARA PERSONALIZAR EL VECTOR
              </p>
              <h2 className={styles.sectionTitle} id="doors-title">
                puertas de acceso a la misión
              </h2>
            </div>
            <span className={styles.dispatch}>DISPATCH MODE // 04 STRATEGIC ENTRYPOINTS</span>
          </div>
          <nav aria-label="Puertas de aprendizaje">
            <ul className={styles.doorGrid}>
              {landingFixture.doors.map((door, index) => (
                <li className={styles.doorItem} key={door.id}>
                  <article className={styles.door}>
                    <div>
                      <div className={styles.doorMeta}>
                        <span>DOOR // {String(index + 1).padStart(2, "0")}</span>
                        <span>SYS.REF // {String(index + 1).padStart(2, "0")}-{door.id.toUpperCase()}</span>
                      </div>
                      <h3>{door.label}</h3>
                      <p>{door.description}</p>
                    </div>
                    <div className={styles.doorFooter}>
                      <div className={styles.doorData}>
                        <span>{door.metadata[0]} <strong>{door.metadata[1]}</strong></span>
                        <span>{index === 0 ? "Ventana de vuelo" : index === 1 ? "Metodología" : index === 2 ? "Profundidad" : "Vector"} <strong>{index === 0 ? "4 - 6 meses" : index === 1 ? "Puente sintáctico" : index === 2 ? "Alta escala" : "RIASEC-Dev 360°"}</strong></span>
                      </div>
                      <Link className={styles.doorAction} href={door.href}>
                        CALIBRAR ESTE PUNTO
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path d="M7 17 17 7m-8 0h8v8" />
                        </svg>
                      </Link>
                    </div>
                    <span className={styles.cornerMark} aria-hidden="true" />
                  </article>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <section className={styles.protocol} aria-labelledby="protocol-title">
          <div className={styles.protocolLead}>
            <span className={styles.protocolIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
                <path d="m12 4 2 8-2 8m-8-8h16" />
              </svg>
            </span>
            <div>
              <h2 id="protocol-title">{landingFixture.protocol.title}</h2>
              <p>{landingFixture.protocol.description}</p>
            </div>
          </div>
          <div className={styles.protocolItems}>
            {landingFixture.protocol.items.map((item, index) => (
              <span key={item}>
                <b aria-hidden="true">✦</b>
                {item}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
