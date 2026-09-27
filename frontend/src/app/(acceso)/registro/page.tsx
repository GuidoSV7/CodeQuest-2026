import type { Metadata } from "next";
import { AuthenticatedEntry } from "@/features/auth/components/AuthenticatedEntry";
import styles from "../login/page.module.css";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Creá tu cuenta de CodeQuest con Discord.",
};

type RegisterPageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { returnTo } = await searchParams;
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/";

  return (
    <main className={styles.main}>
      <div id="login-content">
        <AuthenticatedEntry intent="register" returnTo={safeReturnTo} />
      </div>
    </main>
  );
}
