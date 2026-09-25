"use client";

import { modelFromUserPath, PathDiagram } from "path-diagram";
import { useEffect, useState } from "react";
import { loadPathDetail, type PathDetailResponse } from "../lib/load-path-detail";
import "@xyflow/react/dist/style.css";

export function UserRouteDiagram({
  routeId,
  load = loadPathDetail,
}: {
  routeId: string;
  load?: (routeId: string) => Promise<PathDetailResponse | null>;
}) {
  const [detail, setDetail] = useState<PathDetailResponse | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    load(routeId)
      .then((next) => {
        if (active) setDetail(next);
      })
      .catch(() => {
        if (active) setDetail(null);
      });
    return () => {
      active = false;
    };
  }, [load, routeId]);

  if (detail === undefined) return <p>Cargando diagrama…</p>;
  if (!detail) return <p role="alert">No pudimos cargar el diagrama</p>;

  return (
    <PathDiagram model={modelFromUserPath(detail)} mode="web" />
  );
}
