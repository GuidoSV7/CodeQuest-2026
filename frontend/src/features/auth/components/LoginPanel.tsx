"use client";

import Link from "next/link";
import { authEntryPath, discordStartUrl } from "@/features/auth/api/auth.service";
import styles from "./LoginPanel.module.css";

type LoginPanelProps = {
  returnTo?: string;
  intent?: "login" | "register";
};

export function LoginPanel({
  returnTo = "/",
  intent = "login",
}: LoginPanelProps) {
  const register = intent === "register";

  return (
    <section className={styles.panel} aria-labelledby="login-title">
      <span className={styles.terminalLabel}>TERMINAL DE ACCESO // AUTH</span>
      <h1 className={styles.title} id="login-title">
        {register ? "Creá tu cuenta" : "Inicia sesión en tu misión"}
      </h1>
      <p className={styles.lede}>
        {register
          ? "La primera vez que entrás con Discord creamos tu usuario. No usamos correo ni contraseña."
          : "Si ya tenés cuenta, Discord te vuelve a dejar entrar."}
      </p>
      <div className={styles.discordAction}>
        <a
          className={styles.discordButton}
          href={discordStartUrl(returnTo)}
          aria-label={
            register
              ? "Crear cuenta con Discord"
              : "Continuar con Discord para iniciar sesión"
          }
        >
          <span className={styles.discordLogo} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.1.1 0 0 0-.1.05c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.74 0c-.14-.34-.35-.76-.54-1.09a.1.1 0 0 0-.1-.05c-1.5.26-2.93.71-4.27 1.33a.09.09 0 0 0-.04.03C2.26 9.05 1.6 12.58 1.89 16.07c0 .02.01.04.03.05a16.7 16.7 0 0 0 5.03 2.54c.03 0 .06-.01.07-.04.39-.53.73-1.1 1.03-1.69a.09.09 0 0 0-.05-.12 11 11 0 0 1-1.57-.75.09.09 0 0 1-.01-.15c.1-.08.21-.16.31-.24a.09.09 0 0 1 .09-.01c3.3 1.51 6.87 1.51 10.13 0a.09.09 0 0 1 .1.01c.1.08.2.16.31.24a.09.09 0 0 1 0 .15c-.5.29-1.02.54-1.57.75a.09.09 0 0 0-.05.12c.3.6.64 1.16 1.03 1.69.02.03.05.04.08.04a16.7 16.7 0 0 0 5.04-2.54.09.09 0 0 0 .03-.05c.36-3.74-.6-7.24-2.53-10.71a.07.07 0 0 0-.04-.03ZM8.52 14.1c-.99 0-1.8-.9-1.8-2.02 0-1.12.8-2.02 1.8-2.02.99 0 1.81.91 1.8 2.02 0 1.11-.8 2.02-1.8 2.02Zm6.96 0c-.99 0-1.8-.9-1.8-2.02 0-1.12.8-2.02 1.8-2.02.99 0 1.81.91 1.8 2.02 0 1.11-.81 2.02-1.8 2.02Z"
              />
            </svg>
          </span>
          <span>{register ? "Crear cuenta con Discord" : "Continuar con Discord"}</span>
        </a>
      </div>
      <p className={styles.guestMode}>
        {register ? (
          <Link href={authEntryPath("login")}>Ya tengo cuenta</Link>
        ) : (
          <Link href={authEntryPath("register")}>Crear cuenta</Link>
        )}
      </p>
    </section>
  );
}
