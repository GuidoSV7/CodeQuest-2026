import Link from "next/link";
import { BRAND_ASSETS } from "@/config/brand-assets";
import { ShellAccount } from "@/features/auth/components/ShellAccount";
import { LivePathModal } from "@/features/live-path/components/LivePathModal";
import styles from "./MissionShell.module.css";
import { MissionShellMobileNav } from "./MissionShellMobileNav";

type MissionShellProps = {
  children: React.ReactNode;
  variant?: "product" | "login";
};

const PRODUCT_LINKS = [
  { href: "/mis-rutas", label: "Mis rutas" },
  { href: "/configurador-de-ruta", label: "Configurador de ruta" },
  { href: "/docs/mcp", label: "MCP" },
] as const;

export function MissionShell({
  children,
  variant = "product",
}: MissionShellProps) {
  if (variant === "login") {
    return (
      <div className={`${styles.shell} ${styles.loginShell}`}>
        <header className={styles.loginHeader}>
          <Link className={styles.loginBrand} href="/" aria-label="DevTalles, inicio">
            <img className={styles.brandMark} src={BRAND_ASSETS.isologo} alt="" width={32} height={32} />
            DevTalles
          </Link>
          <nav className={styles.loginNav} aria-label="Navegación principal">
            {PRODUCT_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <MissionShellMobileNav links={[...PRODUCT_LINKS]} />
          <ShellAccount />
        </header>
        <a className={styles.skipLink} href="#login-shell-content">
          Saltar al contenido principal
        </a>
        <div id="login-shell-content">{children}</div>
        <LivePathModal />
        <footer className={styles.loginFooter}>
          <span className={styles.loginFooterBrand}>DevTalles</span>
        </footer>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#orbital-content">
        Saltar al contenido principal
      </a>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="DevTalles, inicio">
          <img className={styles.brandMark} src={BRAND_ASSETS.isologo} alt="" width={32} height={32} />
          DevTalles
        </Link>
        <div className={styles.headerActions}>
          <nav className={styles.desktopNav} aria-label="Navegación principal">
            {PRODUCT_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <MissionShellMobileNav links={[...PRODUCT_LINKS]} />
          <ShellAccount />
        </div>
      </header>
      <div className={styles.content} id="orbital-content">
        {children}
      </div>
      <LivePathModal />
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span className={styles.footerBrand}>
            <img className={styles.footerMark} src={BRAND_ASSETS.isologo} alt="" width={24} height={24} />
            DevTalles
          </span>
        </div>
      </footer>
    </div>
  );
}
