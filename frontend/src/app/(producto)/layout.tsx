import { MissionShell } from "@/features/orbital/components/MissionShell";

export default function ProductoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MissionShell>{children}</MissionShell>;
}
