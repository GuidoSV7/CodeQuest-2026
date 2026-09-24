"use client";

import styles from "./LoginPanel.module.css";

type LoginPanelProps = {
  returnTo?: string;
};

/** Stitch login card — presentation only; no backend or Discord redirect. */
export function LoginPanel(_props: LoginPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="login-title">
      <span className={styles.terminalLabel}>TERMINAL DE ACCESO // AUTH</span>
      <h1 className={styles.title} id="login-title">
        Inicia sesión en tu misión
      </h1>
      <div className={styles.discordAction}>
        <button
          className={styles.discordButton}
          type="button"
          aria-label="Continuar con Discord para iniciar sesión"
        >
          <span className={styles.discordLogo} aria-hidden="true">
            LOGO
          </span>
          <span>Continuar con Discord</span>
        </button>
      </div>
      <div className={styles.divider} aria-hidden="true">
        <span>o</span>
      </div>
      <form
        className={styles.presentationForm}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className={styles.field}>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            placeholder="piloto@devtalles.com"
            required
            type="email"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            placeholder="••••••••••••"
            required
            type="password"
          />
        </div>
        <button className={styles.emailButton} type="submit">
          Entrar con correo
        </button>
      </form>
      <p className={styles.guestMode}>
        MODO INVITADO DISPONIBLE — tu ruta se guarda al iniciar sesión
      </p>
    </section>
  );
}
