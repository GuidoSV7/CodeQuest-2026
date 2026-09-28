import { officialPathIconSrc } from "@/config/official-paths";
import styles from "./StackIcon.module.css";

type StackIconProps = {
  pathId: string | null;
  size: "sm" | "md";
  standaloneLabel?: string;
};

const INTRINSIC_SIZE = { sm: 24, md: 40 } as const;

export function StackIcon({ pathId, size, standaloneLabel }: StackIconProps) {
  const src = officialPathIconSrc(pathId);
  if (!src) return null;

  return (
    <img
      className={`${styles.icon} ${styles[size]}`}
      src={src}
      alt={standaloneLabel ?? ""}
      width={INTRINSIC_SIZE[size]}
      height={INTRINSIC_SIZE[size]}
      loading="lazy"
      decoding="async"
    />
  );
}
