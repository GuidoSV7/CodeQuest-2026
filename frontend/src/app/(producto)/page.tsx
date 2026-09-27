import Link from "next/link";
import { landingFixture } from "@/features/orbital/fixtures";
import styles from "./page.module.css";
import { MissionRadarLive } from "@/features/orbital/components/MissionRadarLive";
import { HomeAuthStatus } from "@/features/auth/components/HomeAuthStatus";

const developers = [
  {
    name: "Guido Salazar Vargas",
    role: "Front/Back",
    photo: "/crew/guido.svg",
    links: [
      { kind: "github", label: "GitHub", href: "https://github.com/GuidoSalazarV7" },
      { kind: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/guidosalazar" },
    ],
  },
  {
    name: "Jose Alejandro Sahonero Salas",
    role: "Front",
    photo: "/crew/jose.svg",
    links: [{ kind: "github", label: "GitHub", href: "https://github.com/Coraxbay78452415" }],
  },
  {
    name: "Marco David Toledo Canna",
    role: "Front/Back",
    photo: "/crew/marco.svg",
    links: [
      { kind: "github", label: "GitHub", href: "https://github.com/marcodavidd020" },
      { kind: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/marco-david-toledo-canna-813bb2165" },
      { kind: "web", label: "Portafolio", href: "https://portafolio-orcin-iota.vercel.app/" },
    ],
  },
] as const;

function SocialIcon({ kind }: { kind: "github" | "linkedin" | "web" }) {
  if (kind === "github") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"
        />
      </svg>
    );
  }
  if (kind === "linkedin") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3.6 1.8A1.8 1.8 0 1 1 1.8 3.6 1.8 1.8 0 0 1 3.6 1.8ZM2 6h3.2v8H2Zm5.2 0H10v1.1h.05A3.5 3.5 0 0 1 13.2 6c2.4 0 2.8 1.6 2.8 3.6V14h-3.2v-3.9c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2V14H7.2Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.5 1.5h5v5h-1.5V4.1L7.4 8.7 6.3 7.6l4.6-4.6H8.5Zm-5 2H7V5H3.5v7.5H11V9h1.5v4.5a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
      />
    </svg>
  );
}

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

        <section className={styles.crew} aria-labelledby="crew-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionEyebrow}>
                <span aria-hidden="true">✦</span>
                EQUIPO
              </p>
              <h2 className={styles.sectionTitle} id="crew-title">
                desarrolladores
              </h2>
            </div>
          </div>
          <ul className={styles.crewList}>
            {developers.map((person) => (
              <li key={person.name}>
                <img
                  className={styles.portrait}
                  src={person.photo}
                  alt={`Vista previa de ${person.name}`}
                  width={72}
                  height={72}
                />
                <div className={styles.crewCopy}>
                  <p>{person.name}</p>
                  <span>{person.role}</span>
                  <div className={styles.socials}>
                    {person.links.map((link) => (
                      <a
                        key={link.href}
                        className={styles.social}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <SocialIcon kind={link.kind} />
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
