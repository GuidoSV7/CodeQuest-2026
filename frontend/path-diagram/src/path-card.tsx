import type { KeyboardEvent } from "react";
import styles from "./path-card.module.css";

export type PathCardProps = {
  title: string;
  bucketLabel: string;
  alreadyKnown: boolean;
  partial: boolean;
  completed: boolean;
  step?: number;
  onOpen: () => void;
};

export function PathCard({
  title,
  bucketLabel,
  alreadyKnown,
  partial,
  completed,
  step,
  onOpen,
}: PathCardProps) {
  const openFromKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen();
  };
  const status = completed ? "Completado" : alreadyKnown ? "Ya visto" : null;

  return (
    <button className={styles.card} type="button" onClick={onOpen} onKeyDown={openFromKey}>
      <span className={styles.copy}>
        {step ? <span className={styles.step}>{step}</span> : null}
        {step === 1 ? <span className={styles.start}>Empieza aquí</span> : null}
        <span className={styles.bucket}>{bucketLabel}</span>
        <span className={styles.title}>{title}</span>
        {status ? <span className={styles.status}>{status}</span> : null}
        {partial ? <span className={styles.status}>Incompleto</span> : null}
      </span>
    </button>
  );
}
