import type { Metadata } from "next";
import { Outfit, Raleway, Space_Mono } from "next/font/google";
import ProveedorNotificaciones from "./_componentes/ProveedorNotificaciones";
import RouteCreatedHost from "./_componentes/RouteCreatedHost";
import ProveedoresApp from "./providers";
import "./globals.css";
import { siteName, siteUrl } from "@/config/site";

const fuenteDisplay = Outfit({
  variable: "--fuente-outfit",
  subsets: ["latin"],
});

const fuenteText = Raleway({
  variable: "--fuente-raleway",
  subsets: ["latin"],
});

const fuenteMono = Space_Mono({
  variable: "--fuente-space-mono",
  weight: ["400", "700"],
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
    <html
      lang="es"
      className={`${fuenteDisplay.variable} ${fuenteText.variable} ${fuenteMono.variable}`}
    >
      <body suppressHydrationWarning>
        <ProveedoresApp>
          <ProveedorNotificaciones>
            <RouteCreatedHost />
            {children}
          </ProveedorNotificaciones>
        </ProveedoresApp>
      </body>
    </html>
  );
}
