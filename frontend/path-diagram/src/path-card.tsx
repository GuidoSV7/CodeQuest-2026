import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { DiagramBucket } from "./model";
import styles from "./path-card.module.css";

export type PathCardProps = {
  title: string;
  bucketLabel: string;
  bucket?: DiagramBucket | null;
  alreadyKnown: boolean;
  partial: boolean;
  completed: boolean;
  step?: number;
  onOpen: () => void;
};

export function PathCard({
  title,
  bucketLabel,
  bucket = null,
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
  const skipClick = useRef(false);
  const trackDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const startX = event.clientX;
    const startY = event.clientY;
    const onMove = (move: globalThis.PointerEvent) => {
      const distance = Math.hypot(move.clientX - startX, move.clientY - startY);
      if (distance > 4) skipClick.current = true;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const openFromClick = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    onOpen();
  };
  const status = completed ? "Completado" : alreadyKnown ? "Ya visto" : null;

  return (
    <button
      className={styles.card}
      type="button"
      data-bucket={bucket ?? undefined}
      onPointerDown={trackDrag}
      onClick={openFromClick}
      onKeyDown={openFromKey}
    >
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
