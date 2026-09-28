"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { CHROME_ICON_STROKE_WIDTH } from "@/config/chrome-icon";
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
        {open ? (
          <X aria-hidden="true" className={styles.menuIcon} strokeWidth={CHROME_ICON_STROKE_WIDTH} />
        ) : (
          <Menu aria-hidden="true" className={styles.menuIcon} strokeWidth={CHROME_ICON_STROKE_WIDTH} />
        )}
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
