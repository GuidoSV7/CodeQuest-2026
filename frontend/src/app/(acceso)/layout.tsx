import { MissionShell } from "@/features/orbital/components/MissionShell";

export default function AccesoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MissionShell variant="login">{children}</MissionShell>;
}
