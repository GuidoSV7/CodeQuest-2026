"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAssessment } from "../lib/assessment-data";
import { answerQuestion } from "../lib/assessment-state";
import type { AssessmentAnswers } from "../types/assessment.types";
import styles from "./AssessmentWizard.module.css";

export function AssessmentWizard() {
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [transitioning, setTransitioning] = useState(false);
  const result = getAssessment("anonymous");
  const router = useRouter();

  useEffect(() => {
    if (!transitioning) return;
    const timer = window.setTimeout(
      () => router.push("/configurador-de-ruta/resultados"),
      320,
    );
    return () => window.clearTimeout(timer);
  }, [router, transitioning]);

  if (result.status === "loading") {
    return <p className={styles.state}>Cargando calibración…</p>;
  }
  if (result.status === "error") {
    return (
      <section className={styles.state} role="alert">
        <h2>No pudimos cargar el configurador</h2>
        <button className={styles.secondaryAction} type="button">Reintentar</button>
      </section>
    );
  }
  if (result.status !== "ready" || result.data === null) {
    return (
      <p className={styles.state}>
        Esta calibración no está disponible en este momento.
      </p>
    );
  }

  const question = result.data.questions[0];
  const selected = answers[question.id];
  const selectOption = (optionId: string) => {
    setAnswers((current) => answerQuestion(current, question.id, optionId));
    setTransitioning(true);
  };

  return (
    <section className={styles.wizard} aria-labelledby="assessment-title">
      <div className={styles.assessmentFrame}>
        <div className={styles.utilityBar}>
          <Link className={styles.backAction} href="/">
            <span aria-hidden="true">←</span>
            Volver
          </Link>
          <div className={styles.progressHeader}>
            <div className={styles.progressDots} aria-label="Progreso: paso 3 de 12">
              {Array.from({ length: 12 }, (_, index) => (
                <span
                  className={index < 2 ? styles.dotComplete : index === 2 ? styles.dotActive : styles.dotPending}
                  key={index}
                  title={`Nodo ${String(index + 1).padStart(2, "0")}`}
                />
              ))}
            </div>
            <span>PASO 03 / 12 <b>✦</b> ESTIMADO: &lt; 3 MIN</span>
          </div>
          <span className={styles.timePromise}>DIAGNÓSTICO COMPLETO EN MENOS DE 5 MINUTOS</span>
        </div>
        <div className={styles.questionCard}>
          <div className={styles.contextTag}>✦ ESCENARIO SITUACIONAL // VECTOR DE INTERÉS</div>
          <h1 id="assessment-title">{question.prompt}</h1>
          <div className={styles.options} id="scenario-options">
            {question.options.map((option) => (
              <label
                className={selected === option.id ? styles.optionSelected : styles.option}
                key={option.id}
                role="button"
                tabIndex={0}
                aria-pressed={selected === option.id}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectOption(option.id);
                  }
                }}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={selected === option.id}
                  onChange={() => selectOption(option.id)}
                />
                <span className={styles.optionCopy}>
                  <small>{`VECTOR // ${option.id.replace("-", " ").toUpperCase()}`}</small>
                  <strong>{option.label}</strong>
                  <em>{option.detail}</em>
                </span>
                <span className={styles.optionArrow} aria-hidden="true">→</span>
              </label>
            ))}
          </div>
        </div>
        <p className={styles.advanceHint} aria-live="polite">
          <span aria-hidden="true">●</span>
          {transitioning
            ? "CALIBRANDO SIGUIENTE ESCENARIO…"
            : "SELECCIONA UNA OPCIÓN PARA AVANZAR DIRECTAMENTE AL SIGUIENTE ESCENARIO"}
          <span aria-hidden="true">●</span>
        </p>
      </div>
    </section>
  );
}
