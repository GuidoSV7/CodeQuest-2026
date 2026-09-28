import { discordStartUrl } from "@/features/auth/api/auth.service";
import styles from "./SignInLink.module.css";

export function SignInLink({ returnTo }: { returnTo: string }) {
  return (
    <a className={styles.action} href={discordStartUrl(returnTo)}>
      Entrar
    </a>
  );
}
