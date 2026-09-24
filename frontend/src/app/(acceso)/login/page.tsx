import type { Metadata } from "next";
import { LoginPanel } from "@/features/auth/components/LoginPanel";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Iniciá sesión en CodeQuest con Discord.",
};

type LoginPageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnTo } = await searchParams;
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/";

  return (
    <main className={styles.main}>
      <div id="login-content">
        <LoginPanel returnTo={safeReturnTo} />
      </div>
    </main>
  );
}
