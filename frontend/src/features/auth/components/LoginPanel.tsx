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
            LOGO
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
