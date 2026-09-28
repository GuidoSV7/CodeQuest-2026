"use client";

import { RouteCreatedNotice } from "@/features/learning-paths/components/RouteCreatedNotice";
import { useNotificacion } from "./ProveedorNotificaciones";

export default function RouteCreatedHost() {
  const { mostrarNotificacion } = useNotificacion();
  return <RouteCreatedNotice onNotify={mostrarNotificacion} />;
}
