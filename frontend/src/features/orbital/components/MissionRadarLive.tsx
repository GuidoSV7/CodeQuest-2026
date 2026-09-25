"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/auth-session";
import { MissionRadar } from "@/features/orbital/components/MissionRadar";
import {
  selectActivePathProgress,
  type PathProgressSnapshot,
  type RadarProgress,
} from "@/features/orbital/lib/radar-progress";

const IDLE: RadarProgress = {
  progressRatio: 0,
  completedCount: 0,
  itemCount: 0,
};

export function MissionRadarLive() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [progress, setProgress] = useState<RadarProgress>(IDLE);

  useEffect(() => {
    if (!hydrated || !user) {
      setProgress(IDLE);
      return;
    }

    let cancelled = false;
    void api
      .get<{ items: PathProgressSnapshot[] }>("/api/me/learning-paths")
      .then(({ data }) => {
        if (!cancelled) setProgress(selectActivePathProgress(data.items ?? []));
      })
      .catch(() => {
        if (!cancelled) setProgress(IDLE);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, user]);

  return (
    <MissionRadar
      completedCount={progress.completedCount}
      progressRatio={progress.progressRatio}
    />
  );
}
