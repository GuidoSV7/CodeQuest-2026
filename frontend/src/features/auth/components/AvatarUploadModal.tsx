"use client";

import { useState, type FormEvent } from "react";
import api from "@/lib/axios";
import styles from "./AvatarUploadModal.module.css";

type AvatarUploadModalProps = {
  onClose: () => void;
  onUploaded: (avatarUrl: string) => void;
};

export function AvatarUploadModal({
  onClose,
  onUploaded,
}: AvatarUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Elegí una imagen");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api.post<{ avatarUrl: string }>("/api/me/avatar", body);
      onUploaded(data.avatarUrl);
      onClose();
    } catch {
      setError("No se pudo subir la imagen");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-upload-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <h2 id="avatar-upload-title">Foto de perfil</h2>
        <p>La imagen se guarda en Cloudinary.</p>
        {preview ? <img alt="" className={styles.preview} src={preview} /> : null}
        <input
          accept="image/*"
          type="file"
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            setFile(next);
            setPreview(
              next && typeof URL.createObjectURL === "function"
                ? URL.createObjectURL(next)
                : null,
            );
          }}
        />
        {error ? <p role="alert">{error}</p> : null}
        <div className={styles.actions}>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button disabled={pending} type="submit">
            {pending ? "Subiendo…" : "Guardar foto"}
          </button>
        </div>
      </form>
    </div>
  );
}
