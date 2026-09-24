"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import styles from "./MissionShell.module.css";

export type MissionShellMobileNavLink = {
  href: string;
  label: string;
};

type MissionShellMobileNavProps = {
  links: MissionShellMobileNavLink[];
};

export function MissionShellMobileNav({ links }: MissionShellMobileNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={styles.mobileNav}>
      <button
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
        onClick={() => setOpen((current) => !current)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className={styles.menuIcon}>
          {open ? (
            <path d="M6 6 18 18M6 18 18 6" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>
      <div
        id={panelId}
        className={open ? styles.mobilePanelOpen : styles.mobilePanel}
        hidden={!open}
      >
        <nav aria-label="Navegación móvil">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
