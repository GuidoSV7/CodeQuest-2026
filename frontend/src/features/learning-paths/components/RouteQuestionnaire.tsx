"use client";

import { useRef, useState } from "react";
import type { OfficialPathId } from "@/config/official-paths";
import {
  suggestOfficialPath,
  type BuildInterest,
  type SkillLevel,
} from "../lib/route-questionnaire";
import styles from "./MyRouteStatus.module.css";

const INTERESTS: Array<{ id: BuildInterest; label: string }> = [
  { id: "web", label: "Una página web" },
  { id: "api", label: "Una API o un servidor" },
  { id: "mobile", label: "Una app para el celular" },
  { id: "data", label: "Datos o inteligencia artificial" },
  { id: "bases", label: "Las bases, todavía no elijo" },
];

const LEVELS: Array<{ id: SkillLevel; label: string }> = [
  { id: "starting", label: "Recién empiezo" },
  { id: "some", label: "Ya hice algunos ejercicios" },
  { id: "building", label: "Ya armo proyectos" },
];

export function RouteQuestionnaire({
  onSuggest,
}: {
  onSuggest: (pathId: OfficialPathId) => void;
}) {
  const [interest, setInterest] = useState<BuildInterest | null>(null);
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const interestRef = useRef(interest);
  const levelRef = useRef(level);

  const chooseInterest = (id: BuildInterest) => {
    interestRef.current = id;
    setInterest(id);
    const currentLevel = levelRef.current;
    if (currentLevel) onSuggest(suggestOfficialPath(id, currentLevel));
  };

  const chooseLevel = (id: SkillLevel) => {
    levelRef.current = id;
    setLevel(id);
    const currentInterest = interestRef.current;
    if (currentInterest) onSuggest(suggestOfficialPath(currentInterest, id));
  };

  return (
    <fieldset className={styles.quiz}>
      <legend className={styles.quizLegend}>Habilidades e intereses</legend>
      <p className={styles.quizPrompt} id="build-interest-label">
        Qué te gustaría construir
      </p>
      <div className={styles.quizOptions} role="group" aria-labelledby="build-interest-label">
        {INTERESTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.quizOption}
            aria-pressed={interest === item.id}
            onClick={() => chooseInterest(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className={styles.quizPrompt} id="skill-level-label">
        Cuánto ya programás
      </p>
      <div className={styles.quizOptions} role="group" aria-labelledby="skill-level-label">
        {LEVELS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.quizOption}
            aria-pressed={level === item.id}
            onClick={() => chooseLevel(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
