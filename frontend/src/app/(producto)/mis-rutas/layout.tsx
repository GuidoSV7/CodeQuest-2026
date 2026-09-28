import { RequireSession } from "@/features/auth/components/RequireSession";

export default function MisRutasLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RequireSession>{children}</RequireSession>;
}
