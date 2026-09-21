import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import ProveedorNotificaciones from "./_componentes/ProveedorNotificaciones";
import ProveedoresApp from "./providers";
import "./globals.css";
import { siteName, siteUrl } from "@/config/site";

const fuenteSans = Space_Grotesk({
  variable: "--fuente-geist-sans",
  subsets: ["latin"],
});

const fuenteMono = JetBrains_Mono({
  variable: "--fuente-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Rutas de aprendizaje DevTalles`,
    template: `%s | ${siteName}`,
  },
  description:
    "Armá tu ruta de aprendizaje con el catálogo DevTalles, progreso y sesión Discord.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_LA",
    siteName,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fuenteSans.variable} ${fuenteMono.variable}`}>
      <body suppressHydrationWarning>
        <ProveedoresApp>
          <ProveedorNotificaciones>{children}</ProveedorNotificaciones>
        </ProveedoresApp>
      </body>
    </html>
  );
}
