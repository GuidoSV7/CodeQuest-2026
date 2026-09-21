"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import estilos from "./notificacion.module.css";
import NotificacionSuperior from "./NotificacionSuperior";

export type ValorNotificaciones = {
  mostrarNotificacion: (mensaje: string, duracionMs?: number) => void;
};

const ContextoNotificaciones = createContext<ValorNotificaciones | null>(null);

export function useNotificacion(): ValorNotificaciones {
  const ctx = useContext(ContextoNotificaciones);
  if (!ctx) {
    throw new Error("useNotificacion debe usarse dentro de ProveedorNotificaciones (layout raíz).");
  }
  return ctx;
}

/** Si el componente puede montarse fuera del árbol principal (tests / story). */
export function useNotificacionOpcional(): ValorNotificaciones | null {
  return useContext(ContextoNotificaciones);
}

// Proveedor global: home, /admin, /cliente comparten el mismo toast superior derecha.
export default function ProveedorNotificaciones({
  children: hijos,
}: Readonly<{ children: ReactNode }>) {
  const [activa, setActiva] = useState<{
    id: number;
    mensaje: string;
    duracionMs: number;
  } | null>(null);

  const mostrarNotificacion = useCallback((mensaje: string, duracionMs = 12_000) => {
    setActiva({ id: Date.now(), mensaje, duracionMs });
  }, []);

  const valor = useMemo(() => ({ mostrarNotificacion }), [mostrarNotificacion]);

  return (
    <ContextoNotificaciones.Provider value={valor}>
      {hijos}
      {activa ? (
        <div className={estilos.notificacionAnclaSuperiorDerecha}>
          <NotificacionSuperior
            key={activa.id}
            mensaje={activa.mensaje}
            duracionMs={activa.duracionMs}
            alTerminar={() => setActiva(null)}
          />
        </div>
      ) : null}
    </ContextoNotificaciones.Provider>
  );
}
